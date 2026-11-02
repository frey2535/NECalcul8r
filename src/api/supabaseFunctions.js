import { invokeEdgeFunction } from "./edgeFunctionClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

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
  try {
    return await invokeEdgeFunction(name, payload);
  } catch (error) {
    let message = error?.message || "Edge function request failed.";
    if (/could not be reached \(network\/CORS\)|failed to send a request to the edge function/i.test(message)) {
      const deployed = await probeEdgeFunctionDeployed(name);
      if (deployed !== true) {
        message = notDeployedMessage(name);
      }
    } else if (/not found/i.test(message) || /NOT_FOUND/.test(message)) {
      message = notDeployedMessage(name);
    }
    const enriched = new Error(message);
    enriched.cause = error;
    throw enriched;
  }
}
