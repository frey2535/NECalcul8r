import React from "react";
import { useCalculatorInputs, useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcGeneratorSizing } from "./logic/generatorSizingCalc";
import FormulaBox from "../FormulaBox";

const GEN_SIZES = [7.5, 10, 15, 20, 25, 30, 45, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];

function Checkbox({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-input accent-blue-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</span>}
      </span>
    </label>
  );
}

export default function GeneratorSizing({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [occupancy, setOccupancy] = useRestoredField("occupancy", "residential");
  const [mode, setMode] = useRestoredField("mode", "whole_house");
  const [v, setV] = useCalculatorInputs({
    // Service-based
    serviceA: 200, serviceV: 240, servicePhases: "single", demandFactor: 80,
    // Legacy essential loads
    criticalLoadsVA: 20000, motorLoadsVA: 5000, lightingVA: 3000, otherVA: 2000,
    // Residential / whole-house inventory
    squareFeet: 2000, kitchenCircuits: 2, laundryCircuits: 1, largestMotorLRA: 0,
    smallApplianceVA: 3000, laundryVA: 1500, refrigeratorVA: 1200,
    rangeVA: 12000, cooktopVA: 0, ovenVA: 0, dryerVA: 5000, waterHeaterVA: 4500,
    dishwasherVA: 1500, hvacCoolingVA: 4500, hvacHeatingVA: 10000, wellPumpVA: 1500,
    otherEssentialVA: 2000, otherOptionalVA: 0,
    // Commercial extras
    receptacleVA: 5000, elevatorVA: 0,
    // Shared
    pf: 0.8,
    loadSheddingEnabled: false,
    shedRange: true, shedCooktop: true, shedOven: true, shedDryer: true,
    shedWaterHeater: false, shedDishwasher: true, shedHvacCooling: false,
    shedHvacHeating: true, shedOtherOptional: true,
  });
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));
  const setBool = (k) => (val) => setV((p) => ({ ...p, [k]: Boolean(val) }));

  const normalizedMode = mode === "load" ? "loads" : mode;
  const gr = calcGeneratorSizing({ ...v, mode: normalizedMode, occupancy }, nec);
  const {
    serviceTotalVA, demandKVA, demandKW, serviceKW_withStarting, serviceGenSize,
    totalRunningVA, totalWithStarting, requiredKW, loadGenSize,
    connectedRunningVA, shedVA, largestMotorVA, wholeHouseWithStartingVA, wholeHouseKW, wholeHouseGenSize,
    applianceRows, loadSheddingEnabled, recommendedGenSize, steps,
  } = gr;
  const pf = parseFloat(v.pf) || 0.8;
  const serviceA = parseFloat(v.serviceA) || 200;
  const demandPct = parseFloat(v.demandFactor) || 80;
  const isResidential = occupancy === "residential";
  const isWholeHouse = normalizedMode === "whole_house";
  const isService = normalizedMode === "service";
  const isLoads = normalizedMode === "loads";

  const methodOptions = [
    { value: "whole_house", label: isResidential ? "Whole-house / appliance inventory" : "Facility load inventory" },
    { value: "loads", label: "Essential loads only (simple)" },
    { value: "service", label: "From service size (back-calculate)" },
  ];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ...v, mode: normalizedMode, occupancy }} outputValues={gr} result={
      <div className="space-y-2">
        {isService ? (
          <>
            <ResultSection title="Service Load">
              <ResultRow label="Service Size" value={serviceA} unit="A" />
              <ResultRow label="Total Service VA" value={(serviceTotalVA / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label={`Demand Load (${demandPct}%)`} value={demandKVA.toFixed(1)} unit="kVA" />
              <ResultRow label="Demand kW" value={demandKW.toFixed(1)} unit="kW" sub={`at PF = ${pf}`} />
            </ResultSection>
            <ResultSection title="Generator Requirements">
              <ResultRow label="With 25% Motor Starting" value={serviceKW_withStarting.toFixed(1)} unit="kW" highlight />
              <ResultRow label="Recommended Generator" value={`${serviceGenSize} kW`} highlight
                sub="Next standard size above requirement" />
            </ResultSection>
            <ResultSection title="Standard Generator Sizes">
              {GEN_SIZES.filter((s) => s >= demandKW * 0.8 && s <= serviceKW_withStarting * 2).map((s) => (
                <ResultRow key={s} label={`${s} kW`}
                  value={s >= serviceKW_withStarting ? "✓ Suitable" : "Too small"}
                  highlight={s === serviceGenSize} />
              ))}
            </ResultSection>
          </>
        ) : isWholeHouse ? (
          <>
            <ResultSection title="Connected Loads on Generator">
              {(applianceRows || []).filter((row) => row.includedVA > 0).map((row) => (
                <ResultRow key={row.key} label={row.label} value={(row.includedVA / 1000).toFixed(2)} unit="kVA" />
              ))}
              <ResultRow label="Connected running total" value={(connectedRunningVA / 1000).toFixed(2)} unit="kVA" highlight />
              {loadSheddingEnabled && (
                <ResultRow label="Load-shed (off generator)" value={(shedVA / 1000).toFixed(2)} unit="kVA"
                  sub="Excluded by load-management / shed modules" />
              )}
            </ResultSection>
            <ResultSection title="Generator Requirements">
              <ResultRow label="Largest motor (running)" value={(largestMotorVA / 1000).toFixed(2)} unit="kVA" />
              <ResultRow label="With largest-motor starting (6×)" value={(wholeHouseWithStartingVA / 1000).toFixed(2)} unit="kVA" highlight />
              <ResultRow label="Required kW" value={wholeHouseKW.toFixed(1)} unit="kW" highlight sub={`at PF = ${pf}`} />
              <ResultRow label="Recommended Generator" value={`${wholeHouseGenSize} kW`} highlight />
            </ResultSection>
          </>
        ) : (
          <>
            <ResultSection title="Load Summary">
              <ResultRow label="Critical Loads" value={((parseFloat(v.criticalLoadsVA) || 0) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Motor (running)" value={((parseFloat(v.motorLoadsVA) || 0) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Motor Starting (6×)" value={(((parseFloat(v.motorLoadsVA) || 0) * 6) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Lighting" value={((parseFloat(v.lightingVA) || 0) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Other" value={((parseFloat(v.otherVA) || 0) / 1000).toFixed(1)} unit="kVA" />
            </ResultSection>
            <ResultSection title="Generator Requirements">
              <ResultRow label="Total Running Load" value={(totalRunningVA / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="With Motor Starting" value={(totalWithStarting / 1000).toFixed(1)} unit="kVA" highlight />
              <ResultRow label="Required kW" value={requiredKW.toFixed(1)} unit="kW" highlight sub={`at PF = ${pf}`} />
              <ResultRow label="Recommended Generator" value={`${loadGenSize} kW`} highlight />
            </ResultSection>
          </>
        )}
        <FormulaBox steps={steps} />
        <NoteBox>
          NEC {necYear} 702 / 445: Size the standby source for the loads that remain connected through the transfer equipment.
          Use demand factors and noncoincidence carefully — this calculator uses connected/nameplate values you enter.
          Whole-house dwelling mode applies Article 220 demand logic and checks motor starting separately; actual LRA is used when entered, otherwise a conservative 6× running-VA estimate is used. Transfer equipment is required per NEC 702.
          Size continuous generator ampacity path with the 125% continuous factor where applicable (445.13).
          {loadSheddingEnabled ? " Load-shed / load-management modules reduce generator size by keeping selected loads off the standby source." : ""}
          {gr.dwelling_generator_shutdown_note ? ` ${gr.dwelling_generator_shutdown_article}: ${gr.dwelling_generator_shutdown_note}` : ""}
          {" "}Recommended size shown: {recommendedGenSize} kW.
        </NoteBox>
      </div>
    }>
      <Field label="Building Type">
        <Select value={occupancy} onChange={setOccupancy} options={[
          { value: "residential", label: "Residential (dwelling)" },
          { value: "commercial", label: "Commercial / facility" },
        ]} />
      </Field>

      <Field label="Calculation Method">
        <Select value={normalizedMode} onChange={setMode} options={methodOptions} />
      </Field>

      {isService && (
        <>
          <Field label="Service Size" unit="A">
            <NumInput value={v.serviceA} onChange={set("serviceA")} placeholder="200" />
          </Field>
          <Field label="Service Voltage">
            <Select value={v.serviceV} onChange={set("serviceV")} options={[
              { value: 120, label: "120V" }, { value: 208, label: "208V" },
              { value: 240, label: "240V" }, { value: 480, label: "480V" },
            ]} />
          </Field>
          <Field label="Phase">
            <Select value={v.servicePhases} onChange={set("servicePhases")} options={[
              { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" },
            ]} />
          </Field>
          <Field label="Demand Factor" unit="%" hint="Typical: 60–80% for many facilities when back-calculating from service">
            <NumInput value={v.demandFactor} onChange={set("demandFactor")} placeholder="80" min={10} max={100} />
          </Field>
        </>
      )}

      {isLoads && (
        <>
          <Field label="Critical / Essential Loads" unit="VA">
            <NumInput value={v.criticalLoadsVA} onChange={set("criticalLoadsVA")} placeholder="20000" />
          </Field>
          <Field label="Motor Loads (running)" unit="VA" hint="Starting = 6× running is applied automatically">
            <NumInput value={v.motorLoadsVA} onChange={set("motorLoadsVA")} placeholder="5000" />
          </Field>
          <Field label="Lighting Loads" unit="VA">
            <NumInput value={v.lightingVA} onChange={set("lightingVA")} placeholder="3000" />
          </Field>
          <Field label="Other Loads" unit="VA">
            <NumInput value={v.otherVA} onChange={set("otherVA")} placeholder="2000" />
          </Field>
        </>
      )}

      {isWholeHouse && isResidential && (
        <>
          <Field label="Dwelling floor area" unit="ft²" hint="Used for the NEC dwelling general-lighting load">
            <NumInput value={v.squareFeet} onChange={set("squareFeet")} placeholder="2000" min={0} />
          </Field>
          <Field label="Kitchen small-appliance circuits" hint="NEC minimum is typically two 1,500 VA circuits">
            <NumInput value={v.kitchenCircuits} onChange={set("kitchenCircuits")} placeholder="2" min={0} />
          </Field>
          <Field label="Laundry circuits">
            <NumInput value={v.laundryCircuits} onChange={set("laundryCircuits")} placeholder="1" min={0} />
          </Field>
          <Field label="Largest motor actual LRA" unit="A" hint="Preferred for generator motor-start verification; leave 0 if unknown">
            <NumInput value={v.largestMotorLRA} onChange={set("largestMotorLRA")} placeholder="0" min={0} />
          </Field>
          <Field label="Lighting" unit="VA">
            <NumInput value={v.lightingVA} onChange={set("lightingVA")} placeholder="3000" />
          </Field>
          <Field label="Small-appliance circuits" unit="VA" hint="Typically 2 × 1500 VA">
            <NumInput value={v.smallApplianceVA} onChange={set("smallApplianceVA")} placeholder="3000" />
          </Field>
          <Field label="Laundry circuit" unit="VA">
            <NumInput value={v.laundryVA} onChange={set("laundryVA")} placeholder="1500" />
          </Field>
          <Field label="Refrigerator" unit="VA">
            <NumInput value={v.refrigeratorVA} onChange={set("refrigeratorVA")} placeholder="1200" />
          </Field>
          <Field label="Range / stove" unit="VA">
            <NumInput value={v.rangeVA} onChange={set("rangeVA")} placeholder="12000" />
          </Field>
          <Field label="Cooktop" unit="VA">
            <NumInput value={v.cooktopVA} onChange={set("cooktopVA")} placeholder="0" />
          </Field>
          <Field label="Wall oven" unit="VA">
            <NumInput value={v.ovenVA} onChange={set("ovenVA")} placeholder="0" />
          </Field>
          <Field label="Clothes dryer" unit="VA">
            <NumInput value={v.dryerVA} onChange={set("dryerVA")} placeholder="5000" />
          </Field>
          <Field label="Water heater" unit="VA">
            <NumInput value={v.waterHeaterVA} onChange={set("waterHeaterVA")} placeholder="4500" />
          </Field>
          <Field label="Dishwasher" unit="VA">
            <NumInput value={v.dishwasherVA} onChange={set("dishwasherVA")} placeholder="1500" />
          </Field>
          <Field label="HVAC cooling / A/C" unit="VA" hint="Use compressor load; treated as motor for starting">
            <NumInput value={v.hvacCoolingVA} onChange={set("hvacCoolingVA")} placeholder="4500" />
          </Field>
          <Field label="HVAC heating / heat strips" unit="VA">
            <NumInput value={v.hvacHeatingVA} onChange={set("hvacHeatingVA")} placeholder="10000" />
          </Field>
          <Field label="Well / sump pump" unit="VA">
            <NumInput value={v.wellPumpVA} onChange={set("wellPumpVA")} placeholder="1500" />
          </Field>
          <Field label="Other essential loads" unit="VA">
            <NumInput value={v.otherEssentialVA} onChange={set("otherEssentialVA")} placeholder="2000" />
          </Field>
          <Field label="Other optional loads" unit="VA">
            <NumInput value={v.otherOptionalVA} onChange={set("otherOptionalVA")} placeholder="0" />
          </Field>
        </>
      )}

      {isWholeHouse && !isResidential && (
        <>
          <Field label="Lighting" unit="VA">
            <NumInput value={v.lightingVA} onChange={set("lightingVA")} placeholder="3000" />
          </Field>
          <Field label="Receptacle / general" unit="VA">
            <NumInput value={v.receptacleVA} onChange={set("receptacleVA")} placeholder="5000" />
          </Field>
          <Field label="Critical / life-safety" unit="VA">
            <NumInput value={v.criticalLoadsVA} onChange={set("criticalLoadsVA")} placeholder="20000" />
          </Field>
          <Field label="HVAC cooling" unit="VA">
            <NumInput value={v.hvacCoolingVA} onChange={set("hvacCoolingVA")} placeholder="4500" />
          </Field>
          <Field label="HVAC heating" unit="VA">
            <NumInput value={v.hvacHeatingVA} onChange={set("hvacHeatingVA")} placeholder="10000" />
          </Field>
          <Field label="Motors / process" unit="VA" hint="Largest motor gets 6× starting">
            <NumInput value={v.motorLoadsVA} onChange={set("motorLoadsVA")} placeholder="5000" />
          </Field>
          <Field label="Elevator / lift" unit="VA">
            <NumInput value={v.elevatorVA} onChange={set("elevatorVA")} placeholder="0" />
          </Field>
          <Field label="Other essential" unit="VA">
            <NumInput value={v.otherEssentialVA} onChange={set("otherEssentialVA")} placeholder="2000" />
          </Field>
          <Field label="Discretionary / shedable" unit="VA">
            <NumInput value={v.otherOptionalVA} onChange={set("otherOptionalVA")} placeholder="0" />
          </Field>
        </>
      )}

      {isWholeHouse && (
        <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-3">
          <Checkbox
            checked={Boolean(v.loadSheddingEnabled === true || v.loadSheddingEnabled === "true")}
            onChange={setBool("loadSheddingEnabled")}
            label="Use load-shedding / load-management modules"
            hint="Keeps selected loads off the standby generator so you can downsize the machine."
          />
          {loadSheddingEnabled && (
            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {isResidential ? (
                <>
                  <Checkbox checked={Boolean(v.shedRange)} onChange={setBool("shedRange")} label="Shed range / stove" />
                  <Checkbox checked={Boolean(v.shedCooktop)} onChange={setBool("shedCooktop")} label="Shed cooktop" />
                  <Checkbox checked={Boolean(v.shedOven)} onChange={setBool("shedOven")} label="Shed wall oven" />
                  <Checkbox checked={Boolean(v.shedDryer)} onChange={setBool("shedDryer")} label="Shed dryer" />
                  <Checkbox checked={Boolean(v.shedWaterHeater)} onChange={setBool("shedWaterHeater")} label="Shed water heater" />
                  <Checkbox checked={Boolean(v.shedDishwasher)} onChange={setBool("shedDishwasher")} label="Shed dishwasher" />
                  <Checkbox checked={Boolean(v.shedHvacCooling)} onChange={setBool("shedHvacCooling")} label="Shed HVAC cooling" />
                  <Checkbox checked={Boolean(v.shedHvacHeating)} onChange={setBool("shedHvacHeating")} label="Shed HVAC heating" />
                  <Checkbox checked={Boolean(v.shedOtherOptional)} onChange={setBool("shedOtherOptional")} label="Shed other optional loads" />
                </>
              ) : (
                <>
                  <Checkbox checked={Boolean(v.shedHvacCooling)} onChange={setBool("shedHvacCooling")} label="Shed HVAC cooling" />
                  <Checkbox checked={Boolean(v.shedHvacHeating)} onChange={setBool("shedHvacHeating")} label="Shed HVAC heating" />
                  <Checkbox checked={Boolean(v.shedOtherOptional)} onChange={setBool("shedOtherOptional")} label="Shed discretionary / elevator / receptacles marked optional" />
                </>
              )}
            </div>
          )}
        </div>
      )}

      <Field label="Power Factor" unit="PF" hint="Typical: 0.8 for motors, 1.0 for resistive">
        <NumInput value={v.pf} onChange={set("pf")} placeholder="0.8" min={0.1} max={1} step={0.01} />
      </Field>
    </CalcLayout>
  );
}
