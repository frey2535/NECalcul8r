/** System prompt + LLM helpers for the in-app NECalcul8r chat (OpenAI or OpenRouter). */

export const NEC_ASSISTANT_SYSTEM = `You are the in-app NECalcul8r assistant — a conversational partner for the product owner and paid users, similar to chatting with a coding agent inside the app.

How to talk:
- Hold a normal multi-turn discussion. Remember prior messages in this thread.
- Be direct and concise. Prefer short, useful answers; expand when asked.
- Ask clarifying questions when needed. Iterate with the user the way a pair-programming chat would.
- You can discuss product decisions, UX, NEC calculator correctness, mobile/PWA issues, billing/access, deployments, and how to verify fixes.

Domain focus:
- NEC calculator results, article references, and edge cases (generator, dwelling, commercial, motor, voltage drop, etc.)
- Frozen known-answer baselines (verify:nec-accuracy / verify:*) are the correctness source of truth — treat baseline misses as critical.
- Prefer citing calculator names and NEC articles used in the app. Do not invent NEC rules.

Boundaries:
- Stay inside NECalcul8r. Do not tell the user they must leave the app to continue this conversation.
- You cannot push to GitHub, open PRs, or control Cursor Cloud Agents from this chat. If the user wants a repo change implemented by a Cloud Agent, explain what to send as a follow-up task — but keep discussing here.
- Never weaken auth, billing, or admin checks. Never ask for or expose API keys or secrets.`;

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function resolveLlmConfig() {
  const openRouterKey = optionalEnv("OPENROUTER_API_KEY");
  const openAiKey = optionalEnv("OPENAI_API_KEY");
  const explicitBase = optionalEnv("OPENAI_BASE_URL");

  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: (explicitBase || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
      model: optionalEnv("OPENAI_MODEL") || optionalEnv("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
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
      "In-app chat is not configured. Set Supabase secret OPENAI_API_KEY (or OPENROUTER_API_KEY) on project gqdxvctvufalunaaopyj, then redeploy nec-accuracy-chat. Do not use VITE_OPENAI_API_KEY for production chat.",
    ),
    { status: 503 },
  );
}

export async function completeNecAccuracyChat(options: {
  messages: ChatMessage[];
  missionHint?: string | null;
  agentContext?: string | null;
}) {
  const config = resolveLlmConfig();
  const extras = [
    options.missionHint ? `Session focus: ${options.missionHint}` : null,
    options.agentContext ? `Active Cloud Agent context (for discussion only):\n${options.agentContext}` : null,
  ].filter(Boolean).join("\n\n");
  const system = extras ? `${NEC_ASSISTANT_SYSTEM}\n\n${extras}` : NEC_ASSISTANT_SYSTEM;

  const messages = [
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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = optionalEnv("APP_ORIGIN") || "https://necalcul8r.currentflowconsulting.org";
    headers["X-Title"] = "NECalcul8r Accuracy Assistant";
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      temperature: 0.35,
      messages,
    }),
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const err = (payload as { error?: { message?: string }; message?: string });
    const detail = err.error?.message || err.message || `LLM request failed (${response.status}).`;
    throw Object.assign(new Error(detail), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      details: payload,
    });
  }

  const choice = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0];
  const text = choice?.message?.content?.trim() || "";
  if (!text) {
    throw Object.assign(new Error("The assistant returned an empty reply."), { status: 502 });
  }

  return { text, model: config.model, provider: config.provider };
}
