import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcTransformerSizing } from "./logic/transformerSizingCalc";

const FORMULAS = [
  { label: "kVA Rating", formula: "kVA = Load VA / 1000", description: "Select transformer kVA at or above required load" },
  { label: "Primary FLC (3-phase)", formula: "I_primary = (kVA × 1000) / (V_primary × √3)", description: "Use 1.732 for 3-phase, 1.0 for single-phase" },
  { label: "Secondary FLC (3-phase)", formula: "I_secondary = (kVA × 1000) / (V_secondary × √3)", description: "Same formula applied to secondary voltage" },
  { label: "Available Fault Current", formula: "AFC = (kVA × 1000) / (V_secondary × √3 × Z%)", description: "Z% = transformer impedance; used for equipment interrupting ratings" },
];
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";

export default function TransformerSizing({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["450_3_b_xfmr_ocpd", "240_6_std_sizes"], necYear);
  const [v, setV] = useCalculatorInputs({ loadVA: 75000, primaryV: 480, secondaryV: 208, phases: "three", impedance: 5.75 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const Z = parseFloat(v.impedance) || 5.75;
  const txResult = calcTransformerSizing(v, nec);
  const { kVA, primaryFLC, secondaryFLC, primaryOCPD, secondaryOCPD: secOCPD,
    primaryConductorA, secondaryConductorA: secConductorA, AFC, steps } = txResult;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={txResult} trace={txResult.trace} result={
      <div className="space-y-2">
        <ResultSection title="Transformer Ratings">
          <ResultRow label="Required kVA" value={kVA.toFixed(1)} unit="kVA" highlight />
          <ResultRow label="Primary FLC" value={primaryFLC.toFixed(1)} unit="A" />
          <ResultRow label="Secondary FLC" value={secondaryFLC.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="Primary Side (NEC 450.3)">
          <ResultRow label="Primary OCPD (max 125%)" value={primaryOCPD} unit="A" highlight />
          <ResultRow label="Primary Conductor Min" value={primaryConductorA.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="Secondary Side">
          <ResultRow label="Secondary OCPD (max 125%)" value={secOCPD} unit="A" highlight />
          <ResultRow label="Secondary Conductor Min" value={secConductorA.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="Available Fault Current">
          <ResultRow label="AFC at Secondary Bus" value={`${(AFC / 1000).toFixed(1)}k`} unit="A" highlight
            sub={`Based on ${Z}% impedance, infinite primary`} />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 450.3(B): Primary OCPD ≤ 125% primary FLC (next std size). Secondary conductors must be protected. AFC = (kVA × 1000) / (Vsec × √3 × Z%). Use to verify equipment AIC ratings per NEC 110.9.</NoteBox>
      </div>
    }>
      <Field label="Total Load" unit="VA"><NumInput value={v.loadVA} onChange={set("loadVA")} placeholder="75000" /></Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[
          { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" }
        ]} />
      </Field>
      <Field label="Primary Voltage" unit="V">
        <Select value={v.primaryV} onChange={set("primaryV")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
          { value: 277, label: "277V" }, { value: 480, label: "480V" }, { value: 2400, label: "2400V" },
          { value: 4160, label: "4160V" }, { value: 12470, label: "12,470V" },
        ]} />
      </Field>
      <Field label="Secondary Voltage" unit="V">
        <Select value={v.secondaryV} onChange={set("secondaryV")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208/120V 3Ø" }, { value: 240, label: "240V" },
          { value: 277, label: "277V" }, { value: 480, label: "480V" },
        ]} />
      </Field>
      <Field label="Transformer Impedance" unit="%" hint="Typical: 2-6% for dry-type, 5-7.5% for liquid">
        <NumInput value={v.impedance} onChange={set("impedance")} placeholder="5.75" step="0.01" />
      </Field>
    </CalcLayout>
  );
}