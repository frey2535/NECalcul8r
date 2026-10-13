import { wrapCursorAgentPrompt } from "../_shared/cursor-agent-doctrine.ts";
import { createCursorCloudAgent } from "../_shared/cursor-agents-api.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, requireProfile } from "../_shared/supabase.ts";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { profile } = await requireProfile(req);
    if (!profile.is_platform_admin) {
      return jsonResponse({ error: "Platform admin access required." }, 403);
    }

    const payload = await req.json().catch(() => ({}));
    const promptText = optionalString(payload.prompt);
    if (!promptText) {
      return jsonResponse({ error: "Prompt is required." }, 400);
    }

    const apiKey = requireEnv("CURSOR_API_KEY");
    const repoUrl = optionalString(payload.repoUrl) || requireEnv("CURSOR_REPO_URL");
    const startingRef = optionalString(payload.startingRef) || Deno.env.get("CURSOR_DEFAULT_BRANCH") || "main";
    const modelId = optionalString(payload.modelId);
    const missionId = optionalString(payload.missionId) || "nec_accuracy_guardian";
    const name = optionalString(payload.name) || promptText.slice(0, 100);
    const wrappedPrompt = wrapCursorAgentPrompt(missionId, promptText);

    try {
      const agent = await createCursorCloudAgent({
        apiKey,
        promptText: wrappedPrompt,
        name,
        repoUrl,
        startingRef,
        modelId,
        autoCreatePR: payload.autoCreatePR !== false,
      });
      return jsonResponse({
        ok: true,
        agentId: agent.agentId,
        runId: agent.runId,
        status: agent.status,
        url: agent.url,
        name: agent.name,
        missionId,
        repoUrl,
        startingRef,
      });
    } catch (error) {
      const err = error as Error & { status?: number; details?: unknown };
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
      return jsonResponse({
        error: err.message || "Cursor agent creation failed.",
        status,
        details: err.details || null,
      }, status);
    }
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Cursor agent request failed." }, 500);
  }
});
