/** System prompt + OpenAI helpers for the in-app NEC Accuracy Assistant (no Cursor Cloud Agents). */

export const NEC_ASSISTANT_SYSTEM = `You are the NECalcul8r NEC Accuracy Assistant — an in-app expert that stays inside the product.

You help electricians and platform operators with:
- NEC calculator results, article references, and edge cases (generator, dwelling, commercial, motor, voltage drop, etc.)
- Why a result may look wrong and how to verify it against known-answer baselines
- Clear, step-by-step guidance to correct inputs or interpret outputs
- Mobile / WebView UI quirks when they affect calculator use

Rules:
- Stay inside NECalcul8r; never tell the user to open cursor.com or Cloud Agents.
- Do not invent NEC rules. Prefer citing article numbers and calculator names used in the app.
- Calculator correctness is judged against frozen known-answer baselines (verify:nec-accuracy / verify:*). Treat baseline misses as critical.
- Be concise and practical. Prefer actionable next steps over long essays.
- If the user asks you to change production code or open a PR, explain the fix clearly and what to verify; you cannot push to GitHub from this chat.
- Never weaken auth, billing, or admin checks. Never ask for or expose API keys or secrets.
- If information is missing, ask one focused clarifying question.`;

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

export async function completeNecAccuracyChat(options: {
  messages: ChatMessage[];
  missionHint?: string | null;
}) {
  const apiKey = optionalEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw Object.assign(
      new Error(
        "OPENAI_API_KEY is not set on Supabase. Set it once (same key used for blueprint AI) — this assistant does not use Cursor Cloud Agents or Cursor billing.",
      ),
      { status: 503 },
    );
  }

  const model = optionalEnv("OPENAI_MODEL") || "gpt-4o-mini";
  const system = options.missionHint
    ? `${NEC_ASSISTANT_SYSTEM}\n\nFocus for this session: ${options.missionHint}`
    : NEC_ASSISTANT_SYSTEM;

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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
    }),
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const err = (payload as { error?: { message?: string }; message?: string });
    const detail = err.error?.message || err.message || `OpenAI request failed (${response.status}).`;
    throw Object.assign(new Error(detail), { status: response.status >= 400 && response.status < 600 ? response.status : 502, details: payload });
  }

  const choice = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0];
  const text = choice?.message?.content?.trim() || "";
  if (!text) {
    throw Object.assign(new Error("The assistant returned an empty reply."), { status: 502 });
  }

  return { text, model };
}
