import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcDataCenter } from "./logic/dataCenterCalc";
import FormulaBox from "../FormulaBox";

export default function DataCenter({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    itLoad_kW: 100, pue: 1.4, voltage: 480, phases: "three",
    redundancy: "N+1", ups_efficiency: 94, coolingPct: 30,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcDataCenter(v, nec);
  const { totalFacilityKW, upsInputKW, coolingKW, serviceA, redundancyMultiplier, serviceA_redundant, breaker, steps } = r;
  const itKW = parseFloat(v.itLoad_kW) || 100;
  const pue = parseFloat(v.pue) || 1.4;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Power Budget">
          <ResultRow label="IT Equipment Load" value={itKW.toFixed(1)} unit="kW" />
          <ResultRow label="PUE Factor" value={pue.toFixed(2)} sub="Power Usage Effectiveness" />
          <ResultRow label="Cooling / Lighting Load" value={coolingKW.toFixed(1)} unit="kW" />
          <ResultRow label="Total Facility Load" value={totalFacilityKW.toFixed(1)} unit="kW" highlight />
        </ResultSection>
        <ResultSection title="UPS & Service Sizing">
          <ResultRow label="UPS Input Power" value={upsInputKW.toFixed(1)} unit="kW" />
          <ResultRow label="Service Current (base)" value={serviceA.toFixed(1)} unit="A" />
          <ResultRow label={`Service Current (${v.redundancy} redundancy)`} value={serviceA_redundant.toFixed(1)} unit="A" highlight />
          <ResultRow label="Recommended Breaker" value={breaker} unit="A" highlight />
        </ResultSection>
        <ResultSection title="NEC 708 — Critical Operations">
          <div className="px-3 py-2 bg-muted/50 rounded text-xs space-y-1">
            <p>• Legally Required Standby — NEC Article 701</p>
            <p>• Alternate power source for critical systems per NEC 708</p>
            <p>• Transfer switch required for UPS bypass</p>
            <p>• Ground fault protection of equipment per NEC 230.95</p>
          </div>
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>Data centers use PUE to measure efficiency. PUE = Total Facility Power / IT Equipment Power. Ideal PUE = 1.0. Typical: 1.2–1.5. Service sizing should account for redundancy (N+1, 2N) per NEC 708 for critical operations power systems.</NoteBox>
      </div>
    }>
      <Field label="IT Equipment Load" unit="kW" hint="Nameplate / measured IT load">
        <NumInput value={v.itLoad_kW} onChange={set("itLoad_kW")} placeholder="100" />
      </Field>
      <Field label="PUE (Power Usage Effectiveness)" hint="1.0 = perfect; typical 1.2–1.5">
        <NumInput value={v.pue} onChange={set("pue")} placeholder="1.4" step="0.01" min={1.0} max={3.0} />
      </Field>
      <Field label="UPS Efficiency" unit="%"><NumInput value={v.ups_efficiency} onChange={set("ups_efficiency")} placeholder="94" min={50} max={99} /></Field>
      <Field label="System Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 208, label: "208V" }, { value: 480, label: "480V" }, { value: 600, label: "600V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "three", label: "Three-Phase" }, { value: "single", label: "Single-Phase" }]} />
      </Field>
      <Field label="Redundancy Level">
        <Select value={v.redundancy} onChange={set("redundancy")} options={[
          { value: "N", label: "N — No redundancy" },
          { value: "N+1", label: "N+1 — Single component redundancy" },
          { value: "2N", label: "2N — Full redundancy" },
          { value: "2N+1", label: "2N+1 — Full redundancy + spare" },
        ]} />
      </Field>
    </CalcLayout>
  );
}