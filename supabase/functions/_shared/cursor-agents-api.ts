export function basicAuthHeader(apiKey: string) {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

export function agentUrl(agentId: string | null | undefined) {
  if (!agentId) return null;
  return `https://cursor.com/agents/${agentId}`;
}

async function cursorFetch(apiKey: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", basicAuthHeader(apiKey));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`https://api.cursor.com${path}`, { ...init, headers });
  const result = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const details = result as Record<string, unknown>;
    const detailMessage =
      (typeof details.error === "string" && details.error) ||
      (typeof details.message === "string" && details.message) ||
      (typeof (details.error as { message?: string } | undefined)?.message === "string"
        ? (details.error as { message: string }).message
        : null) ||
      `Cursor API request failed (${response.status}).`;
    const error = new Error(detailMessage);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = result;
    throw error;
  }
  return result as Record<string, unknown>;
}

function normalizeAgent(payload: Record<string, unknown>) {
  const agent = ((payload.agent || payload) as Record<string, unknown>);
  const agentId = (typeof agent.id === "string" && agent.id) || null;
  return {
    agentId,
    name: (typeof agent.name === "string" && agent.name) || null,
    status: (typeof agent.status === "string" && agent.status) || null,
    latestRunId: (typeof agent.latestRunId === "string" && agent.latestRunId) || null,
    url: (typeof agent.url === "string" && agent.url) || agentUrl(agentId),
    raw: agent,
  };
}

function normalizeRun(payload: Record<string, unknown>) {
  const run = ((payload.run || payload) as Record<string, unknown>);
  const git = (run.git || {}) as Record<string, unknown>;
  const branches = Array.isArray(git.branches) ? git.branches : [];
  return {
    runId: (typeof run.id === "string" && run.id) || null,
    agentId: (typeof run.agentId === "string" && run.agentId) || null,
    status: (typeof run.status === "string" && run.status) || null,
    result: (typeof run.result === "string" && run.result) || null,
    durationMs: typeof run.durationMs === "number" ? run.durationMs : null,
    git: {
      branches: branches.map((item) => {
        const branch = (item || {}) as Record<string, unknown>;
        return {
          repoUrl: typeof branch.repoUrl === "string" ? branch.repoUrl : null,
          branch: typeof branch.branch === "string" ? branch.branch : null,
          prUrl: typeof branch.prUrl === "string" ? branch.prUrl : null,
        };
      }),
    },
    createdAt: typeof run.createdAt === "string" ? run.createdAt : null,
    updatedAt: typeof run.updatedAt === "string" ? run.updatedAt : null,
    raw: run,
  };
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

  const result = await cursorFetch(options.apiKey, "/v1/agents", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
  const agent = normalizeAgent(result);
  const run = normalizeRun(result);
  return {
    ...agent,
    runId: run.runId || agent.latestRunId,
    run,
    raw: result,
  };
}

export async function getCursorAgent(apiKey: string, agentId: string) {
  const result = await cursorFetch(apiKey, `/v1/agents/${encodeURIComponent(agentId)}`);
  return normalizeAgent(result);
}

export async function getCursorRun(apiKey: string, agentId: string, runId: string) {
  const result = await cursorFetch(
    apiKey,
    `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
  );
  return normalizeRun(result);
}

export async function listCursorRuns(apiKey: string, agentId: string, limit = 20) {
  const result = await cursorFetch(
    apiKey,
    `/v1/agents/${encodeURIComponent(agentId)}/runs?limit=${Math.min(100, Math.max(1, limit))}`,
  );
  const items = Array.isArray(result.items) ? result.items : [];
  return items.map((item) => normalizeRun({ run: item as Record<string, unknown> }));
}

export async function createCursorFollowUpRun(options: {
  apiKey: string;
  agentId: string;
  promptText: string;
}) {
  const result = await cursorFetch(
    options.apiKey,
    `/v1/agents/${encodeURIComponent(options.agentId)}/runs`,
    {
      method: "POST",
      body: JSON.stringify({
        prompt: { text: options.promptText },
        mode: "agent",
      }),
    },
  );
  return normalizeRun(result);
}

export async function getCursorAgentSession(apiKey: string, agentId: string, runId?: string | null) {
  const agent = await getCursorAgent(apiKey, agentId);
  const effectiveRunId = runId || agent.latestRunId;
  const run = effectiveRunId ? await getCursorRun(apiKey, agentId, effectiveRunId) : null;
  const runs = await listCursorRuns(apiKey, agentId, 12);
  return { agent, run, runs };
}
