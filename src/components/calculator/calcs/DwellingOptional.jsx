import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcDwellingOptional } from "./logic/dwellingCalcs";

function formulasFor(nec) {
  const hvac = nec.OPTIONAL_HVAC || {};
  const lt4 = Math.round((hvac.spaceHeatLt4Factor ?? 0.65) * 100);
  const ge4 = Math.round((hvac.spaceHeatGe4Factor ?? 0.40) * 100);
  const supp = Math.round((hvac.supplementalHeatFactor ?? 0.65) * 100);
  const remainder = Math.round((nec.OPTIONAL_DEMAND_FACTOR ?? 0.4) * 100);
  const genArt = nec.OPTIONAL_GENERAL_LOAD_ARTICLE || "220.82(B)";
  return [
    { label: `General Demand (NEC ${genArt})`, formula: `Demand = 100%(first 10kVA) + ${remainder}%(remainder)`, description: "Applied to general loads at nameplate: lighting + small appliance + laundry + appliances (range, dryer, water heater, etc.)" },
    { label: "AC / Heat Pump Compressor (NEC 220.82(C)(1)(2))", formula: "Cooling = max(AC, Heat Pump compressor) at 100%", description: "Air conditioning and heat pump compressor at nameplate rating" },
    { label: "Heat Pump + Supplemental (NEC 220.82(C)(3))", formula: `Heating = compressor 100% + supplemental ${supp}% (omit compressor if they cannot run together)`, description: "Take this selection vs cooling; do not add coincident heating and cooling" },
    { label: "Electric Space Heating (NEC 220.82(C)(4)(5))", formula: `Heat = heatStrip × ${lt4}% (<4 units) or ${ge4}% (4+ units)`, description: "Demand factor based on separately controlled units. 2017: 65% if fewer than four; 40% if four or more." },
    { label: "Thermal Storage (NEC 220.82(C)(6))", formula: "Load = nameplate at 100%", description: "Electric thermal storage or other heating expected to operate continuously at full nameplate. Do not also calculate that system under (C)(4) or (C)(5)." },
    { label: "Noncoincident HVAC (NEC 220.82(C))", formula: "HVAC = largest of (C)(1)–(C)(6)", description: "Use the larger of the calculated cooling or heating selections" },
    { label: "Total Load", formula: "Total VA = HVAC + General Demand", description: "Sum of noncoincident HVAC and demanded general load" },
  ];
}

