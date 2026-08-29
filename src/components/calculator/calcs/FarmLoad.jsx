import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcFarmLoad } from "./logic/farmLoadCalc";

const FORMULAS = [
  { label: "Table 220.102 (each building)", formula: "Greater of simultaneous, 125% largest motor, or first 60 A @ 100% + next 60 A @ 50% + remainder @ 25% (ampere load at 240 V)", description: "Applies to farm buildings and other loads with two or more branch circuits — not the dwelling" },
  { label: "Table 220.103 (total farm buildings)", formula: "Largest 100%, second 75%, third 65%, remaining 50%", description: "Ranks the Table 220.102 results. Same-function loads may be combined as one 220.103 load." },
  { label: "Dwelling (220.103 note)", formula: "Add Part III or IV dwelling demand after Table 220.103", description: "Do not use Part IV if the dwelling has electric heat and the farm has electric grain drying" },
];

export default function FarmLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [buildings, setBuildings] = useRestoredField("buildings", [
    { name: "Dairy Barn", va: 35000, simultaneousVA: 0, largestMotorVA: 0, functionGroup: "" },
    { name: "Grain Storage", va: 15000, simultaneousVA: 0, largestMotorVA: 0, functionGroup: "" },
    { name: "Equipment Shed", va: 8000, simultaneousVA: 0, largestMotorVA: 0, functionGroup: "" },
  ]);
  const [dwellingVA, setDwellingVA] = useRestoredField("dwellingVA", 23000);
  const [voltage, setVoltage] = useRestoredField("voltage", "240");
  const [phases, setPhases] = useRestoredField("phases", "single");
  const [dwellingElectricHeat, setDwellingElectricHeat] = useRestoredField("dwellingElectricHeat", false);
  const [grainDrying, setGrainDrying] = useRestoredField("grainDrying", false);

  const addBuilding = () => setBuildings(p => [...p, { name: `Building ${p.length + 1}`, va: 5000, simultaneousVA: 0, largestMotorVA: 0, functionGroup: "" }]);
  const removeBuilding = i => setBuildings(p => p.filter((_, idx) => idx !== i));
  const updateBuilding = (i, key, val) => setBuildings(p => p.map((b, idx) => idx === i ? { ...b, [key]: val } : b));

  const r = calcFarmLoad({ dwellingVA, buildings, voltage, phases, dwellingElectricHeat, grainDrying }, nec);
  const { dwelling, farm102Buildings, farm103Loads, totalBuildingDemand, totalServiceVA, totalA, minService_A: minService, partIVBlocked, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ buildings, dwellingVA, voltage, phases, dwellingElectricHeat, grainDrying }} outputValues={r} result={
      <div className="space-y-2">
        {partIVBlocked && (
          <NoteBox title="220.102(A) / 220.103 note">
            Where the dwelling has electric heat and the farm has electric grain-drying systems, Part IV shall not be used to calculate the dwelling load when dwelling and farm loads are supplied by a common service. Enter a Part III dwelling demand.
          </NoteBox>
        )}
        <ResultSection title="Each Building (NEC Table 220.102)">
          {(farm102Buildings || []).map((b, i) => (
            <ResultRow
              key={i}
              label={b.name}
              value={b.farm102VA.toLocaleString()}
              unit="VA"
              sub={`Connected ${b.connectedVA.toLocaleString()} VA → 60/50/25 = ${b.tieredVA.toLocaleString()} VA${b.governing !== "table_220_102" ? ` — ${b.governing} governs` : ""}`}
            />
          ))}
        </ResultSection>
        <ResultSection title="Farm Building Total (NEC Table 220.103)">
          {(farm103Loads || []).map((b, i) => (
            <ResultRow
              key={i}
              label={`${b.name} (${b.factor}%)`}
              value={b.demanded.toLocaleString()}
              unit="VA"
              sub={`Table 220.102 load ${b.farm102VA.toLocaleString()} VA`}
              highlight={i === 0}
            />
          ))}
          <ResultRow label="Total Farm Building Demand" value={Math.round(totalBuildingDemand).toLocaleString()} unit="VA" highlight />
        </ResultSection>
        <ResultSection title="Farm Service Sizing">
          <ResultRow label="Dwelling (Part III or IV)" value={dwelling.toLocaleString()} unit="VA" sub="Added after Table 220.103" />
          <ResultRow label="Dwelling + Farm Buildings" value={Math.round(totalServiceVA).toLocaleString()} unit="VA" highlight />
          <ResultRow label="Service Current" value={totalA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Minimum Service Size" value={minService} unit="A" highlight sub="Next standard size" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} Part V: For each farm building, Table 220.102 uses the ampere load at 240 V — first 60 A at 100%, next 60 A at 50%, remainder at 25% — but not less than loads expected to operate simultaneously, or 125% of the largest motor. Table 220.103 then ranks those results (100%/75%/65%/50%). Same-function loads across buildings are combined as one 220.103 load after 220.102. The dwelling demand (Part III or IV) is added to that total. Each building feeder is sized from its own Table 220.102 result, not from the 220.103 service ranking.
        </NoteBox>
      </div>
    }>
      <Field label="Dwelling Demand (Part III or IV)" unit="VA" hint="Do not use Part IV if electric heat + grain drying on a common service">
        <NumInput value={dwellingVA} onChange={setDwellingVA} placeholder="23000" min={0} />
      </Field>
      <Field label="Dwelling has electric heat?">
        <Select value={dwellingElectricHeat} onChange={setDwellingElectricHeat} options={[
          { value: false, label: "No" },
          { value: true, label: "Yes" },
        ]} />
      </Field>
      <Field label="Farm has electric grain drying?">
        <Select value={grainDrying} onChange={setGrainDrying} options={[
          { value: false, label: "No" },
          { value: true, label: "Yes" },
        ]} />
      </Field>
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase">Farm Buildings (Table 220.102)</p>
        {buildings.map((b, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Building {i + 1}</span>
              {buildings.length > 1 && (
                <button onClick={() => removeBuilding(i)} className="text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
            <Field label="Building Name">
              <input
                type="text"
                value={b.name}
                onChange={e => updateBuilding(i, "name", e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-slate-50 px-3.5 py-1 text-sm font-medium"
              />
            </Field>
            <Field label="Connected Load" unit="VA">
              <NumInput value={b.va} onChange={val => updateBuilding(i, "va", val)} placeholder="10000" min={0} />
            </Field>
            <Field label="Loads expected to operate simultaneously" unit="VA" hint="Table 220.102 — not less than this value">
              <NumInput value={b.simultaneousVA || 0} onChange={val => updateBuilding(i, "simultaneousVA", val)} placeholder="0" min={0} />
            </Field>
            <Field label="Largest motor nameplate" unit="VA" hint="Compared at 125%">
              <NumInput value={b.largestMotorVA || 0} onChange={val => updateBuilding(i, "largestMotorVA", val)} placeholder="0" min={0} />
            </Field>
            <Field label="Same-function group" hint="Same name combines as one Table 220.103 load after 220.102">
              <input
                type="text"
                value={b.functionGroup || ""}
                onChange={e => updateBuilding(i, "functionGroup", e.target.value)}
                placeholder="leave blank if unique"
                className="flex h-11 w-full rounded-xl border border-input bg-slate-50 px-3.5 py-1 text-sm font-medium"
              />
            </Field>
          </div>
        ))}
        <button onClick={addBuilding} className="text-xs text-primary hover:underline">+ Add Building</button>
      </div>
      <Field label="Service Voltage">
        <Select value={voltage} onChange={setVoltage} options={[
          { value: "120", label: "120V" }, { value: "240", label: "240V" },
          { value: "208", label: "208V 3Ø" }, { value: "480", label: "480V 3Ø" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={phases} onChange={setPhases} options={[
          { value: "single", label: "Single-Phase" },
          { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
    </CalcLayout>
  );
}
