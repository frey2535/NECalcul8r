import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcMultifamilyStandard } from "./logic/multifamilyStandardCalc";

const FORMULAS = [
  { label: "NEC 220.40 Standard Method", formula: "Net Load = General demand + Range demand + Dryer demand + Heating", description: "General lighting, small appliance, and laundry loads are summed and demand-factored per Table 220.42. Ranges use Table 220.55 Column C. Dryers use Table 220.54. Heating at 100%." },
  { label: "Table 220.42 Demand", formula: "First 3,000 @ 100% + next 117,000 @ 35% + remainder @ 25%", description: "Same demand tiers as single dwelling, applied to the total general load of all units combined." },
];

export default function MultifamilyStandard({ category, necYear = "2017" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    numUnits: 20,
    sqftPerUnit: 840,
    smallApplianceCircuits: 2,
    laundryCircuits: 0,
    rangeKW: 12,
    dryerKW: 5,
    heatingVA: 170000,
    voltage: 240,
    phases: "single",
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcMultifamilyStandard(v, nec);
  const {
    lightingVA, smallAppVA, laundryVA, totalGeneralVA,
    generalDemandVA, rangeDemandVA, dryerDemandVA, heatingVA,
    netLoadVA, totalA, minService_A: minService, steps,
  } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="General Load (Table 220.42)">
          <ResultRow label="General Lighting" value={lightingVA.toLocaleString()} unit="VA" />
          <ResultRow label="Small Appliance" value={smallAppVA.toLocaleString()} unit="VA" />
          <ResultRow label="Laundry" value={laundryVA.toLocaleString()} unit="VA" />
          <ResultRow label="Total General Load" value={totalGeneralVA.toLocaleString()} unit="VA" />
          <ResultRow label="General Demand (Table 220.42)" value={generalDemandVA.toLocaleString()} unit="VA" highlight />
        </ResultSection>
        <ResultSection title="Appliance Demand">
          <ResultRow label="Range Demand (Table 220.55)" value={rangeDemandVA.toLocaleString()} unit="VA" />
          <ResultRow label="Dryer Demand (Table 220.54)" value={dryerDemandVA.toLocaleString()} unit="VA" />
          <ResultRow label="Water/Space Heating (100%)" value={heatingVA.toLocaleString()} unit="VA" />
        </ResultSection>
        <ResultSection title="Service Sizing">
          <ResultRow label="Net Calculated Load" value={netLoadVA.toLocaleString()} unit="VA" highlight />
          <ResultRow label="Service Current" value={totalA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Minimum Service Size" value={minService} unit="A" highlight sub="Next standard size" />
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>
          NEC {necYear} 220.40: Standard method for multifamily dwellings. General lighting ({nec.DWELLING_LIGHTING_VA_PER_SQFT} VA/ft²), small appliance ({nec.SMALL_APPLIANCE_VA} VA/circuit), and laundry ({nec.LAUNDRY_VA} VA/circuit) are summed across all units and demand-factored per Table 220.42. Ranges per Table 220.55 Column C. Dryers per Table 220.54. Water/space heating at 100%.
        </NoteBox>
      </div>
    }>
      <Field label="Number of Dwelling Units">
        <NumInput value={v.numUnits} onChange={set("numUnits")} placeholder="20" min={3} />
      </Field>
      <Field label="Floor Area per Unit" unit="ft²">
        <NumInput value={v.sqftPerUnit} onChange={set("sqftPerUnit")} placeholder="1000" min={100} />
      </Field>
      <Field label="Small Appliance Circuits per Unit">
        <NumInput value={v.smallApplianceCircuits} onChange={set("smallApplianceCircuits")} placeholder="2" min={1} />
      </Field>
      <Field label="Laundry Circuits per Unit">
        <NumInput value={v.laundryCircuits} onChange={set("laundryCircuits")} placeholder="1" min={0} />
      </Field>
      <Field label="Range / Cooking per Unit" unit="kW">
        <NumInput value={v.rangeKW} onChange={set("rangeKW")} placeholder="12" min={0} />
      </Field>
      <Field label="Dryer per Unit" unit="kW">
        <NumInput value={v.dryerKW} onChange={set("dryerKW")} placeholder="5" min={0} />
      </Field>
      <Field label="Water / Space Heating (total)" unit="VA" hint="100% — no demand factor applied">
        <NumInput value={v.heatingVA} onChange={set("heatingVA")} placeholder="170000" min={0} />
      </Field>
      <Field label="Service Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 240, label: "240V 1Ø" },
          { value: 208, label: "208V 3Ø" },
          { value: 480, label: "480V 3Ø" },
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