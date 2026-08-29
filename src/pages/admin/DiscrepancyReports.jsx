import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CALCULATORS } from "@/data/nec/audit";
import {
  CheckCircle2, XCircle, Eye, MessageSquare, Filter, Loader2, ArrowUpDown,
  Clock, FileText, Image, ChevronDown, ChevronUp,
} from "lucide-react";

const STATUS_META = {
  open:     { label: "Open",     color: "bg-rose-100 text-rose-700 border-rose-200" },
  reviewed: { label: "Reviewed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function DiscrepancyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [expandedId, setExpandedId] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});
  const debounceTimers = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = {};
      if (filter !== "all") query = { status: filter };
      const recs = await base44.entities.DiscrepancyReport.list("-created_date", 200, query);
      setReports(recs);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (reportId, newStatus) => {
    await base44.entities.DiscrepancyReport.update(reportId, { status: newStatus, admin_notes: adminNotes[reportId] || "" });
    load();
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byStatus = { open: 0, reviewed: 0, accepted: 0, rejected: 0 };
    const byCalc = {};
    const byCalcYear = {};
    for (const r of reports) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byCalc[r.calculator_id] = (byCalc[r.calculator_id] || 0) + 1;
      const cy = `${r.calculator_id}|${r.nec_year}`;
      byCalcYear[cy] = (byCalcYear[cy] || 0) + 1;
    }
    return { byStatus, byCalc, byCalcYear };
  }, [reports]);

  const totalReports = reports.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Discrepancy Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalReports} total reports from users
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["open", "reviewed", "accepted", "rejected", "all"].map(s => {
          const count = s === "all" ? totalReports : (stats.byStatus[s] || 0);
          const meta = STATUS_META[s] || { label: "All", color: "bg-slate-100 text-slate-600 border-slate-200" };
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === s ? `${meta.color} ring-2 ring-offset-1` : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              {s === "open" && <Clock className="w-3 h-3" />}
              {s === "reviewed" && <Eye className="w-3 h-3" />}
              {s === "accepted" && <CheckCircle2 className="w-3 h-3" />}
              {s === "rejected" && <XCircle className="w-3 h-3" />}
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["open", "reviewed", "accepted", "rejected"].map(s => {
          const meta = STATUS_META[s];
          const Icon = s === "open" ? Clock : s === "reviewed" ? Eye : s === "accepted" ? CheckCircle2 : XCircle;
          return (
            <Card key={s}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${s === "open" ? "text-rose-500" : s === "accepted" ? "text-emerald-500" : "text-muted-foreground"}`} />
                <div>
                  <div className="text-xl font-bold">{stats.byStatus[s] || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{meta.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calculator breakdown */}
      {Object.keys(stats.byCalc).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            Reports by Calculator
            {filter === "open" && " (open only)"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCalc)
              .sort((a, b) => b[1] - a[1])
              .map(([calcId, count]) => {
                const calc = CALCULATORS.find(c => c.id === calcId);
                return (
                  <Badge key={calcId} variant="outline" className="text-[11px]">
                    {calc?.name || calcId}: <strong className="ml-1">{count}</strong>
                  </Badge>
                );
              })}
          </div>
        </div>
      )}

      <Separator />

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No {filter !== "all" ? filter : ""} reports.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const isExpanded = expandedId === r.id;
            const meta = STATUS_META[r.status];
            return (
              <Card key={r.id} className={`overflow-hidden ${r.status === "open" ? "border-rose-200 dark:border-rose-800" : ""}`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full text-left px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{r.calculator_name}</span>
                        <Badge variant="outline" className="text-[10px] py-0">NEC {r.nec_year}</Badge>
                        <Badge variant="outline" className={`text-[10px] py-0 ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.explanation}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        {r.article_ref && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {r.article_ref}</span>}
                        {r.file_urls?.length > 0 && <span className="flex items-center gap-1"><Image className="w-3 h-3" /> {r.file_urls.length} attachment(s)</span>}
                        {r.contact_email && <span>{r.contact_email}</span>}
                        <span>{new Date(r.created_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
                    {r.article_ref && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Article/Table</span>
                        <p className="text-sm">{r.article_ref}</p>
                      </div>
                    )}
                    {r.current_result && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Current App Result</span>
                        <p className="text-sm font-mono bg-muted rounded px-2 py-1 mt-0.5">{r.current_result}</p>
                      </div>
                    )}
                    {r.expected_result && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Expected Result</span>
                        <p className="text-sm font-mono bg-muted rounded px-2 py-1 mt-0.5">{r.expected_result}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">Explanation</span>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{r.explanation}</p>
                    </div>

                    {/* Attachments */}
                    {r.file_urls?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Attachments</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {r.file_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className="block max-w-[200px] rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all">
                              <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-32 object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.contact_email && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Contact</span>
                        <p className="text-sm">{r.contact_email}</p>
                      </div>
                    )}

                    {/* Admin actions */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">Admin Notes</span>
                      <Textarea
                      value={adminNotes[r.id] ?? r.admin_notes ?? ""}
                      onChange={e => {
                        const val = e.target.value;
                        setAdminNotes(p => ({ ...p, [r.id]: val }));
                        clearTimeout(debounceTimers.current[r.id]);
                        debounceTimers.current[r.id] = setTimeout(() => {
                          base44.entities.DiscrepancyReport.update(r.id, { admin_notes: val });
                        }, 500);
                      }}
                      placeholder="Internal review notes…"
                      className="text-xs mt-1 min-h-[60px]"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap pt-1">
                      {r.status !== "reviewed" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "reviewed")}
                          className="text-xs h-8"><Eye className="w-3 h-3 mr-1" /> Mark Reviewed</Button>
                      )}
                      {r.status !== "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "accepted")}
                          className="text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                        </Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "rejected")}
                          className="text-xs h-8 border-rose-300 text-rose-700 hover:bg-rose-50">
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}