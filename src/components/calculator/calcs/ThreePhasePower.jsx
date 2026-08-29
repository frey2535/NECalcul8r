import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "Apparent Power", formula: "S (kVA) = √3 × V_LL × I / 1000", description: "V_LL = line-to-line voltage, I = line current" },
  { label: "Real Power", formula: "P (kW) = S × PF", description: "PF = power factor (0–1.0)" },
  { label: "Reactive Power", formula: "Q (kVAR) = S × sin(θ) = √(S² − P²)", description: "θ = arccos(PF)" },
  { label: "Line Current", formula: "I = (kVA × 1000) / (V_LL × √3)", description: "Rearranged from apparent power formula" },
  { label: "Line-to-Neutral", formula: "V_LN = V_LL / √3", description: "√3 ≈ 1.732" },
];
import React from "react";
import { useCalculatorInputs, useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { calcThreePhasePower } from "./logic/powerMathCalcs";

export default function ThreePhasePower({ category, necYear = "2023" }) {
  const TABLES = getTablesById(["general_std_voltages"], necYear);

  const [mode, setMode] = useRestoredField("mode", "vip"); // vip = voltage/current/pf, kva = kva/voltage
  const [v, setV] = useCalculatorInputs({ voltage: 480, current: 100, pf: 0.85, kva: 150 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const Vll = parseFloat(v.voltage) || 480;
  const I = parseFloat(v.current) || 100;
  const PF = parseFloat(v.pf) || 0.85;
  const kVA_in = parseFloat(v.kva) || 150;
  const { kVA, kW, kVAR, amps } = calcThreePhasePower({ ...v, mode });

  const Vln = Vll / 1.732;
  const kW_per_phase = kW / 3;

  const steps = [
    { label: "Apparent Power (S)", formula: "S = √3 × V_LL × I ÷ 1000", expression: mode === "vip" ? `√3 × ${Vll} × ${I} ÷ 1000` : `${kVA_in} kVA (input)`, result: kVA.toFixed(2), unit: "kVA" },
    { label: "Real Power (P)", formula: "P = S × PF", expression: `${kVA.toFixed(2)} × ${PF}`, result: kW.toFixed(2), unit: "kW" },
    { label: "Reactive Power (Q)", formula: "Q = S × sin(arccos(PF))", expression: `${kVA.toFixed(2)} × sin(arccos(${PF}))`, result: kVAR.toFixed(2), unit: "kVAR" },
    { label: "Line-to-Neutral Voltage", formula: "V_LN = V_LL ÷ √3", expression: `${Vll} ÷ √3`, result: Vln.toFixed(1), unit: "V" },
    { label: "Line Current", formula: "I = kVA × 1000 ÷ (V_LL × √3)", expression: mode === "kva" ? `${kVA.toFixed(2)} × 1000 ÷ (${Vll} × √3)` : `${I} A (input)`, result: amps.toFixed(1), unit: "A" },
  ];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ...v, mode }} outputValues={{ kVA, kW, kVAR, amps }} result={
      <div className="space-y-2">
        <ResultSection title="Power Triangle">
          <ResultRow label="Apparent Power (S)" value={kVA.toFixed(2)} unit="kVA" highlight />
          <ResultRow label="Real Power (P)" value={kW.toFixed(2)} unit="kW" highlight />
          <ResultRow label="Reactive Power (Q)" value={kVAR.toFixed(2)} unit="kVAR" />
          <ResultRow label="Power Factor" value={PF.toFixed(3)} />
        </ResultSection>
        <ResultSection title="Voltage & Current">
          <ResultRow label="Line-to-Line Voltage" value={Vll.toFixed(0)} unit="V" />
          <ResultRow label="Line-to-Neutral Voltage" value={Vln.toFixed(1)} unit="V" />
          <ResultRow label="Line Current" value={amps.toFixed(1)} unit="A" />
          <ResultRow label="Per-Phase kW" value={kW_per_phase.toFixed(2)} unit="kW" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>3Ø: S = √3 × V_LL × I (kVA). P = S × PF (kW). Q = S × sin(θ) (kVAR). V_LN = V_LL / √3. Applies to balanced wye or delta systems.</NoteBox>
      </div>
    }>
      <Field label="Calculation Mode">
        <Select value={mode} onChange={setMode} options={[
          { value: "vip", label: "From Voltage + Current + PF" },
          { value: "kva", label: "From kVA + Voltage + PF" },
        ]} />
      </Field>
      <Field label="Line-to-Line Voltage" unit="V">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 208, label: "208V" }, { value: 240, label: "240V" },
          { value: 480, label: "480V" }, { value: 600, label: "600V" }, { value: 4160, label: "4160V" },
        ]} />
      </Field>
      {mode === "vip" && (
        <Field label="Line Current" unit="A"><NumInput value={v.current} onChange={set("current")} placeholder="100" /></Field>
      )}
      {mode === "kva" && (
        <Field label="Apparent Power" unit="kVA"><NumInput value={v.kva} onChange={set("kva")} placeholder="150" /></Field>
      )}
      <Field label="Power Factor" hint="0.0 – 1.0">
        <NumInput value={v.pf} onChange={set("pf")} placeholder="0.85" step="0.01" min={0.01} max={1} />
      </Field>
    </CalcLayout>
  );
}