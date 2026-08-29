import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  FileText, Database, Eye, EyeOff, Zap, ShieldCheck, ShieldAlert,
  Layers, GitBranch, FileCheck,
} from "lucide-react";

const STATUS_META = {
  verified: { label: "2020 VERIFIED", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-800" },
  correct: { label: "Correct (pure math)", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-800" },
  needs_verification: { label: "Needs verification", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/30", border: "border-amber-300 dark:border-amber-800" },
  assumed: { label: "Assumed (dev)", icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-950/30", border: "border-orange-300 dark:border-orange-800" },
  missing: { label: "Missing", icon: XCircle, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-950/30", border: "border-rose-300 dark:border-rose-800" },
  placeholder: { label: "Placeholder", icon: FileText, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-950/30", border: "border-violet-300 dark:border-violet-800" },
  copied_from_another_edition: { label: "Copied from another edition", icon: GitBranch, color: "text-sky-600", bg: "bg-sky-100 dark:bg-sky-950/30", border: "border-sky-300 dark:border-sky-800" },
};

const VERIF_STATUS = {
  pending: { label: "PENDING", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "IN PROGRESS", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950/30" },
  verified: { label: "VERIFIED", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950/30" },
};

function DependencyMatrix({ dependencies }) {
  if (dependencies.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-3 py-2">
        No NEC dependencies — pure math/engineering calculator.
      </p>
    );
  }

  return (
    <div className="overflow-x-scroll nec-scroll rounded border border-border">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">NEC Article</th>
            <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-l border-border">Section</th>
            <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-l border-border">Table</th>
            <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-l border-border">Formula / Rule</th>
            <th className="px-1.5 py-1.5 text-center font-semibold text-muted-foreground border-l border-border">Disp</th>
            <th className="px-1.5 py-1.5 text-center font-semibold text-muted-foreground border-l border-border">Runtime</th>
            <th className="px-1.5 py-1.5 text-center font-semibold text-muted-foreground border-l border-border">Trace</th>
            <th className="px-1.5 py-1.5 text-center font-semibold text-muted-foreground border-l border-border">Impl</th>
            <th className="px-1.5 py-1.5 text-center font-semibold text-muted-foreground border-l border-border">Verif</th>
            <th className="px-1.5 py-1.5 text-center font-semibold text-muted-foreground border-l border-border">Miss</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dependencies.map((d, i) => (
            <tr key={i} className={!d.verified ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}>
              <td className="px-2 py-1.5 font-mono font-semibold">{d.necArticle}</td>
              <td className="px-2 py-1.5 border-l border-border font-mono text-muted-foreground">{d.section || "—"}</td>
              <td className="px-2 py-1.5 border-l border-border font-mono text-muted-foreground">{d.table || "—"}</td>
              <td className="px-2 py-1.5 border-l border-border">{d.formula}</td>
              <td className="px-1.5 py-1.5 border-l border-border text-center">
                {d.displayOnly ? <span className="text-amber-600 font-bold">●</span> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-1.5 py-1.5 border-l border-border text-center">
                {d.runtimeCalculation ? <span className="text-emerald-600 font-bold">●</span> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-1.5 py-1.5 border-l border-border text-center">
                {d.traceOnly ? <span className="text-sky-600 font-bold">●</span> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-1.5 py-1.5 border-l border-border text-center">
                {d.implemented ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-rose-600 font-bold">✗</span>}
              </td>
              <td className="px-1.5 py-1.5 border-l border-border text-center">
                {d.verified ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-amber-600 font-bold">⏳</span>}
              </td>
              <td className="px-1.5 py-1.5 border-l border-border text-center">
                {d.missing ? <span className="text-rose-600 font-bold">✗</span> : <span className="text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegressionResults({ regression }) {
  const years = ["2017", "2020", "2023", "2026"];
  return (
    <div className="space-y-1.5">
      {years.map((y) => {
        const r = regression[y];
        return (
          <div key={y} className="flex items-start gap-2 text-xs">
            <Badge variant="outline" className="text-[10px] font-mono shrink-0 w-12 justify-center">{y}</Badge>
            {r.verified ? (
              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {r.reason}</span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {r.reason}</span>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground italic pt-1">
        {regression["2020"]?.intendedDifferences}
      </p>
    </div>
  );
}

function ConsumerAudit({ audit }) {
  const items = [
    { key: "display", label: "Display" },
    { key: "trace", label: "Trace" },
    { key: "runtime", label: "Runtime" },
    { key: "formulas", label: "Formulas" },
    { key: "calculations", label: "Calculations" },
    { key: "exportedReports", label: "Exported reports" },
    { key: "auditData", label: "Audit data" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            audit[item.key]
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
          }`}
        >
          {audit[item.key] ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function CalculatorVerificationCard({ calc }) {
  const [open, setOpen] = useState(false);
  const status = STATUS_META[calc.status2020] || STATUS_META.needs_verification;
  const verifStatus = VERIF_STATUS[calc.verificationStatus] || VERIF_STATUS.pending;
  const StatusIcon = status.icon;
  const depCount = calc.dependencies.length;
  const verifiedDeps = calc.dependencies.filter((d) => d.verified).length;
  const runtimeDeps = calc.dependencies.filter((d) => d.runtimeCalculation).length;
  const displayDeps = calc.dependencies.filter((d) => d.displayOnly).length;

  return (
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow border-${status.border}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">#{calc.reviewOrder}</span>
              <span className="font-semibold text-sm">{calc.calculatorName}</span>
              <Badge variant="outline" className="text-[10px]">{calc.category}</Badge>
              {calc.yearSensitive && (
                <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Year-sensitive</Badge>
              )}
              {depCount === 0 && (
                <Badge variant="outline" className="text-[10px]">Pure math</Badge>
              )}
            </div>
            <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{calc.sourceFile}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${verifStatus.bg} ${verifStatus.color}`}>
              {verifStatus.label}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg} ${status.color}`}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-4 pb-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span><strong className="text-foreground">{depCount}</strong> dependencies</span>
          <span><strong className="text-emerald-600">{verifiedDeps}</strong> verified</span>
          <span><strong className="text-foreground">{runtimeDeps}</strong> runtime</span>
          <span><strong className="text-amber-600">{displayDeps}</strong> display-only</span>
          <span><strong className="text-rose-600">{calc.dependencies.filter(d => d.missing).length}</strong> missing</span>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors border-t border-border"
        >
          <span className="flex items-center gap-1.5">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Dependency Matrix & Verification Details
          </span>
          <span className="text-[10px]">{open ? "Hide" : "Show"}</span>
        </button>

        {open && (
          <div className="px-3 pb-3 space-y-3">
            {/* STEP 1: Dependency Matrix */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Step 1: Dependency Matrix
              </p>
              <DependencyMatrix dependencies={calc.dependencies} />
            </div>

            <Separator />

            {/* STEP 2: 2020 NEC Comparison */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileCheck className="w-3 h-3" /> Step 2: 2020 NEC Comparison
              </p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {verifiedDeps} of {depCount} dependencies verified
                </span>
              </div>
              {calc.sourceNotes && (
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">{calc.sourceNotes}</p>
              )}
            </div>

            <Separator />

            {/* STEP 3: Consumer Audit */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Step 3: Consumer Audit
              </p>
              <ConsumerAudit audit={calc.consumerAudit} />
            </div>

            <Separator />

            {/* STEP 4: Regression Testing */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Step 4: Regression Testing (2017 / 2020 / 2023 / 2026)
              </p>
              <RegressionResults regression={calc.regressionResults} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}