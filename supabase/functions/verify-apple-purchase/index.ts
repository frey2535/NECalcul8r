import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";

/**
 * Verifies App Store purchases from the iOS Capacitor client.
 *
 * Expected JSON body from `src/lib/appleAppStoreBilling.js`:
 * {
 *   productId: "individual_6_15",
 *   transactionId: "…",
 *   originalTransactionId?: "…",
 *   signedTransaction?: "<JWS or base64 transaction payload>",
 *   receiptData?: "<legacy receipt>",
 *   source: "apple_app_store"
 * }
 *
 * Production implementation should:
 * 1. Authenticate the signed-in user (requireUser).
 * 2. Verify the signed transaction with App Store Server API.
 * 3. Confirm productId is one of individual_6_15 / 16_25 / 26_35 / 36_plus.
 * 4. Upsert entitlements with source/access_type apple_app_store.
 * 5. Reject tokens already linked to a different NECalcul8r account.
 */
Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    await requireUser(req);
    const payload = await req.json().catch(() => ({}));
    const productId = String(payload.productId || "").trim();
    const transactionId = String(payload.transactionId || "").trim();
    const signedTransaction = String(payload.signedTransaction || payload.receiptData || "").trim();

    const configured = Boolean(
      Deno.env.get("APPLE_APP_STORE_CONNECT_ISSUER_ID")
        && Deno.env.get("APPLE_APP_STORE_CONNECT_KEY_ID")
        && Deno.env.get("APPLE_APP_STORE_CONNECT_PRIVATE_KEY")
    ) || Boolean(Deno.env.get("APPLE_APP_SHARED_SECRET"));

    if (!configured) {
      return jsonResponse({
        error: "Apple purchase verification is not configured.",
        required: [
          "APPLE_BUNDLE_ID",
          "APPLE_APP_STORE_CONNECT_ISSUER_ID",
          "APPLE_APP_STORE_CONNECT_KEY_ID",
          "APPLE_APP_STORE_CONNECT_PRIVATE_KEY",
        ],
        received: {
          hasProductId: Boolean(productId),
          hasTransactionId: Boolean(transactionId),
          hasSignedTransaction: Boolean(signedTransaction),
        },
      }, 501);
    }

    if (!productId || (!transactionId && !signedTransaction)) {
      return jsonResponse({
        error: "productId and transactionId/signedTransaction are required.",
      }, 400);
    }

    return jsonResponse({
      error: "Apple purchase verification implementation requires the App Store Server API flow for bundle com.currentflow.necalcul8r.",
      productId,
      transactionId: transactionId || null,
    }, 501);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Apple purchase verification failed." }, 500);
  }
});
