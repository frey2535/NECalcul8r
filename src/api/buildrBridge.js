export const DEFAULT_BUILDR_PRODUCTION_URL = "https://buildrpm.com";

function trimUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function buildrApiUrl() {
  return trimUrl(
    import.meta.env.VITE_BUILDR_API_URL ||
      import.meta.env.VITE_BUILDR_URL ||
      (import.meta.env.PROD ? DEFAULT_BUILDR_PRODUCTION_URL : ""),
  );
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function verifyBuildrFamilyAppSso(token, audience = "necalcul8r") {
  const api = buildrApiUrl();
  if (!api) return { valid: false, error: "buildr_not_configured" };
  if (!token) return { valid: false, error: "token_required" };
  try {
    const response = await fetch(`${api}/functions/verifyFamilyAppSSOToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, audience }),
    });
    const data = await readJson(response);
    if (!response.ok) return { valid: false, error: data.error || "verify_failed", ...data };
    return data;
  } catch (error) {
    return { valid: false, error: "buildr_unavailable", message: error?.message };
  }
}

export async function bootstrapBuildrFamilyAppSso(token, audience = "necalcul8r") {
  const api = buildrApiUrl();
  if (!api) return { valid: false, error: "buildr_not_configured" };
  if (!token) return { valid: false, error: "token_required" };
  try {
    const response = await fetch(`${api}/functions/bootstrapFamilyAppSSO`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, audience }),
    });
    const data = await readJson(response);
    if (!response.ok) return { valid: false, error: data.error || "bootstrap_failed", ...data };
    return data;
  } catch (error) {
    return { valid: false, error: "buildr_unavailable", message: error?.message };
  }
}

export async function verifyBuildrPassword({ email, password, companyId, productKey = "necalcul8r" }) {
  const api = buildrApiUrl();
  if (!api) return { valid: false, error: "buildr_not_configured" };
  try {
    const response = await fetch(`${api}/functions/verifyBuildrPassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        company_id: companyId || undefined,
        product_key: productKey,
      }),
    });
    const data = await readJson(response);
    if (!response.ok) return { valid: false, error: data.error || "verify_failed", ...data };
    return data;
  } catch (error) {
    return { valid: false, error: "buildr_unavailable", message: error?.message };
  }
}
