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
    squareFeet: 2000, kitchenCircuits: 2, laundryCircuits: 1, largestMotorLRA: 0, largestMotorRunningVA: 0, motorStartVoltage: 240,
    smallApplianceVA: 3000, laundryVA: 1500, refrigeratorVA: 1200, refrigeratorFastenedInPlace: false,
    rangeVA: 12000, cooktopVA: 0, ovenVA: 0, dryerVA: 5000, waterHeaterVA: 4500,
    dishwasherVA: 1500, hvacCoolingVA: 4500, hvacBlowerVA: 0, hvacHeatingVA: 10000, wellPumpVA: 1500,
    otherFixedApplianceVA: 0, otherFixedApplianceCount: 0, combineCookingEquipment: false, hvacCoincidence: "noncoincident",
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
  const gr = calcGeneratorSizing({ ...v, mode: normalizedMode, occupancy, necYear }, nec);
  const {
    serviceTotalVA, demandKVA, demandKW, serviceGenSize,
    totalRunningVA, requiredKW, loadGenSize,
    connectedRunningVA, shedVA, largestMotorVA, largestMotorAdderVA,
    necDemandVA, motorStartingKVA,
    wholeHouseKW, wholeHouseGenSize,
    applianceRows, loadSheddingEnabled, recommendedGenSize, steps,
  } = gr;
  const serviceA = parseFloat(v.serviceA) || 200;
  const demandPct = parseFloat(v.demandFactor) || 80;
  const isResidential = occupancy === "residential";
  const isWholeHouse = normalizedMode === "whole_house";
  const isService = normalizedMode === "service";
  const isLoads = normalizedMode === "loads";

  const methodOptions = [
    { value: "whole_house", label: isResidential ? "Whole-house / appliance inventory" : "Facility load inventory" },
    { value: "loads", label: "Essential loads only (simple)" },
    { value: "service", label: "From service size (reference only)" },
  ];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ...v, mode: normalizedMode, occupancy }} outputValues={gr} result={
      <div className="space-y-2">
        {isService ? (
          <>
            <ResultSection title="Service Capacity (Reference)">
              <ResultRow label="Service Size" value={serviceA} unit="A" />
              <ResultRow label="Service Capacity" value={(serviceTotalVA / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label={`Utilization Estimate (${demandPct}%)`} value={demandKVA.toFixed(1)} unit="kVA" highlight />
              <ResultRow label="Utilization Estimate" value={demandKW.toFixed(1)} unit="kW" highlight />
            </ResultSection>
            <ResultSection title="Generator Recommendation">
              <ResultRow
                label="NEC Generator Load"
                value="Not determined"
                highlight
                sub="Service ampacity alone is not an NEC optional-standby load calculation. Switch to Whole-house or Essential loads."
              />
              <ResultRow
                label="Nearest common size at utilization"
                value={`${serviceGenSize} kW`}
                sub="Informational only — not a code-compliant generator size from service ampacity"
              />
            </ResultSection>
            <ResultSection title="Nearby Standard Generator Sizes">
              {GEN_SIZES.filter((s) => s >= Math.max(7.5, demandKW * 0.5) && s <= Math.max(demandKW * 2.5, serviceGenSize * 1.5)).map((s) => (
                <ResultRow
                  key={s}
                  label={`${s} kW`}
                  value={s >= demandKW ? "≥ utilization estimate" : "Below estimate"}
                  highlight={s === serviceGenSize}
                />
              ))}
            </ResultSection>
          </>
        ) : isWholeHouse ? (
          <>
            <ResultSection title="Connected Loads on Generator">
              {(applianceRows || []).filter((row) => row.includedVA > 0).map((row) => (
                <ResultRow key={row.key} label={row.label} value={(row.includedVA / 1000).toFixed(2)} unit="kVA" />
              ))}
              <ResultRow label="Connected nameplate total" value={(connectedRunningVA / 1000).toFixed(2)} unit="kVA" highlight />
              {loadSheddingEnabled && (
                <ResultRow label="Load-shed (off generator)" value={(shedVA / 1000).toFixed(2)} unit="kVA"
                  sub="Excluded by load-management / shed modules" />
              )}
            </ResultSection>
            <ResultSection title="NEC Calculated Standby Load">
              <ResultRow label="NEC demand load" value={(necDemandVA / 1000).toFixed(2)} unit="kVA" highlight />
              <ResultRow label="Largest motor running" value={(largestMotorVA / 1000).toFixed(2)} unit="kVA" />
              <ResultRow label="Largest motor 25% adder" value={(largestMotorAdderVA / 1000).toFixed(2)} unit="kVA" />
              {motorStartingKVA > 0 && (
                <ResultRow label="Motor-starting check (LRA)" value={motorStartingKVA.toFixed(1)} unit="kVA"
                  sub="Verify against manufacturer/model transient capability" />
              )}
              <ResultRow label="Required kW" value={wholeHouseKW.toFixed(1)} unit="kW" highlight
                sub={isResidential ? "NEC dwelling demand basis" : "Connected inventory basis"} />
              <ResultRow label="Recommended Generator" value={`${wholeHouseGenSize} kW`} highlight />
            </ResultSection>
          </>
        ) : (
          <>
            <ResultSection title="Load Summary">
              <ResultRow label="Critical Loads" value={((parseFloat(v.criticalLoadsVA) || 0) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Motor (running)" value={((parseFloat(v.motorLoadsVA) || 0) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Lighting" value={((parseFloat(v.lightingVA) || 0) / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Other" value={((parseFloat(v.otherVA) || 0) / 1000).toFixed(1)} unit="kVA" />
            </ResultSection>
            <ResultSection title="Generator Requirements">
              <ResultRow label="Total Running Load" value={(totalRunningVA / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Largest motor 25% adder" value={(largestMotorAdderVA / 1000).toFixed(2)} unit="kVA" />
              <ResultRow label="Required kW" value={requiredKW.toFixed(1)} unit="kW" highlight />
              <ResultRow label="Recommended Generator" value={`${loadGenSize} kW`} highlight />
            </ResultSection>
          </>
        )}
        <FormulaBox steps={steps} />
        <NoteBox>
          NEC {necYear} 702 / 445: Size the standby source for the loads that remain connected through the transfer equipment.
          Use demand factors and noncoincidence carefully — this calculator uses connected/nameplate values you enter.
          Whole-house dwelling mode applies the selected NEC-year dwelling load rules. Motor starting is checked separately using actual LRA when provided and must be verified against the selected generator manufacturer/model transient capability. Service ampacity alone is not used as the NEC generator load.
          Size continuous generator ampacity path with the 125% continuous factor where applicable (445.13).
          {loadSheddingEnabled ? " Load-shed / load-management modules reduce generator size by keeping selected loads off the standby source." : ""}
          {gr.dwelling_generator_shutdown_note ? ` ${gr.dwelling_generator_shutdown_article}: ${gr.dwelling_generator_shutdown_note}` : ""}
          {recommendedGenSize != null ? ` Recommended size shown: ${recommendedGenSize} kW.` : " Service mode does not produce a code generator size — use Whole-house or Essential loads."}
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
          <Field label="Largest motor running load" unit="VA" hint="Used for the NEC 25% largest-motor adder. Use nameplate running VA.">
            <NumInput value={v.largestMotorRunningVA} onChange={set("largestMotorRunningVA")} placeholder="0" min={0} />
          </Field>
          <Field label="Largest motor actual LRA" unit="A" hint="Used only for the separate manufacturer motor-starting check.">
            <NumInput value={v.largestMotorLRA} onChange={set("largestMotorLRA")} placeholder="0" min={0} />
          </Field>
          <Field label="Motor starting voltage" unit="V">
            <NumInput value={v.motorStartVoltage} onChange={set("motorStartVoltage")} placeholder="240" min={1} />
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
          <Checkbox checked={Boolean(v.refrigeratorFastenedInPlace)} onChange={setBool("refrigeratorFastenedInPlace")}
            label="Refrigerator is fastened in place / built-in"
            hint="Only check when it qualifies as a fastened-in-place appliance for the applicable fixed-appliance demand rule." />
          <Field label="Range / stove" unit="VA">
            <NumInput value={v.rangeVA} onChange={set("rangeVA")} placeholder="12000" />
          </Field>
          <Field label="Cooktop" unit="VA">
            <NumInput value={v.cooktopVA} onChange={set("cooktopVA")} placeholder="0" />
          </Field>
          <Field label="Wall oven" unit="VA">
            <NumInput value={v.ovenVA} onChange={set("ovenVA")} placeholder="0" />
          </Field>
          <Checkbox checked={Boolean(v.combineCookingEquipment)} onChange={setBool("combineCookingEquipment")}
            label="Cooktop and wall oven qualify as one combined cooking appliance"
            hint="Use only when the installation qualifies for the applicable household cooking-equipment table note." />
          <Field label="Clothes dryer" unit="VA">
            <NumInput value={v.dryerVA} onChange={set("dryerVA")} placeholder="5000" />
          </Field>
          <Field label="Water heater" unit="VA">
            <NumInput value={v.waterHeaterVA} onChange={set("waterHeaterVA")} placeholder="4500" />
          </Field>
          <Field label="Dishwasher" unit="VA">
            <NumInput value={v.dishwasherVA} onChange={set("dishwasherVA")} placeholder="1500" />
          </Field>
          <Field label="HVAC outdoor condensers" unit="VA" hint="Enter the sum of all condenser running VA that can operate simultaneously. Do NOT include the 25% largest-motor adder here.">
            <NumInput value={v.hvacCoolingVA} onChange={set("hvacCoolingVA")} placeholder="4500" />
          </Field>
          <Field label="HVAC indoor blowers / air handlers" unit="VA" hint="Enter the electrical load of indoor blowers that operate with cooling. These are added to condenser load during cooling.">
            <NumInput value={v.hvacBlowerVA} onChange={set("hvacBlowerVA")} placeholder="0" />
          </Field>
          <Field label="HVAC heating / heat strips" unit="VA">
            <NumInput value={v.hvacHeatingVA} onChange={set("hvacHeatingVA")} placeholder="10000" />
          </Field>
          <Field label="Well / sump pump" unit="VA">
            <NumInput value={v.wellPumpVA} onChange={set("wellPumpVA")} placeholder="1500" />
          </Field>
          <Field label="Other qualifying fixed appliances" unit="VA">
            <NumInput value={v.otherFixedApplianceVA} onChange={set("otherFixedApplianceVA")} placeholder="0" />
          </Field>
          <Field label="Number of other qualifying fixed appliances" hint="Needed to determine whether the four-or-more fixed-appliance demand factor applies">
            <NumInput value={v.otherFixedApplianceCount} onChange={set("otherFixedApplianceCount")} placeholder="0" min={0} />
          </Field>
          <Field label="Heating / cooling operation" hint="Use simultaneous only when the loads can operate at the same time.">
            <Select value={v.hvacCoincidence} onChange={set("hvacCoincidence")} options={[
              { value: "noncoincident", label: "Noncoincident — use larger load" },
              { value: "simultaneous", label: "Can operate simultaneously — add both" },
            ]} />
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
            hint="Excludes selected loads only when the transfer/load-management system prevents them from being connected while on generator."
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

      {!isWholeHouse && <Field label="Power Factor" unit="PF" hint="Reference only in legacy estimate modes">
        <NumInput value={v.pf} onChange={set("pf")} placeholder="0.8" min={0.1} max={1} step={0.01} />
      </Field>}
    </CalcLayout>
  );
}
