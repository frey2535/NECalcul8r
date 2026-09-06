import { requireEnv } from "./supabase.ts";

function stripeSecretKey() {
  return requireEnv("STRIPE_SECRET_KEY");
}

export async function stripeRequest<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      body.set(key, String(value));
    }
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed: ${response.status}`);
  }
  return data as T;
}

export async function stripeGet<T>(path: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed: ${response.status}`);
  }
  return data as T;
}

export async function verifyStripeSignature(payload: string, signatureHeader: string | null, endpointSecret: string) {
  if (!signatureHeader) throw new Error("Missing Stripe signature");

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Invalid Stripe signature");

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(endpointSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length || expected !== signature) {
    throw new Error("Stripe signature verification failed");
  }
}
