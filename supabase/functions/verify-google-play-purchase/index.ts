import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";
import { syncPlayPurchaseForUser } from "../_shared/google-play.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, user } = await requireUser(req);
    const payload = await req.json().catch(() => ({}));
    const productId = String(payload.productId || "").trim();
    const purchaseToken = String(payload.purchaseToken || "").trim();
    const expectedBasePlanId = String(payload.basePlanId || Deno.env.get("GOOGLE_PLAY_BASE_PLAN_ID") || "monthly");

    const result = await syncPlayPurchaseForUser(client, user.id, productId, purchaseToken, {
      expectedBasePlanId,
    });
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Play verification failed.";
    const status = message.includes("already linked to another NECalcul8r account")
      ? 409
      : message === "Authentication required"
        ? 401
        : 500;
    return jsonResponse({ error: message }, status);
  }
});
