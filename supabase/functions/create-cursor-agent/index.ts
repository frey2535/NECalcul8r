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
    const name = optionalString(payload.name) || promptText.slice(0, 100);

    const requestBody: Record<string, unknown> = {
      prompt: { text: promptText },
      name,
      repos: [{ url: repoUrl, startingRef }],
      autoCreatePR: payload.autoCreatePR !== false,
      workOnCurrentBranch: false,
      mode: "agent",
    };
    if (modelId) requestBody.model = { id: modelId };

    const response = await fetch("https://api.cursor.com/v1/agents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse({
        error: "Cursor agent creation failed.",
        status: response.status,
        details: result,
      }, response.status);
    }

    const agent = (result.agent || result) as Record<string, unknown>;
    const run = (result.run || {}) as Record<string, unknown>;
    return jsonResponse({
      ok: true,
      agentId: agent.id || result.id || null,
      runId: run.id || result.latestRunId || null,
      status: agent.status || result.status || null,
      url: agent.url || result.url || null,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Cursor agent request failed." }, 500);
  }
});
