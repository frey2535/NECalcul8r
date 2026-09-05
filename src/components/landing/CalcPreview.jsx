import React from "react";
import { cn } from "@/lib/utils";
// All mockup components use static string literals (✓/✗) — no icon imports needed

// ─── Shared mockup primitives (replicate CalcLayout styling exactly) ───

function MockHeader({ article, label, emoji, gradient = "from-blue-600 to-violet-600" }) {
  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg shadow-blue-200", gradient)}>
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

function MockField({ label, unit, value }) {
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

function MockResultRow({ label, value, unit, highlight, sub, failed }) {
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

function MockResultSection({ title, children }) {
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

function MockNoteBox({ children, title }) {
  return (
    <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
      <p className="font-bold mb-1 text-amber-700 uppercase tracking-wide text-[10px]">
        {title || "📋 Code Notes (data-derived)"}
      </p>
      {children}
    </div>
  );
}

function MockFormulaStep({ label, expression, result, unit }) {
  return (
    <div className="py-2.5 border-b border-border/40 last:border-0">
      <p className="text-xs font-bold text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{expression}</p>
      <p className="text-sm font-extrabold text-blue-600 mt-1">= {result}{unit ? ` ${unit}` : ""}</p>
    </div>
  );
}

// ─── Voltage Drop Calculator Mockup ───

export function VoltageDropPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 210.19 / 215.2" label="Voltage Drop" emoji="⚡" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MockField label="Voltage" unit="V" value="120" />
        <MockField label="Current" unit="A" value="20" />
        <MockField label="One-way Distance" unit="ft" value="100" />
        <MockField label="Material" value="Copper" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Selected Wire Performance">
          <MockResultRow label="Voltage Drop" value="6.18" unit="V" highlight />
          <MockResultRow label="Voltage Drop %" value="5.15" unit="%" highlight failed />
          <MockResultRow label="End Voltage" value="113.8" unit="V" />
          <MockResultRow label="3% Branch Limit" value="✗ FAIL" failed />
          <MockResultRow label="5% Total Limit" value="✓ PASS" />
        </MockResultSection>
        <MockResultSection title="Minimum Wire for Compliance">
          <MockResultRow label="≤3% Wire Size" value="#10 AWG" sub="NEC 210.19 recommendation" highlight />
          <MockResultRow label="≤5% Wire Size" value="#12 AWG" sub="NEC 215.2 recommendation" />
        </MockResultSection>
        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="block w-3 h-px bg-slate-400" />
            Step-by-Step Calculation
          </p>
          <MockFormulaStep label="Voltage Drop (Single-Phase)" expression="VD = (2 × 12.9 × 20 × 100) / 6,530" result="6.18" unit="V" />
          <MockFormulaStep label="Voltage Drop Percentage" expression="VD% = (6.18 / 120) × 100" result="5.15" unit="%" />
        </div>
      </div>
    </div>
  );
}

// ─── Conductor Ampacity Mockup ───

export function ConductorAmpacityPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 310.15" label="Conductor Ampacity" emoji="🔌" gradient="from-emerald-500 to-green-600" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MockField label="Conductor Size" value="#12 AWG" />
        <MockField label="Material" value="Copper" />
        <MockField label="Insulation Rating" unit="°C" value="75°C (THWN)" />
        <MockField label="Ambient Temp" unit="°C" value="30°C" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Ampacity Results">
          <MockResultRow label="Base Ampacity (75°C)" value="25" unit="A" highlight />
          <MockResultRow label="Temp Correction Factor" value="1.00" sub="30°C ambient — no derating" />
          <MockResultRow label="Bundling Adjustment" value="1.00" sub="3 conductors — no derating" />
          <MockResultRow label="Derated Ampacity" value="25" unit="A" highlight />
          <MockResultRow label="OCPD (Next Size Up)" value="30" unit="A" sub="Per NEC 240.4(B)" />
        </MockResultSection>
        <MockNoteBox>
          NEC 310.15(B)(16): Base ampacity for #12 Cu @ 75°C = 25A. At 30°C ambient, correction factor is 1.00. With ≤3 conductors in raceway, no bundling derating applies.
        </MockNoteBox>
      </div>
    </div>
  );
}

// ─── Dwelling Load Mockup ───

