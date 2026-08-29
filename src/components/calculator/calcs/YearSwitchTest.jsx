import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Equal } from "lucide-react";
import { getNecData } from "@/data/nec";

import { calcDwellingStandard, calcDwellingOptional } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { calcEVCharging } from "@/components/calculator/calcs/logic/evChargingCalc";
import { calcReceptacleLoad } from "@/components/calculator/calcs/logic/receptacleCalc";
import { calcServiceSizing } from "@/components/calculator/calcs/logic/serviceSizingCalc";
import { calcConductorAmpacity } from "@/components/calculator/calcs/logic/conductorAmpacityCalc";
import { calcTransformerSizing } from "@/components/calculator/calcs/logic/transformerSizingCalc";
import { calcMotorBranchCircuit } from "@/components/calculator/calcs/logic/motorBranchCircuitCalc";
import { calcMotorFeeder } from "@/components/calculator/calcs/logic/motorFeederCalc";
import { calcCommercialLoad } from "@/components/calculator/calcs/logic/commercialLoadCalc";
import { calcMultifamilyLoad } from "@/components/calculator/calcs/logic/multifamilyLoadCalc";
import { calcFarmLoad } from "@/components/calculator/calcs/logic/farmLoadCalc";
import { calcConduitFill } from "@/components/calculator/calcs/logic/conduitFillCalc";
import { calcBoxFill } from "@/components/calculator/calcs/logic/boxFillCalc";
import { calcGeneratorSizing } from "@/components/calculator/calcs/logic/generatorSizingCalc";
import { calcSolarPV } from "@/components/calculator/calcs/logic/solarPVCalc";
import { calcPoolSpa } from "@/components/calculator/calcs/logic/poolSpaCalc";
import { calcDataCenter } from "@/components/calculator/calcs/logic/dataCenterCalc";
import { calcHVACLoad } from "@/components/calculator/calcs/logic/hvacLoadCalc";
import { calcKitchenEquipment } from "@/components/calculator/calcs/logic/kitchenEquipmentCalc";
import { calcLightingLoad } from "@/components/calculator/calcs/logic/lightingLoadCalc";
import { calcWelderLoad } from "@/components/calculator/calcs/logic/welderLoadCalc";
import { calcContinuousLoad } from "@/components/calculator/calcs/logic/continuousLoadCalc";
import { calcDemandFactor } from "@/components/calculator/calcs/logic/demandFactorCalc";
import { calcOvercurrentProtection } from "@/components/calculator/calcs/logic/overcurrentProtectionCalc";
import { calcFixedElectricHeat } from "@/components/calculator/calcs/logic/fixedElectricHeatCalc";
import { calcEGCSizing, calcGECSizing } from "@/components/calculator/calcs/logic/groundingCalc";
import { calcVoltageDrop } from "@/components/calculator/calcs/logic/voltageDropCalc";
import { calcShortCircuit } from "@/components/calculator/calcs/logic/shortCircuitCalc";
import { calcSupplementalGrounding } from "@/components/calculator/calcs/logic/supplementalGroundingCalc";
import { calcGECforSDS, calcMainBondingJumper, calcSystemBondingJumper, calcBondingJumperParallel } from "@/components/calculator/calcs/logic/bondingJumperCalcs";
import { calcPowerFactor } from "@/components/calculator/calcs/logic/powerFactorCalc";
import { calcRVParkLoad } from "@/components/calculator/calcs/logic/rvParkLoadCalc";
import { calcMarinaShorePower } from "@/components/calculator/calcs/logic/marinaShorePowerCalc";

const YEARS = ["2017", "2020", "2023", "2026"];
const NOTE_ONLY_FIELDS = new Set(["GFCI_scope", "island_peninsula_rule", "explanation", "GFCI_servicing_note", "outdoor_50A_gfci_note", "demandTableRef", "lightingArticle", "ampacityTable", "tempArticle", "bundleArticle", "dwellingServiceArticle"]);

