import { requireSupabase } from "./supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

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
      if (body?.code === "NOT_FOUND") {
        return `${fallback}: function not found (not deployed).`;
      }
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

/**
 * Undeployed Edge Functions return gateway 404 whose CORS allow-list omits
 * content-type, so browsers report "Failed to send a request..." instead of
 * NOT_FOUND. Probe OPTIONS (ACAO *) to detect that case clearly.
 */
export async function probeEdgeFunctionDeployed(name) {
  if (!SUPABASE_URL || typeof fetch !== "function") return null;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${name}`, {
      method: "OPTIONS",
      headers: {
        Origin: typeof window !== "undefined" ? window.location.origin : "https://localhost",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,apikey,content-type,x-client-info",
      },
    });
    if (response.status === 404) return false;
    if (response.ok) return true;
    const body = await response.json().catch(() => null);
    if (body?.code === "NOT_FOUND") return false;
    return null;
  } catch {
    return null;
  }
}

export async function invokeSupabaseFunction(name, payload = {}) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke(name, { body: payload });
  if (error) {
    let message = await extractFunctionError(error);
    if (/failed to send a request to the edge function/i.test(message)) {
      const deployed = await probeEdgeFunctionDeployed(name);
      if (deployed === false) {
        message =
          `${name} is not deployed in Supabase (gateway 404). ` +
          `Deploy with: supabase functions deploy ${name} --project-ref gqdxvctvufalunaaopyj`;
      } else {
        message =
          `${name} could not be reached (network/CORS). ` +
          `Confirm the function is deployed and CORS allows authorization, apikey, content-type, and x-client-info.`;
      }
    } else if (/not found/i.test(message) || /NOT_FOUND/.test(message)) {
      message =
        `${name} is not deployed in Supabase yet. ` +
        `Deploy with: supabase functions deploy ${name} --project-ref gqdxvctvufalunaaopyj`;
    }
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
