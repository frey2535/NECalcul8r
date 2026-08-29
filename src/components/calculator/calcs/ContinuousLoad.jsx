import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "OCPD Requirement (NEC 210.20)", formula: "Min OCPD = (Continuous A × 1.25) + Noncontinuous A", description: "Branch circuit OCPD must not be less than 125% continuous + 100% noncontinuous" },
  { label: "Conductor Sizing (NEC 210.19)", formula: "Min Conductor Ampacity = (Continuous A × 1.25) + Noncontinuous A", description: "Conductors must also be rated at 125% of continuous load" },
];
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcContinuousLoad } from "./logic/continuousLoadCalc";

export default function ContinuousLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["240_6_std_sizes", "310_15_b_16_copper"], necYear);

  const [v, setV] = useCalculatorInputs({ continuousA: 16, noncontinuousA: 4, voltage: 120, phases: "single" });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const contA = parseFloat(v.continuousA) || 0;
  const nonContA = parseFloat(v.noncontinuousA) || 0;
  const r = calcContinuousLoad(v, nec);
  const { minOCPD_A, minConductorA, selectedOCPD, totalW, adjustedW, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Load Summary">
          <ResultRow label="Continuous Current" value={contA.toFixed(1)} unit="A" sub="≥3 hrs continuous operation" />
          <ResultRow label="Noncontinuous Current" value={nonContA.toFixed(1)} unit="A" />
          <ResultRow label="Total Actual Load" value={(contA + nonContA).toFixed(1)} unit="A" />
          <ResultRow label="Total Load (Watts)" value={totalW.toFixed(0)} unit="W" />
        </ResultSection>
        <ResultSection title="Required Sizing (NEC 210.20)">
          <ResultRow label="Continuous × 125%" value={(contA * 1.25).toFixed(1)} unit="A" />
          <ResultRow label="+ Noncontinuous" value={nonContA.toFixed(1)} unit="A" />
          <ResultRow label="Minimum OCPD Required" value={`${minOCPD_A.toFixed(1)}A`} />
          <ResultRow label="Selected Standard OCPD" value={`${selectedOCPD}A`} highlight />
          <ResultRow label="Minimum Conductor Ampacity" value={`${minConductorA.toFixed(1)}A`} highlight />
          <ResultRow label="Adjusted Load (VA)" value={adjustedW.toFixed(0)} unit="VA" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 210.20(A): Branch circuit OCPD must not be less than the noncontinuous load plus {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% of the continuous load. Conductors must also be sized at {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% of continuous load per NEC 210.19(A)(1).</NoteBox>
      </div>
    }>
      <Field label="Continuous Current" unit="A" hint="Loads expected to operate 3+ hours">
        <NumInput value={v.continuousA} onChange={set("continuousA")} placeholder="16" />
      </Field>
      <Field label="Noncontinuous Current" unit="A">
        <NumInput value={v.noncontinuousA} onChange={set("noncontinuousA")} placeholder="4" />
      </Field>
      <Field label="Circuit Voltage" unit="V">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
          { value: 277, label: "277V" }, { value: 480, label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[
          { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" }
        ]} />
      </Field>
    </CalcLayout>
  );
}