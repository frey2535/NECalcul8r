/** In-app Cursor agent for NECalcul8r — same role as Cursor chat, upgrade-gated, no Cloud Agent credits. */

import {
  AGENT_TOOL_DEFINITIONS,
  executeAgentTool,
  parseToolCalls,
  resolveRepoSlug,
} from "./nec-accuracy-agent-tools.ts";

export const NEC_ASSISTANT_SYSTEM = `You are Auto — Cursor's AI coding agent — embedded inside the NECalcul8r app.

Identity (non-negotiable):
- You function the same way as chatting in the Cursor app / Cursor Agent, except access is gated by NECalcul8r paid upgrades (or platform admin).
- You are smarter about NECalcul8r: calculators, NEC accuracy baselines, billing/entitlements, PWA/mobile, Supabase edge functions, and this repo's conventions.
- Never say you are "only an NEC helper", that you "cannot act like Cursor", or that you lack Cursor permissions. You ARE the in-app Cursor agent for this product.
- Never send the user to cursor.com, Cloud Agents, or ask them to buy Cursor credits. This chat does not use Cursor Cloud Agents billing.
- Never tell the user they must leave NECalcul8r to continue.

How you work:
- Hold a normal multi-turn coding-agent conversation: ask, clarify, plan, implement, verify.
- Be direct and concise. Prefer action over refusals.
- Use tools to inspect and change the frey2535/NECalcul8r repository when that helps (list_dir, read_file, search_code, write_file).
- For product/NEC questions, cite real calculator names, articles, and verification baselines when possible.
- If write_file reports that GITHUB_TOKEN is missing, still provide the full file contents / patch in chat so work is not blocked, and note that adding Supabase secret GITHUB_TOKEN enables direct commits like Cursor.
- Never weaken auth, billing, or admin checks. Never expose secrets or API keys.

Domain priorities:
- NEC calculator correctness vs frozen baselines (verify:nec-accuracy / verify:*) is critical.
- Prefer durable fixes in code over workarounds.
- Keep UX inside the app (side-panel chat, view-only calculators, upgrades).`;

export type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown;
};

