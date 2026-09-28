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
- Do not send users to cursor.com or ask them to buy Cursor credits. This chat runs inside NECalcul8r.
- Never weaken auth, billing, or admin checks. Never ask for or expose API keys or secrets.`;

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** OpenRouter free router — works with $0 OpenRouter balance. */
const OPENROUTER_FREE_MODEL = "openrouter/free";

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
    // Paid OpenRouter slugs need account credits. Prefer free router when unset/legacy paid default.
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
      "In-app chat is not configured. Set Supabase secret OPENROUTER_API_KEY (or OPENAI_API_KEY) on project gqdxvctvufalunaaopyj, then redeploy nec-accuracy-chat. Do not use VITE_OPENAI_API_KEY for production chat.",
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

async function requestChatCompletion(options: {
  config: ReturnType<typeof resolveLlmConfig>;
  model: string;
  messages: Array<{ role: string; content: string }>;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (options.config.provider === "openrouter") {
    headers["HTTP-Referer"] = optionalEnv("APP_ORIGIN") || "https://necalcul8r.currentflowconsulting.org";
    headers["X-Title"] = "NECalcul8r Accuracy Assistant";
  }

  const response = await fetch(`${options.config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options.model,
      temperature: 0.35,
      messages: options.messages,
    }),
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  return { response, payload };
}

export async function completeNecAccuracyChat(options: {
  messages: ChatMessage[];
  missionHint?: string | null;
  agentContext?: string | null;
}) {
  const config = resolveLlmConfig();
  const extras = [
    options.missionHint ? `Session focus: ${options.missionHint}` : null,
    options.agentContext ? `Session context:\n${options.agentContext}` : null,
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

  let model = config.model;
  let { response, payload } = await requestChatCompletion({ config, model, messages });

  // Paid OpenRouter models fail with 402 when the account has $0 credits.
  // Retry once on the free router so in-app chat keeps working without Cursor/OpenRouter spend.
  if (
    !response.ok &&
    config.provider === "openrouter" &&
    model !== OPENROUTER_FREE_MODEL
  ) {
    const err = (payload as { error?: { message?: string }; message?: string });
    const detail = err.error?.message || err.message || "";
    if (isInsufficientCreditsError(response.status, detail)) {
      model = OPENROUTER_FREE_MODEL;
      ({ response, payload } = await requestChatCompletion({ config, model, messages }));
    }
  }

  if (!response.ok) {
    const err = (payload as { error?: { message?: string }; message?: string });
    let detail = err.error?.message || err.message || `LLM request failed (${response.status}).`;
    if (isInsufficientCreditsError(response.status, detail)) {
      detail =
        "In-app chat could not reach a free model. Set OPENAI_MODEL=openrouter/free on Supabase and redeploy nec-accuracy-chat.";
    }
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

  return { text, model, provider: config.provider };
}
