import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";

const ACTIVE_TYPES = new Set([
  "permanent",
  "paid",
  "external_company",
  "company_seat",
  "buildrpro_included",
  "app_store",
  "google_play",
  "apple_app_store",
]);

const CALCULATOR_LIMITS: Record<string, number | null> = {
  calc_0_5_free: 5,
  calc_6_15: 15,
  calc_16_25: 25,
  calc_26_35: 35,
  calc_35_plus: null,
};

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function entitlementMetadata(payload: Record<string, unknown>, actorId: string) {
  const calculatorTierId = String(payload.calculatorTierId || payload.calculator_tier_id || "calc_35_plus");
  const customerTierId = String(payload.customerTierId || payload.customer_tier_id || "");
  const seats = positiveNumber(payload.seats);

  return {
    note: payload.note || null,
    granted_by: actorId,
    customer_tier_id: customerTierId || null,
    calculator_tier_id: calculatorTierId,
    calculator_limit: calculatorTierId in CALCULATOR_LIMITS ? CALCULATOR_LIMITS[calculatorTierId] : null,
    seat_limit: seats,
  };
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, profile: actor } = await requireProfile(req);
    const payload = await req.json().catch(() => ({}));
    const targetProfileId = String(payload.profileId || payload.target_profile_id || "").trim();
    if (!targetProfileId && !payload.orgId) {
      return jsonResponse({ error: "profileId or orgId is required." }, 400);
    }

    if (!actor.is_platform_admin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (payload.orgId) {
      const { error } = await client.from("entitlements").insert({
        org_id: payload.orgId,
        source: payload.source || "company_external",
        access_type: payload.accessType || "external_company",
        status: "active",
        subscription_status: "active",
        seats: Math.max(1, Number(payload.seats) || 1),
        expires_at: payload.expiresAt || null,
        metadata: entitlementMetadata(payload, actor.id),
      });
      if (error) throw error;
      return jsonResponse({ ok: true, org_id: payload.orgId });
    }

    const { data: target, error: targetError } = await client
      .from("profiles")
      .select("*")
      .eq("id", targetProfileId)
      .single();
    if (targetError || !target) return jsonResponse({ error: "Target profile not found." }, 404);

    const updates = payload.updates || {};
    let accessType = updates.access_type || payload.accessType || target.access_type || "trial";
    let accessStatus = updates.access_status || (ACTIVE_TYPES.has(accessType) ? "active" : target.access_status || "trial");
    let purchaseSource = updates.purchase_source || payload.source || target.purchase_source || "admin";
    let subscriptionStatus = updates.subscription_status || target.subscription_status;

    if (accessStatus === "active" && accessType === "trial") {
      accessType = "permanent";
      if (purchaseSource === "manual") purchaseSource = "admin";
    }
    if (ACTIVE_TYPES.has(accessType) && accessStatus === "trial") accessStatus = "active";
    if (accessType === "paid" && !subscriptionStatus) subscriptionStatus = "active";

    const { error: updateError } = await client
      .from("profiles")
      .update({
        access_type: accessType,
        access_status: accessStatus,
        purchase_source: purchaseSource,
        subscription_status: subscriptionStatus || null,
        trial_start_date: updates.trial_start_date ?? target.trial_start_date,
        trial_end_date: updates.trial_end_date ?? target.trial_end_date,
        updated_date: new Date().toISOString(),
      })
      .eq("id", targetProfileId);
    if (updateError) throw updateError;

    await client
      .from("entitlements")
      .update({ status: accessStatus === "disabled" ? "disabled" : "expired", updated_at: new Date().toISOString() })
      .eq("profile_id", targetProfileId)
      .eq("status", "active");

    if (accessStatus === "active" && accessType !== "trial") {
      const { error: entitlementError } = await client.from("entitlements").insert({
        profile_id: targetProfileId,
        source: purchaseSource,
        access_type: accessType,
        status: "active",
        subscription_status: subscriptionStatus || "active",
        seats: 1,
        expires_at: payload.expiresAt || null,
        metadata: entitlementMetadata(payload, actor.id),
      });
      if (entitlementError) throw entitlementError;
    }

    return jsonResponse({
      ok: true,
      profile_id: targetProfileId,
      access_type: accessType,
      access_status: accessStatus,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Access grant failed." }, 500);
  }
});
