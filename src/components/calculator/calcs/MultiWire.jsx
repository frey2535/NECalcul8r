import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { calcMultiwire } from "./logic/powerMathCalcs";

export default function MultiWire({ category, necYear = "2023" }) {
  const [v, setV] = useCalculatorInputs({ phaseA: 15, phaseB: 12, phaseC: 0, circuitType: "single_phase_2w", voltage: 120 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const A = parseFloat(v.phaseA) || 0;
  const B = parseFloat(v.phaseB) || 0;
  const C = parseFloat(v.phaseC) || 0;
  const voltage = parseFloat(v.voltage) || 120;
  const { neutralI, imbalance, needsHandle, powerA, powerB, powerC } = calcMultiwire(v);

  const explanation = v.circuitType === "single_phase_2w" ? "2-wire circuit: neutral carries full phase current"
    : v.circuitType === "single_phase_3w" ? "3-wire MWBC (120/240V): neutral = |Phase A − Phase B|"
    : v.circuitType === "three_phase_4w" ? "4-wire 3Ø wye: neutral = √(A²+B²+C²-AB-BC-CA)"
    : "Perfectly balanced: neutral carries 0A";
  const maxLoad = v.circuitType === "three_phase_4w" ? Math.max(A, B, C) : Math.max(A, B);
  const minLoad = v.circuitType === "three_phase_4w" ? Math.min(A, B, C) : Math.min(A, B);

  const steps = [
    { label: "Neutral Current", formula: v.circuitType === "single_phase_2w" ? "I_N = I_phase" : v.circuitType === "single_phase_3w" ? "I_N = |I_A − I_B|" : v.circuitType === "three_phase_4w" ? "I_N = √(A²+B²+C²−AB−BC−CA)" : "I_N = 0 (balanced)", expression: v.circuitType === "single_phase_2w" ? `${A} A` : v.circuitType === "single_phase_3w" ? `|${A} − ${B}|` : v.circuitType === "three_phase_4w" ? `√(${A}²+${B}²+${C}²−${A}×${B}−${B}×${C}−${C}×${A})` : "0 (balanced)", result: neutralI.toFixed(2), unit: "A", note: explanation },
    { label: "Phase Imbalance", formula: "Imbalance = (max − min) ÷ max × 100", expression: maxLoad > 0 ? `(${maxLoad} − ${minLoad}) ÷ ${maxLoad} × 100` : "—", result: imbalance.toFixed(1), unit: "%" },
  ];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={{ neutralI, imbalance, needsHandle, powerA, powerB, powerC }} result={
      <div className="space-y-2">
        <ResultSection title="Circuit Loading">
          <ResultRow label="Phase A Current" value={A.toFixed(1)} unit="A" />
          <ResultRow label="Phase B Current" value={B.toFixed(1)} unit="A" />
          {v.circuitType === "three_phase_4w" && <ResultRow label="Phase C Current" value={C.toFixed(1)} unit="A" />}
        </ResultSection>
        <ResultSection title="Neutral Conductor">
          <ResultRow label="Neutral Current" value={neutralI.toFixed(2)} unit="A" highlight
            sub={explanation} />
          <ResultRow label="Phase Imbalance" value={`${imbalance.toFixed(1)}%`} />
          {neutralI === 0 && <ResultRow label="Status" value="✓ Balanced — neutral may be reduced" />}
        </ResultSection>
        <ResultSection title="NEC Compliance">
          <ResultRow label="Requires Handle Tie/2-Pole?" value={needsHandle ? "Yes — NEC 210.4(B)" : "No"} highlight={needsHandle} />
          <ResultRow label="AFCI Required?" value="Yes — if dwelling (NEC 210.12)" />
          <ResultRow label="Neutral = Current-Carrying?" value={neutralI > 0 ? "Yes — count for derating" : "No — balanced"} />
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>          NEC {necYear} 210.4: MWBC must have a means to disconnect all ungrounded conductors simultaneously. For 3-wire 120/240V, neutral current = difference of the two phase currents. An unbalanced neutral carries current and must be counted for conduit fill derating.</NoteBox>
      </div>
    }>
      <Field label="Circuit Type">
        <Select value={v.circuitType} onChange={set("circuitType")} options={[
          { value: "single_phase_2w", label: "Single-Phase 2-Wire (standard)" },
          { value: "single_phase_3w", label: "Single-Phase 3-Wire MWBC (120/240V)" },
          { value: "three_phase_4w", label: "Three-Phase 4-Wire MWBC (208/120V)" },
          { value: "balanced", label: "Perfectly Balanced (theoretical)" },
        ]} />
      </Field>
      <Field label="Circuit Voltage" unit="V per phase">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 277, label: "277V" },
        ]} />
      </Field>
      <Field label="Phase A Load" unit="A"><NumInput value={v.phaseA} onChange={set("phaseA")} placeholder="15" /></Field>
      <Field label="Phase B Load" unit="A"><NumInput value={v.phaseB} onChange={set("phaseB")} placeholder="12" /></Field>
      {v.circuitType === "three_phase_4w" && (
        <Field label="Phase C Load" unit="A"><NumInput value={v.phaseC} onChange={set("phaseC")} placeholder="8" /></Field>
      )}
    </CalcLayout>
  );
}