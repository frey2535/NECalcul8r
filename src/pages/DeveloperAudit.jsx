import React, { useState, useMemo, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  CALCULATORS, getDynamicCalculators, getYearSensitiveCalculators, getGroupedCalculators, NEC_CHANGE_LOG,
} from "@/data/nec/audit";
import { getNecData } from "@/data/nec";
import { normalizeArticleVerificationStatus } from "@/lib/articleVerificationStatus";
import { articleRefForYear } from "@/lib/verificationGate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import {
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Gauge, BookOpen,
  ShieldCheck, ShieldAlert, FileSearch, Clock, XCircle, Loader2, Flag, ExternalLink,
  ArrowLeftRight, Info,
} from "lucide-react";

const YEARS = ["2017", "2020", "2023", "2026"];
const GLOBAL_REF_PREFIX = "global";

// ─── Status helpers ────────────────────────────────────────────────────────
const STATUS_CYCLE = ["pending_review", "verified", "needs_correction"];

const STATUS_META = {
  pending_review:  { label: "Pending",    icon: Clock,       color: "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200" },
  ai_reviewed_pending_human_approval: { label: "AI reviewed", icon: FileSearch, color: "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200" },
  verified:        { label: "Verified",   icon: ShieldCheck, color: "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200" },
  needs_correction:{ label: "Needs fix",  icon: XCircle,     color: "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200" },
};

function verificationKey(calcId, articleRef, year) {
  return `${calcId}|${articleRef}|${year}`;
}

function mergeVerificationStatus(current = "pending_review", next = "pending_review") {
  if (current === "needs_correction" || next === "needs_correction") return "needs_correction";
  if (current === "verified" || next === "verified") return "verified";
  if (current === "ai_reviewed_pending_human_approval" || next === "ai_reviewed_pending_human_approval") {
    return "ai_reviewed_pending_human_approval";
  }
  return "pending_review";
}

function getVerificationStatus(verifications, calcId, articleRef, year) {
  const specific = verifications[verificationKey(calcId, articleRef, year)] || "pending_review";
  const global = verifications[verificationKey(GLOBAL_REF_PREFIX, articleRef, year)] || "pending_review";
  return mergeVerificationStatus(global, specific);
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ usesGetNecData }) {
  return usesGetNecData
    ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 text-[11px]"><CheckCircle2 className="w-3 h-3" /> Dynamic</Badge>
    : <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 gap-1 text-[11px]">Static</Badge>;
}

