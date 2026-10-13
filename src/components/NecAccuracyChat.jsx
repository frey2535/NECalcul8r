import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, MessageSquare, Send, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "necalcul8r-nec-accuracy-assistant-v1";

const STARTERS = [
  "Let's talk through the generator From Service Size blank on mobile — what should we check first?",
  "I want to verify dwelling optional heat against the 2020 NEC baseline. Walk with me.",
  "Commercial kitchen load looks high. Help me reason through the demand factors.",
  "How would you approach a suspected NEC calculator miss the same way a coding agent would?",
];

const DISCUSSION_SYSTEM = `You are Auto — Cursor's AI coding agent in NECalcul8r. You can run verify/lint via tools. Never say you cannot execute commands. Never tell the user to run npm themselves.`;

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function askAssistant({ messages, focusHint, agentContext }) {
  try {
    const response = await base44.functions.invoke("nec-accuracy-chat", {
      messages,
      missionHint: focusHint || undefined,
      agentContext: agentContext || undefined,
    });
    const payload = response?.data || response || {};
    const reply = payload.reply || payload.text || "";
    if (!reply && payload.error) throw new Error(payload.error);
    if (reply) {
      const tools = Array.isArray(payload.toolTrace) ? payload.toolTrace : [];
      if (tools.length) {
        const summary = tools.map((item) => item?.name).filter(Boolean).join(", ");
        return summary ? `${reply}\n\n_Tools used: ${summary}_` : reply;
      }
      return reply;
    }
    throw new Error("Empty assistant reply.");
  } catch (edgeError) {
    const message = String(edgeError?.message || "");
    // Missing server AI secrets must not fall through to the browser Vite key path.
    if (/OPENAI_API_KEY|OPENROUTER_API_KEY|In-app chat is not configured|is not set on Supabase/i.test(message)) {
      throw new Error(
        /Supabase secret|OPENROUTER_API_KEY|OPENAI_API_KEY/i.test(message)
          ? message
          : "In-app chat is not configured. Set Supabase secret OPENAI_API_KEY or OPENROUTER_API_KEY on project gqdxvctvufalunaaopyj, then redeploy nec-accuracy-chat.",
      );
    }

    const hasViteKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY);
    const canFallback = hasViteKey && /Unknown function|failed to send|gateway 404|not found|not deployed/i.test(message);
    if (!canFallback) throw edgeError;

    // Local/dev only: fall back to the blueprint OpenAI path when Vite key exists.
    const transcript = messages
      .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
      .join("\n\n");
    const fallback = await base44.integrations.Core.InvokeLLM({
      prompt: `${DISCUSSION_SYSTEM}${focusHint ? `\nFocus: ${focusHint}` : ""}${agentContext ? `\nAgent context:\n${agentContext}` : ""}\n\nConversation:\n${transcript}\n\nAssistant:`,
    });
    return typeof fallback === "string" ? fallback : JSON.stringify(fallback);
  }
}

/**
 * In-app Cursor agent chat — same role as Cursor app chat, upgrade-gated.
 * Immediate replies via nec-accuracy-chat (OpenRouter free); not Cloud Agents.
 */
export default function NecAccuracyChat({
  allowed = false,
  focusHint = "",
  agentContext = "",
  disabledReason = "",
  compact = false,
}) {
  const [messages, setMessages] = useState(() => loadMessages());
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
    } catch {
      // ignore quota
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  const apiMessages = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.text })),
    [messages],
  );

  const send = async (textOverride) => {
    const text = String(textOverride ?? draft).trim();
    if (!text || busy || !allowed) return;
    setBusy(true);
    setError("");
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      at: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    try {
      const reply = await askAssistant({
        messages: [...apiMessages, { role: "user", content: text }],
        focusHint,
        agentContext,
      });
      if (!reply) throw new Error("Empty assistant reply.");
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: reply,
          at: new Date().toISOString(),
        },
      ]);
      window.requestAnimationFrame(() => composerRef.current?.focus());
    } catch (nextError) {
      setError(nextError?.message || "Assistant request failed.");
      setMessages(nextMessages);
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className={`rounded-2xl border border-border bg-card shadow-sm text-center space-y-3 ${compact ? "p-4" : "p-6"}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <Lock className="h-6 w-6 text-amber-700" />
        </div>
        <h2 className="text-lg font-black text-foreground">In-app chat</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {disabledReason || "Discuss product and NEC accuracy in chat inside the app — included with paid upgrades."}
        </p>
        <Button asChild className="gap-2">
          <Link to="/purchase">
            <ShoppingCart className="h-4 w-4" />
            View plans
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`bg-card space-y-3 ${
        compact
          ? "flex h-full min-h-0 flex-col border-0 p-0 shadow-none rounded-none"
          : "rounded-2xl border border-border p-5 shadow-sm space-y-4"
      }`}
    >
      <div className={`flex flex-wrap items-start justify-between gap-3 ${compact ? "shrink-0" : ""}`}>
        <div>
          {!compact && (
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Discuss in-app</p>
          )}
          <h2 className={`font-black text-foreground flex items-center gap-2 ${compact ? "text-base" : "text-lg"}`}>
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Cursor Agent
          </h2>
          {!compact && (
            <p className="mt-1 text-sm text-muted-foreground">
              Same role as Cursor chat — ask, clarify, inspect code, implement. Access is via NECalcul8r upgrades.
              No Cursor Cloud Agent credits.
            </p>
          )}
          {compact && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              In-app Cursor agent — stay on this screen. Upgrade-gated, no Cloud Agent credits.
            </p>
          )}
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setMessages([]);
              setError("");
              localStorage.removeItem(STORAGE_KEY);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            New chat
          </Button>
        )}
      </div>

      {messages.length === 0 && (
        <div className={`grid gap-2 shrink-0 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              className="rounded-xl border border-border bg-background p-3 text-left text-xs font-medium text-foreground hover:bg-muted/50"
              onClick={() => send(starter)}
              disabled={busy}
            >
              <Sparkles className="mb-1 h-3.5 w-3.5 text-blue-600" />
              {starter}
            </button>
          ))}
        </div>
      )}

      <div
        className={`overflow-y-auto rounded-xl border border-border bg-background p-3 space-y-3 ${
          compact
            ? "min-h-0 flex-1"
            : "min-h-[18rem] max-h-[min(70vh,36rem)]"
        }`}
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Start a discussion — bugs, NEC results, upgrades, mobile quirks, verification. Keep going turn by turn.
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
              {message.role === "user" ? "You" : "Cursor Agent"}
            </p>
            {message.text}
          </div>
        ))}
        {busy && (
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Cursor Agent is working…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 whitespace-pre-wrap shrink-0">
          {error}
        </p>
      )}

      <div className={`space-y-2 ${compact ? "shrink-0 pb-1" : ""}`}>
        <Textarea
          ref={composerRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={compact ? 3 : 4}
          placeholder="Message the assistant… (Enter to send, Shift+Enter for a new line)"
          className="text-sm"
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="gap-2" disabled={busy || !draft.trim()} onClick={() => send()}>
            <Send className="h-4 w-4" />
            {busy ? "Sending…" : "Send"}
          </Button>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Continuous discussion thread — not a one-shot Cloud Agent task.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export { askAssistant };
