import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { getTablesById } from "@/lib/necTables";
import { calcMarinaShorePower } from "./logic/marinaShorePowerCalc";
import MarinaReceptacleEditor from "./MarinaReceptacleEditor";
import MarinaLoadEditor from "./MarinaLoadEditor";
import MarinaResults from "./MarinaResults";
import MarinaDockEditor from "./MarinaDockEditor";

export default function MarinaShorePower({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);

  const [receptacles, setReceptacles] = useRestoredField("receptacles", [
    { id: "r1", rating: "30A", quantity: 10, slip: "Slips 1–10", feeder: "Feeder 1", panel: "Panel A" },
    { id: "r2", rating: "50A", quantity: 5, slip: "Slips 11–15", feeder: "Feeder 1", panel: "Panel A" },
    { id: "r3", rating: "100A", quantity: 2, slip: "Slips 16–17", feeder: "Feeder 2", panel: "Panel B" },
  ]);
  const [additionalLoads, setAdditionalLoads] = useRestoredField("additionalLoads", [
    { id: "l1", type: "office", va: 5000 },
    { id: "l2", type: "lighting", va: 2000 },
    { id: "l3", type: "pump_out", va: 2000 },
  ]);

  const [voltage, setVoltage] = useRestoredField("voltage", "208");
  const [phases, setPhases] = useRestoredField("phases", "three");
  const [material, setMaterial] = useRestoredField("material", "copper");
  const [tempRating, setTempRating] = useRestoredField("tempRating", "75");
  const [length, setLength] = useRestoredField("length", 150);
  const [maxVD, setMaxVD] = useRestoredField("maxVD", "3");
  const [transformerEnabled, setTransformerEnabled] = useRestoredField("transformerEnabled", false);
  const [primaryV, setPrimaryV] = useRestoredField("primaryV", "480");
  const [secondaryV, setSecondaryV] = useRestoredField("secondaryV", "208");
  const [impedance, setImpedance] = useRestoredField("impedance", "5.75");
  const [phaseMode, setPhaseMode] = useRestoredField("phaseMode", "auto");
  const [calcMode, setCalcMode] = useRestoredField("calcMode", "single");
  const [docks, setDocks] = useRestoredField("docks", [
    { id: "d1", name: "Dock A", receptacles: [
      { id: "r1", rating: "30A", quantity: 10, slip: "Slips 1–10", feeder: "Feeder 1", panel: "Panel A" },
      { id: "r2", rating: "50A", quantity: 5, slip: "Slips 11–15", feeder: "Feeder 1", panel: "Panel A" },
    ]},
    { id: "d2", name: "Dock B", receptacles: [
      { id: "r3", rating: "30A", quantity: 12, slip: "Slips 1–12", feeder: "Feeder 2", panel: "Panel B" },
      { id: "r4", rating: "50A", quantity: 8, slip: "Slips 13–20", feeder: "Feeder 2", panel: "Panel B" },
    ]},
    { id: "d3", name: "Dock C", receptacles: [
      { id: "r5", rating: "30A", quantity: 7, slip: "Slips 1–7", feeder: "Feeder 3", panel: "Panel C" },
      { id: "r6", rating: "50A", quantity: 11, slip: "Slips 8–18", feeder: "Feeder 3", panel: "Panel C" },
    ]},
  ]);

  const allReceptacles = calcMode === "multi"
    ? docks.flatMap(d => d.receptacles.map(r => ({ ...r, dock: d.name })))
    : receptacles;

  const r = calcMarinaShorePower({
    receptacles: allReceptacles, additionalLoads, voltage, phases, material, tempRating, length, maxVD,
    transformerEnabled, primaryV, secondaryV, impedance, phaseMode,
  }, nec, necYear);
  const [demandTable] = getTablesById(["555_12_marina_demand"], necYear);

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{
      calcMode, docks, receptacles, additionalLoads, voltage, phases, material, tempRating, length, maxVD,
      transformerEnabled, primaryV, secondaryV, impedance, phaseMode,
    }} outputValues={r} trace={r.trace} result={
      <MarinaResults r={r} necYear={necYear} tempRating={tempRating} material={material} length={length} demandTable={demandTable} />
    }>
      <Field label="Calculation Mode">
        <Select value={calcMode} onChange={setCalcMode} options={[
          { value: "single", label: "Single Dock / Receptacle List" },
          { value: "multi", label: "Entire Marina — Multiple Docks" },
        ]} />
      </Field>
      {calcMode === "multi" ? (
        <MarinaDockEditor docks={docks} onChange={setDocks} phases={phases} phaseMode={phaseMode} />
      ) : (
        <MarinaReceptacleEditor receptacles={receptacles} onChange={setReceptacles} phases={phases} phaseMode={phaseMode} />
      )}
      <MarinaLoadEditor loads={additionalLoads} onChange={setAdditionalLoads} />

      <Field label="Distribution System">
        <Select value={voltage} onChange={setVoltage} options={[
          { value: "240", label: "120/240V Single-Phase" },
          { value: "208", label: "208Y/120V Three-Phase" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={phases} onChange={setPhases} options={[
          { value: "single", label: "Single-Phase" },
          { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
      <Field label="Phase Balancing Mode">
        <Select value={phaseMode} onChange={setPhaseMode} options={[
          { value: "auto", label: "Automatic — distribute evenly" },
          { value: "manual", label: "Manual — assign per receptacle" },
        ]} />
      </Field>

      <Field label="Conductor Material">
        <Select value={material} onChange={setMaterial} options={[
          { value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" },
        ]} />
      </Field>
      <Field label="Temperature Column (Insulation)">
        <Select value={tempRating} onChange={setTempRating} options={[
          { value: "60", label: "60°C (TW, UF)" }, { value: "75", label: "75°C (THWN, XHHW)" }, { value: "90", label: "90°C (THHN, XHHW-2)" },
        ]} />
      </Field>
      <Field label="Feeder Length (one-way)" unit="ft" hint="For voltage drop calculation">
        <input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="150" min={0} className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
      </Field>
      <Field label="Maximum Voltage Drop">
        <Select value={maxVD} onChange={setMaxVD} options={[
          { value: "3", label: "3% (branch circuit)" }, { value: "5", label: "5% (branch + feeder)" },
        ]} />
      </Field>

      <Field label="Transformer Sizing">
        <Select value={String(transformerEnabled)} onChange={val => setTransformerEnabled(val === "true")} options={[
          { value: "false", label: "Not required" }, { value: "true", label: "Size transformer (450.3)" },
        ]} />
      </Field>
      {transformerEnabled && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
          <p className="text-xs font-bold text-muted-foreground uppercase">Transformer Parameters</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Primary Voltage" unit="V">
              <input type="number" value={primaryV} onChange={e => setPrimaryV(e.target.value)} placeholder="480" className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
            </Field>
            <Field label="Secondary Voltage" unit="V">
              <input type="number" value={secondaryV} onChange={e => setSecondaryV(e.target.value)} placeholder="208" className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
            </Field>
          </div>
          <Field label="Impedance" unit="%">
            <input type="number" value={impedance} onChange={e => setImpedance(e.target.value)} placeholder="5.75" step="0.01" className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
          </Field>
        </div>
      )}
    </CalcLayout>
  );
}