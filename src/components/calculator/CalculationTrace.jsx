import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Database, BookOpen, ChevronDown, ChevronRight, X, Info } from "lucide-react";
import { FIELD_META, ARTICLE_META } from "@/lib/calculatorTrace";

// ── Article / Table row (clickable) ─────────────────────────────────
function RefRow({ necRef, necYear, getStatus }) {
  const [open, setOpen] = useState(false);
  const { status, notes } = getStatus(necRef, necYear);
  const isVerified  = status === "verified";
  const isAiPending = status === "ai_reviewed_pending_human_approval";
  const isError     = status === "needs_correction";
  const is2026     = necYear === "2026";
  const meta       = ARTICLE_META[necRef];

  const pendingReason = is2026
    ? `NEC ${necYear} is pending final publication — data not yet verified against the released code.`
    : isAiPending
    ? `AI review complete. Awaiting human admin approval before status advances to Verified.`
    : `NEC ${necYear} edition not yet manually verified against the published code text.`;

  return (
    <div className={`rounded-lg overflow-hidden border ${
      isVerified  ? "border-emerald-200 dark:border-emerald-800" :
      isError     ? "border-red-200 dark:border-red-800" :
      isAiPending ? "border-purple-200 dark:border-purple-800" :
                    "border-amber-200 dark:border-amber-800"
    }`}>
      {/* Row header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 py-2 px-3 text-left transition-colors ${
          isVerified  ? "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" :
          isError     ? "bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50" :
          isAiPending ? "bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/30" :
                        "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30"
        }`}
      >
        {isVerified
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          : isError
          ? <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
        <code className="text-[11px] font-mono font-semibold text-foreground flex-1">{necRef}</code>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
          isVerified ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" :
          isError    ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" :
                       "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        }`}>
          {isVerified ? "Verified" : isError ? "Needs Correction" : isAiPending ? "AI Review — Pending Approval" : "Pending Review"}
        </span>
        <Info className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />
      </button>

      {/* Expanded detail panel */}
      {open && (
        <div className={`px-3 pb-3 pt-2 text-[10px] space-y-1.5 border-t ${
          isVerified ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800" :
          isError    ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-800" :
                       "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800"
        }`}>
          {meta?.title && (
            <p className="font-semibold text-foreground text-[11px]">{meta.title}</p>
          )}
          <div className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 items-start">
            <span className="text-muted-foreground font-medium">Status</span>
            <span className="font-semibold text-foreground">
              {isVerified ? "Manually verified" : isError ? "Needs correction" : "Pending review"}
            </span>

            {isVerified ? (
              <>
                <span className="text-muted-foreground font-medium">Source</span>
                <span className="font-semibold text-foreground">NFPA 70 ({necYear})</span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground font-medium">Reason</span>
                <span className="text-foreground">{notes || pendingReason}</span>
              </>
            )}

            <span className="text-muted-foreground font-medium">Edition</span>
            <span className="font-semibold text-foreground">{necYear}</span>

            {meta?.usedBy?.length > 0 && (
              <>
                <span className="text-muted-foreground font-medium mt-0.5">Used by</span>
                <ul className="space-y-0.5">
                  {meta.usedBy.map(c => (
                    <li key={c} className="text-foreground">· {c}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clickable field chip with popover ────────────────────────────────
function FieldChip({ fieldKey, necYear, activeField, setActiveField }) {
  const meta = FIELD_META[fieldKey];
  const isActive = activeField === fieldKey;

  return (
    <div className="relative">
      <button
        onClick={() => setActiveField(isActive ? null : fieldKey)}
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all border ${
          isActive
            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
            : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/50"
        }`}
      >
        {fieldKey}
      </button>
      {isActive && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 rounded-xl bg-card border border-border shadow-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <code className="text-[11px] font-mono font-bold text-foreground leading-tight">{fieldKey}</code>
            <button onClick={() => setActiveField(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
          {meta ? (
            <div className="space-y-1 text-[10px]">
              <div className="grid grid-cols-[64px_1fr] gap-x-2 gap-y-1 items-start">
                <span className="text-muted-foreground font-medium">Value</span>
                <span className="font-semibold text-foreground">{meta.value}</span>
                <span className="text-muted-foreground font-medium">Source</span>
                <span className="font-semibold text-foreground">{meta.source}</span>
                <span className="text-muted-foreground font-medium">Verified</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{necYear} NEC</span>
                {meta.usedBy?.length > 0 && (
                  <>
                    <span className="text-muted-foreground font-medium mt-0.5">Used in</span>
                    <ul className="space-y-0.5">
                      {meta.usedBy.map(c => <li key={c}>· {c}</li>)}
                    </ul>
                  </>
                )}
              </div>
              {meta.description && (
                <p className="text-muted-foreground leading-snug pt-1.5 border-t border-border">{meta.description}</p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">No metadata registered for this field.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Coverage progress bar ─────────────────────────────────────────────
function CoverageBar({ label, pct }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-slate-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-bold w-7 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function CalculationTrace({ trace, getStatus, necYear }) {
  const [expanded, setExpanded] = useState(false);
  const [activeField, setActiveField] = useState(null);

  if (!trace) return null;

  const { articles_used = [], tables_used = [], fields_used = [] } = trace;
  const allRefs = [...articles_used, ...tables_used];

  const verifiedRefs  = allRefs.filter(r => getStatus(r, necYear).status === "verified");
  const pendingRefs   = allRefs.filter(r => getStatus(r, necYear).status !== "verified");
  const hasUnverified = pendingRefs.length > 0;
  const is2026 = necYear === "2026";

  const verifiedSet  = new Set(verifiedRefs);
  const scoreArr     = (arr) => arr.length === 0 ? 100 : Math.round((arr.filter(r => verifiedSet.has(r)).length / arr.length) * 100);
  const articleScore = scoreArr(articles_used);
  const tableScore   = scoreArr(tables_used);
  const fieldScore   = fields_used.length === 0 ? 100 : Math.round((fields_used.filter(f => FIELD_META[f]).length / fields_used.length) * 100);
  const overallScore = Math.round((articleScore + tableScore + fieldScore) / 3);

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3 space-y-3">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 font-mono">
          <Database className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Calculation Trace</span>
          {hasUnverified ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="w-2.5 h-2.5" />{pendingRefs.length} pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-2.5 h-2.5" />All verified
            </span>
          )}
        </div>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {/* 2026 warning banner */}
      {is2026 && hasUnverified && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span><strong>NEC 2026 is pending publication.</strong> Data has not been verified against final code. Results are speculative.</span>
        </div>
      )}

      {expanded && (
        <div className="space-y-4">
          {/* Article / Table verification */}
          {allRefs.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> NEC References — click any row for details
              </p>
              <div className="space-y-1.5">
                {verifiedRefs.map(r => <RefRow key={r} necRef={r} necYear={necYear} getStatus={getStatus} />)}
                {pendingRefs.map(r => <RefRow key={r} necRef={r} necYear={necYear} getStatus={getStatus} />)}
              </div>
            </div>
          )}

          {/* NEC Values Used */}
          {fields_used.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                NEC Values Used <span className="normal-case font-normal text-muted-foreground/70">— click to inspect</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fields_used.map(f => (
                  <FieldChip key={f} fieldKey={f} necYear={necYear} activeField={activeField} setActiveField={setActiveField} />
                ))}
              </div>
            </div>
          )}

          {/* Manual Verification Progress */}
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Manual Verification Progress</p>
            <p className="text-[9px] text-muted-foreground mb-2">
              Percentage of referenced code sections that have been manually reviewed against the published NEC {necYear} text.
            </p>
            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <div className="flex items-baseline gap-1.5 pb-1">
                <span className="text-xl font-extrabold text-foreground">{overallScore}%</span>
                <span className="text-[9px] text-muted-foreground">of sources manually verified</span>
              </div>
              <CoverageBar label="Articles" pct={articleScore} />
              <CoverageBar label="Tables" pct={tableScore} />
              <CoverageBar label="NEC Values" pct={fieldScore} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}