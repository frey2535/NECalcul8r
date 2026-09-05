import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcDwellingStandard } from "./logic/dwellingCalcs";

function buildFormulas(nec) {
  const demandDesc = nec.DWELLING_DEMAND_TABLE.map(t =>
    `${(t.factor * 100).toFixed(0)}%${t.band < Infinity ? ` first ${t.band.toLocaleString()} VA` : " remainder"}`
  ).join(" + ");
  return [
    { label: "General Lighting Load", formula: `Lighting VA = Floor Area (sq ft) × ${nec.DWELLING_LIGHTING_VA_PER_SQFT} VA/sq ft`, description: `NEC 220.12 Table — dwellings use ${nec.DWELLING_LIGHTING_VA_PER_SQFT} VA/sq ft` },
    { label: "Lighting Demand (NEC 220.42)", formula: `Demand = ${demandDesc}`, description: "Applied to general lighting + small appliance + laundry circuits" },
    { label: "Range Demand", formula: "Col A: <3½ kW % of nameplate | Col B: 3½–8¾ kW | Col C: table kW (8¾–12 kW) | Note 1: +5% per kW or major fraction over 12 kW", description: "Cooking demand table: Table 220.55. NEC 220.60 is the separate noncoincident-load rule. One 12 kW range = 8 kW. Ranges ≤8¾ kW use Column A/B percent of nameplate, not 8 kW flat." },
    { label: "Service Amperage", formula: "A = Total VA / Voltage", description: "For 240V single-phase service" },
  ];
}
export default function DwellingStandard({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["220_12_unit_loads", "220_42_lighting_demand", "220_54_dryer_demand", "220_55_cooking_demand", "240_6_std_sizes"], necYear);
  const [v, setV] = useCalculatorInputs({
    sqft: 2000,
    smallAppliance: 2,
    laundry: 1,
    bathroom: 0,
    range: 12000,
    rangeCount: 1,
    dryer: 5000,
    dishwasher: 1200,
    disposer: 900,
    waterHeater: 4500,
    hvac: 5000,
    other: 0,
    voltage: 240,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcDwellingStandard(v, nec);
  const { genLighting_VA: genLighting, smallAppl_VA: smallApplVA, laundry_VA: laundryVA,
    subtotal_VA: subtotal, lightingDemand_VA: lightingDemand, rangeDemand_VA: rangeDemand,
    dryerDemand_VA: dryerDemand, fixedLoads_VA: fixedLoads, totalVA, totalAmps, minService_A: minService, steps } = r;
  const rangeDemandArticle = r.rangeDemandArticle || "Table 220.55";
  const bathroomCount = parseFloat(v.bathroom) || 0;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Load Breakdown">
          <ResultRow label="General Lighting (3 VA/sq ft)" value={genLighting.toFixed(0)} unit="VA" />
          <ResultRow label="Small Appliance Circuits" value={smallApplVA.toFixed(0)} unit="VA" />
          <ResultRow label="Laundry Circuit" value={laundryVA.toFixed(0)} unit="VA" />
          {bathroomCount > 0 && <ResultRow label="Bathroom Circuits (not added)" value={`${bathroomCount} circuit(s)`} sub="210.11(C)(3) included in general lighting per 220.14(J)" />}
          <ResultRow label="Subtotal (before demand)" value={subtotal.toFixed(0)} unit="VA" />
        </ResultSection>
        <ResultSection title="After Demand Factors">
          <ResultRow label="Lighting Demand (220.42)" value={lightingDemand.toFixed(0)} unit="VA" />
          <ResultRow label={`Range Demand (${rangeDemandArticle})`} value={rangeDemand.toFixed(0)} unit="VA" />
          <ResultRow label="Dryer Demand (220.54)" value={dryerDemand.toFixed(0)} unit="VA" />
          <ResultRow label={r.fixedApplianceDemandApplied ? "Fixed Appliances (220.53 at 75%)" : "Fixed Appliances (nameplate)"} value={fixedLoads.toFixed(0)} unit="VA" />
        </ResultSection>
        <ResultSection title="Service Sizing">
          <ResultRow label="Total Load" value={totalVA.toFixed(0)} unit="VA" highlight />
          <ResultRow label="Total Amperage" value={totalAmps.toFixed(1)} unit="A" highlight />
          <ResultRow label="Minimum Service Size" value={`${minService}A`} sub="NEC 230.79(C)" highlight />
        </ResultSection>
        <FormulaBox steps={steps} formulas={buildFormulas(nec)} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 220.40 Standard Method. Floor area per Table 220.12 excludes unused cellars, unfinished attics, and open porches. Lighting demand (Table 220.42 dwelling): {nec.DWELLING_DEMAND_TABLE.map((t) => `${(t.factor * 100).toFixed(0)}%${t.band < Infinity ? ` first ${t.band.toLocaleString()} VA` : " remainder"}`).join(", ")}.</li>
            <li>220.52 / 210.11(C): minimum 2 small-appliance circuits and 1 laundry circuit at 1500 VA each. 210.11(C)(3) bathroom circuit is required but is not an extra 1500 VA — 220.14(J).</li>
            <li>Range per {rangeDemandArticle} (Columns A/B/C and Note 1). One household dryer: 5000 W or nameplate, 220.54. 220.53 75% applies only with 4+ fastened appliances other than range, dryer, space heating, or AC. Enter the larger of heating vs cooling in HVAC.</li>
            <li>Feeder/service neutral (220.61) is not calculated here — use the Neutral Load calculator. D1(b) motor/A/C additions (430.24 / 440) are not in this calculator.</li>
            <li>Minimum one-family dwelling service: {nec.DWELLING_MIN_SERVICE_AMPS}A per 230.79(C).</li>
            {nec.DWELLING_SPD_REQUIRED && <li><strong>230.67 ({necYear}):</strong> SPD Type 1 or 2 required for this dwelling unit service.</li>}
            {nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED && <li><strong>230.85 ({necYear}):</strong> Outdoor emergency disconnect required for one- and two-family dwellings.</li>}
            {nec.GFCI_SCOPE_DWELLING && <li><strong>210.8(A) GFCI scope ({necYear}):</strong> {nec.GFCI_SCOPE_DWELLING}</li>}
            {nec.ISLAND_PENINSULA_RULE && <li><strong>210.52(C)(2) Island/Peninsula ({necYear}):</strong> {nec.ISLAND_PENINSULA_RULE}</li>}
            {nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE && <li><strong>210.52(G) Garage/Basement ({necYear}):</strong> {nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE}</li>}
            {(nec.DISHWASHER_GFCI_REQUIRED || nec.SUMP_PUMP_GFCI_REQUIRED) && <li><strong>210.8(D)/422.5 Appliance GFCI ({necYear}):</strong> {nec.GFCI_SPECIFIC_APPLIANCES}</li>}
            {nec.GFCI_OUTDOOR_DWELLING_50A && <li><strong>210.8(F) Outdoor Outlets ({necYear}):</strong> {nec.GFCI_OUTDOOR_DWELLING_50A}</li>}
            {nec.DWELLING_SPD_TYPE && <li><strong>230.67 SPD Type ({necYear}):</strong> {nec.DWELLING_SPD_TYPE}</li>}
            {nec.DWELLING_OUTDOOR_DISCONNECT_NOTE && <li><strong>230.85 Emergency Disconnect ({necYear}):</strong> {nec.DWELLING_OUTDOOR_DISCONNECT_NOTE}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Living Area" unit="sq ft">
        <NumInput value={v.sqft} onChange={set("sqft")} placeholder="2000" />
      </Field>
      <Field label="Small Appliance Branch Circuits" unit="min. 2" hint="1500 VA each, NEC 210.11(C)(1)">
        <NumInput value={v.smallAppliance} onChange={set("smallAppliance")} min={2} />
      </Field>
      <Field label="Laundry Branch Circuits" unit="min. 1" hint="1500 VA each, NEC 210.11(C)(2)">
        <NumInput value={v.laundry} onChange={set("laundry")} min={1} />
      </Field>
      <Field label="Bathroom Branch Circuits" unit="count" hint="210.11(C)(3) required; load is in general lighting (220.14(J)), not extra 1500 VA">
        <NumInput value={v.bathroom} onChange={set("bathroom")} min={0} />
      </Field>
      <Field label="Range / Oven Nameplate" unit="watts" hint="0 if none">
        <NumInput value={v.range} onChange={set("range")} placeholder="12000" />
      </Field>
      <Field label="Number of Ranges" unit="count" hint={`${rangeDemandArticle} demand for multiple ranges`}>
        <NumInput value={v.rangeCount} onChange={set("rangeCount")} min={1} placeholder="1" />
      </Field>
      <Field label="Clothes Dryer Nameplate" unit="watts" hint="Min 5000W per NEC">
        <NumInput value={v.dryer} onChange={set("dryer")} placeholder="5000" />
      </Field>
      <Field label="Dishwasher" unit="watts">
        <NumInput value={v.dishwasher} onChange={set("dishwasher")} placeholder="1200" />
      </Field>
      <Field label="Garbage Disposer" unit="watts">
        <NumInput value={v.disposer} onChange={set("disposer")} placeholder="900" />
      </Field>
      <Field label="Water Heater" unit="watts">
        <NumInput value={v.waterHeater} onChange={set("waterHeater")} placeholder="4500" />
      </Field>
      <Field label="HVAC / A-C (largest)" unit="watts">
        <NumInput value={v.hvac} onChange={set("hvac")} placeholder="5000" />
      </Field>
      <Field label="Other Fixed Appliances" unit="watts">
        <NumInput value={v.other} onChange={set("other")} placeholder="0" />
      </Field>
      <Field label="Service Voltage" unit="V">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 240, label: "240V" },
        ]} />
      </Field>
    </CalcLayout>
  );
}