const CALC_TESTS = {
  dwelling_standard: {
    label: "2000 sq ft, range 12kW, dryer 5kW, HVAC 5kW, 240V",
    inputs: { sqft: 2000, smallAppliance: 2, laundry: 1, bathroom: 0, range: 12000, dryer: 5000, dishwasher: 1200, disposer: 900, waterHeater: 4500, hvac: 5000, other: 0, voltage: 240 },
    fn: calcDwellingStandard,
  },
  dwelling_optional: {
    label: "2000 sq ft, AC 5kW, other loads 8kW, 240V",
    inputs: { sqft: 2000, airCond: 5000, heatStrip: 0, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0, otherLoads: 8000, voltage: 240 },
    fn: calcDwellingOptional,
  },
  ev_charging: {
    label: "Level 2, 240V, 32A, 1 unit, no demand mgmt",
    inputs: { voltage: 240, evseA: 32, numUnits: 1, demandManaged: "no", simultaneousLoad: 100 },
    fn: calcEVCharging,
  },
  receptacle_load: {
    label: "50 receptacles, 180 VA each, 120V, demand applied",
    inputs: { count: 50, vaPerReceptacle: 180, voltage: 120, phases: "single", applyDemand: true },
    fn: calcReceptacleLoad,
  },
  service_sizing: {
    label: "40,000 VA, 240V, single-phase, 80% continuous",
    inputs: { totalVA: 40000, voltage: 240, phases: "single", continuousPct: 80 },
    fn: calcServiceSizing,
  },
  conductor_ampacity: {
    label: "#12 copper, 75C, 26C ambient, 3 conductors, 75C terminal",
    inputs: { awg: "12", material: "copper", tempRating: "75", ambient: 26, bundled: 3, useTerminal: "75" },
    fn: calcConductorAmpacity,
  },
  transformer_sizing: {
    label: "75kVA, 480V to 208V 3-phase, 5.75% Z",
    inputs: { loadVA: 75000, primaryV: 480, secondaryV: 208, phases: "three", impedance: 5.75 },
    fn: calcTransformerSizing,
  },
  motor_full_load: {
    label: "10HP 3-phase 460V, ITCB, 75C terminals, SF>=1.15",
    inputs: { phases: "three", hp: "10", voltage: "460", ocpdType: "itcb", termRating: "75", nameplateFL: "", sfAbove115: "yes" },
    fn: calcMotorBranchCircuit,
  },
  motor_feeder: {
    label: "3 motors: 28A, 15.2A, 6.8A",
    inputs: { motors: [{ flc: 28 }, { flc: 15.2 }, { flc: 6.8 }], voltage: "208", phases: "three" },
    fn: calcMotorFeeder,
  },
  commercial_load: {
    label: "5000 sq ft office, 30 receptacles, 10kVA HVAC, 208V 3-phase",
    inputs: { occupancy: "office", sqft: 5000, receptacles: 30, receptacleVA: 180, showWindow: 0, showWindowVA: 200, outsideSign: 1200, majorAppliances: 0, hvac: 10000, voltage: 208, phases: "three" },
    fn: calcCommercialLoad,
  },
  multifamily_load: {
    label: "12 units, 900 sq ft, range 12kW, dryer 5kW, AC 3.5kW, 208V 3-phase",
    inputs: { numUnits: 12, sqftPerUnit: 900, smallApplianceCircuits: 2, laundryCircuits: 1, rangeKW: 12, dryerKW: 5, acKW: 3.5, heatKW: 0, waterHeaterKW: 4.5, houseLighting: 3000, houseHVAC: 5000, voltage: 208, phases: "three" },
    fn: calcMultifamilyLoad,
  },
  farm_load: {
    label: "Dwelling 23kVA + 3 farm buildings, 240V single-phase",
    inputs: { dwellingVA: 23000, buildings: [{ name: "Dairy Barn", va: 35000 }, { name: "Grain Storage", va: 15000 }, { name: "Equipment Shed", va: 8000 }], voltage: "240", phases: "single" },
    fn: calcFarmLoad,
  },
  conduit_fill: {
    label: "3 x #12 THHN in EMT",
    inputs: { wires: [{ type: "12 THHN", count: 3 }], conduitType: "EMT" },
    fn: calcConduitFill,
  },
  box_fill: {
    label: "#12 AWG, 4 conductors, 1 EGC, 1 device",
    inputs: { awg: "12", conductors: 4, grounding: 1, devices: 1, clamps: 0, supportFittings: 0, boxVolume: "18", customBoxVolume: "" },
    fn: calcBoxFill,
  },
  generator_sizing: {
    label: "200A service, 240V single-phase, 80% demand, PF=0.8",
    inputs: { mode: "service", serviceA: 200, serviceV: 240, servicePhases: "single", demandFactor: 80, pf: 0.8, criticalLoadsVA: 20000, motorLoadsVA: 5000, lightingVA: 3000, otherVA: 2000 },
    fn: calcGeneratorSizing,
  },
  solar_pv: {
    label: "40A inverter, 225A busbar, 200A main, 40A backfeed",
    inputs: { systemDC_kW: 10, inverterAC_kW: 9.6, inverterOutputA: 40, inverterOutputV: 240, phases: "single", busbarA: 225, mainBreakerA: 200, backfeedCB: 40 },
    fn: calcSolarPV,
  },
  pool_spa: {
    label: "1.5HP pump, 240V, 6kW heater, 300W lighting, pool",
    inputs: { pumpHP: 1.5, pumpV: 240, heaterKW: 6, lightingW: 300, installType: "pool" },
    fn: calcPoolSpa,
  },
  data_center: {
    label: "100kW IT, PUE 1.4, 480V 3-phase, N+1 redundancy, 94% UPS",
    inputs: { itLoad_kW: 100, pue: 1.4, voltage: 480, phases: "three", redundancy: "N+1", ups_efficiency: 94 },
    fn: calcDataCenter,
  },
  hvac_load: {
    label: "28A nameplate, single compressor, 240V single-phase",
    inputs: { nameplateAmps: 28, voltage: 240, phases: "single", compressorFLA: 20, fanFLA: 4, conductorType: "single" },
    fn: calcHVACLoad,
  },
  kitchen_equipment_demand: {
    label: "5 items totaling 55kW, 208V 3-phase",
    inputs: { equipment: [{ name: "Range", kw: 12 }, { name: "Fryer", kw: 15 }, { name: "Griddle", kw: 10 }, { name: "Steamer", kw: 8 }, { name: "Broiler", kw: 10 }], voltage: "208", phases: "three" },
    fn: calcKitchenEquipment,
  },
  lighting_load: {
    label: "10,000 sq ft office, 277V single-phase",
    inputs: { occupancy: "office", sqft: 10000, voltage: 277, phases: "single", actualFixtureW: 0 },
    fn: calcLightingLoad,
  },
  welding_receptacle: {
    label: "60A nameplate, 60% duty cycle, 240V single-phase",
    inputs: { nameplateAmps: 60, dutyCycle: 60, voltage: 240, phases: "single" },
    fn: calcWelderLoad,
  },
  continuous_load: {
    label: "16A continuous, 4A noncontinuous, 120V",
    inputs: { continuousA: 16, noncontinuousA: 4, voltage: 120, phases: "single" },
    fn: calcContinuousLoad,
  },
  demand_factor: {
    label: "Dwelling lighting demand, 50,000 VA",
    inputs: { loadType: "lighting_dwelling", totalVA: 50000 },
    fn: calcDemandFactor,
  },
  overcurrent_protection: {
    label: "65A conductor, allow next up, no continuous",
    inputs: { conductorAmpacity: 65, isContinuous: false, continuousLoad: 50, noncontinuousLoad: 15, awg: "large", allowNextUp: true },
    fn: calcOvercurrentProtection,
  },
  fixed_electric_heat: {
    label: "3 heaters x 2000W, 240V single-phase",
    inputs: { heatersCount: 3, wattsPerHeater: 2000, voltage: "240", phases: "single" },
    fn: calcFixedElectricHeat,
  },
  egc_sizing: {
    label: "100A OCPD, copper EGC",
    inputs: { ocpd: "100", material: "copper" },
    fn: calcEGCSizing,
  },
  grounding_electrode: {
    label: "Service conductor index 0, copper GEC",
    inputs: { serviceSize: "0", material: "copper" },
    fn: calcGECSizing,
  },
  voltage_drop: {
    label: "#12 AWG, 120V, 20A, 100 ft, copper, single-phase",
    inputs: { voltage: 120, current: 20, length: 100, material: "copper", phases: "single", selectedAWG: "12" },
    fn: calcVoltageDrop,
  },
  short_circuit: {
    label: "150kVA, 480 to 208V 3ph, 5.75% Z, 50ft #4/0 copper",
    inputs: { kva: 150, primaryV: 480, secondaryV: 208, phases: "three", impedance: 5.75, cableLength: 50, cableSize: "4/0", cableMaterial: "copper" },
    fn: calcShortCircuit,
  },
  supplemental_grounding_electrode: {
    label: "8ft rod, 5/8in dia, average garden soil",
    inputs: { soilType: "3", customRho: 100000, rodLength: 8, rodDiameter: 0.625 },
    fn: calcSupplementalGrounding,
  },
  gec_for_sds: {
    label: "SDS conductor index 2, copper GEC",
    inputs: { serviceSize: "2", material: "copper" },
    fn: calcGECforSDS,
  },
  main_bonding_jumper: {
    label: "2/0 AWG copper, 1 set, service application",
    inputs: { conductorSize: "2/0", mbjMaterial: "copper", parallelSets: 1, applicationType: "service" },
    fn: calcMainBondingJumper,
  },
  system_bonding_jumper: {
    label: "75kVA transformer, 2/0 AWG copper, 208V 3ph",
    inputs: { conductorSize: "2/0", sbjMaterial: "copper", parallelSets: 1, kva: 75, voltage: 208, phases: "three", sdsType: "transformer" },
    fn: calcSystemBondingJumper,
  },
  bonding_jumper_parallel: {
    label: "2/0 AWG copper, 2 parallel sets",
    inputs: { conductorSize: "2/0", bjMaterial: "copper", parallelSets: 2, method: "total" },
    fn: calcBondingJumperParallel,
  },
  power_factor: {
    label: "100kW load, PF 0.75 to 0.95, 480V 3ph",
    inputs: { kw: 100, currentPF: 0.75, targetPF: 0.95, voltage: 480, phases: "three" },
    fn: calcPowerFactor,
  },
  rv_park_load: {
    label: "10×20A, 20×30A, 5×50A sites, 240V 1Ø, 200ft feeder, copper 75°C",
    inputs: { sites20A: 10, sites30A: 20, sites50A: 5, voltage: "240", phases: "single", additionalLoads: [{ name: "Office", va: 5000 }, { name: "Bathhouse", va: 2000 }], material: "copper", tempRating: "75", length: 200, maxVD: "3" },
    fn: calcRVParkLoad,
  },
  marina_shore_power: {
    label: "10×30A, 5×50A, 2×100A receptacles, 208V 3Ø, 150ft feeder, copper 75°C",
    inputs: {
      receptacles: [
        { id: "r1", rating: "30A", quantity: 10, slip: "Slips 1-10", feeder: "Feeder 1", panel: "Panel A" },
        { id: "r2", rating: "50A", quantity: 5, slip: "Slips 11-15", feeder: "Feeder 1", panel: "Panel A" },
        { id: "r3", rating: "100A", quantity: 2, slip: "Slips 16-17", feeder: "Feeder 2", panel: "Panel B" },
      ],
      additionalLoads: [
        { id: "l1", type: "office", va: 5000 },
        { id: "l2", type: "lighting", va: 2000 },
        { id: "l3", type: "pump_out", va: 2000 },
      ],
      voltage: "208", phases: "three", material: "copper", tempRating: "75", length: 150, maxVD: "3",
      transformerEnabled: false, phaseMode: "auto",
    },
    fn: calcMarinaShorePower,
  },
};

