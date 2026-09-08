import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, serviceClient } from "../_shared/supabase.ts";
import { stripeGet, verifyStripeSignature } from "../_shared/stripe.ts";

function stripeStatusToAccess(status: string) {
  return status === "active" || status === "trialing" ? "active" : "expired";
}

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
};

function numberOrFallback(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEntitlementMetadata(metadata: Record<string, string>, subscription: Record<string, unknown>, itemQuantity: number) {
  const planKey = metadata.plan_key || metadata.calculator_tier_id || "individual_36_plus";
  const plan = PLAN_ACCESS[planKey] || PLAN_ACCESS.individual_36_plus;
  const seatLimit = metadata.seat_limit === "" || metadata.seat_limit == null
    ? plan.companySeatLimit
    : numberOrFallback(metadata.seat_limit, itemQuantity || 1);

  return {
    ...metadata,
    plan_key: planKey,
    customer_tier_id: metadata.customer_tier_id || "individual",
    calculator_tier_id: planKey,
    calculator_limit: plan.calculatorLimit,
    has_nec_tables: plan.hasNecTables,
    can_export_complete_reports: plan.canExportCompleteReports,
    company_seat_limit: plan.companySeatLimit,
    seat_limit: seatLimit,
    billing_quantity: numberOrFallback(metadata.billing_quantity, itemQuantity || 1),
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    quantity: itemQuantity || 1,
  };
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
    seats: Number(data.metadata.seat_limit) || Number(data.metadata.company_seat_limit) || 0,
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
  const itemQuantity = Number(item.quantity) || 1;
  const entitlementMetadata = normalizeEntitlementMetadata(metadata, subscription, itemQuantity);

  await upsertSubscription(client, {
    profile_id: profileId,
    org_id: orgId,
    provider_customer_id: subscription.customer,
    provider_subscription_id: subscription.id,
    provider_product_id: price.product || null,
    provider_price_id: price.id || null,
    status,
    seats: Number(entitlementMetadata.seat_limit) || Number(entitlementMetadata.company_seat_limit) || 0,
    current_period_end: subscription.current_period_end
      ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
      : null,
    metadata: entitlementMetadata,
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

  if (orgId) {
    const { error } = await client
      .from("organizations")
      .update({
        access_status: accessStatus,
        purchase_source: "stripe",
        stripe_customer_id: subscription.customer,
        seat_limit: Number(entitlementMetadata.seat_limit) || Number(entitlementMetadata.company_seat_limit) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);
    if (error) throw error;
  }

  await replaceActiveEntitlement(client, {
    profile_id: profileId,
    org_id: orgId,
    status: accessStatus,
    subscription_status: status,
    subscription_id: storedSubscription?.id || null,
    metadata: entitlementMetadata,
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
