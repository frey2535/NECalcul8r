import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const APPLE_PRODUCT_PLANS: Record<string, { planKey: string; calculatorLimit: number | null }> = {
  individual_6_15: { planKey: "individual_6_15", calculatorLimit: 15 },
  individual_16_25: { planKey: "individual_16_25", calculatorLimit: 25 },
  individual_26_35: { planKey: "individual_26_35", calculatorLimit: 35 },
  individual_36_plus: { planKey: "individual_36_plus", calculatorLimit: null },
};

const ACTIVE_APPLE_STATES = new Set([
  "1", // active
  "2", // expired but may still be in paid period via expiresDate
  "3", // billing retry
  "4", // billing grace period
  "5", // revoked — treat inactive unless expires in future (handled below)
]);
void ACTIVE_APPLE_STATES;

function base64Url(input: string | ArrayBuffer | Uint8Array) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalizePrivateKey(raw: string) {
  const trimmed = raw.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN PRIVATE KEY")) return trimmed;
  return `-----BEGIN PRIVATE KEY-----\n${trimmed}\n-----END PRIVATE KEY-----`;
}

function pemToArrayBuffer(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function decodeJwsPayload(jws: string) {
  const parts = String(jws || "").split(".");
  if (parts.length < 2) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(parts[1]));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function decodeMaybeBase64Json(raw: string) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // fall through
  }
  try {
    const decoded = atob(text);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createAppStoreConnectToken() {
  const issuerId = Deno.env.get("APPLE_APP_STORE_CONNECT_ISSUER_ID");
  const keyId = Deno.env.get("APPLE_APP_STORE_CONNECT_KEY_ID");
  const privateKeyRaw = Deno.env.get("APPLE_APP_STORE_CONNECT_PRIVATE_KEY");
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID") || "com.currentflow.necalcul8r";
  if (!issuerId || !keyId || !privateKeyRaw) {
    throw new Error("Missing App Store Connect API credentials.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const claims = {
    iss: issuerId,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
    bid: bundleId,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(normalizePrivateKey(privateKeyRaw)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );
  // WebCrypto returns raw r||s; JWT needs DER... actually for JWT ES256, raw r||s (64 bytes) is correct for JOSE.
  return `${unsigned}.${base64Url(signature)}`;
}

async function appStoreGet(path: string, token: string) {
  const response = await fetch(`https://api.storekit.itunes.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    // Retry sandbox host for TestFlight / sandbox purchases.
    if (response.status === 404 || response.status === 400) {
      const sandbox = await fetch(`https://api.storekit-sandbox.itunes.apple.com${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sandboxText = await sandbox.text();
      let sandboxJson: Record<string, unknown> = {};
      try {
        sandboxJson = sandboxText ? JSON.parse(sandboxText) : {};
      } catch {
        sandboxJson = { raw: sandboxText };
      }
      if (sandbox.ok) return { ...sandboxJson, __environment: "Sandbox" };
      throw new Error(
        `App Store Server API failed: ${sandboxJson.errorMessage || sandboxJson.errorCode || sandbox.status}`,
      );
    }
    throw new Error(`App Store Server API failed: ${json.errorMessage || json.errorCode || response.status}`);
  }
  return { ...json, __environment: "Production" };
}

export async function fetchAppleTransaction(transactionId: string) {
  const token = await createAppStoreConnectToken();
  const payload = await appStoreGet(`/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, token);
  const signed = String(payload.signedTransactionInfo || "");
  const decoded = decodeJwsPayload(signed) || {};
  return {
    environment: String(payload.__environment || decoded.environment || "Production"),
    signedTransactionInfo: signed || null,
    transaction: decoded,
    raw: payload,
  };
}

function msToIso(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n).toISOString();
}

export async function syncApplePurchaseForUser(
  client: ReturnType<typeof createClient>,
  userId: string,
  options: {
    productId: string;
    transactionId?: string | null;
    originalTransactionId?: string | null;
    signedTransaction?: string | null;
  },
) {
  const productId = String(options.productId || "").trim();
  const plan = APPLE_PRODUCT_PLANS[productId];
  if (!plan) throw new Error("Unsupported App Store product ID.");

  const bundleId = Deno.env.get("APPLE_BUNDLE_ID") || "com.currentflow.necalcul8r";
  let transactionId = String(options.transactionId || "").trim();
  let originalTransactionId = String(options.originalTransactionId || "").trim();
  const signedTransaction = String(options.signedTransaction || "").trim();

  let transaction: Record<string, unknown> = {};
  let environment = "Production";
  let rawStatus: Record<string, unknown> = {};

  // Client JWS/JSON is only used to discover transactionId before Server API lookup.
  const jwsPayload = signedTransaction.includes(".")
    ? decodeJwsPayload(signedTransaction)
    : null;
  const jsonPayload = !jwsPayload ? decodeMaybeBase64Json(signedTransaction) : null;
  const clientHint = jwsPayload || jsonPayload || {};

  if (!transactionId) {
    transactionId = String(clientHint.transactionId || clientHint.id || "").trim();
  }
  if (!originalTransactionId) {
    originalTransactionId = String(
      clientHint.originalTransactionId || clientHint.originalID || "",
    ).trim();
  }
  if (!transactionId) throw new Error("Missing App Store transactionId.");

  // Always verify with App Store Server API — never trust client JWS alone.
  const hasServerApi = Boolean(
    Deno.env.get("APPLE_APP_STORE_CONNECT_ISSUER_ID")
      && Deno.env.get("APPLE_APP_STORE_CONNECT_KEY_ID")
      && Deno.env.get("APPLE_APP_STORE_CONNECT_PRIVATE_KEY"),
  );
  if (!hasServerApi) {
    throw new Error("Apple purchase verification is not configured.");
  }
  const fetched = await fetchAppleTransaction(transactionId);
  transaction = fetched.transaction;
  environment = fetched.environment || environment;
  rawStatus = fetched.raw;
  if (!originalTransactionId) {
    originalTransactionId = String(fetched.transaction.originalTransactionId || transactionId);
  }

  const verifiedProductId = String(transaction.productId || transaction.productID || productId);
  if (verifiedProductId !== productId) {
    throw new Error("Purchase product ID did not match selected product.");
  }
  const verifiedBundle = String(transaction.bundleId || transaction.bundleID || bundleId);
  if (verifiedBundle && verifiedBundle !== bundleId) {
    throw new Error("Purchase bundle ID did not match this app.");
  }

  const expiresAt = msToIso(transaction.expiresDate)
    || (typeof transaction.expirationDate === "string" ? transaction.expirationDate : null);
  const startedAt = msToIso(transaction.purchaseDate)
    || (typeof transaction.purchaseDate === "string" ? transaction.purchaseDate : null);
  const revocationDate = msToIso(transaction.revocationDate);
  const stillPaidPeriod = Boolean(expiresAt) && new Date(String(expiresAt)).getTime() > Date.now();
  const revoked = Boolean(revocationDate);
  const active = !revoked && (stillPaidPeriod || !expiresAt);

  const { data: existingPurchase, error: existingPurchaseError } = await client
    .from("apple_app_store_purchases")
    .select("user_id")
    .eq("bundle_id", bundleId)
    .eq("original_transaction_id", originalTransactionId || transactionId)
    .maybeSingle();
  if (existingPurchaseError) throw existingPurchaseError;
  if (existingPurchase?.user_id && existingPurchase.user_id !== userId) {
    throw new Error("This App Store purchase is already linked to another NECalcul8r account. Sign in with that account or contact support.");
  }

  await client.from("apple_app_store_purchases").upsert({
    user_id: userId,
    bundle_id: bundleId,
    product_id: productId,
    transaction_id: transactionId,
    original_transaction_id: originalTransactionId || transactionId,
    environment,
    purchase_state: revoked ? "revoked" : active ? "active" : "expired",
    started_at: startedAt,
    expires_at: expiresAt,
    last_verified_at: new Date().toISOString(),
    raw_status: {
      transaction,
      server: rawStatus,
      signedTransactionPreview: signedTransaction ? `${signedTransaction.slice(0, 24)}…` : null,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "bundle_id,original_transaction_id" });

  await client
    .from("entitlements")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("profile_id", userId)
    .eq("source", "apple_app_store")
    .eq("status", "active");

  if (active) {
    await client.from("entitlements").insert({
      profile_id: userId,
      source: "apple_app_store",
      access_type: "apple_app_store",
      status: "active",
      subscription_status: revoked ? "revoked" : "active",
      seats: 1,
      expires_at: expiresAt,
      metadata: {
        plan_key: plan.planKey,
        calculator_tier_id: plan.planKey,
        calculator_limit: plan.calculatorLimit,
        has_nec_tables: true,
        can_export_complete_reports: true,
        apple_product_id: productId,
        apple_transaction_id: transactionId,
        apple_original_transaction_id: originalTransactionId || transactionId,
        apple_environment: environment,
      },
    });
  }

  await client
    .from("profiles")
    .update({
      access_type: "apple_app_store",
      access_status: active ? "active" : "expired",
      purchase_source: "apple_app_store",
      subscription_status: revoked ? "revoked" : active ? "active" : "expired",
      plan_key: plan.planKey,
      calculator_tier_id: plan.planKey,
      updated_date: new Date().toISOString(),
    })
    .eq("id", userId);

  return {
    ok: true,
    active,
    access_status: active ? "active" : "expired",
    plan_key: plan.planKey,
    product_id: productId,
    transaction_id: transactionId,
    original_transaction_id: originalTransactionId || transactionId,
    expires_at: expiresAt,
    environment,
  };
}
