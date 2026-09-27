import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Bot, ExternalLink, Play, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  buildCursorAgentPrompt,
  CURSOR_FOCUS_AREAS,
  CURSOR_MISSIONS,
  getMission,
} from "@/lib/cursorAgentMissions";
import {
  listPlatformNotifications,
  listReliabilityScans,
  markAllPlatformNotificationsRead,
  markPlatformNotificationRead,
} from "@/api/platformNotifications";
import CursorAgentChat, { buildInitialChatSession } from "@/components/admin/CursorAgentChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

function toggleId(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function agentIdFromLink(link) {
  if (!link || typeof link !== "string") return null;
  const match = link.match(/cursor\.com\/agents\/([A-Za-z0-9_-]+)/i);
  return match?.[1] || null;
}

function cursorAgentErrorHint(error) {
  const message = String(error || "");
  if (/hard limit|increase your hard limit|\$2 remaining|billing|usage limit|spend limit/i.test(message)) {
    return "This is a Cursor account billing limit, not a Supabase deploy problem. Open https://www.cursor.com/dashboard?tab=settings and raise your hard limit (Cloud Agents need at least $2 remaining), then retry.";
  }
  if (/not deployed|gateway 404|could not be reached|failed to send/i.test(message)) {
    return "Deploy create-cursor-agent, cursor-agent-session, and daily-reliability-scan (add GitHub secret SUPABASE_ACCESS_TOKEN and re-run the deploy workflow, or deploy locally). Set CURSOR_API_KEY / CURSOR_REPO_URL / RELIABILITY_SCAN_SECRET, and apply supabase/fixes/add-reliability-scans.sql.";
  }
  if (/unauthorized|forbidden|api key|invalid key|cloud agents access/i.test(message)) {
    return "Confirm Supabase secrets CURSOR_API_KEY and CURSOR_REPO_URL. The API key needs Cloud Agents access for https://github.com/frey2535/NECalcul8r.";
  }
  return "If this keeps failing, check Cursor dashboard billing/limits and Supabase secrets CURSOR_API_KEY / CURSOR_REPO_URL.";
}

const DEFAULT_MISSION = "nec_accuracy_guardian";
const DEFAULT_FOCUS = ["generator", "dwelling", "commercial"];

export default function CursorAgent() {
  const { user } = useAuth();
  const [missionId, setMissionId] = useState(DEFAULT_MISSION);
  const [focusIds, setFocusIds] = useState(DEFAULT_FOCUS);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(getMission(DEFAULT_MISSION).defaultName);
  const [startingRef, setStartingRef] = useState("main");
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState(() =>
    buildCursorAgentPrompt({
      missionId: DEFAULT_MISSION,
      focusIds: DEFAULT_FOCUS,
      notes: "",
    })
  );
  const [promptTouched, setPromptTouched] = useState(false);
  const [autoCreatePR, setAutoCreatePR] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const [error, setError] = useState("");
  const [scans, setScans] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const mission = useMemo(() => getMission(missionId), [missionId]);

  useEffect(() => {
    if (promptTouched) return;
    setPrompt(buildCursorAgentPrompt({ missionId, focusIds, notes }));
  }, [missionId, focusIds, notes, promptTouched]);

  const refreshOwnerFeed = useCallback(async () => {
    if (!user?.is_platform_admin) return;
    try {
      const [nextScans, nextNotifications] = await Promise.all([
        listReliabilityScans(8),
        listPlatformNotifications(12),
      ]);
      setScans(nextScans);
      setNotifications(nextNotifications);
    } catch {
      // Tables may not exist until SQL fix is applied; keep the launcher usable.
      setScans([]);
      setNotifications([]);
    }
  }, [user?.is_platform_admin]);

  useEffect(() => {
    refreshOwnerFeed();
  }, [refreshOwnerFeed]);

  const applyMission = (nextMissionId) => {
    const next = getMission(nextMissionId);
    setMissionId(next.id);
    setAutoCreatePR(next.defaultAutoCreatePR);
    if (!name.trim() || CURSOR_MISSIONS.some((item) => item.defaultName === name)) {
      setName(next.defaultName);
    }
    setPromptTouched(false);
  };

  const regeneratePrompt = () => {
    setPromptTouched(false);
    setPrompt(buildCursorAgentPrompt({ missionId, focusIds, notes }));
  };

  const openAgentInApp = useCallback((options = {}) => {
    const agentId = options.agentId || agentIdFromLink(options.url);
    if (!agentId) return false;
    setChatSession(buildInitialChatSession({
      agentId,
      runId: options.runId || null,
      name: options.name || "Cloud Agent",
      url: options.url || `https://cursor.com/agents/${agentId}`,
      prompt: options.prompt || null,
      status: options.status || "ACTIVE",
    }));
    window.requestAnimationFrame(() => {
      document.getElementById("cursor-in-app-session")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return true;
  }, []);

  const createAgent = async () => {
    setError("");
    setResult(null);
    if (!user?.is_platform_admin) {
      setError("Platform admin access is required to start Cursor agents.");
      return;
    }
    if (!prompt.trim()) {
      setError("Enter a task for Cursor first.");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke("create-cursor-agent", {
        name: name.trim() || mission.defaultName,
        startingRef: startingRef.trim() || "main",
        modelId: modelId.trim() || undefined,
        prompt: prompt.trim(),
        missionId,
        focusIds,
        autoCreatePR,
      });
      const payload = response?.data || response || {};
      const agentId = payload.agentId || payload.id || null;
      const url = payload.url || (agentId ? `https://cursor.com/agents/${agentId}` : null);
      const normalized = { ...payload, agentId, url };
      setResult(normalized);
      openAgentInApp({
        agentId,
        runId: payload.runId || null,
        name: payload.name || name.trim() || mission.defaultName,
        url,
        prompt: prompt.trim(),
        status: payload.status || "ACTIVE",
      });
      toast({
        title: "NEC Accuracy Guardian started",
        description: "Stay in the app — status and follow-ups appear in the session panel.",
      });
      // Do not navigate away to cursor.com; conversation stays in-app.
    } catch (nextError) {
      setError(nextError?.message || "Could not start Cursor agent.");
    } finally {
      setLoading(false);
    }
  };

  const runDailyScanNow = async () => {
    setError("");
    if (!user?.is_platform_admin) {
      setError("Platform admin access is required to run the daily scan.");
      return;
    }
    setScanLoading(true);
    try {
      const response = await base44.functions.invoke("daily-reliability-scan", {
        source: "manual",
        startAgent: true,
      });
      const payload = response?.data || response || {};
      if (payload.agent?.agentId || payload.agent?.url) {
        openAgentInApp({
          agentId: payload.agent.agentId || payload.agentId,
          runId: payload.agent.runId || null,
          name: payload.agent.name || "Daily reliability scan",
          url: payload.agent.url,
          prompt: "Daily NEC reliability scan",
          status: payload.agent.status || "ACTIVE",
        });
      }
      toast({
        title: "Daily NEC scan started",
        description: payload.agent?.agentId
          ? "Scan agent is running in the in-app session panel."
          : `Probe findings: ${payload.findingCount ?? 0}.`,
      });
      await refreshOwnerFeed();
    } catch (nextError) {
      setError(nextError?.message || "Could not run daily reliability scan.");
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/40">
            <Bot className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Platform owner</p>
            <h1 className="text-2xl font-black text-foreground">NEC Accuracy Guardian</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Start and chat with a Cursor Cloud Agent <span className="font-semibold text-foreground">inside NECalcul8r</span>.
              The guardian treats frozen NEC known-answer baselines as the source of truth, reports misses immediately,
              and lets you send follow-ups without leaving the app. Your Cursor API key stays server-side in Supabase.
            </p>
          </div>
        </div>
      </div>

      <div id="daily-scans" className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Daily scan + owner alerts</p>
            <h2 className="text-lg font-black text-foreground">Top-to-bottom reliability pass</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              GitHub runs this once per day (14:00 UTC): NEC accuracy guardian + lint/typecheck, then notifies
              platform admins and launches a correction agent when issues are found.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={refreshOwnerFeed}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={scanLoading || !user?.is_platform_admin}
              onClick={runDailyScanNow}
            >
              <Bell className="h-3.5 w-3.5" />
              {scanLoading ? "Scanning..." : "Run scan now"}
            </Button>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notifications</p>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600"
                onClick={async () => {
                  await markAllPlatformNotificationsRead();
                  await refreshOwnerFeed();
                }}
              >
                Mark all read
              </button>
            </div>
            <div className="space-y-2">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left text-sm ${
                    item.read_at ? "border-border bg-background" : "border-amber-300 bg-amber-50"
                  }`}
                  onClick={async () => {
                    if (!item.read_at) await markPlatformNotificationRead(item.id);
                    const openedInApp = openAgentInApp({
                      agentId: item.agent_id || agentIdFromLink(item.link),
                      url: item.link,
                      name: item.title || "Cloud Agent",
                    });
                    if (!openedInApp && item.link && !agentIdFromLink(item.link)) {
                      window.open(item.link, "_blank", "noopener,noreferrer");
                    }
                    await refreshOwnerFeed();
                  }}
                >
                  <p className="font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {scans.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent scans</p>
            {scans.map((scan) => (
              <div key={scan.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-foreground">
                    {scan.source} · {scan.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scan.created_at ? new Date(scan.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{scan.summary}</p>
                {Array.isArray(scan.findings) && scan.findings.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-foreground">
                    {scan.findings.slice(0, 6).map((finding) => (
                      <li key={finding.id || finding.title}>
                        <span className="font-semibold uppercase text-rose-600">[{finding.severity}]</span>{" "}
                        {finding.title}
                      </li>
                    ))}
                  </ul>
                )}
                {(scan.agent_id || scan.agent_url) && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline"
                    onClick={() => openAgentInApp({
                      agentId: scan.agent_id || agentIdFromLink(scan.agent_url),
                      url: scan.agent_url,
                      name: "Daily reliability scan",
                    })}
                  >
                    Open scan agent in-app
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div id="cursor-in-app-session">
        <CursorAgentChat
          initialSession={chatSession}
          onClear={() => {
            setChatSession(null);
            setResult(null);
          }}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mission</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {CURSOR_MISSIONS.map((item) => {
              const active = item.id === missionId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyMission(item.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.short}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Focus areas</label>
          <div className="flex flex-wrap gap-2">
            {CURSOR_FOCUS_AREAS.map((area) => {
              const active = focusIds.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    setFocusIds((current) => toggleId(current, area.id));
                    setPromptTouched(false);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {area.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Context / observed symptoms optional
          </label>
          <Textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setPromptTouched(false);
            }}
            rows={4}
            placeholder="e.g. Generator From Service Size blanks on mobile; dwelling optional heat overcount on 2020 NEC"
            className="text-sm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Agent name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={mission.defaultName}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Starting branch</label>
            <Input
              value={startingRef}
              onChange={(event) => setStartingRef(event.target.value)}
              placeholder="main"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Model ID optional</label>
          <Input
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            placeholder="Leave blank to use your Cursor default"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Task sent to Cursor
            </label>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={regeneratePrompt}>
              <Sparkles className="h-3.5 w-3.5" />
              Rebuild from mission
            </Button>
          </div>
          <Textarea
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setPromptTouched(true);
            }}
            rows={14}
            className="font-mono text-xs"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={autoCreatePR}
            onChange={(event) => setAutoCreatePR(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Ask Cursor to auto-create a PR
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-bold">Cursor agent could not start</p>
              <p className="whitespace-pre-wrap break-words">{error}</p>
              <p className="mt-2 text-xs">{cursorAgentErrorHint(error)}</p>
            </div>
          </div>
        )}

        {result?.agentId && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 space-y-1">
            <p className="font-bold">Cursor agent created in-app</p>
            {result.name && <p className="text-xs">Name: {result.name}</p>}
            <p className="text-xs font-mono">ID: {result.agentId}</p>
            {result.status && <p className="text-xs">Status: {result.status}</p>}
            <p className="text-xs">Use the session panel above for status and follow-ups. Optional: open on Cursor.com if you want the full web UI.</p>
            {result.url && (
              <a
                className="mt-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                href={result.url}
                target="_blank"
                rel="noreferrer"
              >
                Optional: open on Cursor.com <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        <Button onClick={createAgent} disabled={loading || !user?.is_platform_admin} className="gap-2">
          <Play className="h-4 w-4" />
          {loading ? "Starting guardian..." : "Start NEC Accuracy Guardian"}
        </Button>
      </div>
    </div>
  );
}
