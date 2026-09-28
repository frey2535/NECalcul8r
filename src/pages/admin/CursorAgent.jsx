import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Bot, ChevronDown, ExternalLink, Play, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
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
import NecAccuracyChat from "@/components/NecAccuracyChat";
import CursorAgentChat, { buildInitialChatSession } from "@/components/admin/CursorAgentChat";
import { canUseNecAccuracyAssistant } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

function toggleId(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function cursorAgentErrorHint(error) {
  const message = String(error || "");
  if (/hard limit|increase your hard limit|\$2 remaining|billing|usage limit|spend limit/i.test(message)) {
    return "Cursor Cloud Agents are billed on your Cursor account (separate from NECalcul8r upgrades). Prefer the in-app assistant above — it does not use Cloud Agents. If you still want a repo agent, raise the Cursor hard limit, then retry.";
  }
  if (/not deployed|gateway 404|could not be reached|failed to send/i.test(message)) {
    return "Optional Cloud Agent deploy: create-cursor-agent / cursor-agent-session. The in-app assistant uses nec-accuracy-chat + OPENAI_API_KEY instead.";
  }
  return "Cloud Agents are optional and billed by Cursor. Use the in-app NEC Accuracy Assistant above for normal help.";
}

const DEFAULT_MISSION = "nec_accuracy_guardian";
const DEFAULT_FOCUS = ["generator", "dwelling", "commercial"];

export default function CursorAgent() {
  const { user } = useAuth();
  const assistantAllowed = canUseNecAccuracyAssistant(user);
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
  const focusHint = useMemo(
    () => CURSOR_FOCUS_AREAS.filter((area) => focusIds.includes(area.id)).map((area) => area.label).join(", "),
    [focusIds],
  );
  const agentContext = useMemo(() => {
    if (!chatSession?.agentId && !result?.agentId) return "";
    return [
      `activeAgentId=${chatSession?.agentId || result?.agentId || ""}`,
      `activeAgentName=${chatSession?.name || result?.name || ""}`,
      `activeAgentStatus=${chatSession?.status || result?.status || ""}`,
    ].filter(Boolean).join("\n");
  }, [chatSession, result]);

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

  const createAgent = async () => {
    setError("");
    setResult(null);
    if (!user?.is_platform_admin) {
      setError("Platform admin access is required for optional Cursor Cloud Agents.");
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
      setChatSession(buildInitialChatSession({
        agentId,
        runId: payload.runId || null,
        name: payload.name || name.trim() || mission.defaultName,
        url,
        prompt: prompt.trim(),
        status: payload.status || "ACTIVE",
      }));
      toast({
        title: "Cloud Agent started",
        description: "Discuss anytime in chat. Use Send to agent only for another Cloud Agent run.",
      });
      window.requestAnimationFrame(() => {
        document.getElementById("cursor-in-app-session")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (nextError) {
      setError(nextError?.message || "Could not start Cursor Cloud Agent.");
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
        startAgent: false,
      });
      const payload = response?.data || response || {};
      toast({
        title: "Daily NEC scan finished",
        description: `Probe findings: ${payload.findingCount ?? 0}. Use the in-app assistant to dig into any misses.`,
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
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Inside NECalcul8r</p>
            <h1 className="text-2xl font-black text-foreground">In-app Agent Chat</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Discuss here turn-by-turn <span className="font-semibold text-foreground">exactly like a Cursor agent chat</span> —
              ask, clarify, iterate. Replies are immediate, stay in the app, and do not use Cursor credits.
            </p>
          </div>
        </div>
      </div>

      <NecAccuracyChat
        allowed={assistantAllowed}
        focusHint={focusHint}
        agentContext={agentContext}
        disabledReason="Upgrade to a paid plan to unlock in-app discussion chat (same boundary as NEC Tables). Platform admins always have access."
      />

      <div id="cursor-in-app-session">
        <CursorAgentChat
          initialSession={chatSession}
          discussAllowed={assistantAllowed}
          onClear={() => {
            setChatSession(null);
            setResult(null);
          }}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Optional focus for this chat</label>
        <div className="flex flex-wrap gap-2">
          {CURSOR_FOCUS_AREAS.map((area) => {
            const active = focusIds.includes(area.id);
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setFocusIds((current) => toggleId(current, area.id))}
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

      {user?.is_platform_admin && (
        <div id="daily-scans" className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Owner scans</p>
              <h2 className="text-lg font-black text-foreground">Daily reliability probe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Runs without launching a Cloud Agent. Review findings here, then ask the in-app assistant to dig in.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={refreshOwnerFeed}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button type="button" size="sm" className="gap-1.5" disabled={scanLoading} onClick={runDailyScanNow}>
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
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left text-sm ${
                    item.read_at ? "border-border bg-background" : "border-amber-300 bg-amber-50"
                  }`}
                  onClick={async () => {
                    if (!item.read_at) await markPlatformNotificationRead(item.id);
                    await refreshOwnerFeed();
                  }}
                >
                  <p className="font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                </button>
              ))}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user?.is_platform_admin && (
        <details className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Advanced / optional</p>
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                Cursor Cloud Agents
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Uses Cursor account credits. Not used by the in-app chat above — leave this closed unless you intentionally want a repo agent.
              </p>
            </div>
          </summary>

          <div className="mt-4 space-y-4">
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
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Agent name</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Starting branch</label>
                <Input value={startingRef} onChange={(event) => setStartingRef(event.target.value)} placeholder="main" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Task sent to Cursor Cloud Agents
                </label>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={regeneratePrompt}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Rebuild
                </Button>
              </div>
              <Textarea
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setPromptTouched(true);
                }}
                rows={10}
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Model ID optional</label>
              <Input
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                placeholder="Leave blank to use Cursor default"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-bold">Cloud Agent could not start</p>
                  <p className="whitespace-pre-wrap break-words">{error}</p>
                  <p className="mt-2 text-xs">{cursorAgentErrorHint(error)}</p>
                </div>
              </div>
            )}

            {result?.agentId && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 space-y-1">
                <p className="font-bold">Cloud Agent created (Cursor-billed)</p>
                <p className="text-xs font-mono">ID: {result.agentId}</p>
                {result.url && (
                  <a
                    className="inline-flex items-center gap-1 font-semibold underline"
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on Cursor.com <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            <Button onClick={createAgent} disabled={loading} className="gap-2" variant="outline">
              <Play className="h-4 w-4" />
              {loading ? "Starting Cloud Agent..." : "Start optional Cloud Agent"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Prefer the in-app assistant. Need a plan? <Link className="underline" to="/purchase">View upgrades</Link>.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