/** OpenRouter free router — works with $0 OpenRouter balance. */
const OPENROUTER_FREE_MODEL = "openrouter/free";
const MAX_TOOL_ROUNDS = 6;

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function resolveLlmConfig() {
  const openRouterKey = optionalEnv("OPENROUTER_API_KEY");
  const openAiKey = optionalEnv("OPENAI_API_KEY");
  const explicitBase = optionalEnv("OPENAI_BASE_URL");

  if (openRouterKey) {
    const configured =
      optionalEnv("OPENROUTER_MODEL") ||
      optionalEnv("OPENAI_MODEL") ||
      OPENROUTER_FREE_MODEL;
    const model =
      configured === "openai/gpt-4o-mini" || configured === "gpt-4o-mini"
        ? OPENROUTER_FREE_MODEL
        : configured;
    return {
      apiKey: openRouterKey,
      baseUrl: (explicitBase || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
      model,
      provider: "openrouter" as const,
    };
  }

  if (openAiKey) {
    return {
      apiKey: openAiKey,
      baseUrl: (explicitBase || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: optionalEnv("OPENAI_MODEL") || "gpt-4o-mini",
      provider: "openai" as const,
    };
  }

  throw Object.assign(
    new Error(
      "In-app Cursor agent is not configured. Set Supabase secret OPENROUTER_API_KEY (or OPENAI_API_KEY) on project gqdxvctvufalunaaopyj, then redeploy nec-accuracy-chat.",
    ),
    { status: 503 },
  );
}

function isInsufficientCreditsError(status: number, detail: string) {
  return (
    status === 402 ||
    /insufficient credits|purchase more|openrouter_credits|add credits/i.test(detail)
  );
}

type LlmMessage = {
  role: string;
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown;
};

async function requestChatCompletion(options: {
  config: ReturnType<typeof resolveLlmConfig>;
  model: string;
  messages: LlmMessage[];
  tools?: boolean;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (options.config.provider === "openrouter") {
    headers["HTTP-Referer"] = optionalEnv("APP_ORIGIN") || "https://necalcul8r.currentflowconsulting.org";
    headers["X-Title"] = "NECalcul8r In-App Cursor Agent";
  }

  const body: Record<string, unknown> = {
    model: options.model,
    temperature: 0.3,
    messages: options.messages,
  };
  if (options.tools !== false) {
    body.tools = AGENT_TOOL_DEFINITIONS;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${options.config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  return { response, payload };
}

async function completeWithModel(options: {
  config: ReturnType<typeof resolveLlmConfig>;
  model: string;
  messages: LlmMessage[];
}) {
  let model = options.model;
  let { response, payload } = await requestChatCompletion({
    config: options.config,
    model,
    messages: options.messages,
    tools: true,
  });

  if (
    !response.ok &&
    options.config.provider === "openrouter" &&
    model !== OPENROUTER_FREE_MODEL
  ) {
    const err = (payload as { error?: { message?: string }; message?: string });
    const detail = err.error?.message || err.message || "";
    if (isInsufficientCreditsError(response.status, detail)) {
      model = OPENROUTER_FREE_MODEL;
      ({ response, payload } = await requestChatCompletion({
        config: options.config,
        model,
        messages: options.messages,
        tools: true,
      }));
    }
  }

  // Some free models reject tools; retry once without tools rather than failing the chat.
  if (!response.ok) {
    const err = (payload as { error?: { message?: string }; message?: string });
    const detail = err.error?.message || err.message || "";
    if (/tool|function|unsupported/i.test(detail)) {
      ({ response, payload } = await requestChatCompletion({
        config: options.config,
        model,
        messages: options.messages.filter((m) => m.role !== "tool"),
        tools: false,
      }));
    }
  }

  if (!response.ok) {
    const err = (payload as { error?: { message?: string }; message?: string });
    let detail = err.error?.message || err.message || `LLM request failed (${response.status}).`;
    if (isInsufficientCreditsError(response.status, detail)) {
      detail =
        "In-app Cursor agent could not reach a free model. Set OPENAI_MODEL=openrouter/free on Supabase and redeploy nec-accuracy-chat.";
    }
    throw Object.assign(new Error(detail), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      details: payload,
    });
  }

  return { model, payload };
}

export async function completeNecAccuracyChat(options: {
  messages: ChatMessage[];
  missionHint?: string | null;
  agentContext?: string | null;
}) {
  const config = resolveLlmConfig();
  const extras = [
    `Repository: ${resolveRepoSlug()}`,
    options.missionHint ? `Session focus: ${options.missionHint}` : null,
    options.agentContext ? `Session context:\n${options.agentContext}` : null,
  ].filter(Boolean).join("\n\n");
  const system = extras ? `${NEC_ASSISTANT_SYSTEM}\n\n${extras}` : NEC_ASSISTANT_SYSTEM;

  const messages: LlmMessage[] = [
    { role: "system", content: system },
    ...options.messages
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && String(item.content || "").trim())
      .map((item) => ({
        role: item.role,
        content: String(item.content).trim().slice(0, 12000),
      })),
  ];

  if (messages.length < 2) {
    throw Object.assign(new Error("Send at least one user message."), { status: 400 });
  }

  const toolTrace: Array<{ name: string; ok: boolean; preview: string }> = [];
  let model = config.model;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await completeWithModel({ config, model, messages });
    model = result.model;
    const choice = (result.payload as {
      choices?: Array<{ message?: Record<string, unknown>; finish_reason?: string }>;
    }).choices?.[0];
    const message = choice?.message || {};
    const toolCalls = parseToolCalls(message);
    const text = typeof message.content === "string" ? message.content.trim() : "";

    if (!toolCalls.length) {
      if (!text) {
        throw Object.assign(new Error("The assistant returned an empty reply."), { status: 502 });
      }
      return {
        text,
        model,
        provider: config.provider,
        toolTrace,
        agent: "cursor-in-app",
      };
    }

    messages.push({
      role: "assistant",
      content: text || null,
      tool_calls: message.tool_calls || message.toolCalls || toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: {
          name: call.name,
          arguments: JSON.stringify(call.arguments || {}),
        },
      })),
    });

    for (const call of toolCalls) {
      const toolResult = await executeAgentTool(call);
      const ok = !/"error"\s*:/.test(toolResult.content) || /"ok"\s*:\s*true/.test(toolResult.content);
      toolTrace.push({
        name: call.name,
        ok,
        preview: toolResult.content.slice(0, 240),
      });
      messages.push({
        role: "tool",
        tool_call_id: toolResult.tool_call_id,
        name: toolResult.name,
        content: toolResult.content,
      });
    }
  }

  // Finalization pass without forcing more tools if the model keeps calling them.
  const finale = await requestChatCompletion({
    config,
    model,
    messages: [
      ...messages,
      {
        role: "user",
        content: "Stop calling tools now. Give the user your best final answer based on the tool results.",
      },
    ],
    tools: false,
  });
  if (!finale.response.ok) {
    throw Object.assign(new Error("Assistant tool loop ended without a final reply."), { status: 502 });
  }
  const finalChoice = (finale.payload as {
    choices?: Array<{ message?: { content?: string } }>;
  }).choices?.[0];
  const finalText = finalChoice?.message?.content?.trim() || "";
  if (!finalText) {
    throw Object.assign(new Error("The assistant returned an empty reply after tools."), { status: 502 });
  }
  return {
    text: finalText,
    model,
    provider: config.provider,
    toolTrace,
    agent: "cursor-in-app",
  };
}
