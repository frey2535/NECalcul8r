export function basicAuthHeader(apiKey: string) {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

export function agentUrl(agentId: string | null | undefined) {
  if (!agentId) return null;
  return `https://cursor.com/agents/${agentId}`;
}

export async function createCursorCloudAgent(options: {
  apiKey: string;
  promptText: string;
  name: string;
  repoUrl: string;
  startingRef: string;
  modelId?: string | null;
  autoCreatePR?: boolean;
}) {
  const requestBody: Record<string, unknown> = {
    prompt: { text: options.promptText },
    name: options.name,
    repos: [{ url: options.repoUrl, startingRef: options.startingRef }],
    autoCreatePR: options.autoCreatePR !== false,
    workOnCurrentBranch: false,
    mode: "agent",
  };
  if (options.modelId) requestBody.model = { id: options.modelId };

  const response = await fetch("https://api.cursor.com/v1/agents", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(options.apiKey),
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
    const error = new Error(detailMessage);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = result;
    throw error;
  }

  const agent = ((result as Record<string, unknown>).agent || result) as Record<string, unknown>;
  const run = ((result as Record<string, unknown>).run || {}) as Record<string, unknown>;
  const agentId = (typeof agent.id === "string" && agent.id)
    || (typeof (result as Record<string, unknown>).id === "string" && (result as Record<string, unknown>).id as string)
    || null;
  const url =
    (typeof agent.url === "string" && agent.url) ||
    (typeof (result as Record<string, unknown>).url === "string" && (result as Record<string, unknown>).url as string)
    || agentUrl(agentId);

  return {
    agentId,
    runId: (typeof run.id === "string" && run.id) || (typeof agent.latestRunId === "string" && agent.latestRunId) || null,
    status: (typeof agent.status === "string" && agent.status)
      || (typeof (result as Record<string, unknown>).status === "string" && (result as Record<string, unknown>).status as string)
      || null,
    url,
    name: (typeof agent.name === "string" && agent.name) || options.name,
    raw: result,
  };
}