function YearShield({ year, verified }) {
  return (
    <div className="flex items-center gap-1" title={verified ? `All articles verified for NEC ${year}` : `Some articles pending for NEC ${year}`}>
      {verified
        ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
      <span className={`text-xs font-medium ${verified ? "text-emerald-700" : "text-amber-700"}`}>{year}</span>
    </div>
  );
}

function ArticleRow({ article, calcId, verifications, onToggle }) {
  const hasYearRefs = !!article.yearRefs;
  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] whitespace-nowrap shrink-0">{article.ref}</code>
          {hasYearRefs && <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 py-0 h-4">Year refs</Badge>}
          <span className="text-foreground font-medium">{article.desc}</span>
          {article.changed
            ? <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 py-0 h-4">Changed</Badge>
            : <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-600 py-0 h-4">Stable</Badge>}
        </div>
        {article.note && <div className="text-[10px] text-muted-foreground mt-0.5">{article.note}</div>}
      </div>
      {/* Per-year verification toggles */}
      <div className="flex items-center gap-1 shrink-0">
        {YEARS.map(y => {
          const resolvedRef = articleRefForYear(article, y);
          const status = getVerificationStatus(verifications, calcId, resolvedRef, y);
          const meta = STATUS_META[status] || STATUS_META.pending_review;
          const Icon = meta.icon;
          return (
            <button
              key={y}
              onClick={() => onToggle(calcId, resolvedRef, y, status)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${meta.color}`}
              title={`${resolvedRef} / NEC ${y}: ${meta.label} — click to cycle`}
            >
              <Icon className="w-3 h-3" />
              <span>{y}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TestCaseCard({ calc }) {
  const [expanded, setExpanded] = useState(false);

  const results = useMemo(() => {
    if (!calc.calculate || !calc.testInputs) return null;
    const r = {};
    for (const y of YEARS) r[y] = { outputs: calc.calculate(calc.testInputs, getNecData(y)) };
    return r;
  }, [calc]);

  const diffs = useMemo(() => {
    if (!results) return [];
    const allKeys = new Set();
    for (const y of YEARS) Object.keys(results[y].outputs).forEach(k => allKeys.add(k));
    return [...allKeys].filter(key => new Set(YEARS.map(y => JSON.stringify(results[y].outputs[key]))).size > 1);
  }, [results]);

  if (!results) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
        <div className="flex items-center gap-2">
          {diffs.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          <span className="text-sm font-medium">Test: {calc.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {diffs.length > 0 && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">{diffs.length} diff</Badge>}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="border-b border-border">
              <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Output</th>
              {YEARS.map(y => <th key={y} className="text-right py-1.5 px-2 font-semibold text-muted-foreground">{y}</th>)}
            </tr></thead>
            <tbody>
              {Object.keys(results["2023"].outputs).map(key => {
                const isDiff = diffs.includes(key);
                return (
                  <tr key={key} className={`border-b border-border/50 ${isDiff ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                    <td className="py-1.5 px-2 font-medium">{isDiff && <AlertTriangle className="w-3 h-3 text-amber-500 inline mr-1" />}{key}</td>
                    {YEARS.map(y => {
                      const val = results[y].outputs[key];
                      const d = typeof val === "boolean" ? (val ? "Yes" : "No") : (val ?? "—");
                      return <td key={y} className={`py-1.5 px-2 text-right font-mono ${isDiff ? "font-bold text-amber-800 dark:text-amber-300" : ""}`}>{d}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function DeveloperAudit() {
  const [verifications, setVerifications] = useState({});
  const [openReports, setOpenReports] = useState({}); // calcId → count
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // "calcId|articleRef|year"

  // ── Load existing verifications + open reports ───────────────────────────
  const loadVerifications = useCallback(async () => {
    try {
      const [records, reportRecords] = await Promise.all([
        base44.entities.ArticleVerification.list("-created_date", 2000),
        base44.entities.DiscrepancyReport.list("-created_date", 1000, { status: "open" }),
      ]);
      const map = {};
      for (const r of records) {
        const status = normalizeArticleVerificationStatus(r.status);
        const key = verificationKey(r.calculator_id, r.article_ref, r.nec_year);
        map[key] = mergeVerificationStatus(map[key], status);
        const globalKey = verificationKey(GLOBAL_REF_PREFIX, r.article_ref, r.nec_year);
        map[globalKey] = mergeVerificationStatus(map[globalKey], status);
      }
      setVerifications(map);
      // Group open reports by calculator_id
      const rptMap = {};
      for (const r of reportRecords) {
        rptMap[r.calculator_id] = (rptMap[r.calculator_id] || 0) + 1;
      }
      setOpenReports(rptMap);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadVerifications(); }, [loadVerifications]);

  // ── Toggle article verification status ───────────────────────────────────
  const handleToggle = useCallback(async (calcId, articleRef, year, currentStatus) => {
    const nextIdx = (STATUS_CYCLE.indexOf(currentStatus) + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIdx];
    const key = `${calcId}|${articleRef}|${year}`;

    // Optimistic update
    setVerifications(prev => ({ ...prev, [key]: nextStatus }));
    setSaving(key);

    try {
      // Upsert: find existing record or create
      const existing = await base44.entities.ArticleVerification.filter({
        calculator_id: calcId, article_ref: articleRef, nec_year: year,
      });
      if (existing.length > 0) {
        await base44.entities.ArticleVerification.update(existing[0].id, { status: nextStatus });
      } else {
        await base44.entities.ArticleVerification.create({
          calculator_id: calcId, article_ref: articleRef, nec_year: year, status: nextStatus,
        });
      }
    } catch (e) {
      // Revert on error
      setVerifications(prev => ({ ...prev, [key]: currentStatus }));
    }
    setSaving(null);
  }, []);

  // ── Compute calculator/year verification ─────────────────────────────────
  const calcYearVerification = useMemo(() => {
    const result = {};
    for (const calc of CALCULATORS) {
      const articles = calc.articles || [];
      if (articles.length === 0) {
        // Pure math — always verified
        result[calc.id] = { "2017": true, "2020": true, "2023": true, "2026": true };
        continue;
      }
      const perYear = {};
      for (const y of YEARS) {
        perYear[y] = articles.every(a => {
          const articleRef = articleRefForYear(a, y);
          return getVerificationStatus(verifications, calc.id, articleRef, y) === "verified";
        });
      }
      result[calc.id] = perYear;
    }
    return result;
  }, [verifications]);

  // ── Counts ───────────────────────────────────────────────────────────────
  const dynamicCount = getDynamicCalculators().length;
  const yearSensitive = getYearSensitiveCalculators();
  const staticCount = CALCULATORS.filter(c => !c.usesGetNecData).length;
  const grouped = useMemo(() => getGroupedCalculators(), []);

  const fullyVerified = CALCULATORS.filter(c => {
    const v = calcYearVerification[c.id];
    return v && Object.values(v).every(x => x);
  }).length;

  const needsReview = CALCULATORS.filter(c => {
    const v = calcYearVerification[c.id];
    return v && Object.values(v).some(x => !x);
  }).length;

  const totalOpenReports = Object.values(openReports).reduce((s, c) => s + c, 0);
  const calcsWithReports = Object.keys(openReports).length;

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading verification data…</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Developer Audit — Verification Workflow</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click each year badge to cycle: <span className="text-slate-500">Pending</span> → <span className="text-emerald-700">Verified</span> → <span className="text-rose-700">Needs correction</span>. Calculator badges turn green when every article is verified.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{CALCULATORS.length}</div><div className="text-xs text-muted-foreground">Total calculators</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-emerald-600">{dynamicCount}</div><div className="text-xs text-muted-foreground">Use getNecData</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-emerald-600">{fullyVerified}</div><div className="text-xs text-muted-foreground">Fully verified</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-amber-600">{needsReview}</div><div className="text-xs text-muted-foreground">Needs review</div></CardContent></Card>
      </div>

      {/* Unresolved user reports warning */}
      {totalOpenReports > 0 && (
        <Alert className="border-rose-200 bg-rose-50 dark:bg-rose-950/20">
          <Flag className="w-4 h-4 text-rose-600" />
          <AlertDescription className="text-sm text-rose-800 dark:text-rose-300">
            <strong>{totalOpenReports} unresolved discrepancy report{totalOpenReports !== 1 ? "s" : ""}</strong> across{" "}
            <strong>{calcsWithReports} calculator{calcsWithReports !== 1 ? "s" : ""}</strong>.{" "}
            <Link to="/admin/reports" className="underline inline-flex items-center gap-0.5 font-medium hover:text-rose-900">
              Review reports <ExternalLink className="w-3 h-3" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Status key */}
      <div className="flex flex-wrap gap-2 text-[11px] items-center">
        <span className="text-muted-foreground font-medium">Click badges to cycle:</span>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <span key={key} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] ${meta.color}`}>
              <Icon className="w-3 h-3" /> {meta.label}
            </span>
          );
        })}
      </div>

      {needsReview > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <FileSearch className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{needsReview} calculators</strong> need article verification. Click each article's year badge to mark it verified after confirming against the actual NEC codebook for that year. Green calculator shields appear only when every article has been independently verified.
          </AlertDescription>
        </Alert>
      )}

      {yearSensitive.length > 0 && (
        <Alert className="border-rose-200 bg-rose-50 dark:bg-rose-950/20">
          <Gauge className="w-4 h-4 text-rose-600" />
          <AlertDescription className="text-sm text-rose-800 dark:text-rose-300">
            <strong>{yearSensitive.length} year-sensitive calculator:</strong>{" "}
            {yearSensitive.map(c => c.name).join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {/* Per-category detail */}
      {Object.entries(grouped).map(([groupName, groupCalcs]) => (
        <div key={groupName} className="space-y-3">
          <h2 className="text-lg font-semibold">{groupName}</h2>
          {groupCalcs.map(calc => {
            const yearV = calcYearVerification[calc.id] || {};
            const allGreen = Object.values(yearV).every(Boolean);
            return (
              <Card key={calc.id} className={`overflow-hidden ${allGreen && calc.articles?.length > 0 ? "ring-2 ring-emerald-200 dark:ring-emerald-800" : ""}`}>
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{calc.name}</span>
                        <StatusBadge usesGetNecData={calc.usesGetNecData} />
                        {calc.yearSensitive && (
                          <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 py-0 h-4">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Year Diff
                          </Badge>
                        )}
                        {allGreen && calc.articles?.length > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] gap-0.5 py-0 h-4">
                            <ShieldCheck className="w-3 h-3" /> All verified
                          </Badge>
                        )}
                        {openReports[calc.id] > 0 && (
                          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] gap-0.5 py-0 h-4 border border-rose-200 dark:border-rose-800">
                            <Flag className="w-3 h-3" /> {openReports[calc.id]} open report{openReports[calc.id] !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{calc.id}</div>
                    </div>
                    {/* Calculator-level shields */}
                    <div className="flex items-center gap-3 shrink-0">
                      {YEARS.map(y => <YearShield key={y} year={y} verified={yearV[y] || false} />)}
                    </div>
                  </div>

                  {/* Source notes */}
                  {calc.sourceNotes && (
                    <div className="px-4 pb-2">
                      <div className="flex items-start gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{calc.sourceNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Articles with per-year verification toggles */}
                  {calc.articles && calc.articles.length > 0 && (
                    <div className="border-t border-border">
                      <div className="px-4 py-1.5 bg-muted/30 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Articles ({calc.articles.length})
                        </span>
                        <span className="text-[9px] text-muted-foreground">Click year badge to cycle status</span>
                      </div>
                      <div className="px-4 py-1 divide-y divide-border/30">
                        {calc.articles.map((a, i) => (
                          <ArticleRow
                            key={i}
                            article={a}
                            calcId={calc.id}
                            verifications={verifications}
                            onToggle={handleToggle}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <Separator />

      {/* NEC Change Log */}
      <div>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-amber-600" />
          NEC Change Log — 2017 → 2020
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Code-cycle changes encoded in data layer. All entries are <strong>pending manual review</strong> against the actual NEC codebook.
        </p>
        <div className="space-y-3">
          {NEC_CHANGE_LOG.map(entry => (
            <Card key={entry.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap bg-amber-50/40 dark:bg-amber-950/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">{entry.article}</code>
                      <span className="font-semibold text-sm">{entry.title}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">{entry.cycle}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Affects: {entry.affectedCalcs.map(id => {
                        const c = CALCULATORS.find(x => x.id === id);
                        return c ? c.name.split(" (")[0] : id;
                      }).join(", ")}
                    </div>
                  </div>
                  <Badge className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    <Clock className="w-3 h-3 mr-0.5" /> Pending review
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border">
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">2017 Value / Requirement</p>
                    <p className="text-xs text-foreground">{entry.value2017}</p>
                  </div>
                  <div className="p-3 space-y-1 bg-blue-50/30 dark:bg-blue-950/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {entry.value2023 ? "2020 / 2023 Value" : "2020 Value / Requirement"}
                    </p>
                    <p className="text-xs text-foreground font-medium">{entry.value2020}</p>
                    {entry.value2023 && <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">2023+: {entry.value2023}</p>}
                  </div>
                </div>
                {entry.notes && (
                  <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[10px] text-muted-foreground">{entry.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Cross-year test cases */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Cross-Year Test Cases</h2>
        <p className="text-sm text-muted-foreground mb-4">Same inputs computed under each NEC year. Differences highlighted.</p>
        <div className="space-y-3">
          {CALCULATORS.filter(c => c.calculate && c.testInputs).map(calc => (
            <TestCaseCard key={calc.id} calc={calc} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> = All articles verified for this NEC year</span>
        <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-amber-500" /> = Some articles still pending verification</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-rose-500" /> = Year-sensitive — outputs differ across editions</span>
      </div>
    </div>
  );
}