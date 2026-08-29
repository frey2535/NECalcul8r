import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcFixedElectricHeat } from "./logic/fixedElectricHeatCalc";

const FORMULAS = [
  { label: "Fixed Electric Heat Load (NEC 220.51)", formula: "Load = 100% of nameplate rating — no demand factor permitted", description: "Unlike motors or general loads, fixed space heating must be taken at full 100%" },
  { label: "Branch Circuit Ampacity", formula: "I = W / V  (single-phase)  or  W / (V × √3)  (three-phase)", description: "Conductor must be rated ≥ 125% of load current per NEC 210.19(A) (continuous load)" },
  { label: "OCPD Sizing", formula: "OCPD ≥ 125% × I (continuous load rule, NEC 210.20)", description: "Select next standard breaker size above 125% of load current" },
];

export default function FixedElectricHeat({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    heatersCount: 3,
    wattsPerHeater: 2000,
    voltage: "240",
    phases: "single",
    circuits: "individual",  // individual or one circuit
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const count = parseInt(v.heatersCount) || 1;
  const watts = parseFloat(v.wattsPerHeater) || 0;
  const r = calcFixedElectricHeat(v, nec);
  const { totalW, totalA, conductorA, ocpd, perCircuitA, perCircuitConductor, perCircuitOCPD, steps } = r;
  const perCircuitW = watts;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Fixed Heat Load (NEC 220.51 — 100% Load)">
          <ResultRow label="Heaters" value={count} unit="units" />
          <ResultRow label="Watts per Heater" value={watts.toLocaleString()} unit="W" />
          <ResultRow label="Total Connected Load" value={totalW.toLocaleString()} unit="W" highlight />
          <ResultRow label="Total Load Current" value={totalA.toFixed(1)} unit="A" highlight />
        </ResultSection>
        <ResultSection title="Feeder / Branch Circuit Sizing (Continuous Load)">
          <ResultRow label="Conductor Ampacity (125%)" value={conductorA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Feeder OCPD (min)" value={ocpd} unit="A" highlight />
        </ResultSection>
        <ResultSection title="Per Individual Heater Circuit">
          <ResultRow label="Per Heater Load" value={perCircuitW.toLocaleString()} unit="W" />
          <ResultRow label="Per Heater Current" value={perCircuitA.toFixed(1)} unit="A" />
          <ResultRow label="Conductor at 125%" value={perCircuitConductor.toFixed(1)} unit="A" />
          <ResultRow label="Per-Circuit OCPD" value={perCircuitOCPD} unit="A" highlight />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 220.51: Fixed electric space heating is calculated at 100% — no demand factor may be applied. NEC 210.19(A) / 215.2(A): Conductors serving continuous loads must be rated ≥ {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% of the load. NEC 424.3(B): Each heater rated over 48A must have its own branch circuit. Thermostats are not considered switching devices for load-reduction purposes.
        </NoteBox>
      </div>
    }>
      <Field label="Number of Heaters">
        <NumInput value={v.heatersCount} onChange={set("heatersCount")} placeholder="3" min={1} />
      </Field>
      <Field label="Watts per Heater" unit="W">
        <NumInput value={v.wattsPerHeater} onChange={set("wattsPerHeater")} placeholder="2000" min={100} />
      </Field>
      <Field label="Supply Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: "120", label: "120V" }, { value: "208", label: "208V" },
          { value: "240", label: "240V" }, { value: "277", label: "277V" },
          { value: "480", label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[
          { value: "single", label: "Single-Phase" },
          { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
    </CalcLayout>
  );
}