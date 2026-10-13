import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";
import { syncApplePurchaseForUser } from "../_shared/apple-app-store.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, user } = await requireUser(req);
    const payload = await req.json().catch(() => ({}));
    const productId = String(payload.productId || "").trim();
    const transactionId = String(payload.transactionId || "").trim();
    const originalTransactionId = String(payload.originalTransactionId || "").trim();
    const signedTransaction = String(payload.signedTransaction || payload.receiptData || "").trim();

    const configured = Boolean(
      Deno.env.get("APPLE_APP_STORE_CONNECT_ISSUER_ID")
        && Deno.env.get("APPLE_APP_STORE_CONNECT_KEY_ID")
        && Deno.env.get("APPLE_APP_STORE_CONNECT_PRIVATE_KEY")
    );

    if (!configured) {
      return jsonResponse({
        error: "Apple purchase verification is not configured.",
        required: [
          "APPLE_BUNDLE_ID",
          "APPLE_APP_STORE_CONNECT_ISSUER_ID",
          "APPLE_APP_STORE_CONNECT_KEY_ID",
          "APPLE_APP_STORE_CONNECT_PRIVATE_KEY",
        ],
      }, 501);
    }

    if (!productId || (!transactionId && !signedTransaction)) {
      return jsonResponse({
        error: "productId and transactionId or signedTransaction are required.",
      }, 400);
    }

    const result = await syncApplePurchaseForUser(client, user.id, {
      productId,
      transactionId: transactionId || null,
      originalTransactionId: originalTransactionId || null,
      signedTransaction: signedTransaction || null,
    });
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple purchase verification failed.";
    const status = message.includes("already linked to another NECalcul8r account")
      ? 409
      : message === "Authentication required"
        ? 401
        : /not configured|Unsupported App Store product/i.test(message)
          ? 501
          : 500;
    return jsonResponse({ error: message }, status);
  }
});
