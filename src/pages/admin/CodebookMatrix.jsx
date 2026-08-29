import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CALCULATORS } from "@/data/nec/audit";
import { computeGate, GATE_META } from "@/lib/verificationGate";
import { check2017ArticleCompliance, HIGH_RISK_2017_CALCULATORS, POST_2017_ARTICLES } from "@/lib/nec2017Compliance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AIVerificationPanel from "@/components/admin/AIVerificationPanel";
import AppUsagePanel from "@/components/admin/AppUsagePanel";
import ResizableTh from "@/components/admin/ResizableTh";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, ShieldCheck,
  Loader2, Filter, X, ChevronDown, ChevronUp, RefreshCw, Brain,
  AlertCircle, ShieldAlert, Eye, CopyCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const YEARS = ["2017", "2020", "2023", "2026"];

const STATUS_OPTIONS = [
  { value: "pending_review",                   label: "Pending Review",            icon: Clock,        color: "text-slate-500" },
  { value: "ai_reviewed_pending_human_approval", label: "AI Reviewed — Awaiting Admin", icon: Brain,    color: "text-purple-600" },
  { value: "verified",                         label: "Verified",                  icon: CheckCircle2, color: "text-emerald-600" },
  { value: "needs_correction",                 label: "Needs Correction",          icon: XCircle,      color: "text-rose-600" },
];

const SOURCE_TYPE_OPTIONS = [
  { value: "pending",                label: "Pending" },
  { value: "manual_codebook_review", label: "Manual Codebook Review" },
  { value: "licensed_source",        label: "Licensed Source" },
];

// Extract a numeric sort key from an article reference string.
// "210.8(A)" → 210.8, "Table 220.42" → 220.42, "Ch.9 Table 8" → 908, "—" → 9999
function articleSortKey(ref) {
  if (!ref || ref.startsWith("—")) return 9999;
  const chMatch = ref.match(/^Ch\.(\d+)\s+Table\s+(\d+)/);
  if (chMatch) return parseInt(chMatch[1]) * 100 + parseInt(chMatch[2]);
  const tableMatch = ref.match(/^Table\s+([\d.]+)/);
  if (tableMatch) return parseFloat(tableMatch[1]);
  const numMatch = ref.match(/^([\d.]+)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 9999;
}

// ── Inline editable cell ─────────────────────────────────────────────────────
function EditableCell({ value, onSave, placeholder, multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value || "");
  const commit = () => { onSave(draft); setEditing(false); };

  if (editing) {
    return multiline ? (
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        rows={2} className="w-full text-xs border border-blue-400 rounded px-1.5 py-1 bg-card resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
    ) : (
      <input autoFocus type="text" value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()}
        className="w-full text-xs border border-blue-400 rounded px-1.5 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder={placeholder} />
    );
  }
  return (
    <span onClick={() => { setDraft(value || ""); setEditing(true); }}
      className={`cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 block text-xs break-words whitespace-pre-wrap ${value ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
      {value || placeholder || "—"}
    </span>
  );
}

function SelectCell({ value, options, onSave, disabled }) {
  return (
    <select value={value || ""} onChange={e => onSave(e.target.value)} disabled={disabled}
      className="text-xs border border-input rounded px-1.5 py-1 bg-card w-full focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function GateBadge({ gate }) {
  const m = GATE_META[gate];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.short}
    </span>
  );
}

function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${opt.color}`}>
      <Icon className="w-3 h-3" /> {opt.label}
    </span>
  );
}

