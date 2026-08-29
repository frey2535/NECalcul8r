import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const ACCENT = {
  violet: { border: "border-violet-200 dark:border-violet-800", bg: "bg-white dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400", borderT: "border-violet-200 dark:border-violet-800" },
  blue: { border: "border-blue-200 dark:border-blue-800", bg: "bg-white dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", borderT: "border-blue-200 dark:border-blue-800" },
  emerald: { border: "border-emerald-200 dark:border-emerald-800", bg: "bg-white dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", borderT: "border-emerald-200 dark:border-emerald-800" },
  cyan: { border: "border-cyan-200 dark:border-cyan-800", bg: "bg-white dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-400", borderT: "border-cyan-200 dark:border-cyan-800" },
};

function StatusItem({ label, status }) {
  if (status === "yes") return <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> {label}</span>;
  if (status === "pending") return <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> {label}</span>;
  return <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-3 h-3" /> {label}</span>;
}

export default function ArticleStatusCard({ article }) {
  const a = ACCENT[article.accentColor] || ACCENT.blue;
  const impl = article.implementationStatus;

  const gridItems = [
    { label: "Documented", status: impl.documented ? "yes" : "no" },
    { label: "Traced", status: impl.traced ? "yes" : "no" },
    { label: article.displayedLabel, status: impl.displayed ? "yes" : "no" },
    { label: "Year-aware", status: impl.yearAware ? "yes" : "no" },
    { label: "2017 preserved", status: impl.preserved2017 ? "yes" : "no" },
    { label: "Official verification pending", status: impl.officialSourceVerificationPending ? "pending" : "no" },
    impl.noCalculatorByDesign
      ? { label: "No calculator by design", status: "yes" }
      : { label: "Active calculator logic", status: impl.activeCalculatorLogic ? "yes" : "no" },
    { label: "Runtime evaluation", status: impl.runtimeEvaluation ? "yes" : "no" },
  ];

  return (
    <div className={`px-3 py-2.5 rounded-lg border ${a.border} ${a.bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <code className={`text-[11px] font-mono font-semibold ${a.text}`}>{article.article}</code>
        <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Review complete — verification pending</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground mb-1.5">{article.title}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        {gridItems.map((item, i) => <StatusItem key={i} {...item} />)}
      </div>
      {article.status2017 && (
        <div className={`mt-2 pt-2 border-t ${a.borderT}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${a.text} mb-1.5`}>2017-Specific Status</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <StatusItem label="Explicit field ownership" status={article.status2017.explicitFieldOwnership ? "yes" : "no"} />
            <StatusItem label="Displayed (null — no render)" status={article.status2017.displayed ? "yes" : "no"} />
            <StatusItem label="Active calculator logic" status={article.status2017.activeCalculatorLogic ? "yes" : "no"} />
            <StatusItem label="Runtime evaluation" status={article.status2017.runtimeEvaluation ? "yes" : "no"} />
            <StatusItem label="Official NEC verified" status={article.status2017.officialNecVerified ? "yes" : "no"} />
            <StatusItem label={article.status2017.pendingLabel || "Verification pending"} status={article.status2017.verificationPending ? "pending" : "no"} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 italic">{article.status2017.pendingReason}</p>
        </div>
      )}
    </div>
  );
}