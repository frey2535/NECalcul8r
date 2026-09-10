/**
 * Google Play Real-time Developer Notifications (RTDN) webhook.
 *
 * Configure in Play Console → Monetization setup → Real-time developer notifications
 * with a Pub/Sub topic that pushes to:
 *   https://<project>.supabase.co/functions/v1/google-play-rtdn
 *
 * Optional secret: set GOOGLE_PLAY_RTDN_TOKEN and pass it as
 *   ?token=<GOOGLE_PLAY_RTDN_TOKEN>  or  Authorization: Bearer <token>
 */
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { syncPlayPurchaseForUser } from "../_shared/google-play.ts";

function authorized(req: Request) {
  const expected = Deno.env.get("GOOGLE_PLAY_RTDN_TOKEN");
  if (!expected) return true; // allow if not configured (Pub/Sub push often has no auth)
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const header = req.headers.get("Authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  return queryToken === expected || bearer === expected;
}

function decodePubSubData(raw: string) {
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method === "GET") {
    return jsonResponse({ ok: true, service: "google-play-rtdn" });
  }

  try {
    if (!authorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    // Pub/Sub push envelope or direct test payload
    const encoded = body?.message?.data;
    const notification = encoded
      ? decodePubSubData(String(encoded))
      : (body.subscriptionNotification || body.oneTimeProductNotification
        ? body
        : null);

    if (!notification) {
      return jsonResponse({ ok: true, ignored: true, reason: "no_notification_payload" });
    }

    const sub = notification.subscriptionNotification;
    if (!sub) {
      // Ignore one-time / voided / test pings we don't handle yet
      return jsonResponse({ ok: true, ignored: true, reason: "not_subscription_notification" });
    }

    const purchaseToken = String(sub.purchaseToken || "").trim();
    const productId = String(sub.subscriptionId || "").trim();
    const packageName = String(notification.packageName || Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") || "");
    if (!purchaseToken || !productId) {
      return jsonResponse({ ok: true, ignored: true, reason: "missing_token_or_product" });
    }

    const client = serviceClient();
    const { data: existing } = await client
      .from("google_play_purchases")
      .select("user_id, product_id, purchase_token")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();

    if (!existing?.user_id) {
      // User will pick this up via Restore Purchases / next verify call.
      return jsonResponse({ ok: true, pending_user_link: true });
    }

    const result = await syncPlayPurchaseForUser(
      client,
      existing.user_id,
      existing.product_id || productId,
      purchaseToken,
      { packageName: packageName || undefined },
    );

    return jsonResponse({
      ok: true,
      notificationType: sub.notificationType,
      ...result,
    });
  } catch (error) {
    console.error("[google-play-rtdn]", error);
    // Return 200 so Pub/Sub does not infinite-retry poison messages; log for ops.
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "RTDN processing failed",
    });
  }
});
