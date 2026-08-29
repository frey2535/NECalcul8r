import React from "react";
import { cn } from "@/lib/utils";

export const gradientMap = {
  blue: "from-blue-600 to-violet-600",
  green: "from-emerald-500 to-green-600",
  purple: "from-purple-500 to-violet-600",
  orange: "from-orange-400 to-orange-500",
  red: "from-red-500 to-rose-600",
  teal: "from-teal-500 to-cyan-600",
  indigo: "from-indigo-500 to-indigo-600",
  yellow: "from-amber-400 to-yellow-500",
  slate: "from-slate-500 to-slate-600",
  amber: "from-amber-500 to-orange-500",
  cyan: "from-cyan-500 to-sky-600",
  gray: "from-gray-500 to-slate-600",
};

export const bgMap = {
  blue: "bg-blue-50 border-blue-100",
  green: "bg-emerald-50 border-emerald-100",
  purple: "bg-purple-50 border-purple-100",
  orange: "bg-orange-50 border-orange-100",
  red: "bg-red-50 border-red-100",
  teal: "bg-teal-50 border-teal-100",
  indigo: "bg-indigo-50 border-indigo-100",
  yellow: "bg-amber-50 border-amber-100",
  slate: "bg-slate-50 border-slate-100",
  amber: "bg-amber-50 border-amber-100",
  cyan: "bg-cyan-50 border-cyan-100",
  gray: "bg-gray-50 border-gray-100",
};

export function MockHeader({ article, label, emoji, color = "blue" }) {
  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg shadow-blue-200", gradientMap[color])}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-1">{article}</p>
          <h2 className="text-lg font-extrabold leading-tight">{label}</h2>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
          {emoji}
        </div>
      </div>
    </div>
  );
}

export function MockField({ label, unit, value }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-foreground flex items-center justify-between">
        <span>{label}</span>
        {unit && <span className="text-muted-foreground font-normal text-[11px]">{unit}</span>}
      </label>
      <div className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm text-foreground items-center">
        {value}
      </div>
    </div>
  );
}

export function MockResultRow({ label, value, unit, highlight, sub, failed }) {
  const baseClasses = "flex items-center justify-between py-3 px-3.5 rounded-xl";
  const bgClasses = failed
    ? "bg-red-50 border border-red-200"
    : highlight
    ? "bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200"
    : "bg-muted/50 border border-transparent";
  const textClasses = failed ? "text-red-700" : highlight ? "text-blue-700" : "text-foreground";
  const valueClasses = failed ? "text-red-600 text-base" : highlight ? "text-blue-600 text-base" : "text-foreground";

  return (
    <div className={cn(baseClasses, bgClasses)}>
      <div className="flex-1 min-w-0 mr-3">
        <span className={cn("text-sm font-semibold leading-snug", textClasses)}>{label}</span>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={cn("text-sm font-extrabold tabular-nums flex-shrink-0", valueClasses)}>
        {value}{unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export function MockResultSection({ title, children }) {
  return (
    <div className="space-y-1.5">
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

export function MockNoteBox({ children, title }) {
  return (
    <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
      <p className="font-bold mb-1 text-amber-700 uppercase tracking-wide text-[10px]">
        {title || "📋 Code Notes (data-derived)"}
      </p>
      {children}
    </div>
  );
}

export function MockFormulaStep({ label, expression, result, unit }) {
  return (
    <div className="py-2.5 border-b border-border/40 last:border-0">
      <p className="text-xs font-bold text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{expression}</p>
      <p className="text-sm font-extrabold text-blue-600 mt-1">= {result}{unit ? ` ${unit}` : ""}</p>
    </div>
  );
}

export function MockFormulaBox({ steps }) {
  return (
    <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span className="block w-3 h-px bg-slate-400" />
        Step-by-Step Calculation
      </p>
      {steps.map((s, i) => (
        <MockFormulaStep key={i} {...s} />
      ))}
    </div>
  );
}