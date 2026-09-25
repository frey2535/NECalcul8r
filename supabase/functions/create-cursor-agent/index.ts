import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, requireProfile } from "../_shared/supabase.ts";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function agentUrl(agentId: string | null | undefined) {
  if (!agentId) return null;
  return `https://cursor.com/agents/${agentId}`;
}

function basicAuthHeader(apiKey: string) {
  return `Basic ${btoa(`${apiKey}:`)}`;
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
      // Always create a new cursor/... branch from startingRef for in-app corrections.
      workOnCurrentBranch: false,
      mode: "agent",
    };
    if (modelId) requestBody.model = { id: modelId };

    const response = await fetch("https://api.cursor.com/v1/agents", {
      method: "POST",
      headers: {
        // Cloud Agents API accepts Basic or Bearer; Basic matches Cursor docs examples.
        Authorization: basicAuthHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
      const details = result as Record<string, unknown>;
      const detailMessage =
        (typeof details.error === "string" && details.error) ||
        (typeof details.message === "string" && details.message) ||
        (typeof (details.error as { message?: string } | undefined)?.message === "string"
          ? (details.error as { message: string }).message
          : null) ||
        "Cursor agent creation failed.";
      return jsonResponse({
        error: detailMessage,
        status: response.status,
        details: result,
      }, response.status >= 400 && response.status < 600 ? response.status : 502);
    }

    const agent = ((result as Record<string, unknown>).agent || result) as Record<string, unknown>;
    const run = ((result as Record<string, unknown>).run || {}) as Record<string, unknown>;
    const agentId = (typeof agent.id === "string" && agent.id)
      || (typeof (result as Record<string, unknown>).id === "string" && (result as Record<string, unknown>).id as string)
      || null;
    const url =
      (typeof agent.url === "string" && agent.url) ||
      (typeof (result as Record<string, unknown>).url === "string" && (result as Record<string, unknown>).url as string) ||
      agentUrl(agentId);

    return jsonResponse({
      ok: true,
      agentId,
      runId: (typeof run.id === "string" && run.id) || (typeof agent.latestRunId === "string" && agent.latestRunId) || null,
      status: (typeof agent.status === "string" && agent.status) || (typeof (result as Record<string, unknown>).status === "string" && (result as Record<string, unknown>).status as string) || null,
      url,
      name: (typeof agent.name === "string" && agent.name) || name,
      repoUrl,
      startingRef,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Cursor agent request failed." }, 500);
  }
});
