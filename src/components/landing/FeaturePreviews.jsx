import React from "react";
import { cn } from "@/lib/utils";
import { BookOpen, ShieldCheck, Calendar, Check, FileText, Database, Eye } from "lucide-react";

// ─── NEC Tables Page Preview ───

export function NECTablesPreview() {
  const tables = [
    { id: "310.15(B)(16)", name: "Conductor Ampacity", article: "310.15(B)(16)", rows: 4 },
    { id: "250.122", name: "EGC Sizing", article: "Table 250.122", rows: 3 },
    { id: "220.42", name: "Lighting Demand", article: "220.42", rows: 3 },
    { id: "220.55", name: "Cooking Demand", article: "Table 220.55", rows: 3 },
    { id: "430.250", name: "Motor FLC (3Ø)", article: "Table 430.250", rows: 4 },
    { id: "551.73(A)", name: "RV Park Demand", article: "Table 551.73(A)", rows: 3 },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-4 text-white">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-extrabold">NEC Reference Tables</h2>
        </div>
        <p className="text-xs text-blue-100 mt-1">30+ embedded tables · NEC 2023</p>
      </div>
      <div className="p-3 space-y-2 max-h-[340px] overflow-hidden">
        {tables.map((t, i) => (
          <div key={t.id} className={cn(
            "rounded-xl border p-3 transition-all",
            i === 0 ? "bg-blue-50 border-blue-200" : "bg-muted/30 border-border"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{t.article}</p>
              </div>
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full",
                i === 0 ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
              )}>
                {i === 0 ? "VIEWING" : "AVAILABLE"}
              </span>
            </div>
            {i === 0 && (
              <div className="space-y-1">
                {[1, 2, 3, 4].map(r => (
                  <div key={r} className="flex items-center gap-2 text-[10px] font-mono py-1 px-2 rounded-lg bg-white border border-blue-100">
                    <span className="font-bold text-blue-600 w-16">#{r === 1 ? "12" : r === 2 ? "10" : r === 3 ? "8" : "6"} AWG</span>
                    <span className="text-muted-foreground flex-1">Cu · 75°C</span>
                    <span className="font-bold text-foreground">{r === 1 ? "25" : r === 2 ? "35" : r === 3 ? "50" : "65"} A</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calculation Trace Panel Preview ───

export function CalculationTracePreview() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-4 text-white">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          <h2 className="text-lg font-extrabold">Calculation Trace</h2>
        </div>
        <p className="text-xs text-slate-300 mt-1">Voltage Drop · NEC 2023</p>
      </div>
      <div className="p-3 space-y-2">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">100%</span>
          </div>
          <div className="space-y-1.5">
            {[
              { icon: FileText, label: "NEC Articles", value: "Ch.9 Table 8", status: "verified" },
              { icon: Database, label: "Data Fields", value: "RESISTIVITY · CM", status: "verified" },
              { icon: BookOpen, label: "Source Edition", value: "NFPA 70-2023", status: "verified" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-white border border-emerald-100">
                  <Icon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold text-foreground flex-1">{item.label}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">{item.value}</span>
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">Verification Progress</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-violet-600 rounded-full" style={{ width: "100%" }} />
            </div>
            <span className="text-xs font-bold text-blue-600">3/3</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">All references verified against NEC 2023</p>
        </div>
      </div>
    </div>
  );
}

// ─── NEC Year Selector Preview ───

export function NECYearSelectorPreview() {
  const years = [
    { year: "2017", changes: ["GFCI basements", "Island/peninsula"] },
    { year: "2020", changes: ["GFCI expansion", "Outdoor disconnect", "EV GFCI"], active: false },
    { year: "2023", changes: ["SPD required", "Dishwasher GFCI"], active: true },
    { year: "2026", changes: ["Upcoming cycle"], active: false },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <h2 className="text-lg font-extrabold">NEC Edition Selector</h2>
        </div>
        <p className="text-xs text-amber-100 mt-1">Switch between code cycles</p>
      </div>
      <div className="p-3 space-y-2">
        {years.map(y => (
          <div key={y.year} className={cn(
            "rounded-xl border p-3 transition-all",
            y.active ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200" : "bg-muted/30 border-border"
          )}>
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-sm font-extrabold", y.active ? "text-amber-700" : "text-foreground")}>
                NEC {y.year}
              </span>
              {y.active && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {y.changes.map(c => (
                <span key={c} className={cn(
                  "text-[9px] font-semibold px-1.5 py-0.5 rounded-md",
                  y.active ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                )}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}