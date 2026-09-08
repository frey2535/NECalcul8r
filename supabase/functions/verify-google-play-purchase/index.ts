import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, requireUser } from "../_shared/supabase.ts";

const PRODUCT_PLANS: Record<string, { planKey: string; calculatorLimit: number | null }> = {
  individual_6_15: { planKey: "individual_6_15", calculatorLimit: 15 },
  individual_16_25: { planKey: "individual_16_25", calculatorLimit: 25 },
  individual_26_35: { planKey: "individual_26_35", calculatorLimit: 35 },
  individual_36_plus: { planKey: "individual_36_plus", calculatorLimit: null },
};

const ACTIVE_SUBSCRIPTION_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

function serviceAccount() {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS")
    || Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing required environment variable: GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS");
  return JSON.parse(raw);
}

function base64Url(input: string | ArrayBuffer) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function googleAccessToken() {
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(`Google OAuth failed: ${json.error_description || json.error || response.status}`);
  }
  return String(json.access_token);
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

async function fetchSubscriptionStatus(packageName: string, purchaseToken: string, accessToken: string) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Google Play verification failed: ${json.error?.message || response.status}`);
  }
  return json;
}

async function acknowledgeSubscription(packageName: string, productId: string, purchaseToken: string, accessToken: string) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok && response.status !== 409) {
    const json = await response.json().catch(() => ({}));
    throw new Error(`Google Play acknowledgement failed: ${json.error?.message || response.status}`);
  }
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { client, user } = await requireUser(req);
    const payload = await req.json().catch(() => ({}));
    const productId = String(payload.productId || "").trim();
    const purchaseToken = String(payload.purchaseToken || "").trim();
    const expectedBasePlanId = String(payload.basePlanId || Deno.env.get("GOOGLE_PLAY_BASE_PLAN_ID") || "monthly");
    const plan = PRODUCT_PLANS[productId];
    if (!plan) return jsonResponse({ error: "Unsupported Google Play product ID." }, 400);
    if (!purchaseToken) return jsonResponse({ error: "Missing Google Play purchase token." }, 400);

    const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") || requireEnv("GOOGLE_PLAY_PACKAGE_NAME");
    const accessToken = await googleAccessToken();
    const status = await fetchSubscriptionStatus(packageName, purchaseToken, accessToken);
    const lineItem = Array.isArray(status.lineItems) ? status.lineItems[0] || {} : {};
    const verifiedProductId = lineItem.productId || productId;
    const basePlanId = lineItem.offerDetails?.basePlanId || expectedBasePlanId;
    if (verifiedProductId !== productId) return jsonResponse({ error: "Purchase product ID did not match selected product." }, 400);
    if (basePlanId !== expectedBasePlanId) return jsonResponse({ error: "Purchase base plan did not match monthly plan." }, 400);

    const subscriptionState = String(status.subscriptionState || "SUBSCRIPTION_STATE_UNSPECIFIED");
    const acknowledgementState = String(status.acknowledgementState || "");
    const active = ACTIVE_SUBSCRIPTION_STATES.has(subscriptionState);
    const expiresAt = lineItem.expiryTime || null;
    const startedAt = status.startTime || null;

    if (active && acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
      await acknowledgeSubscription(packageName, productId, purchaseToken, accessToken);
    }

    await client.from("google_play_purchases").upsert({
      user_id: user.id,
      package_name: packageName,
      product_id: productId,
      base_plan_id: basePlanId,
      purchase_token: purchaseToken,
      purchase_state: subscriptionState,
      acknowledgement_state: active ? "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED" : acknowledgementState,
      auto_renewing: status.lineItems?.some?.((item: Record<string, unknown>) => Boolean(item.autoRenewingPlan)) || false,
      started_at: startedAt,
      expires_at: expiresAt,
      last_verified_at: new Date().toISOString(),
      raw_status: status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "package_name,purchase_token" });

    await client
      .from("entitlements")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("profile_id", user.id)
      .eq("source", "google_play")
      .eq("status", "active");

    if (active) {
      await client.from("entitlements").insert({
        profile_id: user.id,
        source: "google_play",
        access_type: "google_play",
        status: "active",
        subscription_status: subscriptionState,
        seats: 1,
        expires_at: expiresAt,
        metadata: {
          plan_key: plan.planKey,
          calculator_tier_id: plan.planKey,
          calculator_limit: plan.calculatorLimit,
          has_nec_tables: true,
          can_export_complete_reports: true,
          google_play_product_id: productId,
          google_play_base_plan_id: basePlanId,
        },
      });
    }

    await client
      .from("profiles")
      .update({
        access_type: "google_play",
        access_status: active ? "active" : "expired",
        purchase_source: "google_play",
        subscription_status: subscriptionState,
        updated_date: new Date().toISOString(),
      })
      .eq("id", user.id);

    return jsonResponse({
      ok: true,
      active,
      access_status: active ? "active" : "expired",
      plan_key: plan.planKey,
      product_id: productId,
      base_plan_id: basePlanId,
      expires_at: expiresAt,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Google Play verification failed." }, 500);
  }
});
