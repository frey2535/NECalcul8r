import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";

const ALLOWED_PLANS = new Set([
  "individual_6_15",
  "individual_16_25",
  "individual_26_35",
  "individual_36_plus",
  "company_0_10",
  "company_11_20",
  "company_unlimited",
]);

function randomSegment(length = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function makeCode() {
  return `NEC-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, profile: actor } = await requireProfile(req);
    if (!actor.is_platform_admin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const payload = await req.json().catch(() => ({}));
    const planKey = String(payload.planKey || payload.plan_key || "").trim();
    if (!ALLOWED_PLANS.has(planKey)) {
      return jsonResponse({ error: "planKey must be a known individual or company plan." }, 400);
    }

    const seats = Math.max(1, Number(payload.seats) || 1);
    const maxRedemptions = Math.max(1, Number(payload.maxRedemptions || payload.max_redemptions) || 1);
    const note = payload.note ? String(payload.note).slice(0, 500) : null;
    const expiresAt = payload.expiresAt || payload.expires_at || null;
    const accessExpiresAt = payload.accessExpiresAt || payload.access_expires_at || null;
    const count = Math.min(50, Math.max(1, Number(payload.count) || 1));

    const created = [];
    for (let i = 0; i < count; i++) {
      let code = makeCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await client
          .from("license_keys")
          .insert({
            code,
            plan_key: planKey,
            seats,
            max_redemptions: maxRedemptions,
            redemption_count: 0,
            status: "active",
            note,
            expires_at: expiresAt,
            access_expires_at: accessExpiresAt,
            created_by: actor.id,
            org_id: payload.orgId || payload.org_id || null,
          })
          .select("*")
          .single();

        if (!error && data) {
          created.push(data);
          break;
        }
        if (error && !String(error.message || "").includes("duplicate")) {
          throw error;
        }
        code = makeCode();
      }
    }

    if (created.length === 0) {
      return jsonResponse({ error: "Could not generate unique license keys." }, 500);
    }

    return jsonResponse({
      ok: true,
      keys: created.map((row) => ({
        id: row.id,
        code: row.code,
        plan_key: row.plan_key,
        seats: row.seats,
        max_redemptions: row.max_redemptions,
        expires_at: row.expires_at,
        access_expires_at: row.access_expires_at,
      })),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not create license keys." }, 500);
  }
});
