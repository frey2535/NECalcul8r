/**
 * Production Edge Functions currently allow only this CORS header set.
 * supabase-js 2.115+ also sends `x-supabase-api-version`, which is not in the
 * deployed allow-list and makes browsers report "Failed to send a request to
 * the Edge Function". Browser callers must stay inside this set.
 */
export const DEPLOYED_EDGE_FUNCTION_ALLOWED_HEADERS = Object.freeze([
  "authorization",
  "apikey",
  "content-type",
  "x-client-info",
  "stripe-signature",
]);

export function edgeFunctionUrl(supabaseUrl, functionName) {
  const name = String(functionName || "").replace(/^\/+/, "");
  if (!name) throw new Error("Edge Function name is required.");
  return `${String(supabaseUrl || "").replace(/\/$/, "")}/functions/v1/${name}`;
}

export function buildBrowserEdgeFunctionHeaders({ accessToken, anonKey } = {}) {
  const key = String(anonKey || "").trim();
  if (!key) throw new Error("Supabase anon key is required.");
  const token = String(accessToken || key).trim() || key;
  return {
    Authorization: `Bearer ${token}`,
    apikey: key,
    "Content-Type": "application/json",
  };
}

export function assertBrowserEdgeFunctionHeaders(headers) {
  const names = Object.keys(headers || {}).map((name) => name.toLowerCase());
  const forbidden = names.filter((name) => !DEPLOYED_EDGE_FUNCTION_ALLOWED_HEADERS.includes(name));
  if (forbidden.length) {
    throw new Error(`Edge Function headers are not CORS-safe: ${forbidden.join(", ")}`);
  }
  return headers;
}