// ── 2017 Compliance Pass ─────────────────────────────────────────────────────
function NEC2017CompliancePass({ allRows, records }) {
  const violations = useMemo(() => {
    const v = [];
    for (const row of allRows) {
      if (row.necYear !== "2017") continue;
      const check = check2017ArticleCompliance(row.articleRef);
      if (check.isViolation) {
        v.push({
          ...row,
          violation: check,
          severity: "critical",
          message: `Article ${row.articleRef} was added in NEC ${check.addedIn} and did NOT exist in 2017 NEC. App must not apply this rule when year=2017.`,
        });
      }
    }
    return v;
  }, [allRows]);

  const highRiskRows = useMemo(() => {
    return allRows.filter(r =>
      r.necYear === "2017" && HIGH_RISK_2017_CALCULATORS.includes(r.calcId)
    );
  }, [allRows]);

  const pendingHighRisk = highRiskRows.filter(r => {
    const rec = records[r.key];
    return !rec || rec.status === "pending_review" || rec.status === "ai_reviewed_pending_human_approval";
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-blue-800 dark:text-blue-300">NEC 2017 Isolation Rules</p>
          <ul className="mt-1.5 space-y-1 text-blue-700 dark:text-blue-400 text-xs">
            <li>• Jurisdiction amendments are <strong>ignored</strong> — base 2017 code only</li>
            <li>• Articles added in 2020/2023/2026 must <strong>not</strong> be applied when year=2017</li>
            <li>• App values must exactly match 2017 NEC source — no rounding, no inheritance from later editions</li>
            <li>• A 2017 record may only be set to Verified by a human admin after AI review</li>
          </ul>
        </div>
      </div>

      {/* Cross-year contamination failures */}
      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Cross-Year Contamination Failures
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-bold",
            violations.length > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
          )}>
            {violations.length}
          </span>
        </h3>
        {violations.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> No cross-year contamination detected in 2017 article references.
          </div>
        ) : (
          <div className="space-y-2">
            {violations.map(v => (
              <div key={v.key} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-red-700 dark:text-red-300">{v.calcName} — {v.articleRef}</p>
                  <p className="text-red-600 dark:text-red-400 mt-0.5">{v.message}</p>
                  <p className="text-muted-foreground mt-0.5">Added in NEC {v.violation.addedIn}: {v.violation.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High-risk calculator status */}
      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          High-Risk 2017 Calculators
          <span className="text-xs text-muted-foreground font-normal">(EV charging, GFCI, SPD, service sizing, dwelling load)</span>
        </h3>
        <div className="space-y-2">
          {highRiskRows.map(row => {
            const rec = records[row.key];
            const status = rec?.status || "pending_review";
            const isPending = status === "pending_review";
            const isAiPending = status === "ai_reviewed_pending_human_approval";
            const isVerified = status === "verified";
            return (
              <div key={row.key} className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border text-xs",
                isVerified ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" :
                isAiPending ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" :
                "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              )}>
                <div>
                  <span className="font-semibold text-foreground">{row.calcName}</span>
                  <code className="ml-2 text-muted-foreground font-mono">{row.articleRef}</code>
                </div>
                <StatusBadge status={status} />
              </div>
            );
          })}
        </div>
        {pendingHighRisk.length > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="inline w-3 h-3 mr-1" />
            {pendingHighRisk.length} high-risk article{pendingHighRisk.length > 1 ? "s" : ""} still pending verification for 2017.
          </p>
        )}
      </div>

      {/* Post-2017 article registry */}
      <div>
        <h3 className="text-sm font-bold mb-3">Post-2017 Article Registry</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-3 py-2">Article</th>
                <th className="text-left px-3 py-2">Added In</th>
                <th className="text-left px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {Object.entries(POST_2017_ARTICLES).map(([ref, info]) => (
                <tr key={ref} className="hover:bg-muted/20">
                  <td className="px-3 py-2"><code className="font-mono font-semibold">{ref}</code></td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold">NEC {info.addedIn}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{info.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Row detail panel (expandable) ─────────────────────────────────────────────
// AI Review panel now renders as a full-width row below the data row (see CodebookMatrix).

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CodebookMatrix() {
  const { user } = useAuth();
  const [records, setRecords]           = useState({});
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [filterCalc, setFilterCalc]     = useState("");
  const [filterYear, setFilterYear]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showInfoOnly, setShowInfoOnly] = useState(false);
  const [expandedCalcs, setExpandedCalcs] = useState({});
  const [activeTab, setActiveTab]       = useState("matrix"); // "matrix" | "2017pass"
  const [openAIReviews, setOpenAIReviews] = useState({});
  const [openDetails, setOpenDetails] = useState({});
  const [colWidths, setColWidths] = useState({
    article: 170, ruleName: 130, valueUsed: 100, year: 50,
    status: 200, sourceType: 160, verifiedBy: 110, date: 100,
    notes: 240, amend: 40,
  });

  const handleResizeStart = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];
    const handleMouseMove = (ev) => {
      const newWidth = Math.max(40, startWidth + (ev.clientX - startX));
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.ArticleVerification.list("-updated_date", 5000);
      const map = {};
      for (const r of recs) {
        map[`${r.calculator_id}|${r.article_ref}|${r.nec_year}`] = r;
      }
      setRecords(map);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const saveField = useCallback(async (calcId, articleRef, necYear, field, value) => {
    // Guard: only admins may set status to 'verified'
    if (field === "status" && value === "verified") return;

    const key = `${calcId}|${articleRef}|${necYear}`;
    const existing = records[key];
    const patch = { [field]: value };

    setRecords(prev => ({
      ...prev,
      [key]: { ...(existing || { calculator_id: calcId, article_ref: articleRef, nec_year: necYear }), ...patch },
    }));
    setSaving(key);

    try {
      if (existing?.id) {
        await base44.entities.ArticleVerification.update(existing.id, patch);
      } else {
        const created = await base44.entities.ArticleVerification.create({
          calculator_id: calcId, article_ref: articleRef, nec_year: necYear, ...patch,
        });
        setRecords(prev => ({ ...prev, [key]: created }));
      }
    } catch (e) { /* ignore */ }
    setSaving(null);
  }, [records]);

  const handleRecordSaved = useCallback((saved) => {
    const key = `${saved.calculator_id}|${saved.article_ref}|${saved.nec_year}`;
    setRecords(prev => ({ ...prev, [key]: saved }));
  }, []);

  const syncDuplicates = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Build map of article_ref -> [calculator_ids] from CALCULATORS
      const refToCalcs = {};
      for (const calc of CALCULATORS) {
        if (!calc.articles) continue;
        for (const art of calc.articles) {
          if (!refToCalcs[art.ref]) refToCalcs[art.ref] = [];
          if (!refToCalcs[art.ref].includes(calc.id)) refToCalcs[art.ref].push(calc.id);
        }
      }

      // Get all 2017 records
      const recs = await base44.entities.ArticleVerification.filter({ nec_year: "2017" }, "-updated_date", 5000);

      // Build map by calculator_id|article_ref (most recently updated wins)
      const existingByKey = {};
      for (const r of recs) {
        const key = `${r.calculator_id}|${r.article_ref}`;
        if (!existingByKey[key] || new Date(r.updated_date) > new Date(existingByKey[key].updated_date)) {
          existingByKey[key] = r;
        }
      }

      const toUpdate = [];
      const toCreate = [];

      for (const [ref, calcIds] of Object.entries(refToCalcs)) {
        if (calcIds.length <= 1) continue;

        // Find source: a record with verified_date set by the reviewer
        const records = calcIds.map(c => existingByKey[`${c}|${ref}`]).filter(Boolean);
        const source = records.find(r => r.verified_date);
        if (!source) continue;

        for (const calcId of calcIds) {
          const key = `${calcId}|${ref}`;
          const existing = existingByKey[key];

          if (!existing) {
            toCreate.push({
              calculator_id: calcId, article_ref: ref, nec_year: "2017",
              source_type: "manual_codebook_review",
              verified_date: source.verified_date,
              verified_by: source.verified_by || "",
              status: "pending_review",
            });
          } else if (existing.id !== source.id &&
                     (existing.source_type !== "manual_codebook_review" || !existing.verified_date)) {
            toUpdate.push({
              id: existing.id,
              source_type: "manual_codebook_review",
              verified_date: source.verified_date,
              verified_by: source.verified_by || "",
            });
          }
        }
      }

      for (const u of toUpdate) {
        await base44.entities.ArticleVerification.update(u.id, {
          source_type: u.source_type, verified_date: u.verified_date, verified_by: u.verified_by,
        });
      }
      for (const c of toCreate) {
        await base44.entities.ArticleVerification.create(c);
      }

      await loadRecords();
      setSyncResult({ updated: toUpdate.length, created: toCreate.length });
    } catch (e) {
      setSyncResult({ error: e.message });
    }
    setSyncing(false);
  }, [loadRecords]);

  const gates = useMemo(() => {
    const statusMap = {};
    for (const [key, rec] of Object.entries(records)) {
      statusMap[key] = rec.status || "pending_review";
    }
    const g = {};
    for (const calc of CALCULATORS) {
      for (const year of YEARS) {
        g[`${calc.id}|${year}`] = computeGate(calc.id, calc.articles, year, statusMap);
      }
    }
    return g;
  }, [records]);

  const allRows = useMemo(() => {
    const rows = [];
    for (const calc of CALCULATORS) {
      if (!calc.articles || calc.articles.length === 0) continue;
      for (const art of calc.articles) {
        for (const year of YEARS) {
          const key = `${calc.id}|${art.ref}|${year}`;
          rows.push({
            key, calcId: calc.id, calcName: calc.name,
            articleRef: art.ref, articleDesc: art.desc,
            articleNote: art.note, articleSource: art.source, articleChanged: art.changed,
            isInfoOnly: !!(art.note && art.note.includes("NoteBox")),
            sourceNotes: calc.sourceNotes,
            necYear: year, gate: gates[`${calc.id}|${year}`],
            record: records[key] || null,
          });
        }
      }
    }
    return rows;
  }, [records, gates]);

  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (!showInfoOnly && r.isInfoOnly) return false;
      if (filterCalc && !r.calcName.toLowerCase().includes(filterCalc.toLowerCase()) &&
          !r.calcId.toLowerCase().includes(filterCalc.toLowerCase())) return false;
      if (filterYear && r.necYear !== filterYear) return false;
      if (filterStatus) {
        const recStatus = r.record?.status || "pending_review";
        if (filterStatus === "missing")      return !r.record;
        if (filterStatus === "2026_pending") return r.necYear === "2026";
        if (filterStatus !== recStatus)      return false;
      }
      return true;
    });
  }, [allRows, filterCalc, filterYear, filterStatus]);

  const groupedFiltered = useMemo(() => {
    const groups = {};
    for (const row of filtered) {
      if (!groups[row.calcId]) groups[row.calcId] = { calcName: row.calcName, calcId: row.calcId, rows: [] };
      groups[row.calcId].rows.push(row);
    }
    // Sort articles within each calculator by NEC article number (least → greatest), then by year
    for (const g of Object.values(groups)) {
      g.rows.sort((a, b) => {
        const keyA = articleSortKey(a.articleRef);
        const keyB = articleSortKey(b.articleRef);
        if (keyA !== keyB) return keyA - keyB;
        return a.necYear.localeCompare(b.necYear);
      });
    }
    return Object.values(groups);
  }, [filtered]);

  const totalRows      = allRows.length;
  const verifiedCount  = allRows.filter(r => r.record?.status === "verified").length;
  const aiPendingCount = allRows.filter(r => r.record?.status === "ai_reviewed_pending_human_approval").length;
  const pendingCount   = allRows.filter(r => !r.record || r.record.status === "pending_review").length;
  const correctionCount= allRows.filter(r => r.record?.status === "needs_correction").length;
  const missingCount   = allRows.filter(r => !r.record).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading verification matrix…</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Codebook Verification Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every article used by every calculator — verified against the exact NEC edition.
            Only a human admin may mark status as <strong>"Verified"</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={syncDuplicates} disabled={syncing} className="gap-1.5">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CopyCheck className="w-3.5 h-3.5" />}
            Sync Duplicates
          </Button>
          <Button variant="outline" size="sm" onClick={loadRecords} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
          syncResult.error ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
        )}>
          {syncResult.error ? (
            <><AlertTriangle className="w-3.5 h-3.5" /> {syncResult.error}</>
          ) : (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Synced: {syncResult.updated} updated, {syncResult.created} created</>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total references",          val: totalRows,      color: "text-foreground" },
          { label: "Verified",                  val: verifiedCount,  color: "text-emerald-600" },
          { label: "AI Review — Awaiting Admin", val: aiPendingCount, color: "text-purple-600" },
          { label: "Pending review",             val: pendingCount,   color: "text-amber-600" },
          { label: "Needs correction",           val: correctionCount,color: "text-rose-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Integrity note */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Verification integrity:</strong> AI review does not automatically verify any record.
          After AI review, status becomes "AI Reviewed — Awaiting Admin". Only you (admin) can advance to "Verified"
          by clicking "Mark Verified" in the AI Review panel. Never mark Verified without reviewing the AI explanation.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: "matrix", label: "Full Matrix" },
          { key: "2017pass", label: "🔒 2017 Isolation Pass" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2017 Isolation Pass */}
      {activeTab === "2017pass" && (
        <NEC2017CompliancePass allRows={allRows} records={records} />
      )}

      {/* Full Matrix */}
      {activeTab === "matrix" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input placeholder="Filter by calculator…" value={filterCalc}
              onChange={e => setFilterCalc(e.target.value)} className="h-8 w-48 text-xs" />
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="h-8 text-xs border border-input rounded-md px-2 bg-card">
              <option value="">All years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="h-8 text-xs border border-input rounded-md px-2 bg-card">
              <option value="">All statuses</option>
              <option value="verified">Verified</option>
              <option value="ai_reviewed_pending_human_approval">AI Reviewed — Awaiting Admin</option>
              <option value="pending_review">Pending Review</option>
              <option value="needs_correction">Needs Correction</option>
              <option value="missing">No record yet</option>
              <option value="2026_pending">2026 pending</option>
            </select>
            {(filterCalc || filterYear || filterStatus) && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                onClick={() => { setFilterCalc(""); setFilterYear(""); setFilterStatus(""); }}>
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
            <button
              onClick={() => setShowInfoOnly(s => !s)}
              className={cn(
                "h-8 px-3 text-xs border rounded-md whitespace-nowrap",
                showInfoOnly ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" : "bg-card border-input text-muted-foreground"
              )}
              title="Info-only articles are displayed as notes to the user but do not affect calculation results"
            >
              {showInfoOnly ? "✓ Showing info-only" : "Hiding info-only"}
            </button>
            <span className="text-xs text-muted-foreground ml-1">{filtered.length} rows</span>
          </div>

          {/* Matrix grouped by calculator */}
          <div className="space-y-4">
            {groupedFiltered.map(group => {
              const isExpanded = expandedCalcs[group.calcId] !== false;
              return (
                <div key={group.calcId} className="border border-border rounded-xl overflow-x-auto">
                  <button
                    onClick={() => setExpandedCalcs(p => ({ ...p, [group.calcId]: !isExpanded }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-sm">{group.calcName}</span>
                      <code className="text-[10px] font-mono text-muted-foreground">{group.calcId}</code>
                      <div className="flex gap-1.5 flex-wrap">
                        {YEARS.map(y => <GateBadge key={y} gate={gates[`${group.calcId}|${y}`]} />)}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="text-xs" style={{ tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <ResizableTh width={colWidths.article} onResizeStart={(e) => handleResizeStart(e, "article")} className="text-left px-3 py-2 font-semibold">Article / Table</ResizableTh>
                            <ResizableTh width={colWidths.ruleName} onResizeStart={(e) => handleResizeStart(e, "ruleName")} className="text-left px-3 py-2 font-semibold">Rule Name</ResizableTh>
                            <ResizableTh width={colWidths.valueUsed} onResizeStart={(e) => handleResizeStart(e, "valueUsed")} className="text-left px-3 py-2 font-semibold">Value Used</ResizableTh>
                            <ResizableTh width={colWidths.year} onResizeStart={(e) => handleResizeStart(e, "year")} className="text-left px-3 py-2 font-semibold">Year</ResizableTh>
                            <ResizableTh width={colWidths.status} onResizeStart={(e) => handleResizeStart(e, "status")} className="text-left px-3 py-2 font-semibold">Status</ResizableTh>
                            <ResizableTh width={colWidths.sourceType} onResizeStart={(e) => handleResizeStart(e, "sourceType")} className="text-left px-3 py-2 font-semibold">Source Type</ResizableTh>
                            <ResizableTh width={colWidths.verifiedBy} onResizeStart={(e) => handleResizeStart(e, "verifiedBy")} className="text-left px-3 py-2 font-semibold">Verified By</ResizableTh>
                            <ResizableTh width={colWidths.date} onResizeStart={(e) => handleResizeStart(e, "date")} className="text-left px-3 py-2 font-semibold">Date</ResizableTh>
                            <ResizableTh width={colWidths.notes} onResizeStart={(e) => handleResizeStart(e, "notes")} className="text-left px-3 py-2 font-semibold">Notes</ResizableTh>
                            <ResizableTh width={colWidths.amend} onResizeStart={(e) => handleResizeStart(e, "amend")} className="text-left px-3 py-2 font-semibold text-center">Amend</ResizableTh>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {group.rows.map(row => {
                            const rec = row.record || {};
                            const isSaving = saving === row.key;
                            const is2026   = row.necYear === "2026";
                            const is2017   = row.necYear === "2017";
                            const contaminated = is2017 && check2017ArticleCompliance(row.articleRef).isViolation;

                            return (
                              <React.Fragment key={row.key}>
                                <tr className={cn(
                                  "hover:bg-muted/20 transition-colors",
                                  contaminated ? "bg-red-50/60 dark:bg-red-950/20" :
                                  is2026       ? "bg-red-50/30 dark:bg-red-950/10" : "",
                                  isSaving     ? "opacity-60" : ""
                                )}>
                                  <td className="px-3 py-2 align-top">
                                    <code className="font-mono font-semibold text-foreground">{row.articleRef}</code>
                                    {contaminated && (
                                      <span className="ml-1 px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[9px] font-bold">POST-2017</span>
                                    )}
                                    {row.isInfoOnly && (
                                      <span className="ml-1 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold" title="Displayed as a note to the user — does not affect calculation results">INFO ONLY</span>
                                    )}
                                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{row.articleDesc}</div>
                                    <button
                                      onClick={() => setOpenDetails(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      App Usage
                                      {openDetails[row.key] ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3 rotate-180" />}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 align-top overflow-hidden">
                                    <EditableCell value={rec.rule_name} placeholder="Add rule name…"
                                      onSave={v => saveField(row.calcId, row.articleRef, row.necYear, "rule_name", v)} />
                                  </td>
                                  <td className="px-3 py-2 align-top overflow-hidden">
                                    <EditableCell value={rec.value_used} placeholder="e.g. 3 VA/sq ft"
                                      onSave={v => saveField(row.calcId, row.articleRef, row.necYear, "value_used", v)} />
                                  </td>
                                  <td className="px-3 py-2 align-top text-center">
                                    <span className={cn("font-bold", is2026 ? "text-red-600" : is2017 ? "text-blue-600" : "text-muted-foreground")}>{row.necYear}</span>
                                  </td>
                                  <td className="px-3 py-2 align-top overflow-hidden">
                                    {is2026 ? (
                                      <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">Pending publication</span>
                                    ) : (
                                      <>
                                        {/* Status selector — verified is locked to human approval only */}
                                        <select
                                          value={rec.status || "pending_review"}
                                          onChange={e => {
                                            // Admin can set anything EXCEPT verified via dropdown — verified requires AI review + approval
                                            if (e.target.value !== "verified") {
                                              saveField(row.calcId, row.articleRef, row.necYear, "status", e.target.value);
                                            }
                                          }}
                                          className="text-xs border border-input rounded px-1.5 py-1 bg-card w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        >
                                          {STATUS_OPTIONS.filter(o => o.value !== "verified").map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                          ))}
                                          {rec.status === "verified" && (
                                            <option value="verified">✓ Verified</option>
                                          )}
                                        </select>
                                        <button
                                          onClick={() => setOpenAIReviews(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                                          className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 mt-1"
                                        >
                                          <Brain className="w-3 h-3" />
                                          AI Review
                                          {openAIReviews[row.key] ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3 rotate-180" />}
                                        </button>
                                      </>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 align-top overflow-hidden">
                                    {!is2026 && (
                                      <SelectCell value={rec.source_type || "pending"} options={SOURCE_TYPE_OPTIONS}
                                        onSave={v => saveField(row.calcId, row.articleRef, row.necYear, "source_type", v)} />
                                    )}
                                  </td>
                                  <td className="px-3 py-2 align-top overflow-hidden">
                                    <EditableCell value={rec.verified_by} placeholder="Name…"
                                      onSave={v => saveField(row.calcId, row.articleRef, row.necYear, "verified_by", v)} />
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input type="date" value={rec.verified_date || ""}
                                      onChange={e => saveField(row.calcId, row.articleRef, row.necYear, "verified_date", e.target.value)}
                                      className="text-xs border border-input rounded px-1 py-0.5 bg-card w-28 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                  </td>
                                  <td className="px-3 py-2 align-top overflow-hidden">
                                    <EditableCell value={rec.notes} placeholder="Reviewer notes…" multiline
                                      onSave={v => saveField(row.calcId, row.articleRef, row.necYear, "notes", v)} />
                                  </td>
                                  <td className="px-3 py-2 align-top text-center">
                                    <input type="checkbox" checked={!!rec.local_amendment}
                                      onChange={e => saveField(row.calcId, row.articleRef, row.necYear, "local_amendment", e.target.checked)}
                                      title="Local amendment may override this value"
                                      className="w-3.5 h-3.5 cursor-pointer" />
                                  </td>
                                </tr>
                                {openAIReviews[row.key] && !is2026 && (
                                  <tr>
                                    <td colSpan={10} className="px-4 py-3 bg-muted/20">
                                      <div className="rounded-xl bg-card border border-border p-4 max-w-2xl space-y-2">
                                        <AIVerificationPanel
                                          row={row}
                                          record={records[row.key]}
                                          onRecordSaved={handleRecordSaved}
                                          currentUser={user}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                {openDetails[row.key] && (
                                  <tr>
                                    <td colSpan={10} className="px-4 py-3 bg-blue-50/30 dark:bg-blue-950/10">
                                      <AppUsagePanel row={row} />
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {groupedFiltered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No rows match the current filters.
            </div>
          )}
        </>
      )}
    </div>
  );
}