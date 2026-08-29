import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "Reactive Power (kVAR)", formula: "kVAR = kW × tan(arccos(PF))", description: "Calculates reactive power at existing and target power factor" },
  { label: "kVAR Correction Needed", formula: "kVAR_cap = kVAR_existing − kVAR_target", description: "The capacitor bank must supply this difference in reactive power" },
  { label: "Apparent Power", formula: "kVA = kW / PF", description: "Improving PF reduces kVA demand and line current" },
  { label: "Line Current (3-phase)", formula: "I = (kVA × 1000) / (V × √3)", description: "Current reduction directly reduces conductor and equipment losses" },
];
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcPowerFactor } from "./logic/powerFactorCalc";

export default function PowerFactor({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["general_pf_multipliers", "general_std_voltages"], necYear);

  const [v, setV] = useCalculatorInputs({ kw: 100, currentPF: 0.75, targetPF: 0.95, voltage: 480, phases: "three" });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const pf = calcPowerFactor(v, nec);
  const { kVAR_existing, kVAR_target, kVAR_correction, kVA_existing, kVA_new,
    I_existing, I_new, I_reduction, capA, steps } = pf;
  const kW = parseFloat(v.kw) || 100;
  const pfExisting = parseFloat(v.currentPF) || 0.75;
  const pfTarget = parseFloat(v.targetPF) || 0.95;
  const voltage = parseFloat(v.voltage) || 480;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={pf} result={
      <div className="space-y-2">
        <ResultSection title="Before Correction">
          <ResultRow label="Real Power" value={kW.toFixed(1)} unit="kW" />
          <ResultRow label="Power Factor" value={pfExisting.toFixed(2)} />
          <ResultRow label="Apparent Power" value={kVA_existing.toFixed(1)} unit="kVA" />
          <ResultRow label="Reactive Power" value={kVAR_existing.toFixed(1)} unit="kVAR" />
          <ResultRow label="Line Current" value={I_existing.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="After Correction">
          <ResultRow label="Target PF" value={pfTarget.toFixed(2)} />
          <ResultRow label="Apparent Power" value={kVA_new.toFixed(1)} unit="kVA" />
          <ResultRow label="Line Current" value={I_new.toFixed(1)} unit="A" />
          <ResultRow label="Current Reduction" value={I_reduction.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="Required Capacitor Bank">
          <ResultRow label="kVAR Correction Needed" value={kVAR_correction.toFixed(1)} unit="kVAR" highlight />
          <ResultRow label="Capacitor Current" value={capA.toFixed(1)} unit="A" highlight />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 460.8: Capacitor conductors must be rated ≥{((nec.CAPACITOR_CONDUCTOR_MULTIPLIER || 1.35) * 100).toFixed(0)}% of rated capacitor current. kVAR = kW × (tan θ₁ − tan θ₂). Improving PF reduces line current, feeder losses, and utility demand charges.</NoteBox>
      </div>
    }>
      <Field label="Real Power" unit="kW"><NumInput value={v.kw} onChange={set("kw")} placeholder="100" /></Field>
      <Field label="Existing Power Factor"><NumInput value={v.currentPF} onChange={set("currentPF")} placeholder="0.75" step="0.01" min={0.1} max={1} /></Field>
      <Field label="Target Power Factor"><NumInput value={v.targetPF} onChange={set("targetPF")} placeholder="0.95" step="0.01" min={0.1} max={1} /></Field>
      <Field label="System Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
          { value: 480, label: "480V" }, { value: 4160, label: "4160V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" }]} />
      </Field>
    </CalcLayout>
  );
}