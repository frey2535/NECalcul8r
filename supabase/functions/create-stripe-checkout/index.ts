import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";
import { stripeRequest } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { user, profile } = await requireProfile(req);
    const payload = await req.json().catch(() => ({}));
    const priceId = String(payload.priceId || "").trim();
    if (!priceId) return jsonResponse({ error: "Missing Stripe price ID." }, 400);

    const quantity = Math.max(1, Number(payload.quantity) || 1);
    const accountType = String(payload.accountType || "individual");
    const successUrl = String(payload.successUrl || new URL("/", req.url).toString());
    const cancelUrl = String(payload.cancelUrl || new URL("/purchase", req.url).toString());

    const session = await stripeRequest<{ url?: string }>("checkout/sessions", {
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email || profile.email,
      client_reference_id: user.id,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": quantity,
      "metadata[profile_id]": user.id,
      "metadata[org_id]": profile.org_id || "",
      "metadata[account_type]": accountType,
      "metadata[customer_tier_id]": payload.customerTierId,
      "metadata[calculator_tier_id]": payload.calculatorTierId,
      "subscription_data[metadata][profile_id]": user.id,
      "subscription_data[metadata][org_id]": profile.org_id || "",
      "subscription_data[metadata][account_type]": accountType,
      "subscription_data[metadata][customer_tier_id]": payload.customerTierId,
      "subscription_data[metadata][calculator_tier_id]": payload.calculatorTierId,
    });

    if (!session.url) return jsonResponse({ error: "Stripe did not return a checkout URL." }, 502);
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Checkout failed." }, 500);
  }
});
