import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile } from "../_shared/supabase.ts";
import { stripeRequest } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, user, profile } = await requireProfile(req);
    const payload = await req.json().catch(() => ({}));
    const filters = [`profile_id.eq.${user.id}`];
    if (profile.org_id) filters.push(`org_id.eq.${profile.org_id}`);

    const { data: subscriptions = [], error } = await client
      .from("subscriptions")
      .select("*")
      .eq("provider", "stripe")
      .or(filters.join(","))
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;

    const customerId = subscriptions[0]?.provider_customer_id;
    if (!customerId) {
      return jsonResponse({ error: "No Stripe customer was found for this account." }, 404);
    }

    const portal = await stripeRequest<{ url?: string }>("billing_portal/sessions", {
      customer: customerId,
      return_url: String(payload.returnUrl || new URL("/", req.url).toString()),
    });

    if (!portal.url) return jsonResponse({ error: "Stripe did not return a billing portal URL." }, 502);
    return jsonResponse({ url: portal.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Billing portal failed." }, 500);
  }
});
