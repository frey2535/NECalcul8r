const DEFAULT_BUILDR_URL = "https://buildrpm.com";

function trim(value) {
  return String(value || "").trim();
}

export async function bootstrapBuildrSso(token) {
  const rawToken = trim(token);
  if (!rawToken) {
    return { valid: false, error: "token_required" };
  }

  const baseUrl = trim(import.meta.env.VITE_BUILDR_URL || DEFAULT_BUILDR_URL).replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}/functions/bootstrapFamilyAppSSO`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken, audience: "necalcul8r" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.valid !== true) {
      return {
        valid: false,
        error: data?.error || "bootstrap_failed",
        message: data?.message || "Buildr could not open NECalcul8r.",
      };
    }
    return data;
  } catch (error) {
    return {
      valid: false,
      error: "buildr_unavailable",
      message: error?.message || "Buildr is unavailable.",
    };
  }
}

export function saveBuildrCompanyBinding({ companyId, companyName, email }) {
  try {
    localStorage.setItem("necalcul8r.buildrCompanyId", trim(companyId));
    localStorage.setItem("necalcul8r.buildrCompanyName", trim(companyName));
    localStorage.setItem("necalcul8r.buildrEmail", trim(email).toLowerCase());
  } catch {
    // Storage can be unavailable in private browsing; SSO session still works.
  }
}
