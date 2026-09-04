import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, BarChart3, ChevronDown, Check, Flag, AlertTriangle, XCircle, Save } from "lucide-react";
import SaveCalculationDialog from "@/components/calculator/SaveCalculationDialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getNecData } from "@/data/nec";
import { base44 } from "@/api/base44Client";
import ReportDiscrepancy from "@/components/calculator/ReportDiscrepancy";
import CalculationTrace from "@/components/calculator/CalculationTrace";
import { useArticleVerification } from "@/hooks/useArticleVerification";
import { computeGate, GATE_META } from "@/lib/verificationGate";
import { getCalculator } from "@/data/nec/audit";
import { useCalcRestore } from "@/context/CalcRestoreContext";

const VALID_YEARS = ["2017", "2020", "2023", "2026"];

export function CalcLayout({ category, children, result, trace, necYear, inputValues, outputValues }) {
  const isValidYear = VALID_YEARS.includes(necYear);
  const necData = isValidYear ? getNecData(necYear) : null;
  const [tab, setTab] = useState("inputs");
  const [showSave, setShowSave] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [openReportCount, setOpenReportCount] = useState(0);
  const { getStatus, verificationMap } = useArticleVerification(necYear);
  const restore = useCalcRestore();

  // Compute verification gate from live records
  const calcDef = getCalculator(category.id);
  const gate = isValidYear
    ? computeGate(category.id, calcDef?.articles, necYear, verificationMap || {})
    : "invalid";
  const gateMeta = GATE_META[gate];

  useEffect(() => {
    // Check for open discrepancy reports for this calculator
    base44.entities.DiscrepancyReport.filter({ calculator_id: category.id, status: "open" })
      .then(recs => setOpenReportCount(recs.length))
      .catch(() => setOpenReportCount(0));
  }, [category.id]);

  if (!isValidYear) {
    return (
      <div className="rounded-2xl border-2 border-destructive/50 bg-destructive/5 p-6 flex flex-col items-center gap-3 text-center">
        <XCircle className="w-10 h-10 text-destructive" />
        <div>
          <p className="font-bold text-destructive text-base">No NEC Year Selected</p>
          <p className="text-sm text-muted-foreground mt-1">
            A valid NEC code year is required to run this calculation.
            Please select <strong>2017</strong>, <strong>2020</strong>, <strong>2023</strong>, or <strong>2026</strong> from the year selector before proceeding.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-4 sm:p-5 text-white shadow-lg shadow-blue-200/60">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-50 bg-white/15 border border-white/20 rounded-full px-2 py-0.5 mb-2 font-mono">
              {category.article}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold leading-tight">{category.label}</h2>
            <p className="text-xs text-blue-100 mt-1">{category.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowSave(true)}
              className="h-9 px-3 rounded-xl bg-white text-blue-700 text-xs font-bold shadow-sm hover:bg-blue-50 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 shadow-inner flex items-center justify-center text-2xl">
              {category.emoji || "⚡"}
            </div>
          </div>
        </div>
      </div>

      {restore?.title && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
          Loaded <strong>{restore.title}</strong>
          {restore.projectName ? ` from ${restore.projectName}` : ""}. Change the numbers, then Save to update this job.
        </div>
      )}
      <div className="flex bg-muted rounded-xl p-1 sm:hidden gap-1">
        <button
          onClick={() => setTab("inputs")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
            tab === "inputs" ? "bg-card shadow text-blue-600" : "text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Inputs
        </button>
        <button
          onClick={() => setTab("results")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
            tab === "results" ? "bg-card shadow text-blue-600" : "text-muted-foreground"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Results
        </button>
      </div>

      {/* Content — desktop: side by side. Mobile: tabbed */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Inputs panel */}
        <div className={cn(
          "rounded-2xl bg-card border border-border shadow-md p-4",
          "sm:block", tab !== "inputs" && "hidden sm:block"
        )}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3" /> Inputs
          </p>
          <div className="space-y-4">{children}</div>
          {/* Mobile shortcut to results */}
          <button
            onClick={() => setTab("results")}
            className="sm:hidden mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold shadow-md shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            View Results →
          </button>
        </div>

        {/* Results panel */}
        <div className={cn(
          "calculator-results rounded-2xl bg-card border border-border shadow-md p-4",
          "sm:block overflow-y-auto max-h-[80vh] sm:max-h-none",
          tab !== "results" && "hidden sm:block"
        )}>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> Results & Reference
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSave(true)}
                className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                title="Report a discrepancy in this calculation"
              >
                <Flag className="w-3 h-3" /> Report
              </button>
            </div>
          </div>
          {openReportCount > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Community review in progress for this calculator. Submitted reports are being evaluated.</span>
            </div>
          )}
          {result ? (
           <>
             {result}
             {trace && <CalculationTrace trace={trace} getStatus={getStatus} necYear={necYear} />}
           </>
          ) : (
           <div className="text-center py-12 text-muted-foreground text-sm">
             Enter values to calculate
           </div>
          )}
          <SaveCalculationDialog
            open={showSave}
            onOpenChange={setShowSave}
            category={category}
            necYear={necYear}
            inputValues={inputValues}
            outputValues={outputValues}
          />
          <ReportDiscrepancy
            calculatorId={category.id}
            calculatorName={category.label}
            necYear={necYear}
            inputs={inputValues}
            outputs={outputValues}
            open={showReport}
            onOpenChange={setShowReport}
          />
        </div>
      </div>
    </div>
  );
}

