import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    await requireUser(req);
    const configured = Boolean(Deno.env.get("APPLE_APP_SHARED_SECRET") || Deno.env.get("APPLE_APP_STORE_CONNECT_ISSUER_ID"));
    if (!configured) {
      return jsonResponse({
        error: "Apple purchase verification is not configured.",
        required: ["APPLE_APP_SHARED_SECRET or App Store Server API credentials"],
      }, 501);
    }

    return jsonResponse({
      error: "Apple purchase verification implementation requires the production bundle ID and App Store Server API flow.",
    }, 501);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Apple purchase verification failed." }, 500);
  }
});
