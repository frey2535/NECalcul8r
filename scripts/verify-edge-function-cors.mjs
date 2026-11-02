import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertBrowserEdgeFunctionHeaders,
  buildBrowserEdgeFunctionHeaders,
  DEPLOYED_EDGE_FUNCTION_ALLOWED_HEADERS,
  edgeFunctionUrl,
} from "../src/api/edgeFunctionHeaders.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const headers = buildBrowserEdgeFunctionHeaders({
  accessToken: "test-user-jwt",
  anonKey: "test-anon-key",
});
assertBrowserEdgeFunctionHeaders(headers);

const headerNames = Object.keys(headers).map((name) => name.toLowerCase());
assert(headerNames.includes("authorization"), "browser invoke must send Authorization");
assert(headerNames.includes("apikey"), "browser invoke must send apikey");
assert(headerNames.includes("content-type"), "browser invoke must send Content-Type");
assert(!headerNames.includes("x-supabase-api-version"), "browser invoke must omit x-supabase-api-version");
assert(!headerNames.includes("x-necalcul8r-client-platform"), "browser invoke must omit custom platform header");
assert(
  headerNames.every((name) => DEPLOYED_EDGE_FUNCTION_ALLOWED_HEADERS.includes(name)),
  "browser invoke headers must stay inside the deployed CORS allow-list"
);
assert(
  edgeFunctionUrl("https://example.supabase.co/", "create-stripe-checkout")
    === "https://example.supabase.co/functions/v1/create-stripe-checkout",
  "Edge Function URLs should target /functions/v1/:name"
);

const commerce = readFileSync(resolve(root, "src/api/commerce.js"), "utf8");
assert(!commerce.includes("functions.invoke"), "commerce.js must not use supabase-js functions.invoke");
assert(commerce.includes("invokeEdgeFunction"), "commerce.js must use the CORS-safe Edge Function client");
assert(commerce.includes("clientPlatform"), "commerce.js must still send clientPlatform in the JSON body");

const client = readFileSync(resolve(root, "src/api/edgeFunctionClient.js"), "utf8");
assert(client.includes("fetch("), "edgeFunctionClient.js must use fetch instead of supabase-js invoke");
assert(!client.includes("x-supabase-api-version"), "edgeFunctionClient.js must not send x-supabase-api-version");

const cors = readFileSync(resolve(root, "supabase/functions/_shared/cors.ts"), "utf8");
assert(cors.includes("x-supabase-api-version"), "shared CORS should allow x-supabase-api-version after function redeploy");
assert(cors.includes("authorization"), "shared CORS must allow authorization");
assert(cors.includes("content-type"), "shared CORS must allow content-type");

console.log("edge-function-cors: browser checkout headers stay inside the deployed allow-list");