export function Field({ label, unit, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-foreground flex items-center justify-between">
        <span>{label}</span>
        {unit && <span className="text-muted-foreground font-normal text-[11px]">{unit}</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

export function ResultRow({ label, value, unit, highlight, sub, failed }) {
  const baseClasses = "flex items-center justify-between py-3 px-3.5 rounded-xl transition-colors duration-200";
  const bgClasses = failed
    ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800"
    : highlight
    ? "bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/50 dark:to-violet-950/50 border border-blue-200 dark:border-blue-800 shadow-sm"
    : "bg-muted/50 border border-transparent hover:bg-muted/70";
  const textClasses = failed ? "text-red-700 dark:text-red-300" : highlight ? "text-blue-700 dark:text-blue-300" : "text-foreground";
  const valueClasses = failed ? "text-red-600 dark:text-red-400 text-base" : highlight ? "text-blue-600 dark:text-blue-300 text-lg" : "text-foreground text-sm";

  return (
    <div className={cn(baseClasses, bgClasses)}>
      <div className="flex-1 min-w-0 mr-3">
        <span className={cn("text-sm font-semibold leading-snug", textClasses)}>
          {label}
        </span>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={cn("font-extrabold tabular-nums flex-shrink-0", valueClasses)}>
        {value}{unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export function ResultSection({ title, children }) {
  return (
    <div className="calc-result-section space-y-1.5">
      {title && (
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4 mb-2 flex items-center gap-1.5">
          <span className="block w-3 h-px bg-muted-foreground/40" />
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function NoteBox({ children, title }) {
  return (
    <div className="calc-note-card mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
      <p className="font-bold mb-1.5 text-amber-700 dark:text-amber-400 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
        <span>📋</span> {title || "Code Notes (data-derived)"}
      </p>
      {children}
    </div>
  );
}

export function NumInput({ value, onChange, placeholder, min, max, step }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step || "any"}
      className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-base sm:text-sm font-medium shadow-sm transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-400 focus-visible:bg-card text-foreground"
    />
  );
}

export function Select({ value, onChange, options }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => String(o.value) === String(value)) || options[0];

  // Desktop: native select for best UX
  if (!isMobile) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-400 focus-visible:bg-card appearance-none text-foreground"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  // Mobile: Drawer bottom sheet
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-muted/50 px-3.5 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-left text-foreground"
        >
          <span className="truncate">{selected?.label}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-sm text-muted-foreground font-medium">Select an option</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-1 overflow-y-auto max-h-[60vh]">
          {options.map(o => {
            const isActive = String(o.value) === String(value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                  isActive ? "bg-blue-600 text-white" : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                <span>{o.label}</span>
                {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}