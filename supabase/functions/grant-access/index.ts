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

const PLAN_ACCESS: Record<string, {
  calculatorLimit: number | null;
  hasNecTables: boolean;
  canExportCompleteReports: boolean;
  companySeatLimit: number | null;
}> = {
  individual_6_15: { calculatorLimit: 15, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  individual_16_25: { calculatorLimit: 25, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  individual_26_35: { calculatorLimit: 35, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  individual_36_plus: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  company_0_10: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 10 },
  company_11_20: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 20 },
  company_unlimited: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  owner_full_access: { calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
};

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function entitlementMetadata(payload: Record<string, unknown>, actorId: string) {
  const updates = typeof payload.updates === "object" && payload.updates !== null
    ? payload.updates as Record<string, unknown>
    : {};
  const requestedAccessType = String(updates.access_type || payload.accessType || "");
  const defaultPlanKey = requestedAccessType === "permanent" ? "owner_full_access" : "individual_36_plus";
  const planKey = String(
    payload.planKey
    || payload.plan_key
    || payload.calculatorTierId
    || payload.calculator_tier_id
    || updates.planKey
    || updates.plan_key
    || updates.calculatorTierId
    || updates.calculator_tier_id
    || defaultPlanKey
  );
  const plan = PLAN_ACCESS[planKey];
  if (!plan) {
    throw new Error(`Invalid plan key: ${planKey}`);
  }
  const customerTierId = String(payload.customerTierId || payload.customer_tier_id || updates.customerTierId || updates.customer_tier_id || "");
  const seats = positiveNumber(payload.seats || updates.seats || updates.seat_limit);

  return {
    note: payload.note || updates.note || null,
    granted_by: actorId,
    plan_key: planKey,
    customer_tier_id: customerTierId || null,
    calculator_tier_id: planKey,
    calculator_limit: plan.calculatorLimit,
    has_nec_tables: plan.hasNecTables,
    can_export_complete_reports: plan.canExportCompleteReports,
    company_seat_limit: plan.companySeatLimit,
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
      const entitlementSource = accessType === "permanent" ? "owner_grant" : purchaseSource;
      if (entitlementSource === "owner_grant") {
        const { error: grantError } = await client.from("access_grants").insert({
          user_id: targetProfileId,
          grant_type: "owner_full_access",
          active: true,
          starts_at: new Date().toISOString(),
          expires_at: payload.expiresAt || null,
          reason: String(payload.reason || payload.note || "Platform owner full-access grant."),
          granted_by_user_id: actor.id,
        });
        if (grantError) throw grantError;
      }

      const { error: entitlementError } = await client.from("entitlements").insert({
        profile_id: targetProfileId,
        source: entitlementSource,
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
