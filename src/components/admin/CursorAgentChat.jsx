import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MessageSquare, RefreshCw, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { askAssistant } from "@/components/NecAccuracyChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "necalcul8r-cursor-agent-session-v1";
const ACTIVE_RUN = new Set(["CREATING", "RUNNING", "QUEUED", "PENDING"]);

function isActiveRunStatus(status) {
  return ACTIVE_RUN.has(String(status || "").toUpperCase());
}

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.agentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * In-app Cloud Agent session + conversational discussion.
 * Default send = discuss immediately (like this chat). Optional = dispatch follow-up to the Cloud Agent.
 */
export default function CursorAgentChat({
  initialSession = null,
  onClear,
  discussAllowed = true,
}) {
  const [session, setSession] = useState(() => initialSession || loadStoredSession());
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState(null);
  const [mode, setMode] = useState("discuss"); // discuss | agent
  const bottomRef = useRef(null);

  useEffect(() => {
    if (initialSession?.agentId) {
      setSession(initialSession);
      saveStoredSession(initialSession);
    }
  }, [initialSession]);

  useEffect(() => {
    saveStoredSession(session);
  }, [session]);

  const messages = useMemo(() => session?.messages || [], [session]);

  const refreshStatus = useCallback(async () => {
    if (!session?.agentId) return null;
    const response = await base44.functions.invoke("cursor-agent-session", {
      action: "status",
      agentId: session.agentId,
      runId: session.runId || undefined,
    });
    const payload = response?.data || response || {};
    const agent = payload.agent || {};
    const run = payload.run || null;
    const runs = Array.isArray(payload.runs) ? payload.runs : [];

    setLive({ agent, run, runs });

    setSession((current) => {
      if (!current) return current;
      const nextMessages = [...(current.messages || [])];
      const resultText = run?.result;
      if (resultText && run?.runId) {
        const already = nextMessages.some(
          (item) => item.role === "assistant" && item.runId === run.runId,
        );
        if (!already) {
          nextMessages.push({
            id: `assistant-${run.runId}`,
            role: "assistant",
            kind: "agent",
            text: resultText,
            runId: run.runId,
            at: run.updatedAt || new Date().toISOString(),
          });
        }
      }
      return {
        ...current,
        name: agent.name || current.name,
        status: agent.status || current.status,
        runId: run?.runId || agent.latestRunId || current.runId,
        runStatus: run?.status || current.runStatus,
        url: agent.url || current.url,
        git: run?.git || current.git || null,
        messages: nextMessages,
      };
    });

    return payload;
  }, [session?.agentId, session?.runId]);

  useEffect(() => {
    if (!session?.agentId) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        if (!cancelled) await refreshStatus();
      } catch (nextError) {
        if (!cancelled) setError(nextError?.message || "Could not refresh agent status.");
      }
    };
    tick();
    const interval = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session?.agentId, refreshStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, live?.run?.status, busy]);

  if (!session?.agentId) return null;

  const runStatus = live?.run?.status || session.runStatus || "UNKNOWN";
  const agentStatus = live?.agent?.status || session.status || "UNKNOWN";
  const waiting = isActiveRunStatus(runStatus)
    || (String(agentStatus).toUpperCase() === "ACTIVE" && isActiveRunStatus(runStatus));
  const branches = live?.run?.git?.branches || session.git?.branches || [];
  const agentContext = [
    `agentId=${session.agentId}`,
    `name=${session.name || ""}`,
    `agentStatus=${agentStatus}`,
    `runStatus=${runStatus}`,
    branches.length ? `branches=${branches.map((b) => b.branch || b.prUrl).filter(Boolean).join(", ")}` : null,
  ].filter(Boolean).join("\n");

  const appendMessage = (message) => {
    setSession((current) => current ? {
      ...current,
      messages: [...(current.messages || []), message],
    } : current);
  };

  const sendDiscuss = async () => {
    const text = draft.trim();
    if (!text || busy || !discussAllowed) return;
    setBusy(true);
    setError("");
    const userMessage = {
      id: `user-discuss-${Date.now()}`,
      role: "user",
      kind: "discuss",
      text,
      at: new Date().toISOString(),
    };
    appendMessage(userMessage);
    setDraft("");
    try {
      const history = [...messages, userMessage]
        .filter((item) => item.role === "user" || item.role === "assistant")
        .slice(-30)
        .map((item) => ({ role: item.role, content: item.text }));
      const reply = await askAssistant({
        messages: history,
        agentContext,
      });
      appendMessage({
        id: `assistant-discuss-${Date.now()}`,
        role: "assistant",
        kind: "discuss",
        text: reply,
        at: new Date().toISOString(),
      });
    } catch (nextError) {
      setError(nextError?.message || "Discussion reply failed.");
    } finally {
      setBusy(false);
    }
  };

  const sendFollowUp = async () => {
    const text = draft.trim();
    if (!text || !session?.agentId || waiting) return;
    setBusy(true);
    setError("");
    try {
      appendMessage({
        id: `user-agent-${Date.now()}`,
        role: "user",
        kind: "agent",
        text,
        at: new Date().toISOString(),
      });
      setDraft("");

      const response = await base44.functions.invoke("cursor-agent-session", {
        action: "followup",
        agentId: session.agentId,
        prompt: text,
      });
      const payload = response?.data || response || {};
      const run = payload.run || {};
      setSession((current) => current ? {
        ...current,
        runId: run.runId || current.runId,
        runStatus: run.status || "CREATING",
        status: payload.agent?.status || current.status,
      } : current);
      await refreshStatus();
    } catch (nextError) {
      setError(nextError?.message || "Follow-up failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSend = () => {
    if (mode === "agent") return sendFollowUp();
    return sendDiscuss();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Cloud Agent + discussion</p>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            {session.name || "Cloud Agent"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground font-mono break-all">{session.agentId}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Agent: <span className="font-semibold text-foreground">{agentStatus}</span>
            {" · "}
            Run: <span className="font-semibold text-foreground">{runStatus}</span>
            {waiting ? " · agent working…" : " · ready"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use <span className="font-semibold text-foreground">Discuss</span> for immediate back-and-forth (like this chat).
            Use <span className="font-semibold text-foreground">Send to agent</span> only when you want another Cloud Agent run.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => refreshStatus().catch(() => {})}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {session.url && (
            <a
              href={session.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Open on Cursor.com <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setSession(null);
              saveStoredSession(null);
              onClear?.();
            }}
          >
            <X className="h-3.5 w-3.5" />
            End view
          </Button>
        </div>
      </div>

      {branches.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-3 text-xs space-y-1">
          {branches.map((branch) => (
            <div key={`${branch.branch}-${branch.prUrl || ""}`} className="flex flex-wrap gap-2">
              {branch.branch && <span className="font-mono text-foreground">{branch.branch}</span>}
              {branch.prUrl && (
                <a href={branch.prUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline">
                  Pull request
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="min-h-[16rem] max-h-[min(70vh,36rem)] overflow-y-auto rounded-xl border border-border bg-background p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Session started. Discuss anytime — or wait for the agent result, then keep talking.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
              message.role === "user"
                ? "ml-6 bg-blue-600 text-white"
                : "mr-6 bg-muted text-foreground"
            }`}
          >
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
              {message.role === "user"
                ? (message.kind === "agent" ? "You → agent" : "You")
                : (message.kind === "discuss" ? "Assistant" : "Cloud Agent")}
            </p>
            {message.text}
          </div>
        ))}
        {waiting && (
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">
            Cloud Agent is working… you can still Discuss below.
          </p>
        )}
        {busy && mode === "discuss" && (
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Assistant is thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              mode === "discuss" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border text-muted-foreground"
            }`}
            onClick={() => setMode("discuss")}
          >
            Discuss (immediate)
          </button>
          <button
            type="button"
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              mode === "agent" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border text-muted-foreground"
            }`}
            onClick={() => setMode("agent")}
          >
            Send to Cloud Agent
          </button>
        </div>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder={
            mode === "agent"
              ? "Task for the Cloud Agent (runs after current job finishes)…"
              : "Discuss here like a normal agent chat — ask, clarify, iterate…"
          }
          className="text-sm"
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <Button
          type="button"
          className="gap-2"
          disabled={
            busy
            || !draft.trim()
            || (mode === "agent" && waiting)
            || (mode === "discuss" && !discussAllowed)
          }
          onClick={onSend}
        >
          <Send className="h-4 w-4" />
          {busy
            ? "Sending…"
            : mode === "agent"
              ? (waiting ? "Wait for current agent run" : "Send to Cloud Agent")
              : "Send discussion"}
        </Button>
      </div>
    </div>
  );
}

export function buildInitialChatSession({ agentId, runId, name, url, prompt, status }) {
  if (!agentId) return null;
  return {
    agentId,
    runId: runId || null,
    name: name || "Cloud Agent",
    url: url || (agentId ? `https://cursor.com/agents/${agentId}` : null),
    status: status || "ACTIVE",
    runStatus: "CREATING",
    messages: prompt
      ? [{
        id: `user-initial-${Date.now()}`,
        role: "user",
        kind: "agent",
        text: prompt,
        at: new Date().toISOString(),
      }]
      : [],
    startedAt: new Date().toISOString(),
  };
}