export function DwellingLoadPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 220.82" label="Dwelling Load (Standard)" emoji="🏠" gradient="from-orange-400 to-orange-500" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MockField label="Square Footage" unit="sq ft" value="2,000" />
        <MockField label="Small Appliance Circuits" value="2" />
        <MockField label="Range" unit="W" value="12,000" />
        <MockField label="Dryer" unit="W" value="5,000" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Load Calculation">
          <MockResultRow label="General Lighting (3 VA/sq ft)" value="6,000" unit="VA" />
          <MockResultRow label="Small Appliance (1,500 VA × 2)" value="3,000" unit="VA" />
          <MockResultRow label="Laundry Circuit" value="1,500" unit="VA" />
          <MockResultRow label="Lighting Demand (Table 220.42)" value="5,700" unit="VA" sub="100% first 3k + 35% remainder" />
          <MockResultRow label="Range Demand (Table 220.55)" value="8,000" unit="VA" sub="Column C, 1 appliance" />
          <MockResultRow label="Dryer Demand" value="5,000" unit="VA" sub="Min 5,000W per 220.54" />
          <MockResultRow label="Total Service Load" value="18,700" unit="VA" highlight />
          <MockResultRow label="Minimum Service Size" value="100" unit="A" highlight sub="Per NEC 230.79(C)" />
        </MockResultSection>
        <MockNoteBox>
          NEC 220.82: Standard method for single-family dwellings. General lighting at 3 VA/sq ft, minimum 2 small appliance circuits at 1,500 VA each, plus laundry circuit. Demand factors from Table 220.42 applied to lighting load.
        </MockNoteBox>
      </div>
    </div>
  );
}

// ─── EGC Sizing Mockup ───

export function EGCSizingPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 250.122" label="Equipment Grounding" emoji="🌍" gradient="from-amber-500 to-orange-500" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MockField label="OCPD Rating" unit="A" value="200" />
        <MockField label="Material" value="Copper" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="EGC Sizing Result">
          <MockResultRow label="Minimum EGC Size" value="#6 AWG" sub="Copper, per Table 250.122" highlight />
          <MockResultRow label="Aluminum Equivalent" value="#4 AWG" sub="If aluminum EGC used" />
        </MockResultSection>
        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="block w-3 h-px bg-slate-400" />
            Table 250.122 Lookup
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 px-2 rounded-lg bg-white border border-slate-200">
              <span className="font-semibold">100A → Cu #8</span>
              <span className="text-muted-foreground">Al #6</span>
            </div>
            <div className="flex justify-between py-1 px-2 rounded-lg bg-blue-50 border border-blue-200">
              <span className="font-bold text-blue-700">200A → Cu #6</span>
              <span className="text-blue-600 font-semibold">Al #4</span>
            </div>
            <div className="flex justify-between py-1 px-2 rounded-lg bg-white border border-slate-200">
              <span className="font-semibold">400A → Cu #3</span>
              <span className="text-muted-foreground">Al #1</span>
            </div>
          </div>
        </div>
        <MockNoteBox>
          NEC 250.122: Equipment grounding conductor sized by OCPD rating. Where circuit conductors are increased in size for voltage drop, EGC must also be proportionally increased.
        </MockNoteBox>
      </div>
    </div>
  );
}

// ─── RV Park Load Mockup ───

export function RVParkPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC Table 551.73(A)" label="RV Park / Campsite Load" emoji="🚐" gradient="from-emerald-500 to-green-600" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MockField label="20A Sites" value="10" />
        <MockField label="30A Sites" value="20" />
        <MockField label="50A Sites" value="5" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Service Calculation">
          <MockResultRow label="Total Connected RV Load" value="156,000" unit="VA" />
          <MockResultRow label="Total Campsite Count" value="35" unit="sites" />
          <MockResultRow label="Demand Factor (Table 551.73(A))" value="42" unit="%" sub="25–35 sites tier" />
          <MockResultRow label="RV Demand Load" value="65,520" unit="VA" highlight />
          <MockResultRow label="Total Service Load" value="75,520" unit="VA" highlight />
          <MockResultRow label="Service Current" value="314.7" unit="A" />
          <MockResultRow label="Minimum Standard Service" value="350" unit="A" highlight />
          <MockResultRow label="Recommended Conductor (75°C)" value="500 kcmil" sub="Copper · 380A · sized to 350A service disconnect" highlight />
          <MockResultRow label="EGC Size (Table 250.122)" value="#3 AWG" sub="Copper" />
        </MockResultSection>
        <MockNoteBox>
          NEC Table 551.73(A): Demand factors for site feeders and service-entrance conductors for RV park sites. 35 sites → 42% demand factor. Conductor sized to service disconnect rating per NEC 230.42(A).
        </MockNoteBox>
      </div>
    </div>
  );
}