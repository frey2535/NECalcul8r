import { requireSupabase } from "./supabaseClient";

async function extractFunctionError(error) {
  const fallback = error?.message || "Edge function request failed.";
  try {
    const context = error?.context;
    if (!context) return fallback;
    if (typeof context.json === "function") {
      const body = await context.json();
      if (typeof body?.error === "string" && body.error) return body.error;
      if (typeof body?.message === "string" && body.message) return body.message;
      if (body?.error?.message) return String(body.error.message);
      if (body) return `${fallback}: ${JSON.stringify(body)}`;
    }
    if (typeof context.text === "function") {
      const text = await context.text();
      if (text) return `${fallback}: ${text}`;
    }
  } catch {
    // Ignore secondary parse failures and keep the original message.
  }
  return fallback;
}

export async function invokeSupabaseFunction(name, payload = {}) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke(name, { body: payload });
  if (error) {
    const message = await extractFunctionError(error);
    const enriched = new Error(message);
    enriched.cause = error;
    enriched.data = data;
    throw enriched;
  }
  // Some edge functions return { error } with a 2xx status — surface those too.
  if (data && typeof data === "object" && typeof data.error === "string" && data.error) {
    throw new Error(data.error);
  }
  return data;
}
