import {
  assertBrowserEdgeFunctionHeaders,
  buildBrowserEdgeFunctionHeaders,
  edgeFunctionUrl,
} from "./edgeFunctionHeaders";
import { requireSupabase } from "./supabaseClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function notDeployedMessage(functionName) {
  return `${functionName} is not deployed in Supabase yet. Deploy that Edge Function and retry.`;
}

function networkMessage(functionName) {
  return (
    `${functionName} could not be reached (network/CORS). ` +
    "Refresh the page to load the latest billing client, then try again."
  );
}

async function parseFunctionBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function invokeEdgeFunction(functionName, payload = {}) {
  const client = requireSupabase();
  const { data: sessionData } = await client.auth.getSession();
  const headers = assertBrowserEdgeFunctionHeaders(buildBrowserEdgeFunctionHeaders({
    accessToken: sessionData?.session?.access_token,
    anonKey: supabaseAnonKey,
  }));
  const url = edgeFunctionUrl(supabaseUrl, functionName);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
    });
  } catch {
    throw new Error(networkMessage(functionName));
  }

  const body = await parseFunctionBody(response);
  if (!response.ok) {
    if (response.status === 404 || body?.code === "NOT_FOUND" || /not found/i.test(String(body?.message || ""))) {
      throw new Error(notDeployedMessage(functionName));
    }
    throw new Error(body?.error || body?.message || `${functionName} failed.`);
  }
  if (body?.error) throw new Error(body.error);
  return body;
}
