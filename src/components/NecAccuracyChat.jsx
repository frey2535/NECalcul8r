import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, MessageSquare, Send, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "necalcul8r-nec-accuracy-assistant-v1";

const STARTERS = [
  "Generator From Service Size blanks out on mobile — what usually causes that?",
  "Walk me through verifying dwelling optional heat against the 2020 NEC baseline.",
  "Commercial kitchen load looks high — which demand factors should I double-check?",
  "How do I confirm a voltage-drop result against the known-answer suite?",
];

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

/**
 * In-app NEC Accuracy Assistant — OpenAI via Edge Function / local InvokeLLM.
 * No Cursor Cloud Agents, no cursor.com handoff.
 */
export default function NecAccuracyChat({
  allowed = false,
  focusHint = "",
  disabledReason = "",
}) {
  const [messages, setMessages] = useState(() => loadMessages());
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
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
      let reply = "";
      try {
        const response = await base44.functions.invoke("nec-accuracy-chat", {
          messages: [...apiMessages, { role: "user", content: text }],
          missionHint: focusHint || undefined,
        });
        const payload = response?.data || response || {};
        reply = payload.reply || payload.text || "";
        if (!reply && payload.error) throw new Error(payload.error);
      } catch (edgeError) {
        const message = String(edgeError?.message || "");
        const canFallback = /OPENAI_API_KEY|not configured|503|AI is not configured|Unknown function|failed to send|gateway 404|not found/i.test(message);
        if (!canFallback) throw edgeError;
        // Fall back to the same OpenAI path already used for blueprint analysis (no Cursor Cloud Agents).
        const system = `You are the NECalcul8r NEC Accuracy Assistant. Stay inside the app. Help with NEC calculator accuracy, baselines, and practical verification. Do not send users to cursor.com.${focusHint ? ` Focus: ${focusHint}.` : ""}`;
        const transcript = [...apiMessages, { role: "user", content: text }]
          .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
          .join("\n\n");
        const fallback = await base44.integrations.Core.InvokeLLM({
          prompt: `${system}\n\nConversation:\n${transcript}\n\nAssistant:`,
        });
        reply = typeof fallback === "string" ? fallback : JSON.stringify(fallback);
      }
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
    } catch (nextError) {
      setError(nextError?.message || "Assistant request failed.");
      setMessages(nextMessages);
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <Lock className="h-6 w-6 text-amber-700" />
        </div>
        <h2 className="text-lg font-black text-foreground">NEC Accuracy Assistant</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {disabledReason || "Included with paid upgrades — same plan boundary as NEC Tables. Chat stays inside the app; no Cursor Cloud Agents or extra Cursor billing."}
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">In-app assistant</p>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            NEC Accuracy Assistant
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Works like a coding assistant inside NECalcul8r. Included with your upgrade — not billed through Cursor Cloud Agents.
          </p>
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
            Clear chat
          </Button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
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

      <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-background p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about a calculator result, a suspected miss, or how to verify against baselines.
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
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            {message.text}
          </div>
        ))}
        {busy && (
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Assistant is thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 whitespace-pre-wrap">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="e.g. Dwelling optional heat overcounts on 2020 NEC — what should I check?"
          className="text-sm"
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Button type="button" className="gap-2" disabled={busy || !draft.trim()} onClick={() => send()}>
          <Send className="h-4 w-4" />
          {busy ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
