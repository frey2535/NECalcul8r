import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    await requireUser(req);
    const configured = Boolean(Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") && Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"));
    if (!configured) {
      return jsonResponse({
        error: "Google Play purchase verification is not configured.",
        required: ["GOOGLE_PLAY_PACKAGE_NAME", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"],
      }, 501);
    }

    return jsonResponse({
      error: "Google Play purchase verification implementation requires the production package name and service-account flow.",
    }, 501);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Google Play verification failed." }, 500);
  }
});
