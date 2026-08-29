import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "Apparent Power", formula: "VA = V × I", description: "Single-phase apparent power" },
  { label: "Real Power", formula: "W = VA × PF", description: "PF = power factor (1.0 for purely resistive loads)" },
  { label: "Reactive Power", formula: "VAR = VA × sin(arccos(PF))", description: "Reactive component of power" },
  { label: "Current", formula: "I = VA / V  =  W / (V × PF)", description: "Rearranged from apparent power formula" },
];
import React from "react";
import { useCalculatorInputs, useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { calcSinglePhasePower } from "./logic/powerMathCalcs";

export default function SinglePhasePower({ category, necYear = "2023" }) {
  const TABLES = getTablesById(["general_std_voltages"], necYear);

  const [mode, setMode] = useRestoredField("mode", "vip");
  const [v, setV] = useCalculatorInputs({ voltage: 120, current: 20, pf: 1.0, watts: 2400, kva: 3 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const Vs = parseFloat(v.voltage) || 120;
  const I = parseFloat(v.current) || 20;
  const PF = parseFloat(v.pf) || 1.0;
  const W_in = parseFloat(v.watts) || 2400;
  const kVA_in = parseFloat(v.kva) || 3;
  const r = calcSinglePhasePower({ ...v, mode });
  const { VA, W, kVAR, amps } = r;
  const pf_calc = PF;

  const steps = [
    { label: "Apparent Power (VA)", formula: "VA = V × I", expression: mode === "vip" ? `${Vs} × ${I}` : mode === "wp" ? `${W_in} ÷ ${PF}` : `${kVA_in} × 1000`, result: VA.toFixed(0), unit: "VA" },
    { label: "Real Power (W)", formula: "W = VA × PF", expression: `${VA.toFixed(0)} × ${PF}`, result: W.toFixed(0), unit: "W" },
    { label: "Reactive Power (VAR)", formula: "VAR = VA × sin(arccos(PF))", expression: `${VA.toFixed(0)} × sin(arccos(${PF}))`, result: kVAR.toFixed(0), unit: "VAR" },
    { label: "Current", formula: "I = VA ÷ V", expression: mode === "vip" ? `${I} A (input)` : `${VA.toFixed(0)} ÷ ${Vs}`, result: amps.toFixed(2), unit: "A" },
  ];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ...v, mode }} outputValues={{ VA, W, kVAR, amps, pf_calc }} result={
      <div className="space-y-2">
        <ResultSection title="Power Values">
          <ResultRow label="Apparent Power (VA)" value={VA.toFixed(0)} unit="VA" highlight />
          <ResultRow label="Real Power (W)" value={W.toFixed(0)} unit="W" highlight />
          <ResultRow label="Reactive Power (VAR)" value={kVAR.toFixed(0)} unit="VAR" />
          <ResultRow label="Power Factor" value={pf_calc.toFixed(3)} />
        </ResultSection>
        <ResultSection title="Current & Voltage">
          <ResultRow label="Voltage" value={Vs} unit="V" />
          <ResultRow label="Current" value={amps.toFixed(2)} unit="A" />
          <ResultRow label="Power (kW)" value={(W / 1000).toFixed(3)} unit="kW" />
          <ResultRow label="Apparent (kVA)" value={(VA / 1000).toFixed(3)} unit="kVA" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>1Ø: VA = V × I. W = VA × PF. VAR = VA × sin(θ). For purely resistive loads, PF = 1.0 and W = VA. For motors and transformers, PF is typically 0.75–0.95.</NoteBox>
      </div>
    }>
      <Field label="Calculation Mode">
        <Select value={mode} onChange={setMode} options={[
          { value: "vip", label: "From Voltage + Current + PF" },
          { value: "wp", label: "From Watts + Voltage + PF" },
          { value: "kva", label: "From kVA + Voltage + PF" },
        ]} />
      </Field>
      <Field label="Voltage" unit="V">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" },
          { value: 240, label: "240V" }, { value: 277, label: "277V" },
        ]} />
      </Field>
      {mode === "vip" && <Field label="Current" unit="A"><NumInput value={v.current} onChange={set("current")} placeholder="20" /></Field>}
      {mode === "wp" && <Field label="Real Power" unit="W"><NumInput value={v.watts} onChange={set("watts")} placeholder="2400" /></Field>}
      {mode === "kva" && <Field label="Apparent Power" unit="kVA"><NumInput value={v.kva} onChange={set("kva")} placeholder="3" /></Field>}
      <Field label="Power Factor"><NumInput value={v.pf} onChange={set("pf")} placeholder="1.0" step="0.01" min={0.01} max={1} /></Field>
    </CalcLayout>
  );
}