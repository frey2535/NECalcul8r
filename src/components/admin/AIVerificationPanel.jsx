import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Brain, ShieldCheck,
  ChevronDown, ChevronRight, AlertTriangle, Clock,
} from "lucide-react";
import { build2017AIPrompt, check2017ArticleCompliance } from "@/lib/nec2017Compliance";
import { cn } from "@/lib/utils";

const AI_STATUS_META = {
  not_run:   { label: "Not Run",   icon: Clock,        color: "text-slate-500",   bg: "bg-slate-50 dark:bg-slate-900/30",   border: "border-slate-200 dark:border-slate-700" },
  match:     { label: "Match",     icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  mismatch:  { label: "Mismatch",  icon: XCircle,      color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30",       border: "border-red-200 dark:border-red-800" },
  uncertain: { label: "Uncertain", icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",   border: "border-amber-200 dark:border-amber-800" },
};

export default function AIVerificationPanel({ row, record, onRecordSaved, currentUser }) {
  const [excerpt, setExcerpt] = useState(record?.source_excerpt || "");
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);

  const aiStatus = record?.ai_review_status || "not_run";
  const meta = AI_STATUS_META[aiStatus];
  const StatusIcon = meta.icon;
  const postCheck = check2017ArticleCompliance(row.articleRef);

  const runAIReview = async () => {
    if (!excerpt.trim()) {
      setError("Please paste the NEC 2017 article text before running the AI review.");
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const prompt = build2017AIPrompt({
        articleRef: row.articleRef,
        ruleName: record?.rule_name,
        valueUsed: record?.value_used,
        sourceExcerpt: excerpt,
        calculatorId: row.calcId,
      });

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            result:                   { type: "string" },
            confidence:               { type: "number" },
            explanation:              { type: "string" },
            suggested_correction:     { type: "string" },
            fields_affected:          { type: "array", items: { type: "string" } },
            cross_year_contamination: { type: "boolean" },
          },
        },
      });

      const patch = {
        source_excerpt:           excerpt,
        ai_review_status:         aiResult.result || "uncertain",
        ai_confidence:            aiResult.confidence ?? null,
        ai_explanation:           aiResult.explanation || "",
        ai_suggested_correction:  aiResult.suggested_correction || null,
        ai_fields_affected:       aiResult.fields_affected || [],
        ai_reviewed_at:           new Date().toISOString(),
        // Set status to pending human approval — do NOT auto-verify
        status:                   "ai_reviewed_pending_human_approval",
      };

      let saved;
      if (record?.id) {
        saved = await base44.entities.ArticleVerification.update(record.id, patch);
      } else {
        saved = await base44.entities.ArticleVerification.create({
          calculator_id: row.calcId,
          article_ref:   row.articleRef,
          nec_year:      row.necYear,
          ...patch,
        });
      }
      onRecordSaved(saved);
      setExpanded(true);
    } catch (e) {
      setError("AI review failed: " + e.message);
    }
    setRunning(false);
  };

  const approveVerification = async () => {
    if (!record?.id) return;
    setApproving(true);
    try {
      const saved = await base44.entities.ArticleVerification.update(record.id, {
        status:               "verified",
        human_approved_by:    currentUser?.full_name || currentUser?.email || "Admin",
        human_approved_date:  new Date().toISOString().split("T")[0],
      });
      onRecordSaved(saved);
    } catch (e) {
      setError("Approval failed: " + e.message);
    }
    setApproving(false);
  };

  return (
    <div className="space-y-2">
      {/* Cross-year contamination warning */}
      {postCheck.isViolation && row.necYear === "2017" && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-[10px] text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span><strong>Cross-year contamination:</strong> Article {row.articleRef} was added in NEC {postCheck.addedIn}. This article did not exist in 2017 NEC.</span>
        </div>
      )}

      {/* Source excerpt input */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
          NEC {row.necYear} Source Excerpt
        </label>
        <Textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder={`Paste the exact NEC ${row.necYear} article/table text for ${row.articleRef}…`}
          className="text-xs min-h-[72px] resize-y"
        />
      </div>

      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}

      {/* Run AI Review button */}
      <Button
        size="sm"
        variant="outline"
        onClick={runAIReview}
        disabled={running || !excerpt.trim()}
        className="h-7 text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        {running
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running AI Review…</>
          : <><Brain className="w-3.5 h-3.5" /> Run AI Review</>}
      </Button>

      {/* AI Result */}
      {aiStatus !== "not_run" && record && (
        <div className={cn("rounded-lg border p-2.5 space-y-2", meta.bg, meta.border)}>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", meta.color)} />
              <span className={cn("text-[11px] font-bold", meta.color)}>AI: {meta.label}</span>
              {record.ai_confidence != null && (
                <span className="text-[10px] text-muted-foreground">({record.ai_confidence}% confidence)</span>
              )}
            </div>
            {expanded
              ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
              : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </button>

          {expanded && (
            <div className="space-y-2 text-[11px]">
              {record.ai_explanation && (
                <div>
                  <p className="font-semibold text-muted-foreground mb-0.5">Explanation</p>
                  <p className="text-foreground leading-snug">{record.ai_explanation}</p>
                </div>
              )}
              {record.ai_suggested_correction && (
                <div>
                  <p className="font-semibold text-muted-foreground mb-0.5">Suggested Correction</p>
                  <p className="text-foreground leading-snug italic">{record.ai_suggested_correction}</p>
                </div>
              )}
              {record.ai_fields_affected?.length > 0 && (
                <div>
                  <p className="font-semibold text-muted-foreground mb-0.5">Fields Affected</p>
                  <div className="flex flex-wrap gap-1">
                    {record.ai_fields_affected.map(f => (
                      <code key={f} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{f}</code>
                    ))}
                  </div>
                </div>
              )}
              {record.ai_reviewed_at && (
                <p className="text-muted-foreground text-[10px]">
                  Reviewed {new Date(record.ai_reviewed_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Human approval — only shown after AI review, status is pending approval */}
          {record.status === "ai_reviewed_pending_human_approval" && (
            <div className="pt-1 border-t border-current/20 flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground flex-1">
                AI review complete. Only you (admin) can mark this Verified.
              </p>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={approveVerification}
                disabled={approving}
              >
                {approving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <ShieldCheck className="w-3 h-3" />}
                Mark Verified
              </Button>
            </div>
          )}

          {record.status === "verified" && record.human_approved_by && (
            <div className="pt-1 border-t border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              Verified by {record.human_approved_by} on {record.human_approved_date}
            </div>
          )}
        </div>
      )}
    </div>
  );
}