export default function DwellingOptional({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["220_42_lighting_demand", "220_54_dryer_demand", "220_55_cooking_demand"], necYear);
  const [v, setV] = useCalculatorInputs({
    sqft: 2000, airCond: 5000, heatStrip: 0, heatPump: 0,
    heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0,
    otherLoads: 8000, voltage: 240,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcDwellingOptional(v, nec);
  const {
    hvacLoad_VA: hvacLoad,
    acLoad_VA: acLoad, electricHeatLoad_VA: electricHeatLoad,
    heatPumpCompressorLoad_VA: heatPumpCompressorLoad,
    supplementalHeatLoad_VA: supplementalHeatLoad,
    spaceHeaterLoad_VA: spaceHeaterLoad,
    heatPumpSystemLoad_VA: heatPumpSystemLoad,
    coolingLoad_VA: coolingLoad, heatingLoad_VA: heatingLoad,
    heatDemandFactor, spaceHeatArticle, noncoincidentSelected,
    generalLighting_VA: generalLighting,
    generalTotal_VA: generalTotal, generalDemand_VA: generalDemand,
    totalVA, totalAmps, minService_A: minService, steps,
  } = r;
  const laundry = nec.LAUNDRY_VA;
  const smallAppliance = 2 * nec.SMALL_APPLIANCE_VA;
  const other = parseFloat(v.otherLoads) || 0;
  const hvac = nec.OPTIONAL_HVAC || {};
  const lt4 = Math.round((hvac.spaceHeatLt4Factor ?? 0.65) * 100);
  const ge4 = Math.round((hvac.spaceHeatGe4Factor ?? 0.40) * 100);
  const suppPct = Math.round((hvac.supplementalHeatFactor ?? 0.65) * 100);
  const remainderPct = (nec.OPTIONAL_DEMAND_FACTOR * 100).toFixed(0);
  const genArt = nec.OPTIONAL_GENERAL_LOAD_ARTICLE || "220.82(B)";
  const applyArt = nec.OPTIONAL_APPLICABILITY_ARTICLE || "220.82(A)";
  const bothHeatSystems = (parseFloat(v.heatStrip) || 0) > 0 && (parseFloat(v.spaceHeater) || 0) > 0;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="HVAC — Largest of 220.82(C)(1)–(C)(6)">
          <ResultRow label="Air Conditioning (100%) — (C)(1)" value={acLoad} unit="VA" />
          <ResultRow label="Heat Pump Compressor (100%) — (C)(2)" value={heatPumpCompressorLoad} unit="VA" />
          <ResultRow label={`Electric Heat (${(heatDemandFactor * 100).toFixed(0)}%) — ${spaceHeatArticle}`} value={electricHeatLoad} unit="VA" />
          {supplementalHeatLoad > 0 && <ResultRow label={`Supplemental Heat (${suppPct}%) — (C)(3)`} value={supplementalHeatLoad} unit="VA" />}
          {spaceHeaterLoad > 0 && <ResultRow label="Thermal Storage (100%) — (C)(6)" value={spaceHeaterLoad} unit="VA" />}
          {heatPumpSystemLoad > 0 && <ResultRow label="Heat Pump System selection" value={heatPumpSystemLoad} unit="VA" />}
          <ResultRow label="Cooling Load" value={coolingLoad} unit="VA" />
          <ResultRow label="Heating Load" value={heatingLoad} unit="VA" />
          <ResultRow label={`HVAC Load (${noncoincidentSelected})`} value={hvacLoad} unit="VA" highlight />
        </ResultSection>
        <ResultSection title={`General Load (${genArt})`}>
          <ResultRow label="General Lighting (3 VA/sqft)" value={generalLighting} unit="VA" />
          <ResultRow label="Small Appliance (min 2 ckts) — 210.11(C)(1)" value={smallAppliance} unit="VA" />
          <ResultRow label="Laundry Circuit — 210.11(C)(2)" value={laundry} unit="VA" />
          <ResultRow label="Other Appliances (nameplate)" value={other} unit="VA" />
          <ResultRow label="General Total" value={generalTotal} unit="VA" />
          <ResultRow label="General Demand Applied" value={generalDemand} unit="VA" sub={`First 10k @ 100%, remainder @ ${remainderPct}%`} />
        </ResultSection>
        <ResultSection title="Service Sizing">
          <ResultRow label="Total Load" value={totalVA} unit="VA" highlight />
          <ResultRow label="Total Amperage" value={totalAmps} unit="A" highlight />
          <ResultRow label="Minimum Service Size" value={`${minService}A`} highlight />
        </ResultSection>
        <FormulaBox steps={steps} formulas={formulasFor(nec)} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} {applyArt}: optional method for one- and two-family dwellings (and the dwelling portion of a farm service as used) served by a single 120/240 V or 120/208 V 3-wire service or feeder rated 100 A or more.</li>
            <li>NEC {necYear} {genArt}: general loads (lighting, small-appliance, laundry, and nameplate appliances such as range, dryer, water heater, dishwasher) — first 10,000 VA at 100%, remainder at {remainderPct}%. Table 220.55 / 220.54 demand factors are not used in this method.</li>
            <li>NEC {necYear} 220.82(C): HVAC is the <strong>largest</strong> of (C)(1)–(C)(6) — AC 100%, heat-pump compressor 100%, compressor + {suppPct}% supplemental (omit compressor from that selection if they cannot run together), space heat {lt4}% if fewer than 4 separately controlled units or {ge4}% if 4 or more, thermal storage / continuous heating 100%. Do not add heating and cooling.</li>
            {bothHeatSystems && <li>Electric space heating and thermal storage are both entered. A system that qualifies under (C)(6) must not also be calculated under (C)(4) or (C)(5). The calculator takes the larger selection; it does not add them.</li>}
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
    }
    >
      <Field label="Living Area" unit="sq ft"><NumInput value={v.sqft} onChange={set("sqft")} placeholder="2000" /></Field>
      <Field label="Air Conditioning" unit="VA" hint="Nameplate, at 100% per 220.82(C)(1)"><NumInput value={v.airCond} onChange={set("airCond")} placeholder="5000" /></Field>
      <Field label="Heat Pump Compressor" unit="VA" hint="At 100% per 220.82(C)(2)"><NumInput value={v.heatPump} onChange={set("heatPump")} placeholder="0" /></Field>
      <Field label="Electric Space Heating" unit="VA" hint={`Bathroom / room heat, etc. ${lt4}% if <4 units (C)(4); ${ge4}% if 4+ units (C)(5)`}><NumInput value={v.heatStrip} onChange={set("heatStrip")} placeholder="0" /></Field>
      <Field label="Separately Controlled Heating Units" unit="count" hint={`<4 → ${lt4}% (C)(4), 4+ → ${ge4}% (C)(5)`}><NumInput value={v.heatUnits} onChange={set("heatUnits")} placeholder="1" min={1} /></Field>
      <Field label="Heat Pump Supplemental Heat" unit="VA" hint={`At ${suppPct}% per 220.82(C)(3)`}><NumInput value={v.supplementalHeat} onChange={set("supplementalHeat")} placeholder="0" /></Field>
      <Field label="Supplemental Heat Simultaneous?" hint="Can supplemental heat operate with the compressor? If no, compressor is omitted from the (C)(3) selection">
        <Select value={v.supplementalSimultaneous} onChange={set("supplementalSimultaneous")} options={[
          { value: false, label: "No — omit compressor from (C)(3)" },
          { value: true, label: "Yes — compressor 100% + supplemental 65%" },
        ]} />
      </Field>
      <Field label="Thermal Storage / Continuous Heat" unit="VA" hint="100% per 220.82(C)(6). Ordinary space heaters belong under Electric Space Heating, not here."><NumInput value={v.spaceHeater} onChange={set("spaceHeater")} placeholder="0" /></Field>
      <Field label="Other Appliances (nameplate total)" unit="VA" hint="Range, dryer, dishwasher, water heater, wall ovens, etc. at nameplate — 220.82(B)">
        <NumInput value={v.otherLoads} onChange={set("otherLoads")} placeholder="8000" />
      </Field>
      <Field label="Service Voltage" unit="V">
        <Select value={v.voltage} onChange={set("voltage")} options={[{ value: 120, label: "120V" }, { value: 240, label: "240V" }]} />
      </Field>
    </CalcLayout>
  );
}
