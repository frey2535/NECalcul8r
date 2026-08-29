import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, AlertTriangle, ShieldCheck, Layers, FileCheck, Search,
  Calculator as CalcIcon,
} from "lucide-react";
import {
  CALCULATOR_VERIFICATION_INDEX,
  CALCULATOR_VERIFICATION_SUMMARY,
  getCalculatorsByCategory,
} from "@/data/nec/CalculatorVerificationIndex";
import CalculatorVerificationCard from "@/components/CalculatorVerificationCard";

const STATUS_DOT = {
  verified: "✅",
  correct: "✅",
  needs_verification: "⏳",
  assumed: "⚠️",
  missing: "❌",
  placeholder: "📝",
  copied_from_another_edition: "📋",
};

const STATUS_LABEL = {
  verified: "VERIFIED",
  correct: "VERIFIED (pure math)",
  needs_verification: "NEEDS VERIFICATION",
  assumed: "ASSUMED",
  missing: "MISSING",
  placeholder: "PLACEHOLDER",
  copied_from_another_edition: "COPIED",
};

export default function CalculatorVerification() {
  const [search, setSearch] = useState("");
  const grouped = useMemo(() => getCalculatorsByCategory(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return CALCULATOR_VERIFICATION_INDEX;
    const q = search.toLowerCase();
    return CALCULATOR_VERIFICATION_INDEX.filter(
      (c) =>
        c.calculatorName.toLowerCase().includes(q) ||
        c.calculatorId.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.dependencies.some((d) => d.necArticle.toLowerCase().includes(q))
    );
  }, [search]);

  const summary = CALCULATOR_VERIFICATION_SUMMARY;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Calculator Verification — Release Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Calculator-centric verification: "Can every calculator be trusted for the 2020 NEC?"
          Each calculator's dependency matrix shows every NEC article, table, exception, note, and
          calculation that affects it — and whether each dependency is implemented, verified, or missing.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm"><CardContent className="p-4">
          <div className="text-2xl font-bold">{summary.totalCalculators}</div>
          <div className="text-xs text-muted-foreground">Total calculators</div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-600">
            {summary.status2020.correct + summary.status2020.verified}
          </div>
          <div className="text-xs text-muted-foreground">2020 verified / correct</div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4">
          <div className="text-2xl font-bold text-amber-600">
            {summary.status2020.needs_verification + summary.status2020.assumed}
          </div>
          <div className="text-xs text-muted-foreground">Needs verification</div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {summary.verifiedDependencies} / {summary.totalDependencies}
          </div>
          <div className="text-xs text-muted-foreground">Dependencies verified</div>
        </CardContent></Card>
      </div>

      {/* Release Dashboard — compact list */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-blue-500" /> Release Dashboard
          </p>
          <p className="text-xs text-muted-foreground">
            Every calculator and its 2020 verification status. A calculator is only marked
            "VERIFIED" when every applicable NEC dependency has been reviewed against the
            official 2020 NEC text.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs font-mono">
            {filtered.map((calc) => (
              <div key={calc.calculatorId} className="flex items-center justify-between py-0.5 border-b border-border/40">
                <span className="truncate">{calc.calculatorName}</span>
                <span className="shrink-0 ml-2 font-bold">
                  {STATUS_DOT[calc.status2020]} {STATUS_LABEL[calc.status2020]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by calculator name, category, or NEC article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Dependency Matrix Summary */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" /> Calculator Dependency Matrix — Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="font-bold text-lg">{summary.totalDependencies}</div>
              <div className="text-muted-foreground">Total NEC dependencies</div>
            </div>
            <div>
              <div className="font-bold text-lg text-emerald-600">{summary.verifiedDependencies}</div>
              <div className="text-muted-foreground">Verified dependencies</div>
            </div>
            <div>
              <div className="font-bold text-lg text-amber-600">{summary.displayOnlyDependencies}</div>
              <div className="text-muted-foreground">Display-only dependencies</div>
            </div>
            <div>
              <div className="font-bold text-lg text-blue-600">{summary.runtimeDependencies}</div>
              <div className="text-muted-foreground">Runtime calculation deps</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cards by Category */}
      {Object.entries(grouped).map(([cat, calcs]) => {
        const catFiltered = calcs.filter((c) =>
          !search.trim() ||
          c.calculatorName.toLowerCase().includes(search.toLowerCase()) ||
          c.calculatorId.toLowerCase().includes(search.toLowerCase()) ||
          c.dependencies.some((d) => d.necArticle.toLowerCase().includes(search.toLowerCase()))
        );
        if (catFiltered.length === 0) return null;
        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {cat}
              <Badge variant="outline" className="text-[10px]">{catFiltered.length}</Badge>
            </h2>
            {catFiltered.map((calc) => (
              <CalculatorVerificationCard key={calc.calculatorId} calc={calc} />
            ))}
          </div>
        );
      })}

      {/* Footer note */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 shadow-sm">
        <CardContent className="p-4 space-y-2 text-sm">
          <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Verification Limitation
          </p>
          <p className="text-xs text-muted-foreground">
            No calculator can be marked "2020 VERIFIED" until every NEC dependency has been
            reviewed against the official NFPA 70-2020 codebook text. Current source data is
            based on recognized secondary sources (Eaton, Mike Holt, Captain Code/IAEI) and
            developer assumptions — none are verified against authorized primary NEC text.
            The dependency matrix above identifies exactly what remains before release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}