function diffResults(resultsMap) {
  const allKeys = new Set(YEARS.flatMap(y => Object.keys(resultsMap[y] || {})));
  const diffs = [];
  for (const key of allKeys) {
    const vals = Object.fromEntries(YEARS.map(y => [y, resultsMap[y]?.[key]]));
    const unique = new Set(YEARS.map(y => JSON.stringify(vals[y])));
    if (unique.size > 1) diffs.push({ key, vals, isNoteOnly: NOTE_ONLY_FIELDS.has(key) });
  }
  return diffs;
}

function YearCell({ value, isDiff }) {
  const display = value === null || value === undefined
    ? <span className="text-muted-foreground italic text-[10px]">—</span>
    : typeof value === "boolean"
      ? <span className={value ? "text-emerald-600 font-semibold" : "text-slate-400"}>{value ? "YES" : "no"}</span>
      : typeof value === "object"
        ? <span className="text-[9px] font-mono">{JSON.stringify(value).slice(0, 30)}</span>
        : <span>{String(value)}</span>;
  return (
    <td className={`px-2 py-1.5 text-[11px] border-l border-border ${isDiff ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
      {display}
    </td>
  );
}

export default function YearSwitchTest({ calc }) {
  const [open, setOpen] = useState(false);

  const test = CALC_TESTS[calc.id];
  const hasTest = !!test;
  const hasYearFields = calc.calcYearFields?.length > 0;

  const { results, diffs, numericDiffs, noteDiffs, identical } = useMemo(() => {
    if (!test) return { results: {}, diffs: [], numericDiffs: [], noteDiffs: [], identical: true };
    const results = {};
    for (const y of YEARS) {
      const nec = getNecData(y);
      try { results[y] = test.fn(test.inputs, nec, y) || {}; }
      catch (e) { results[y] = { error: e.message }; }
    }
    const diffs = diffResults(results);
    const numericDiffs = diffs.filter(d => !d.isNoteOnly);
    const noteDiffs = diffs.filter(d => d.isNoteOnly);
    return { results, diffs, numericDiffs, noteDiffs, identical: diffs.length === 0 };
  }, [test]);

  const yearFieldValues = useMemo(() => {
    if (!hasYearFields) return {};
    const out = {};
    for (const field of calc.calcYearFields) {
      out[field] = {};
      for (const y of YEARS) out[field][y] = getNecData(y)[field];
    }
    return out;
  }, [calc.calcYearFields]);

  const yearFieldDiffs = useMemo(() => {
    return Object.entries(yearFieldValues)
      .filter(([, vals]) => new Set(YEARS.map(y => JSON.stringify(vals[y]))).size > 1)
      .map(([field]) => field);
  }, [yearFieldValues]);

  if (!hasYearFields && !hasTest) return null;

  const pillLabel = !hasTest
    ? `${yearFieldDiffs.length} field diff${yearFieldDiffs.length !== 1 ? "s" : ""}`
    : identical ? "identical output"
    : `${diffs.length} diff${diffs.length !== 1 ? "s" : ""}`;

  const pillColor = (!hasTest && yearFieldDiffs.length === 0) || (hasTest && identical)
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
    : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Real Parity Test
          {!open && <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${pillColor}`}>{pillLabel}</span>}
        </span>
        {hasTest && (
          <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">{test.label}</span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {hasYearFields && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">necData Fields by Year</p>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground">Field</th>
                      {YEARS.map(y => (
                        <th key={y} className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground border-l border-border">{y}</th>
                      ))}
                      <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground border-l border-border">Changed?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {calc.calcYearFields.map(field => {
                      const vals = yearFieldValues[field] || {};
                      const changed = yearFieldDiffs.includes(field);
                      return (
                        <tr key={field} className={changed ? "bg-amber-50/60 dark:bg-amber-950/10" : ""}>
                          <td className="px-2 py-1.5">
                            <code className="text-[10px] font-mono text-blue-700 dark:text-blue-400">{field}</code>
                          </td>
                          {YEARS.map(y => {
                            const raw = vals[y];
                            const display = raw == null ? "—"
                              : typeof raw === "boolean" ? (raw ? "true" : "false")
                              : typeof raw === "string" && raw.length > 40 ? raw.slice(0, 38) + "..."
                              : String(raw);
                            return (
                              <td key={y} className={`px-2 py-1.5 border-l border-border font-mono text-[10px] ${changed ? "text-amber-800 dark:text-amber-300" : "text-foreground"}`}>
                                {display}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 border-l border-border">
                            {changed
                              ? <span className="flex items-center gap-1 text-amber-600 font-semibold"><AlertTriangle className="w-3 h-3" /> differs</span>
                              : <span className="flex items-center gap-1 text-slate-400"><Equal className="w-3 h-3" /> same</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasTest && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Production Calc Output — <span className="normal-case font-normal text-foreground">{test.label}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mb-2 italic">
                Uses <code className="font-mono not-italic">{test.fn.name}</code> — identical to live calculator.
              </p>

              {identical ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span><strong>Identical output across all 4 NEC years</strong> — numeric results unchanged.</span>
                </div>
              ) : (
                <div className="space-y-1.5 mb-2">
                  {numericDiffs.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-[11px] text-amber-700 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> {numericDiffs.length} numeric output{numericDiffs.length !== 1 ? "s" : ""} differ across years
                    </div>
                  )}
                  {noteDiffs.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 text-[11px] text-blue-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {noteDiffs.length} note/flag field{noteDiffs.length !== 1 ? "s" : ""} differ (expected — year-specific guidance)
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground">Output field</th>
                      {YEARS.map(y => (
                        <th key={y} className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground border-l border-border">{y}</th>
                      ))}
                      <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground border-l border-border">Parity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.keys(results[YEARS[0]] || {}).map(key => {
                      const diff = diffs.find(d => d.key === key);
                      const isDiff = !!diff;
                      const isNoteOnly = diff?.isNoteOnly;
                      return (
                        <tr key={key} className={isDiff && !isNoteOnly ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{key}</td>
                          {YEARS.map(y => (
                            <YearCell key={y} value={results[y]?.[key]} isDiff={isDiff && !isNoteOnly} />
                          ))}
                          <td className="px-2 py-1.5 border-l border-border">
                            {!isDiff
                              ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> same</span>
                              : isNoteOnly
                                ? <span className="text-blue-600 font-semibold">expected</span>
                                : <span className="text-amber-600 font-semibold">differs</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}