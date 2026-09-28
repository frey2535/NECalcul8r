import { completeNecAccuracyChat } from "../_shared/nec-accuracy-chat.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireProfile, serviceClient } from "../_shared/supabase.ts";

const PAID_ACCESS_TYPES = new Set([
  "paid",
  "external_company",
  "company_seat",
  "app_store",
  "google_play",
  "apple_app_store",
  "permanent",
  "buildrpro_included",
]);

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function entitlementActive(row: Record<string, unknown>) {
  if (row.status !== "active") return false;
  if (!row.expires_at) return true;
  return new Date(String(row.expires_at)).getTime() >= Date.now();
}

async function canUseAssistant(client: ReturnType<typeof serviceClient>, profile: Record<string, unknown>) {
  if (profile.is_platform_admin) return true;
  if (profile.access_status === "disabled") return false;
  if (profile.access_type === "permanent" || profile.access_type === "buildrpro_included") return true;
  if (profile.access_status === "active" && PAID_ACCESS_TYPES.has(String(profile.access_type || ""))) {
    return true;
  }

  const filters = [`profile_id.eq.${profile.id}`];
  if (profile.org_id) filters.push(`org_id.eq.${profile.org_id}`);
  const { data: entitlements = [] } = await client
    .from("entitlements")
    .select("status,expires_at,access_type,source,metadata")
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  return (entitlements as Record<string, unknown>[]).some((row) => {
    if (!entitlementActive(row)) return false;
    if (PAID_ACCESS_TYPES.has(String(row.access_type || ""))) return true;
    if (row.source === "owner_grant") return true;
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    const planKey = String(metadata.plan_key || "");
    return Boolean(planKey) && planKey !== "free";
  });
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { client, profile } = await requireProfile(req);
    const allowed = await canUseAssistant(client, profile as Record<string, unknown>);
    if (!allowed) {
      return jsonResponse({
        error: "NEC Accuracy Assistant is included with paid upgrades (or platform admin). Open Purchase to upgrade.",
        upgradeRequired: true,
      }, 403);
    }

    const payload = await req.json().catch(() => ({}));
    const missionHint = optionalString(payload.missionHint) || optionalString(payload.focus);
    const agentContext = optionalString(payload.agentContext);
    const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
    const messages = rawMessages.slice(-30).map((item: Record<string, unknown>) => ({
      role: item.role === "assistant" ? "assistant" as const : "user" as const,
      content: String(item.content || item.text || ""),
    }));

    try {
      const result = await completeNecAccuracyChat({ messages, missionHint, agentContext });
      return jsonResponse({
        ok: true,
        reply: result.text,
        model: result.model,
        provider: result.provider || "openai",
      });
    } catch (error) {
      const err = error as Error & { status?: number; details?: unknown };
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
      return jsonResponse({
        error: err.message || "Assistant request failed.",
        status,
        details: err.details || null,
      }, status);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "NEC Accuracy Assistant failed.";
    const status = /auth|profile/i.test(message) ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
