import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";
import { stripeRequest } from "../_shared/stripe.ts";

const CUSTOMER_TIERS: Record<string, { accountType: "individual" | "company"; seatLimit: number }> = {
  individual: { accountType: "individual", seatLimit: 1 },
  company_0_10: { accountType: "company", seatLimit: 10 },
  company_10_30: { accountType: "company", seatLimit: 30 },
  company_30_plus: { accountType: "company", seatLimit: 31 },
};

const CALCULATOR_TIERS: Record<string, { calculatorLimit: number | null }> = {
  calc_0_5_free: { calculatorLimit: 5 },
  calc_6_15: { calculatorLimit: 15 },
  calc_16_25: { calculatorLimit: 25 },
  calc_26_35: { calculatorLimit: 35 },
  calc_35_plus: { calculatorLimit: null },
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

    const customerTierId = String(payload.customerTierId || "individual");
    const calculatorTierId = String(payload.calculatorTierId || "calc_35_plus");
    const customerTier = CUSTOMER_TIERS[customerTierId];
    const calculatorTier = CALCULATOR_TIERS[calculatorTierId];
    if (!customerTier) return jsonResponse({ error: "Invalid customer tier." }, 400);
    if (!calculatorTier) return jsonResponse({ error: "Invalid calculator tier." }, 400);

    const accountType = String(payload.accountType || customerTier.accountType);
    if (accountType !== customerTier.accountType) {
      return jsonResponse({ error: "Account type does not match customer tier." }, 400);
    }
    if (accountType === "company" && !profile.org_id) {
      return jsonResponse({ error: "Company packages require an account connected to a company." }, 400);
    }

    const quantity = Math.max(1, Number(payload.quantity) || 1);
    const seats = Math.max(1, Number(payload.seats) || customerTier.seatLimit || 1);
    const successUrl = String(payload.successUrl || new URL("/", req.url).toString());
    const cancelUrl = String(payload.cancelUrl || new URL("/purchase", req.url).toString());
    const calculatorLimit = calculatorTier.calculatorLimit;
    const metadata = {
      profile_id: user.id,
      org_id: profile.org_id || "",
      account_type: accountType,
      customer_tier_id: customerTierId,
      calculator_tier_id: calculatorTierId,
      calculator_limit: metadataValue(calculatorLimit),
      seat_limit: String(seats),
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
      "metadata[customer_tier_id]": metadata.customer_tier_id,
      "metadata[calculator_tier_id]": metadata.calculator_tier_id,
      "metadata[calculator_limit]": metadata.calculator_limit,
      "metadata[seat_limit]": metadata.seat_limit,
      "metadata[billing_quantity]": metadata.billing_quantity,
      "subscription_data[metadata][profile_id]": metadata.profile_id,
      "subscription_data[metadata][org_id]": metadata.org_id,
      "subscription_data[metadata][account_type]": metadata.account_type,
      "subscription_data[metadata][customer_tier_id]": metadata.customer_tier_id,
      "subscription_data[metadata][calculator_tier_id]": metadata.calculator_tier_id,
      "subscription_data[metadata][calculator_limit]": metadata.calculator_limit,
      "subscription_data[metadata][seat_limit]": metadata.seat_limit,
      "subscription_data[metadata][billing_quantity]": metadata.billing_quantity,
    });

    if (!session.url) return jsonResponse({ error: "Stripe did not return a checkout URL." }, 502);
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Checkout failed." }, 500);
  }
});
