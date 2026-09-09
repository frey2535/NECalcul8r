import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";
import { stripeGet } from "../_shared/stripe.ts";
import { syncStripeSubscription } from "../_shared/stripe-entitlements.ts";

function metadataFor(object: Record<string, unknown>) {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, string>
    : {};
}

function sessionBelongsToUser(session: Record<string, unknown>, userId: string, orgId?: string | null) {
  const metadata = metadataFor(session);
  return session.client_reference_id === userId
    || metadata.profile_id === userId
    || Boolean(orgId && metadata.org_id === orgId);
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { user, profile } = await requireProfile(req);
    const payload = await req.json().catch(() => ({}));
    const sessionId = String(payload.sessionId || "").trim();
    if (!sessionId) return jsonResponse({ error: "Missing Stripe checkout session ID." }, 400);

    const session = await stripeGet<Record<string, unknown>>(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (!sessionBelongsToUser(session, user.id, profile.org_id)) {
      return jsonResponse({ error: "Checkout session does not belong to this account." }, 403);
    }

    const subscriptionId = String(session.subscription || "");
    if (!subscriptionId) {
      return jsonResponse({ error: "Checkout session does not include a subscription yet." }, 409);
    }

    const subscription = await stripeGet<Record<string, unknown>>(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    const result = await syncStripeSubscription(subscription);
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Checkout session sync failed." }, 500);
  }
});
