import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";
import { stripeGet, stripeRequest } from "../_shared/stripe.ts";
import { syncStripeSubscription } from "../_shared/stripe-entitlements.ts";

const CUSTOMER_TIERS: Record<string, { accountType: "individual" | "company"; seatLimit: number }> = {
  individual: { accountType: "individual", seatLimit: 1 },
  company_0_10: { accountType: "company", seatLimit: 10 },
  company_11_20: { accountType: "company", seatLimit: 20 },
  company_unlimited: { accountType: "company", seatLimit: 1 },
};

const PLANS: Record<string, {
  accountType: "individual" | "company";
  calculatorLimit: number | null;
  hasNecTables: boolean;
  canExportCompleteReports: boolean;
  companySeatLimit: number | null;
  upgradeRank: number;
}> = {
  individual_6_15: { accountType: "individual", calculatorLimit: 15, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, upgradeRank: 15 },
  individual_16_25: { accountType: "individual", calculatorLimit: 25, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, upgradeRank: 25 },
  individual_26_35: { accountType: "individual", calculatorLimit: 35, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, upgradeRank: 35 },
  individual_36_plus: { accountType: "individual", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, upgradeRank: 1000 },
  company_0_10: { accountType: "company", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 10, upgradeRank: 2010 },
  company_11_20: { accountType: "company", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 20, upgradeRank: 2020 },
  company_unlimited: { accountType: "company", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null, upgradeRank: 3000 },
};

function metadataValue(value: unknown) {
  return value == null ? "" : String(value);
}

function planRank(planKey: string | null | undefined) {
  if (!planKey) return 0;
  return PLANS[planKey]?.upgradeRank || 0;
}

function subscriptionItem(subscription: Record<string, unknown>) {
  return Array.isArray((subscription.items as { data?: unknown[] } | undefined)?.data)
    ? ((subscription.items as { data: Array<Record<string, unknown>> }).data[0] || null)
    : null;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, user, profile } = await requireProfile(req);
    const payload = await req.json().catch(() => ({}));
    const priceId = String(payload.priceId || "").trim();
    const planKey = String(payload.planKey || payload.calculatorTierId || "").trim();
    const plan = PLANS[planKey];
    if (!priceId) return jsonResponse({ error: "Missing Stripe price ID." }, 400);
    if (!plan) return jsonResponse({ error: "Invalid plan." }, 400);
    if (plan.accountType === "company" && !profile.org_id) {
      return jsonResponse({ error: "Company packages require an account connected to a company." }, 400);
    }

    const accountType = String(payload.accountType || plan.accountType);
    if (accountType !== plan.accountType) {
      return jsonResponse({ error: "Account type does not match selected plan." }, 400);
    }

    const customerTierId = String(payload.customerTierId || (plan.accountType === "company" ? planKey : "individual"));
    const customerTier = CUSTOMER_TIERS[customerTierId];
    if (!customerTier || customerTier.accountType !== plan.accountType) {
      return jsonResponse({ error: "Account type does not match customer tier." }, 400);
    }

    const filters = [`profile_id.eq.${user.id}`];
    if (profile.org_id) filters.push(`org_id.eq.${profile.org_id}`);
    const { data: subscriptions = [], error: subscriptionError } = await client
      .from("subscriptions")
      .select("*")
      .eq("provider", "stripe")
      .in("status", ["active", "trialing"])
      .or(filters.join(","))
      .order("updated_at", { ascending: false })
      .limit(1);
    if (subscriptionError) throw subscriptionError;

    const storedSubscription = subscriptions[0];
    const subscriptionId = storedSubscription?.provider_subscription_id;
    if (!subscriptionId) {
      return jsonResponse({ error: "No active Stripe subscription was found for this account." }, 404);
    }

    const currentPlanKey = String(storedSubscription.metadata?.plan_key || storedSubscription.metadata?.calculator_tier_id || "");
    if (planRank(planKey) <= planRank(currentPlanKey)) {
      return jsonResponse({ error: "This package is not an upgrade. Downgrades and cancellations take effect through Manage Billing." }, 409);
    }

    const currentSubscription = await stripeGet<Record<string, unknown>>(`subscriptions/${subscriptionId}`);
    const item = subscriptionItem(currentSubscription);
    const itemId = String(item?.id || "");
    if (!itemId) return jsonResponse({ error: "Stripe subscription item was not found." }, 502);

    const quantity = Math.max(1, Number(payload.quantity) || 1);
    const seats = plan.accountType === "company" && plan.companySeatLimit == null
      ? 0
      : Math.max(1, Number(payload.seats) || plan.companySeatLimit || customerTier.seatLimit || 1);
    const metadata = {
      profile_id: user.id,
      org_id: profile.org_id || "",
      account_type: plan.accountType,
      plan_key: planKey,
      customer_tier_id: customerTierId,
      calculator_tier_id: planKey,
      calculator_limit: metadataValue(plan.calculatorLimit),
      has_nec_tables: String(plan.hasNecTables),
      can_export_complete_reports: String(plan.canExportCompleteReports),
      company_seat_limit: metadataValue(plan.companySeatLimit),
      seat_limit: metadataValue(seats || plan.companySeatLimit),
      billing_quantity: String(quantity),
    };

    const updatedSubscription = await stripeRequest<Record<string, unknown>>(`subscriptions/${subscriptionId}`, {
      "items[0][id]": itemId,
      "items[0][price]": priceId,
      "items[0][quantity]": quantity,
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
      "metadata[profile_id]": metadata.profile_id,
      "metadata[org_id]": metadata.org_id,
      "metadata[account_type]": metadata.account_type,
      "metadata[plan_key]": metadata.plan_key,
      "metadata[customer_tier_id]": metadata.customer_tier_id,
      "metadata[calculator_tier_id]": metadata.calculator_tier_id,
      "metadata[calculator_limit]": metadata.calculator_limit,
      "metadata[has_nec_tables]": metadata.has_nec_tables,
      "metadata[can_export_complete_reports]": metadata.can_export_complete_reports,
      "metadata[company_seat_limit]": metadata.company_seat_limit,
      "metadata[seat_limit]": metadata.seat_limit,
      "metadata[billing_quantity]": metadata.billing_quantity,
    });

    const result = await syncStripeSubscription(updatedSubscription);
    return jsonResponse({ ok: true, proration: "always_invoice", ...result });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Subscription update failed." }, 500);
  }
});
