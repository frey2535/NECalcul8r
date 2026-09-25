import React, { useState } from "react";
import { Bot, ExternalLink, Play, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const DEFAULT_PROMPT = `Fix the issue described below in NECalcul8r.

Task:


Requirements:
- Create a new branch from main using the cursor/<name>-d22c pattern.
- Make the requested code changes.
- Run focused validation for touched calculators/scripts.
- Commit, push, and create a draft PR against main.`;

export default function CursorAgent() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [startingRef, setStartingRef] = useState("main");
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [autoCreatePR, setAutoCreatePR] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
        name: name.trim() || undefined,
        startingRef: startingRef.trim() || "main",
        modelId: modelId.trim() || undefined,
        prompt: prompt.trim(),
        autoCreatePR,
      });
      const payload = response?.data || response || {};
      const agentId = payload.agentId || payload.id || null;
      const url = payload.url || (agentId ? `https://cursor.com/agents/${agentId}` : null);
      const normalized = { ...payload, agentId, url };
      setResult(normalized);
      toast({
        title: "Cursor agent started",
        description: url ? "Open the agent link to follow progress and send follow-ups." : "Agent created.",
      });
      if (url && typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (nextError) {
      setError(nextError?.message || "Could not start Cursor agent.");
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-black text-foreground">Cursor Agent</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Start a secure Cursor Cloud Agent from inside the app for calculator corrections and other code fixes.
              Your Cursor API key stays server-side in Supabase secrets and is never sent to the browser.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Agent name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Fix generator blower demand"
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
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Task for Cursor</label>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={12}
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
              <p className="mt-2 text-xs">
                Confirm Supabase secrets `CURSOR_API_KEY` and `CURSOR_REPO_URL` are set,
                then redeploy `create-cursor-agent`. The API key must have Cloud Agents access
                for `https://github.com/frey2535/NECalcul8r`.
              </p>
            </div>
          </div>
        )}

        {result?.url && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 space-y-1">
            <p className="font-bold">Cursor agent created</p>
            {result.name && <p className="text-xs">Name: {result.name}</p>}
            {result.agentId && <p className="text-xs font-mono">ID: {result.agentId}</p>}
            {result.status && <p className="text-xs">Status: {result.status}</p>}
            <a
              className="mt-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              href={result.url}
              target="_blank"
              rel="noreferrer"
            >
              Open Cursor agent <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <Button onClick={createAgent} disabled={loading || !user?.is_platform_admin} className="gap-2">
          <Play className="h-4 w-4" />
          {loading ? "Starting Cursor..." : "Start Cursor agent"}
        </Button>
      </div>
    </div>
  );
}
