import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcCommercialLoad } from "./logic/commercialLoadCalc";

function buildFormulas(nec) {
  const recDesc = nec.RECEPTACLE_DEMAND_TIERS.map(t =>
    `${(t.factor * 100).toFixed(0)}%${t.band < Infinity ? ` first ${t.band.toLocaleString()} VA` : " remainder"}`
  ).join(" + ");
  const ltDesc = (nec.LIGHTING_DEMAND.warehouse || nec.LIGHTING_DEMAND.office).tiers.map(t =>
    `${(t.factor * 100).toFixed(0)}%${t.band < Infinity ? ` first ${t.band.toLocaleString()} VA` : " remainder"}`
  ).join(" + ");
  return [
    { label: "Lighting Load", formula: "Lighting VA = Floor Area × Unit Load (VA/sq ft)", description: "Unit loads from NEC Table 220.12 by occupancy type" },
    { label: "Lighting Demand (NEC 220.42)", formula: `Demand = ${ltDesc}`, description: "For all occupancies except dwellings and hotels" },
    { label: "Receptacle Demand (NEC 220.44)", formula: `Demand = ${recDesc}`, description: "Applied to total receptacle VA (180 VA each per 220.14(I))" },
    { label: "Total Current", formula: "I = Total VA / (V × √3)  [3-phase]  or  I = Total VA / V  [1-phase]", description: "Use 1.732 factor for 3-phase systems" },
  ];
}

export default function CommercialLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["220_12_unit_loads", "220_42_lighting_demand", "220_44_receptacle_demand", "240_6_std_sizes"], necYear);
  const [v, setV] = useCalculatorInputs({
    occupancy: "office", sqft: 5000,
    receptacles: 30, receptacleVA: 180,
    showWindow: 0, showWindowVA: 200,
    outsideSign: 0,
    majorAppliances: 0,
    hvac: 10000,
    voltage: 208,
    phases: "three",
    lightingUsedAtOneTime: false,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const unitLoad = nec.OCCUPANCY_UNIT_LOADS[v.occupancy] || 3.5;
  const r = calcCommercialLoad(v, nec);
  const { lightingVA, lightingDemand, receptacleTotal, receptacleDemand,
    showWindowVA, signVA, appliancesVA, hvacVA, totalVA, totalAmps, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Lighting Load">
          <ResultRow label={`Unit Load (${unitLoad} VA/sq ft)`} value={lightingVA.toFixed(0)} unit="VA" />
          <ResultRow label="After Demand Factor (220.42)" value={lightingDemand.toFixed(0)} unit="VA" />
        </ResultSection>
        <ResultSection title="Receptacle Load">
          <ResultRow label={`${v.receptacles} receptacles × ${v.receptacleVA} VA`} value={receptacleTotal.toFixed(0)} unit="VA" />
          <ResultRow label="After Demand Factor (220.44)" value={receptacleDemand.toFixed(0)} unit="VA" />
        </ResultSection>
        <ResultSection title="Other Loads">
          <ResultRow label="Show Window" value={showWindowVA.toFixed(0)} unit="VA" />
          <ResultRow label="Outside Signs (min 1200VA)" value={signVA.toFixed(0)} unit="VA" />
          <ResultRow label="Major Appliances" value={appliancesVA.toFixed(0)} unit="VA" />
          <ResultRow label="HVAC" value={hvacVA.toFixed(0)} unit="VA" />
        </ResultSection>
        <ResultSection title="Service Sizing">
          <ResultRow label="Total Load" value={totalVA.toFixed(0)} unit="VA" highlight />
          <ResultRow label="Total Amperage" value={totalAmps.toFixed(1)} unit="A" highlight />
        </ResultSection>
        <FormulaBox steps={steps} formulas={buildFormulas(nec)} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} Table 220.12 unit loads by occupancy (unlisted occupancies 2 VA/ft²). Table 220.42 lighting demand — hospitals/hotels/motels: do not apply the demand factors to areas where the entire lighting is likely to be used at one time. All other occupancies: 100% unless a 220.42 row exists for that occupancy.</li>
            <li>Receptacles: 180 VA per yoke (220.14(I)), then 220.44 (first 10 kVA at 100%, remainder 50%). Offices and banks: not less than 1 VA/ft² (220.14(K)). Show window: 200 VA per linear foot (220.14(G)). Sign outlet: not less than 1,200 VA if a sign load is entered (220.14(F)).</li>
            {nec.GFCI_SCOPE_OTHER_THAN_DWELLING && <li><strong>210.8(B) GFCI ({necYear}):</strong> {nec.GFCI_SCOPE_OTHER_THAN_DWELLING}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Occupancy Type">
        <Select value={v.occupancy} onChange={set("occupancy")} options={Object.entries(nec.OCCUPANCY_UNIT_LOADS).map(([k, val]) => ({
          value: k, label: `${k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} (${val} VA/sq ft)`
        }))} />
      </Field>
      <Field label="Floor Area" unit="sq ft"><NumInput value={v.sqft} onChange={set("sqft")} placeholder="5000" /></Field>
      <Field label="Number of Receptacles"><NumInput value={v.receptacles} onChange={set("receptacles")} placeholder="30" /></Field>
      <Field label="VA per Receptacle" unit="VA" hint="NEC: 180 VA each"><NumInput value={v.receptacleVA} onChange={set("receptacleVA")} placeholder="180" /></Field>
      <Field label="Show Window" unit="linear ft"><NumInput value={v.showWindow} onChange={set("showWindow")} placeholder="0" /></Field>
      <Field label="Outside Sign Circuit" unit="VA" hint="If used, not less than 1200 VA per 220.14(F)"><NumInput value={v.outsideSign} onChange={set("outsideSign")} placeholder="0" /></Field>
      <Field label="Hospital/Hotel lighting used at one time?" hint="Table 220.42 footnote — demand factors do not apply to those areas">
        <Select value={v.lightingUsedAtOneTime} onChange={set("lightingUsedAtOneTime")} options={[
          { value: false, label: "No — apply Table 220.42" },
          { value: true, label: "Yes — 100% (footnote)" },
        ]} />
      </Field>
      <Field label="Major Appliances (total)" unit="VA"><NumInput value={v.majorAppliances} onChange={set("majorAppliances")} placeholder="0" /></Field>
      <Field label="HVAC Load" unit="VA"><NumInput value={v.hvac} onChange={set("hvac")} placeholder="10000" /></Field>
      <Field label="System Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V 3Ø" },
          { value: 240, label: "240V" }, { value: 480, label: "480V 3Ø" },
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