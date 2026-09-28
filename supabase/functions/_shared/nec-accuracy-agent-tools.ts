/** GitHub-backed tools for the in-app Cursor agent (no Cloud Agents billing). */

export type AgentToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentToolResult = {
  tool_call_id: string;
  name: string;
  content: string;
};

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

export function resolveRepoSlug() {
  const fromEnv = optionalEnv("GITHUB_REPO") || optionalEnv("CURSOR_REPO_URL") || "https://github.com/frey2535/NECalcul8r";
  const match = fromEnv.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (match) return `${match[1]}/${match[2]}`;
  if (/^[^/]+\/[^/]+$/.test(fromEnv)) return fromEnv;
  return "frey2535/NECalcul8r";
}

function defaultBranch() {
  return optionalEnv("CURSOR_DEFAULT_BRANCH") || optionalEnv("GITHUB_DEFAULT_BRANCH") || "main";
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "NECalcul8r-InApp-Cursor-Agent",
  };
  const token = optionalEnv("GITHUB_TOKEN") || optionalEnv("GH_TOKEN");
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, hasWriteToken: Boolean(token) };
}

async function githubFetch(path: string) {
  const { headers } = githubHeaders();
  const response = await fetch(`https://api.github.com${path}`, { headers });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    const detail =
      typeof json === "object" && json && "message" in json
        ? String((json as { message?: string }).message)
        : text.slice(0, 400);
    throw new Error(`GitHub API ${response.status}: ${detail}`);
  }
  return json;
}

function normalizePath(path: string) {
  return String(path || "")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .trim();
}

async function listDir(path: string) {
  const repo = resolveRepoSlug();
  const branch = defaultBranch();
  const clean = normalizePath(path) || "";
  const apiPath = clean
    ? `/repos/${repo}/contents/${clean.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`
    : `/repos/${repo}/contents?ref=${encodeURIComponent(branch)}`;
  const data = await githubFetch(apiPath);
  if (!Array.isArray(data)) {
    const item = data as { type?: string; path?: string; size?: number };
    return JSON.stringify(item, null, 2);
  }
  const listing = data.map((item: { type?: string; path?: string; name?: string; size?: number }) => ({
    type: item.type,
    path: item.path,
    name: item.name,
    size: item.size,
  }));
  return JSON.stringify(listing, null, 2);
}

async function readFile(path: string) {
  const repo = resolveRepoSlug();
  const branch = defaultBranch();
  const clean = normalizePath(path);
  if (!clean) throw new Error("path is required");
  const apiPath = `/repos/${repo}/contents/${clean.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`;
  const data = await githubFetch(apiPath) as {
    type?: string;
    encoding?: string;
    content?: string;
    size?: number;
    path?: string;
    download_url?: string;
  };
  if (data.type !== "file") throw new Error(`Not a file: ${clean}`);
  if (data.encoding === "base64" && data.content) {
    const decoded = atob(data.content.replace(/\n/g, ""));
    const max = 120_000;
    return decoded.length > max
      ? `${decoded.slice(0, max)}\n\n…[truncated ${decoded.length - max} chars]`
      : decoded;
  }
  if (data.download_url) {
    const response = await fetch(data.download_url);
    const text = await response.text();
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    return text.slice(0, 120_000);
  }
  throw new Error(`Could not read ${clean}`);
}

async function searchCode(query: string) {
  const repo = resolveRepoSlug();
  const q = `${query} repo:${repo}`;
  const data = await githubFetch(
    `/search/code?q=${encodeURIComponent(q)}&per_page=12`,
  ) as {
    items?: Array<{ path?: string; html_url?: string; name?: string }>;
    message?: string;
  };
  const items = (data.items || []).map((item) => ({
    path: item.path,
    name: item.name,
    url: item.html_url,
  }));
  return JSON.stringify({ count: items.length, items }, null, 2);
}

async function createOrUpdateFile(options: {
  path: string;
  content: string;
  message: string;
  branch?: string;
}) {
  const { headers, hasWriteToken } = githubHeaders();
  if (!hasWriteToken) {
    return JSON.stringify({
      ok: false,
      error:
        "Write tools need Supabase secret GITHUB_TOKEN (repo contents:write). Read tools still work. Paste the full patch in chat if needed.",
    });
  }
  const repo = resolveRepoSlug();
  const branch = options.branch || defaultBranch();
  const clean = normalizePath(options.path);
  if (!clean) throw new Error("path is required");

  let sha: string | undefined;
  try {
    const existing = await githubFetch(
      `/repos/${repo}/contents/${clean.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
    ) as { sha?: string };
    sha = existing.sha;
  } catch {
    sha = undefined;
  }

  const body = {
    message: options.message || `In-app Cursor agent: update ${clean}`,
    content: btoa(unescape(encodeURIComponent(options.content))),
    branch,
    sha,
  };
  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${clean.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return JSON.stringify({
      ok: false,
      status: response.status,
      error: (payload as { message?: string }).message || "commit failed",
    });
  }
  const content = (payload as { content?: { html_url?: string; path?: string }; commit?: { html_url?: string; sha?: string } });
  return JSON.stringify({
    ok: true,
    path: content.content?.path || clean,
    commitUrl: content.commit?.html_url || null,
    sha: content.commit?.sha || null,
  });
}

export const AGENT_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files and folders in the NECalcul8r GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path relative to repo root. Empty for root." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a text file from the NECalcul8r repository.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root, e.g. src/App.jsx" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description: "Search code in the NECalcul8r repository (GitHub code search).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query, e.g. canUseNecAccuracyAssistant" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Create or update a file on the default branch via GitHub. Requires GITHUB_TOKEN. Use for real code changes like Cursor.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string", description: "Full new file contents" },
          message: { type: "string", description: "Commit message" },
        },
        required: ["path", "content", "message"],
      },
    },
  },
] as const;

export async function executeAgentTool(call: AgentToolCall): Promise<AgentToolResult> {
  try {
    const args = call.arguments || {};
    let content: string;
    switch (call.name) {
      case "list_dir":
        content = await listDir(String(args.path ?? ""));
        break;
      case "read_file":
        content = await readFile(String(args.path ?? ""));
        break;
      case "search_code":
        content = await searchCode(String(args.query ?? ""));
        break;
      case "write_file":
        content = await createOrUpdateFile({
          path: String(args.path ?? ""),
          content: String(args.content ?? ""),
          message: String(args.message ?? ""),
        });
        break;
      default:
        content = JSON.stringify({ error: `Unknown tool: ${call.name}` });
    }
    return { tool_call_id: call.id, name: call.name, content: content.slice(0, 100_000) };
  } catch (error) {
    return {
      tool_call_id: call.id,
      name: call.name,
      content: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

export function parseToolCalls(message: Record<string, unknown>): AgentToolCall[] {
  const raw = message.tool_calls || message.toolCalls;
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;
    const fn = (row.function || {}) as Record<string, unknown>;
    const name = String(fn.name || row.name || "");
    let args: Record<string, unknown> = {};
    const argRaw = fn.arguments ?? row.arguments ?? {};
    if (typeof argRaw === "string") {
      try {
        args = JSON.parse(argRaw || "{}");
      } catch {
        args = { raw: argRaw };
      }
    } else if (argRaw && typeof argRaw === "object") {
      args = argRaw as Record<string, unknown>;
    }
    return {
      id: String(row.id || `call-${index}`),
      name,
      arguments: args,
    };
  }).filter((call) => call.name);
}
