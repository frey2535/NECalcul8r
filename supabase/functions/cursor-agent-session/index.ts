import { createCursorFollowUpRun, getCursorAgentSession } from "../_shared/cursor-agents-api.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, requireProfile } from "../_shared/supabase.ts";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { profile } = await requireProfile(req);
    if (!profile.is_platform_admin) {
      return jsonResponse({ error: "Platform admin access required." }, 403);
    }

    const payload = await req.json().catch(() => ({}));
    const action = optionalString(payload.action) || "status";
    const agentId = optionalString(payload.agentId);
    if (!agentId) return jsonResponse({ error: "agentId is required." }, 400);

    const apiKey = requireEnv("CURSOR_API_KEY");

    if (action === "followup") {
      const promptText = optionalString(payload.prompt);
      if (!promptText) return jsonResponse({ error: "Prompt is required for follow-up." }, 400);
      try {
        const run = await createCursorFollowUpRun({ apiKey, agentId, promptText });
        const session = await getCursorAgentSession(apiKey, agentId, run.runId);
        return jsonResponse({ ok: true, action, ...session });
      } catch (error) {
        const err = error as Error & { status?: number; details?: unknown };
        const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
        return jsonResponse({
          error: err.message || "Follow-up failed.",
          status,
          details: err.details || null,
        }, status);
      }
    }

    if (action !== "status") {
      return jsonResponse({ error: "Unknown action. Use status or followup." }, 400);
    }

    const runId = optionalString(payload.runId);
    const session = await getCursorAgentSession(apiKey, agentId, runId);
    return jsonResponse({ ok: true, action, ...session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cursor agent session failed.";
    const status = /auth|admin/i.test(message) ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
