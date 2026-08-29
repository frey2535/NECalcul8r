import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcShortCircuit } from "./logic/shortCircuitCalc";
import FormulaBox from "../FormulaBox";

export default function ShortCircuit({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({ kva: 150, primaryV: 480, secondaryV: 208, phases: "three", impedance: 5.75, cableLength: 50, cableSize: "4/0", cableMaterial: "copper" });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const kva = parseFloat(v.kva) || 150;
  const secV = parseFloat(v.secondaryV) || 208;
  const Z = parseFloat(v.impedance) || 5.75;
  const factor = v.phases === "three" ? 1.732 : 1;

  const sc = calcShortCircuit(v, nec);
  const { transAFC, xfmrZ_ohm, cableZ_ohm, totalZ, AFC_atPanel, requiredAIC, steps } = sc;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={sc} result={
      <div className="space-y-2">
        <ResultSection title="AFC at Transformer Secondary">
          <ResultRow label="Transformer kVA" value={kva} unit="kVA" />
          <ResultRow label="Impedance %" value={`${Z}%`} />
          <ResultRow label="AFC at Secondary Bus" value={`${(transAFC / 1000).toFixed(1)}k`} unit="A" highlight
            sub="Infinite primary assumption" />
        </ResultSection>
        <ResultSection title="AFC at Panel (with cable)">
          <ResultRow label="Transformer Impedance (Ω)" value={xfmrZ_ohm.toFixed(4)} unit="Ω" />
          <ResultRow label="Cable Impedance (Ω)" value={cableZ_ohm.toFixed(4)} unit="Ω" />
          <ResultRow label="Total Impedance" value={totalZ.toFixed(4)} unit="Ω" />
          <ResultRow label="AFC at Panel" value={`${(AFC_atPanel / 1000).toFixed(1)}k`} unit="A" highlight />
        </ResultSection>
        <ResultSection title="Required Equipment AIC Rating">
          <ResultRow label="Min AIC Rating Needed" value={`${requiredAIC.toLocaleString()}`} unit="A" highlight
            sub="NEC 110.9 / 110.10: Equipment must exceed AFC" />
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>          NEC {necYear} 110.9: Equipment must have interrupting rating ≥ available fault current. NEC 110.10: Equipment must be selected to withstand fault energy. AFC decreases as distance from transformer increases due to cable impedance.</NoteBox>
      </div>
    }>
      <Field label="Transformer kVA"><NumInput value={v.kva} onChange={set("kva")} placeholder="150" /></Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single" }, { value: "three", label: "Three" }]} />
      </Field>
      <Field label="Primary Voltage" unit="V"><NumInput value={v.primaryV} onChange={set("primaryV")} placeholder="480" /></Field>
      <Field label="Secondary Voltage" unit="V"><NumInput value={v.secondaryV} onChange={set("secondaryV")} placeholder="208" /></Field>
      <Field label="Transformer Impedance" unit="%"><NumInput value={v.impedance} onChange={set("impedance")} placeholder="5.75" step="0.01" /></Field>
      <Field label="Cable Length to Panel" unit="ft"><NumInput value={v.cableLength} onChange={set("cableLength")} placeholder="50" /></Field>
      <Field label="Cable Size">
        <Select value={v.cableSize} onChange={set("cableSize")} options={Object.keys({ "14": 1, "12": 1, "10": 1, "8": 1, "6": 1, "4": 1, "2": 1, "1/0": 1, "2/0": 1, "3/0": 1, "4/0": 1, "250": 1, "350": 1, "500": 1 }).map(k => ({ value: k, label: `#${k} AWG` }))} />
      </Field>
      <Field label="Cable Material">
        <Select value={v.cableMaterial} onChange={set("cableMaterial")} options={[{ value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }]} />
      </Field>
    </CalcLayout>
  );
}