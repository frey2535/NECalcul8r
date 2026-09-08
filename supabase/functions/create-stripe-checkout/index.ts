import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";
import { stripeRequest } from "../_shared/stripe.ts";

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
}> = {
  individual_6_15: { accountType: "individual", calculatorLimit: 15, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  individual_16_25: { accountType: "individual", calculatorLimit: 25, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  individual_26_35: { accountType: "individual", calculatorLimit: 35, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  individual_36_plus: { accountType: "individual", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
  company_0_10: { accountType: "company", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 10 },
  company_11_20: { accountType: "company", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: 20 },
  company_unlimited: { accountType: "company", calculatorLimit: null, hasNecTables: true, canExportCompleteReports: true, companySeatLimit: null },
};

function metadataValue(value: unknown) {
  return value == null ? "" : String(value);
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { user, profile } = await requireProfile(req);
    const payload = await req.json().catch(() => ({}));
    const priceId = String(payload.priceId || "").trim();
    if (!priceId) return jsonResponse({ error: "Missing Stripe price ID." }, 400);

    const planKey = String(payload.planKey || payload.calculatorTierId || "individual_36_plus");
    const plan = PLANS[planKey];
    if (!plan) return jsonResponse({ error: "Invalid plan." }, 400);

    const customerTierId = String(payload.customerTierId || (plan.accountType === "company" ? planKey : "individual"));
    const customerTier = CUSTOMER_TIERS[customerTierId];
    if (!customerTier) return jsonResponse({ error: "Invalid customer tier." }, 400);

    const accountType = String(payload.accountType || plan.accountType);
    if (accountType !== plan.accountType || accountType !== customerTier.accountType) {
      return jsonResponse({ error: "Account type does not match customer tier." }, 400);
    }
    if (accountType === "company" && !profile.org_id) {
      return jsonResponse({ error: "Company packages require an account connected to a company." }, 400);
    }

    const quantity = Math.max(1, Number(payload.quantity) || 1);
    const seats = plan.accountType === "company" && plan.companySeatLimit == null
      ? 0
      : Math.max(1, Number(payload.seats) || plan.companySeatLimit || customerTier.seatLimit || 1);
    const successUrl = String(payload.successUrl || new URL("/", req.url).toString());
    const cancelUrl = String(payload.cancelUrl || new URL("/purchase", req.url).toString());
    const metadata = {
      profile_id: user.id,
      org_id: profile.org_id || "",
      account_type: accountType,
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

    const session = await stripeRequest<{ url?: string }>("checkout/sessions", {
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email || profile.email,
      client_reference_id: user.id,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": quantity,
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
      "subscription_data[metadata][profile_id]": metadata.profile_id,
      "subscription_data[metadata][org_id]": metadata.org_id,
      "subscription_data[metadata][account_type]": metadata.account_type,
      "subscription_data[metadata][plan_key]": metadata.plan_key,
      "subscription_data[metadata][customer_tier_id]": metadata.customer_tier_id,
      "subscription_data[metadata][calculator_tier_id]": metadata.calculator_tier_id,
      "subscription_data[metadata][calculator_limit]": metadata.calculator_limit,
      "subscription_data[metadata][has_nec_tables]": metadata.has_nec_tables,
      "subscription_data[metadata][can_export_complete_reports]": metadata.can_export_complete_reports,
      "subscription_data[metadata][company_seat_limit]": metadata.company_seat_limit,
      "subscription_data[metadata][seat_limit]": metadata.seat_limit,
      "subscription_data[metadata][billing_quantity]": metadata.billing_quantity,
    });

    if (!session.url) return jsonResponse({ error: "Stripe did not return a checkout URL." }, 502);
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Checkout failed." }, 500);
  }
});
