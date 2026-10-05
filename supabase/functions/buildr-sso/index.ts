import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, serviceClient } from "../_shared/supabase.ts";

type Bootstrap = {
  valid?: boolean;
  error?: string;
  email?: string;
  name?: string;
  company_id?: string;
  company_name?: string;
  role?: string;
};

function buildrApiBases() {
  const configured = String(Deno.env.get("BUILDR_API_URL") || "").trim().replace(/\/$/, "");
  return Array.from(new Set([configured, "https://buildrpm.com"].filter(Boolean)));
}

async function bootstrapFromBuildr(token: string): Promise<Bootstrap> {
  let lastError = "buildr_unavailable";
  for (const base of buildrApiBases()) {
    try {
      const response = await fetch(`${base}/functions/bootstrapFamilyAppSSO`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, audience: "necalcul8r" }),
      });
      const data = (await response.json().catch(() => ({}))) as Bootstrap;
      if (!response.ok) {
        lastError = data.error || `Buildr returned ${response.status}`;
        if (response.status >= 400 && response.status < 500) return { valid: false, error: lastError };
        continue;
      }
      if (!data.valid || !data.email || !data.company_id) {
        return { valid: false, error: data.error || "invalid_bootstrap" };
      }
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "buildr_unavailable";
    }
  }
  return { valid: false, error: lastError };
}

function mapRole(role: string | undefined) {
  const value = String(role || "").trim().toLowerCase();
  return value === "owner" || value === "admin" ? "admin" : "user";
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as { token?: string };
    const token = String(body.token || "").trim();
    if (!token) return jsonResponse({ error: "token_required" }, 400);

    const bootstrap = await bootstrapFromBuildr(token);
    if (!bootstrap.valid) return jsonResponse({ error: bootstrap.error || "bootstrap_failed" }, 403);

    const email = String(bootstrap.email || "").trim().toLowerCase();
    const admin = serviceClient();
    const anon = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) {
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: bootstrap.name || email.split("@")[0],
          buildr_company_id: bootstrap.company_id,
          organization_name: bootstrap.company_name || null,
        },
      });
      if (created.error && !/already|registered|exists/i.test(created.error.message || "")) {
        throw created.error;
      }
      link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error) throw link.error;
    }

    const userId = String(link.data?.user?.id || "").trim();
    const hashedToken = String(link.data?.properties?.hashed_token || "").trim();
    if (!hashedToken) throw new Error("Buildr SSO did not receive a Supabase session token");

    const verified = await anon.auth.verifyOtp({
      token_hash: hashedToken,
      type: "email",
    });
    if (verified.error || !verified.data.session) {
      throw verified.error || new Error("Could not create session");
    }

    if (userId) {
      await admin.from("profiles").upsert({
        id: userId,
        email,
        full_name: bootstrap.name || email.split("@")[0],
        role: mapRole(bootstrap.role),
        buildr_company_id: bootstrap.company_id,
        organization_name: bootstrap.company_name || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }

    return jsonResponse({
      access_token: verified.data.session.access_token,
      refresh_token: verified.data.session.refresh_token,
      email,
      company_id: bootstrap.company_id,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "buildr_sso_failed" }, 500);
  }
});
