import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, FileText, Database, Eye, Layers } from "lucide-react";

export default function ImplementationSummary({ summary }) {
  const items = [
    { label: "Articles reviewed", value: summary.articlesReviewed, icon: FileText, color: "text-slate-700 dark:text-slate-300" },
    { label: "Implementation reviews complete", value: summary.implementationReviewsComplete, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Pending review", value: summary.pendingReview, icon: AlertTriangle, color: summary.pendingReview > 0 ? "text-amber-600" : "text-slate-400" },
    { label: "Officially verified", value: summary.officiallyVerified, icon: CheckCircle2, color: summary.officiallyVerified > 0 ? "text-emerald-600" : "text-slate-400" },
    { label: "Pending verification", value: summary.pendingVerification, icon: AlertTriangle, color: "text-amber-600" },
    { label: "Display-only articles", value: summary.displayOnlyArticles, icon: Eye, color: "text-blue-600" },
    { label: "Runtime logic articles", value: summary.runtimeLogicArticles, icon: Database, color: summary.runtimeLogicArticles > 0 ? "text-blue-600" : "text-slate-400" },
    { label: "Numeric-impact articles", value: summary.numericImpactArticles, icon: Layers, color: summary.numericImpactArticles > 0 ? "text-amber-600" : "text-emerald-600" },
    { label: "Regression failures", value: summary.regressionFailures, icon: XCircle, color: summary.regressionFailures > 0 ? "text-rose-600" : "text-emerald-600" },
  ];

  return (
    <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <p className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4" /> NEC Implementation Summary
        </p>
        <p className="text-xs text-muted-foreground">
          Overall audit progress — read from <code className="font-mono">ArticleImplementationIndex.js</code> (authoritative source).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="px-3 py-2 rounded-lg bg-white dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}