import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcLightingLoad } from "./logic/lightingLoadCalc";
import FormulaBox from "../FormulaBox";

const OCCUPANCY_LABELS = {
  dwelling: "Dwelling Units", hotel_motel: "Hotels/Motels", hospital: "Hospitals",
  office: "Office Buildings", store: "Stores", school: "Schools",
  restaurant: "Restaurants", church: "Churches/Auditoriums",
  garage: "Garages (commercial)", industrial: "Industrial/Loft",
  warehouse: "Warehouses", armory: "Armories",
};

export default function LightingLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({ occupancy: "office", sqft: 10000, voltage: 277, phases: "single", actualFixtureW: 0 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const occLabel = OCCUPANCY_LABELS[v.occupancy] || v.occupancy;
  const sqft = parseFloat(v.sqft) || 0;
  const r = calcLightingLoad(v, nec);
  const { occVA, nec_VA, demand, designVA, totalAmps, actualAmps, numCircuits, steps } = r;
  const actualW = parseFloat(v.actualFixtureW) || 0;
  const useActual = actualW > 0;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="NEC Required Lighting Load">
          <ResultRow label="Unit Load" value={`${occVA} VA/sq ft`} sub="NEC Table 220.12" />
          <ResultRow label="Floor Area" value={sqft.toFixed(0)} unit="sq ft" />
          <ResultRow label="Total Required Load" value={nec_VA.toFixed(0)} unit="VA" highlight />
        </ResultSection>
        <ResultSection title="After Demand Factor (NEC 220.42)">
          <ResultRow label="Demand Load" value={demand.toFixed(0)} unit="VA" highlight />
          <ResultRow label="Design Load Used" value={(designVA || demand).toFixed(0)} unit="VA" />
          <ResultRow label="Total Current Required" value={totalAmps.toFixed(1)} unit="A" />
          <ResultRow label="Required Circuits (@20A)" value={numCircuits} unit="circuits" />
          <ResultRow label="Demand Reduction" value={`${(((nec_VA - demand) / nec_VA) * 100).toFixed(1)}%`} />
        </ResultSection>
        {useActual && (
          <ResultSection title="Actual Fixture Load">
            <ResultRow label="Actual Fixture Wattage" value={actualW.toFixed(0)} unit="W" />
            <ResultRow label="Actual Circuit Current" value={actualAmps.toFixed(1)} unit="A" />
            <ResultRow label="Basis for Design" value={nec_VA > actualW ? "NEC minimum" : "Actual load (controls)"} />
          </ResultSection>
        )}
        <FormulaBox steps={steps} />
        <NoteBox>          NEC {necYear} 220.12 / Table 220.12: General lighting load calculated at VA/sq ft by occupancy type. The larger of NEC-required or actual fixture load must be used. Demand factors per 220.42 apply.</NoteBox>
      </div>
    }>
      <Field label="Occupancy Type">
        <Select value={v.occupancy} onChange={set("occupancy")}
          options={Object.keys(nec.OCCUPANCY_UNIT_LOADS).map(k => ({ value: k, label: `${OCCUPANCY_LABELS[k] || k} (${nec.OCCUPANCY_UNIT_LOADS[k]} VA/sq ft)` }))} />
      </Field>
      <Field label="Gross Floor Area" unit="sq ft"><NumInput value={v.sqft} onChange={set("sqft")} placeholder="10000" /></Field>
      <Field label="Actual Fixture Load (optional)" unit="W" hint="Enter 0 to use NEC minimum only">
        <NumInput value={v.actualFixtureW} onChange={set("actualFixtureW")} placeholder="0" />
      </Field>
      <Field label="Circuit Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
          { value: 277, label: "277V (commercial)" }, { value: 480, label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single" }, { value: "three", label: "Three" }]} />
      </Field>
    </CalcLayout>
  );
}