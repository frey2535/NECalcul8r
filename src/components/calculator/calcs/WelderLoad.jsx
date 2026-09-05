import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "Conductor Ampacity (NEC 630.11)", formula: "I_conductor = I_rated × Table 630.11(A) multiplier", description: "Use the listed duty-cycle multiplier from Table 630.11(A); non-listed values use the next higher duty-cycle row." },
  { label: "Max OCPD (NEC 630.12)", formula: "Max OCPD = I_rated × 2.00 (200%)", description: "Based on rated primary current, not the derated conductor ampacity" },
];
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcWelderLoad } from "./logic/welderLoadCalc";

export default function WelderLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["630_11_welder", "240_6_std_sizes"], necYear);

  const [v, setV] = useCalculatorInputs({ nameplateAmps: 60, dutyCycle: 60, voltage: 240, phases: "single" });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcWelderLoad(v, nec);
  const { dcFactor, conductorA, maxOCPD_calc, maxOCPD, nameplatekVA, demandkVA, steps } = r;
  const I = parseFloat(v.nameplateAmps) || 60;
  const DC = parseFloat(v.dutyCycle) || 60;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Welder Load (NEC 630.11)">
          <ResultRow label="Nameplate Primary Current" value={I} unit="A" />
          <ResultRow label="Duty Cycle" value={`${DC}%`} />
          <ResultRow label="Duty-Cycle Multiplier (Table 630.11(A))" value={dcFactor.toFixed(3)} />
          <ResultRow label="Nameplate kVA" value={nameplatekVA.toFixed(1)} unit="kVA" />
        </ResultSection>
        <ResultSection title="Conductor & OCPD Sizing">
          <ResultRow label="Min Conductor Ampacity" value={conductorA.toFixed(1)} unit="A" highlight
            sub="NEC 630.11: Nameplate × Table 630.11(A) multiplier" />
          <ResultRow label="Max OCPD (200% nameplate)" value={maxOCPD_calc.toFixed(0)} unit="A" />
          <ResultRow label="Selected OCPD (≤ 200%)" value={maxOCPD} unit="A" highlight />
          <ResultRow label="Demand kVA" value={demandkVA.toFixed(1)} unit="kVA" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 630.11(A): Arc welder conductor ampacity is sized from nameplate primary current and the listed Table 630.11(A) duty-cycle multiplier. NEC 630.12: OCPD ≤ 200% of the rated primary current of the welder. For multiple welders, NEC 630.11(B) applies.</NoteBox>
      </div>
    }>
      <Field label="Nameplate Primary Current" unit="A"><NumInput value={v.nameplateAmps} onChange={set("nameplateAmps")} placeholder="60" /></Field>
      <Field label="Duty Cycle" unit="%" hint="From nameplate; typical: 20–100%">
        <Select value={v.dutyCycle} onChange={set("dutyCycle")} options={[
          { value: 20, label: "20%" }, { value: 30, label: "30%" }, { value: 40, label: "40%" },
          { value: 50, label: "50%" }, { value: 60, label: "60%" }, { value: 70, label: "70%" },
          { value: 80, label: "80%" }, { value: 90, label: "90%" }, { value: 100, label: "100% (continuous)" },
        ]} />
      </Field>
      <Field label="Voltage"><Select value={v.voltage} onChange={set("voltage")} options={[
        { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
        { value: 480, label: "480V" },
      ]} /></Field>
      <Field label="Phase"><Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single" }, { value: "three", label: "Three" }]} /></Field>
    </CalcLayout>
  );
}