import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";

const PLAN_ACCESS: Record<string, {
  calculatorLimit: number | null;
  hasNecTables: boolean;
  canExportCompleteReports: boolean;
  companySeatLimit: number | null;
  accountType: "individual" | "company";
}> = {
  individual_6_15: { calculatorLimit: 15, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, accountType: "individual" },
  individual_16_25: { calculatorLimit: 25, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, accountType: "individual" },
  individual_26_35: { calculatorLimit: 35, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, accountType: "individual" },
  individual_36_plus: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, accountType: "individual" },
  company_0_10: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 10, accountType: "company" },
  company_11_20: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 20, accountType: "company" },
  company_unlimited: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, accountType: "company" },
};

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, user } = await requireUser(req);
    const payload = await req.json().catch(() => ({}));
    const code = normalizeCode(String(payload.code || payload.licenseKey || ""));
    if (!code || code.length < 8) {
      return jsonResponse({ error: "Enter a valid license key." }, 400);
    }

    const { data: keyRow, error: keyError } = await client
      .from("license_keys")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (keyError) throw keyError;
    if (!keyRow) return jsonResponse({ error: "License key not found." }, 404);
    if (keyRow.status === "revoked") return jsonResponse({ error: "This license key has been revoked." }, 400);
    if (keyRow.status === "exhausted" || keyRow.redemption_count >= keyRow.max_redemptions) {
      return jsonResponse({ error: "This license key has already been fully redeemed." }, 400);
    }
    if (keyRow.expires_at && new Date(keyRow.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: "This license key has expired." }, 400);
    }

    const plan = PLAN_ACCESS[keyRow.plan_key];
    if (!plan) return jsonResponse({ error: "License key plan is invalid. Contact support." }, 400);

    const accessType = plan.accountType === "company" ? "external_company" : "paid";
    const purchaseSource = "license_key";

    await client
      .from("entitlements")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("profile_id", user.id)
      .eq("status", "active");

    await client.from("entitlements").insert({
      profile_id: user.id,
      org_id: keyRow.org_id || null,
      source: "manual",
      access_type: accessType,
      status: "active",
      subscription_status: "active",
      seats: keyRow.seats || 1,
      expires_at: keyRow.access_expires_at || null,
      metadata: {
        plan_key: keyRow.plan_key,
        calculator_tier_id: keyRow.plan_key,
        calculator_limit: plan.calculatorLimit,
        has_nec_tables: plan.hasNecTables,
        can_export_complete_reports: plan.canExportCompleteReports,
        company_seat_limit: plan.companySeatLimit,
        license_key_id: keyRow.id,
        license_code: code,
        activated_via: "license_key",
      },
    });

    await client
      .from("profiles")
      .update({
        access_type: accessType,
        access_status: "active",
        purchase_source: purchaseSource,
        subscription_status: "active",
        updated_date: new Date().toISOString(),
      })
      .eq("id", user.id);

    const nextCount = Number(keyRow.redemption_count || 0) + 1;
    const exhausted = nextCount >= Number(keyRow.max_redemptions || 1);
    await client
      .from("license_keys")
      .update({
        redemption_count: nextCount,
        status: exhausted ? "exhausted" : "active",
        last_redeemed_by: user.id,
        last_redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", keyRow.id);

    await client.from("purchase_events").insert({
      profile_id: user.id,
      provider: "manual",
      event_type: "license_key_activated",
      payload: {
        license_key_id: keyRow.id,
        plan_key: keyRow.plan_key,
        code,
      },
    }).catch(() => null);

    return jsonResponse({
      ok: true,
      plan_key: keyRow.plan_key,
      access_type: accessType,
      access_status: "active",
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "License activation failed." }, 500);
  }
});
