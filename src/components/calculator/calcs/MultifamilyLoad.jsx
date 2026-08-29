import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcMultifamilyLoad } from "./logic/multifamilyLoadCalc";

const FORMULAS = [
  { label: "NEC 220.84 Optional Method", formula: "Total Load = House loads (Part III) + (Σ unit loads × Table 220.84)", description: "Demand factor from Table 220.84 based on number of dwelling units (3 or more)" },
  { label: "Per-Unit Load (220.84(C))", formula: "Unit load = 3 VA/ft² + small-appliance + laundry + nameplate fastened + larger of A/C or heat", description: "Electric cooking required for 220.84(A)(2). Common laundry may omit in-unit laundry circuits." },
];

export default function MultifamilyLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    numUnits: 12,
    sqftPerUnit: 900,
    smallApplianceCircuits: 2,
    laundryCircuits: 1,
    commonLaundry: false,
    rangeKW: 12,
    dryerKW: 5,
    acKW: 3.5,
    heatKW: 0,
    waterHeaterKW: 4.5,
    otherFixedKW: 0,
    houseLighting: 3000,
    houseHVAC: 5000,
    voltage: 208,
    phases: "three",
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcMultifamilyLoad(v, nec);
  const {
    units, lightingVA, smallAppVA, laundryVA, perUnitVA, totalConnectedVA,
    demandFactor, demandedVA, houseVA, totalServiceVA, totalA, minService_A: minService,
    meets220_84A, electricCooking, meetsUnitCount, hvacVA, steps,
  } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        {!meets220_84A && (
          <NoteBox title="220.84(A) applicability">
            { !meetsUnitCount
              ? "220.84(A) requires three or more dwelling units. Table 220.84 is not applied."
              : !electricCooking
                ? "220.84(A)(2) requires each dwelling unit to be equipped with electric cooking equipment. Enter a range/cooking load, or use Part III (standard method). The 220.84 Exception (compare Part III without cooking vs optional with cooking) is not calculated here."
                : "220.84(A) requires each dwelling unit to be equipped with electric space heating, air conditioning, or both. Enter A/C or heat, or use Part III (standard method)." }
          </NoteBox>
        )}
        <ResultSection title="Per-Unit Load Summary (220.84(C))">
          <ResultRow label={`General Lighting (${nec.DWELLING_LIGHTING_VA_PER_SQFT} VA/ft²)`} value={(lightingVA).toLocaleString()} unit="VA" />
          <ResultRow label="Small Appliance Circuits" value={smallAppVA.toLocaleString()} unit="VA" />
          <ResultRow label="Laundry Circuit" value={laundryVA.toLocaleString()} unit="VA" />
          <ResultRow label="Range/Cooking" value={Math.round((parseFloat(v.rangeKW) || 0) * 1000).toLocaleString()} unit="VA" />
          <ResultRow label="Dryer" value={Math.round((parseFloat(v.dryerKW) || 0) * 1000).toLocaleString()} unit="VA" />
          <ResultRow label="HVAC (larger of A/C or heat)" value={hvacVA.toLocaleString()} unit="VA" />
          <ResultRow label="Water Heater" value={Math.round((parseFloat(v.waterHeaterKW) || 0) * 1000).toLocaleString()} unit="VA" />
          <ResultRow label="Other Fastened Appliances / Motors" value={Math.round((parseFloat(v.otherFixedKW) || 0) * 1000).toLocaleString()} unit="VA" />
          <ResultRow label="Total Per Unit" value={perUnitVA.toLocaleString()} unit="VA" highlight />
        </ResultSection>
        <ResultSection title="Building Load (NEC Table 220.84)">
          <ResultRow label="Number of Units" value={units} />
          <ResultRow label="Total Connected VA" value={totalConnectedVA.toLocaleString()} unit="VA" />
          <ResultRow label={`Demand Factor (Table 220.84)`} value={`${demandFactor}%`} />
          <ResultRow label="Dwelling-Unit Demand" value={Math.round(demandedVA).toLocaleString()} unit="VA" highlight />
          <ResultRow label="House Loads (220.84(B) Part III)" value={houseVA.toLocaleString()} unit="VA" />
          <ResultRow label="Total Service VA" value={Math.round(totalServiceVA).toLocaleString()} unit="VA" highlight />
        </ResultSection>
        <ResultSection title="Service Sizing">
          <ResultRow label="Total Service Current" value={totalA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Minimum Service Size" value={minService} unit="A" highlight sub="Next standard size" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 220.84: Optional method for a feeder or service supplying three or more dwelling units of a multifamily dwelling, if no unit is supplied by more than one feeder and each unit has electric cooking. Per-unit load is 220.84(C): general lighting ({nec.DWELLING_LIGHTING_VA_PER_SQFT} VA/ft²), 1500 VA per 210.11(C)(1) small-appliance circuit and 210.11(C)(2) laundry circuit, nameplate fastened appliances and motors, and the larger of air-conditioning or space heating. Table 220.84 applies to that connected unit load. House loads are calculated under Part III and added (220.84(B)). {necYear === "2017" ? "2017 Table 220.84: 51–61 units at 27%; 62 and over at 26%." : ""} Common laundry facilities may omit in-unit laundry circuits (210.52(F) Exception). Neutral (220.61) and 3-phase range phase-leg balancing (Annex D D5(b)) are not in this calculator.
        </NoteBox>
      </div>
    }>
      <Field label="Number of Dwelling Units" hint="220.84(A) — three or more">
        <NumInput value={v.numUnits} onChange={set("numUnits")} placeholder="12" min={0} />
      </Field>
      <Field label="Floor Area per Unit" unit="ft²">
        <NumInput value={v.sqftPerUnit} onChange={set("sqftPerUnit")} placeholder="900" min={0} />
      </Field>
      <Field label="Small-Appliance Circuits per Unit" hint="210.11(C)(1) — minimum 2">
        <NumInput value={v.smallApplianceCircuits} onChange={set("smallApplianceCircuits")} placeholder="2" min={2} />
      </Field>
      <Field label="Common laundry on premises?" hint="210.52(F) Exception — omit in-unit laundry circuit">
        <Select value={v.commonLaundry} onChange={set("commonLaundry")} options={[
          { value: false, label: "No — include laundry circuit(s)" },
          { value: true, label: "Yes — omit in-unit laundry" },
        ]} />
      </Field>
      {!(v.commonLaundry === true || v.commonLaundry === "true") && (
        <Field label="Laundry Circuits per Unit" hint="210.11(C)(2) — minimum 1 unless common laundry">
          <NumInput value={v.laundryCircuits} onChange={set("laundryCircuits")} placeholder="1" min={1} />
        </Field>
      )}
      <Field label="Range / Cooking per Unit" unit="kW" hint="220.84(A)(2) — electric cooking required">
        <NumInput value={v.rangeKW} onChange={set("rangeKW")} placeholder="12" min={0} />
      </Field>
      <Field label="Dryer per Unit" unit="kW">
        <NumInput value={v.dryerKW} onChange={set("dryerKW")} placeholder="5" min={0} />
      </Field>
      <Field label="A/C per Unit" unit="kW">
        <NumInput value={v.acKW} onChange={set("acKW")} placeholder="3.5" min={0} />
      </Field>
      <Field label="Electric Heat per Unit" unit="kW" hint="Larger of A/C or heat is used (220.84(C)(5))">
        <NumInput value={v.heatKW} onChange={set("heatKW")} placeholder="0" min={0} />
      </Field>
      <Field label="Water Heater per Unit" unit="kW">
        <NumInput value={v.waterHeaterKW} onChange={set("waterHeaterKW")} placeholder="4.5" min={0} />
      </Field>
      <Field label="Other Fastened Appliances / Motors per Unit" unit="kW" hint="220.84(C)(3) and (C)(4) nameplate">
        <NumInput value={v.otherFixedKW} onChange={set("otherFixedKW")} placeholder="0" min={0} />
      </Field>
      <Field label="House Loads — Part III calculated" unit="VA" hint="220.84(B) — enter lighting/receptacle demand already calculated under Part III">
        <NumInput value={v.houseLighting} onChange={set("houseLighting")} placeholder="3000" min={0} />
      </Field>
      <Field label="House HVAC / Other House Loads" unit="VA">
        <NumInput value={v.houseHVAC} onChange={set("houseHVAC")} placeholder="5000" min={0} />
      </Field>
      <Field label="Service Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V 3Ø" },
          { value: 240, label: "240V" }, { value: 480, label: "480V" },
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
