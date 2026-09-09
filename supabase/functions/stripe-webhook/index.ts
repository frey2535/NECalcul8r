import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { syncStripeSubscription } from "../_shared/stripe-entitlements.ts";
import { requireEnv } from "../_shared/supabase.ts";
import { stripeGet, verifyStripeSignature } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const payload = await req.text();
    await verifyStripeSignature(payload, req.headers.get("stripe-signature"), requireEnv("STRIPE_WEBHOOK_SECRET"));
    const event = JSON.parse(payload);
    const object = event?.data?.object || {};

    if (event.type === "checkout.session.completed" && object.subscription) {
      const subscription = await stripeGet<Record<string, unknown>>(`subscriptions/${object.subscription}`);
      await syncStripeSubscription(subscription);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncStripeSubscription(object);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Webhook failed." }, 400);
  }
});
