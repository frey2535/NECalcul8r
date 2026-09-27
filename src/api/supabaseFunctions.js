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
 * NOT_FOUND. Probe with a plain GET (no Access-Control-Request-Headers) so
 * the 404 body stays readable under ACAO *.
 */
export async function probeEdgeFunctionDeployed(name) {
  if (!SUPABASE_URL || typeof fetch !== "function") return null;
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${name}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status === 404) return false;
    const body = await response.json().catch(() => null);
    if (body?.code === "NOT_FOUND") return false;
    // Deployed functions reject GET with 405/401/etc — anything but gateway NOT_FOUND counts as present.
    if (response.status !== 404) return true;
    return null;
  } catch {
    return null;
  }
}

function notDeployedMessage(name) {
  return (
    `${name} is not deployed in Supabase (gateway 404). ` +
    `Deploy with: supabase functions deploy ${name} --project-ref gqdxvctvufalunaaopyj`
  );
}

export async function invokeSupabaseFunction(name, payload = {}) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke(name, { body: payload });
  if (error) {
    let message = await extractFunctionError(error);
    if (/failed to send a request to the edge function/i.test(message)) {
      const deployed = await probeEdgeFunctionDeployed(name);
      // Undeployed functions commonly surface as opaque CORS failures; treat
      // unknown probe results the same as confirmed 404 for actionable guidance.
      if (deployed !== true) {
        message = notDeployedMessage(name);
      } else {
        message =
          `${name} could not be reached (network/CORS). ` +
          `Confirm CORS allows authorization, apikey, content-type, and x-client-info.`;
      }
    } else if (/not found/i.test(message) || /NOT_FOUND/.test(message)) {
      message = notDeployedMessage(name);
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
