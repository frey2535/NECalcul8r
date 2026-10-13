import { wrapCursorAgentPrompt } from "../_shared/cursor-agent-doctrine.ts";
import { createCursorCloudAgent } from "../_shared/cursor-agents-api.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireEnv, serviceClient } from "../_shared/supabase.ts";

type Finding = {
  id: string;
  severity: "critical" | "warning" | "info";
  area: string;
  title: string;
  detail: string;
};

const CRITICAL_FUNCTIONS = [
  "create-cursor-agent",
  "daily-reliability-scan",
  "create-stripe-checkout",
  "update-stripe-subscription",
  "create-stripe-portal-session",
  "sync-stripe-checkout-session",
  "grant-access",
  "delete-account",
  "activate-license-key",
  "generate-license-key",
  "verify-google-play-purchase",
  "verify-apple-purchase",
  "stripe-webhook",
];

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function projectUrl() {
  return requireEnv("SUPABASE_URL").replace(/\/$/, "");
}

async function probeEdgeFunction(name: string): Promise<Finding | null> {
  try {
    const response = await fetch(`${projectUrl()}/functions/v1/${name}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await response.json().catch(() => null) as { code?: string; message?: string } | null;
    const missing = response.status === 404 || body?.code === "NOT_FOUND";
    if (missing) {
      return {
        id: `edge-missing-${name}`,
        severity: name === "create-cursor-agent" || name.includes("stripe") || name.includes("play")
          ? "critical"
          : "warning",
        area: "edge_functions",
        title: `Edge Function not deployed: ${name}`,
        detail: "Gateway returned NOT_FOUND. Browser calls may surface as Failed to send a request to the Edge Function because 404 CORS omits content-type.",
      };
    }
    return null;
  } catch (error) {
    return {
      id: `edge-probe-error-${name}`,
      severity: "warning",
      area: "edge_functions",
      title: `Could not probe Edge Function: ${name}`,
      detail: error instanceof Error ? error.message : "Probe failed",
    };
  }
}

function dailyScanPrompt(findings: Finding[]) {
  const findingBlock = findings.length
    ? findings.map((finding, index) =>
      `${index + 1}. [${finding.severity}] ${finding.title} — ${finding.detail}`
    ).join("\n")
    : "No automated probe findings. Still perform a full proactive audit.";

  return `Daily top-to-bottom NECalcul8r reliability + NEC accuracy scan.

Goal:
- First priority: NEC calculator correctness against frozen known-answer baselines (npm run verify:nec-accuracy).
- Any failed baseline is a critical defect — fix immediately to match expected values 100%, then re-run until green.
- Also scan admin tools, mobile/PWA, commerce/access, Edge Functions, auth/entitlements.
- Identify and list ALL concrete issues and plausible potential issues.
- Prefer clear, actionable findings with severity and file/path evidence.
- Fix only critical/high-confidence defects in this pass; put remaining items under Suggested follow-ups.

Automated probe / CI findings already detected (verify and expand):
${findingBlock}

Delivery:
- Draft PR summarizing Findings (severity-ordered), Changes made, Validation, Suggested follow-ups.
- Branch pattern cursor/daily-reliability-scan-d22c (or similar cursor/*-d22c).
- Do not weaken auth/billing/admin checks. Do not weaken NEC baselines to force a pass.`;
}

async function authorize(req: Request) {
  const cronSecret = Deno.env.get("RELIABILITY_SCAN_SECRET") || "";
  const provided = req.headers.get("x-reliability-scan-secret")
    || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    || "";
  if (cronSecret && provided && provided === cronSecret) {
    return { mode: "cron" as const };
  }

  // Platform admins may trigger a manual scan with their user JWT.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Authentication required");
  const client = serviceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile?.is_platform_admin) {
    throw new Error("Platform admin access required.");
  }
  return { mode: "manual" as const, profile };
}

async function notifyAdmins(options: {
  client: ReturnType<typeof serviceClient>;
  scanId: string;
  title: string;
  body: string;
  link: string | null;
  severity: "info" | "warning" | "critical";
  findings: Finding[];
}) {
  const { data: admins, error } = await options.client
    .from("profiles")
    .select("id, email, full_name")
    .eq("is_platform_admin", true);
  if (error) throw error;
  const rows = (admins || []).map((admin) => ({
    profile_id: admin.id,
    title: options.title,
    body: options.body,
    link: options.link,
    severity: options.severity,
    category: "reliability_scan",
    scan_id: options.scanId,
  }));
  if (rows.length) {
    const { error: insertError } = await options.client.from("platform_notifications").insert(rows);
    if (insertError) throw insertError;
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RELIABILITY_NOTIFY_FROM") || "NECalcul8r <onboarding@resend.dev>";
  const overrideEmail = optionalString(Deno.env.get("PLATFORM_OWNER_NOTIFY_EMAIL"));
  const recipients = overrideEmail
    ? [overrideEmail]
    : (admins || []).map((admin) => admin.email).filter(Boolean);

  if (resendKey && recipients.length) {
    const findingsHtml = options.findings.length
      ? `<ol>${options.findings.map((finding) =>
        `<li><strong>[${finding.severity}]</strong> ${finding.title}<br/><span>${finding.detail}</span></li>`
      ).join("")}</ol>`
      : "<p>No automated probe findings. Deep Cursor scan will expand the list.</p>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: options.title,
        html: `<p>${options.body}</p>${findingsHtml}${
          options.link ? `<p><a href="${options.link}">Open details</a></p>` : ""
        }`,
      }),
    }).catch(() => null);
  }

  return { adminCount: rows.length, emailed: Boolean(resendKey && recipients.length) };
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const auth = await authorize(req);
    const payload = await req.json().catch(() => ({}));
    const source = optionalString(payload.source)
      || (auth.mode === "manual" ? "manual" : "daily_cron");
    const startAgent = payload.startAgent === true;
    const client = serviceClient();

    const findings: Finding[] = [];
    for (const name of CRITICAL_FUNCTIONS) {
      const finding = await probeEdgeFunction(name);
      if (finding) findings.push(finding);
    }

    // Allow CI to pass extra findings (lint/test failures, etc.)
    if (Array.isArray(payload.findings)) {
      for (const raw of payload.findings) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        const title = optionalString(item.title);
        if (!title) continue;
        findings.push({
          id: optionalString(item.id) || `ci-${findings.length + 1}`,
          severity: item.severity === "critical" || item.severity === "warning" || item.severity === "info"
            ? item.severity
            : "warning",
          area: optionalString(item.area) || "ci",
          title,
          detail: optionalString(item.detail) || "",
        });
      }
    }

    const { data: scan, error: scanError } = await client
      .from("reliability_scans")
      .insert({
        source,
        status: "running",
        summary: `Automated probe found ${findings.length} issue(s).`,
        findings,
        metadata: { authMode: auth.mode },
      })
      .select("*")
      .single();
    if (scanError || !scan) throw scanError || new Error("Failed to create reliability scan");

    let agent: Awaited<ReturnType<typeof createCursorCloudAgent>> | null = null;
    let agentError: string | null = null;
    if (startAgent) {
      try {
        const apiKey = requireEnv("CURSOR_API_KEY");
        const repoUrl = requireEnv("CURSOR_REPO_URL");
        const startingRef = Deno.env.get("CURSOR_DEFAULT_BRANCH") || "main";
        const promptText = wrapCursorAgentPrompt(
          "nec_accuracy_guardian",
          dailyScanPrompt(findings),
        );
        agent = await createCursorCloudAgent({
          apiKey,
          promptText,
          name: `NEC accuracy + daily scan ${new Date().toISOString().slice(0, 10)}`,
          repoUrl,
          startingRef,
          autoCreatePR: true,
        });
      } catch (error) {
        agentError = error instanceof Error ? error.message : "Cursor agent failed to start";
      }
    }

    const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
    const severity = criticalCount > 0 ? "critical" : findings.length > 0 ? "warning" : "info";
    const appOrigin = optionalString(Deno.env.get("APP_ORIGIN")) || "https://frey2535.github.io/NECalcul8r";
    const link = agent?.url
      || `${appOrigin.replace(/\/$/, "")}/accuracy-assistant`;
    const title = criticalCount > 0
      ? `Daily scan: ${criticalCount} critical issue(s) found`
      : findings.length > 0
        ? `Daily scan: ${findings.length} potential issue(s) found`
        : "Daily scan completed — no automated probe issues";
    const body = [
      `Source: ${source}.`,
      `Automated findings: ${findings.length}.`,
      agent?.url ? `Optional Cloud Agent started: ${agent.url}` : null,
      agentError ? `Optional Cloud Agent could not start: ${agentError}` : null,
      "Open the in-app Assistant to discuss findings (no Cursor credits required).",
    ].filter(Boolean).join(" ");

    await client
      .from("reliability_scans")
      .update({
        status: agentError && startAgent ? "failed" : "completed",
        summary: body,
        agent_id: agent?.agentId || null,
        agent_url: agent?.url || null,
        agent_name: agent?.name || null,
        metadata: {
          authMode: auth.mode,
          agentError,
          criticalCount,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", scan.id);

    const notify = await notifyAdmins({
      client,
      scanId: scan.id,
      title,
      body,
      link,
      severity,
      findings,
    });

    return jsonResponse({
      ok: true,
      scanId: scan.id,
      findings,
      findingCount: findings.length,
      criticalCount,
      agent,
      agentError,
      notify,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily reliability scan failed.";
    const status = /auth|admin/i.test(message) ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
