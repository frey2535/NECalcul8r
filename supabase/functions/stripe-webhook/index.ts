import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, serviceClient } from "../_shared/supabase.ts";
import { stripeGet, verifyStripeSignature } from "../_shared/stripe.ts";

function stripeStatusToAccess(status: string) {
  return status === "active" || status === "trialing" ? "active" : "expired";
}

async function upsertSubscription(client: ReturnType<typeof serviceClient>, data: Record<string, unknown>) {
  const providerSubscriptionId = String(data.provider_subscription_id || "");
  if (!providerSubscriptionId) return;

  const { data: existing } = await client
    .from("subscriptions")
    .select("id")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await client
      .from("subscriptions")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("subscriptions").insert({
    provider: "stripe",
    ...data,
  });
  if (error) throw error;
}

async function replaceActiveEntitlement(client: ReturnType<typeof serviceClient>, data: {
  profile_id?: string | null;
  org_id?: string | null;
  status: string;
  subscription_status: string;
  subscription_id?: string | null;
  metadata: Record<string, unknown>;
}) {
  const targetColumn = data.org_id ? "org_id" : "profile_id";
  const targetId = data.org_id || data.profile_id;
  if (!targetId) return;

  await client
    .from("entitlements")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq(targetColumn, targetId)
    .eq("source", "stripe")
    .eq("status", "active");

  if (data.status !== "active") return;

  const { error } = await client.from("entitlements").insert({
    profile_id: data.profile_id || null,
    org_id: data.org_id || null,
    subscription_id: data.subscription_id || null,
    source: "stripe",
    access_type: "paid",
    status: "active",
    subscription_status: data.subscription_status,
    seats: Number(data.metadata.quantity) || 1,
    metadata: data.metadata,
  });
  if (error) throw error;
}

async function syncSubscription(subscription: Record<string, unknown>) {
  const client = serviceClient();
  const metadata = (subscription.metadata || {}) as Record<string, string>;
  const profileId = metadata.profile_id || null;
  const orgId = metadata.org_id || null;
  const status = String(subscription.status || "incomplete");
  const accessStatus = stripeStatusToAccess(status);
  const item = Array.isArray((subscription.items as { data?: unknown[] } | undefined)?.data)
    ? ((subscription.items as { data: Array<Record<string, unknown>> }).data[0] || {})
    : {};
  const price = (item.price || {}) as Record<string, unknown>;

  await upsertSubscription(client, {
    profile_id: profileId,
    org_id: orgId,
    provider_customer_id: subscription.customer,
    provider_subscription_id: subscription.id,
    provider_product_id: price.product || null,
    provider_price_id: price.id || null,
    status,
    seats: Number(item.quantity) || 1,
    current_period_end: subscription.current_period_end
      ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
      : null,
    metadata,
  });

  const { data: storedSubscription } = await client
    .from("subscriptions")
    .select("id")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id)
    .maybeSingle();

  if (profileId) {
    const { error } = await client
      .from("profiles")
      .update({
        access_type: "paid",
        access_status: accessStatus,
        purchase_source: "stripe",
        subscription_status: status,
        updated_date: new Date().toISOString(),
      })
      .eq("id", profileId);
    if (error) throw error;
  }

  await replaceActiveEntitlement(client, {
    profile_id: profileId,
    org_id: orgId,
    status: accessStatus,
    subscription_status: status,
    subscription_id: storedSubscription?.id || null,
    metadata: {
      ...metadata,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      quantity: Number(item.quantity) || 1,
    },
  });
}

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
      await syncSubscription(subscription);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(object);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Webhook failed." }, 400);
  }
});
