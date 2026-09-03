/**
 * FROZEN BASELINE — Remaining 2017 calculators
 * v1.0.0 — 2026-08-22
 *
 * Gates every registry calculator not already covered by the dwelling /
 * commercial / kitchen / multifamily / farm / RV / marina scripts.
 */

import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";
import { calcReceptacleLoad } from "@/components/calculator/calcs/logic/receptacleCalc";
import { calcLightingLoad } from "@/components/calculator/calcs/logic/lightingLoadCalc";
import { calcMotorBranchCircuit } from "@/components/calculator/calcs/logic/motorBranchCircuitCalc";
import { calcMotorFeeder } from "@/components/calculator/calcs/logic/motorFeederCalc";
import { calcHVACLoad } from "@/components/calculator/calcs/logic/hvacLoadCalc";
import { calcFixedElectricHeat } from "@/components/calculator/calcs/logic/fixedElectricHeatCalc";
import { calcContinuousLoad } from "@/components/calculator/calcs/logic/continuousLoadCalc";
import { calcWelderLoad } from "@/components/calculator/calcs/logic/welderLoadCalc";
import { calcEVCharging } from "@/components/calculator/calcs/logic/evChargingCalc";
import { calcSolarPV } from "@/components/calculator/calcs/logic/solarPVCalc";
import { calcPoolSpa } from "@/components/calculator/calcs/logic/poolSpaCalc";
import { calcDataCenter } from "@/components/calculator/calcs/logic/dataCenterCalc";
import { calcGeneratorSizing } from "@/components/calculator/calcs/logic/generatorSizingCalc";
import { calcTransformerSizing } from "@/components/calculator/calcs/logic/transformerSizingCalc";
import { calcServiceSizing } from "@/components/calculator/calcs/logic/serviceSizingCalc";
import { calcDemandFactor } from "@/components/calculator/calcs/logic/demandFactorCalc";
import { calcVoltageDrop } from "@/components/calculator/calcs/logic/voltageDropCalc";
import { calcConductorAmpacity } from "@/components/calculator/calcs/logic/conductorAmpacityCalc";
import { calcBoxFill } from "@/components/calculator/calcs/logic/boxFillCalc";
import { calcConduitFill } from "@/components/calculator/calcs/logic/conduitFillCalc";
import { calcEGCSizing, calcGECSizing } from "@/components/calculator/calcs/logic/groundingCalc";
import { calcMainBondingJumper, calcSystemBondingJumper, calcGECforSDS, calcBondingJumperParallel } from "@/components/calculator/calcs/logic/bondingJumperCalcs";
import { calcSupplementalGrounding } from "@/components/calculator/calcs/logic/supplementalGroundingCalc";
import { calcOvercurrentProtection } from "@/components/calculator/calcs/logic/overcurrentProtectionCalc";
import { calcPowerFactor } from "@/components/calculator/calcs/logic/powerFactorCalc";
import { calcThreePhasePower, calcSinglePhasePower, calcMultiwire } from "@/components/calculator/calcs/logic/powerMathCalcs";
import { calcShortCircuit } from "@/components/calculator/calcs/logic/shortCircuitCalc";
import { calcMultifamilyStandard } from "@/components/calculator/calcs/logic/multifamilyStandardCalc";
import { calcPullBoxSizing } from "@/components/calculator/calcs/logic/pullBoxSizingCalc";
import { calcNeutralLoad } from "@/components/calculator/calcs/logic/neutralLoadCalc";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC = getNecData("2017");

function suite(id, title, calcFn, tests, tolerance) {
  const result = runCalcTests({ tests, calcFn, nec: NEC, tolerance: tolerance ?? 0.05 });
  return { id, title, ...result };
}

export const REMAINING_NUMERIC_SUITE_DEFS = [];
function def(id, title, calcFn, tests, tolerance) {
  REMAINING_NUMERIC_SUITE_DEFS.push({ id, title, calcFn, tests, tolerance: tolerance ?? 0.05 });
}


def("receptacle_load", "Receptacle Load 220.14(I) / 220.44", calcReceptacleLoad, [
  {
    id: "rec_yoke_180",
    description: "220.14(I) default 180 VA per yoke",
    inputs: { count: 10, voltage: 120, applyDemand: false },
    expected: { totalConnected_VA: 1800, demandAdjusted_VA: 1800 },
  },
  {
    id: "rec_below_10k_100",
    description: "220.44 — 50 yokes stay 100% (under 10 kVA)",
    inputs: { count: 50, vaPerReceptacle: 180, voltage: 120, applyDemand: true },
    expected: { totalConnected_VA: 9000, demandAdjusted_VA: 9000, circuits_required: 5 },
  },
  {
    id: "rec_220_44_tiers",
    description: "220.44 — 100 yokes: first 10 kVA 100%, remainder 50%",
    inputs: { count: 100, vaPerReceptacle: 180, voltage: 120, applyDemand: true },
    expected: { totalConnected_VA: 18000, demandAdjusted_VA: 14000, circuits_required: 8 },
  },
  {
    id: "rec_no_demand",
    description: "Demand off — connected load used",
    inputs: { count: 100, vaPerReceptacle: 180, voltage: 120, applyDemand: false },
    expected: { demandAdjusted_VA: 18000, circuits_required: 10 },
  },
  {
    id: "rec_3ph_amps",
    description: "Three-phase amps from demanded VA",
    inputs: { count: 100, vaPerReceptacle: 180, voltage: 208, phases: "three", applyDemand: true },
    expected: { demandAmps: 38.9 },
  },
]);

def("lighting_load", "Lighting Load Table 220.12 / 220.42", calcLightingLoad, [
  {
    id: "lt_office_100",
    description: "Office 3.5 VA/ft² — Table 220.42 All Others 100%",
    inputs: { occupancy: "office", sqft: 5000, voltage: 277, phases: "single" },
    expected: { occVA: 3.5, nec_VA: 17500, demand: 17500 },
  },
  {
    id: "lt_unlisted_2",
    description: "Unlisted occupancy uses Table 220.12 note 2 VA/ft² (not 3.5)",
    inputs: { occupancy: "museum", sqft: 4000, voltage: 277, phases: "single" },
    expected: { occVA: 2, nec_VA: 8000, demand: 8000 },
  },
  {
    id: "lt_dwelling_220_42",
    description: "Dwelling 10,000 ft² — 3 VA, 220.42 100/35/25",
    inputs: { occupancy: "dwelling", sqft: 10000, voltage: 120, phases: "single" },
    expected: { occVA: 3, nec_VA: 30000, demand: 12450, designVA: 12450, totalAmps: 103.8, numCircuits: 6 },
  },
  {
    id: "lt_dwelling_4500_demand_amps",
    description: "Dwelling 4,500 ft² — amps/circuits use 220.42 demand load, not raw Table 220.12 VA",
    inputs: { occupancy: "dwelling", sqft: 4500, voltage: 120, phases: "single", actualFixtureW: 0 },
    expected: { occVA: 3, nec_VA: 13500, demand: 6675, designVA: 6675, totalAmps: 55.6, actualAmps: 55.6, numCircuits: 3 },
  },
  {
    id: "lt_hotel_2017",
    description: "Hotel 50,000 ft² — 2017 220.42 50/40/30",
    inputs: { occupancy: "hotel_motel", sqft: 50000, voltage: 120, phases: "single" },
    expected: { occVA: 2, nec_VA: 100000, demand: 42000 },
  },
  {
    id: "lt_hotel_alias",
    description: "hotel key maps to hotel_motel unit load and demand",
    inputs: { occupancy: "hotel", sqft: 50000, voltage: 120, phases: "single" },
    expected: { occVA: 2, nec_VA: 100000, demand: 42000 },
  },
  {
    id: "lt_warehouse",
    description: "Warehouse 0.25 VA — first 12.5 kVA 100% then 50%",
    inputs: { occupancy: "warehouse", sqft: 60000, voltage: 277, phases: "single" },
    expected: { nec_VA: 15000, demand: 13750 },
  },
  {
    id: "lt_hospital",
    description: "Hospital 2 VA — 40% first 50 kVA, 20% remainder",
    inputs: { occupancy: "hospital", sqft: 100000, voltage: 277, phases: "single" },
    expected: { nec_VA: 200000, demand: 50000 },
  },
  {
    id: "lt_store_all_others",
    description: "Store not listed in 220.42 stays 100%",
    inputs: { occupancy: "store", sqft: 10000, voltage: 277, phases: "single" },
    expected: { occVA: 3, nec_VA: 30000, demand: 30000 },
  },
]);

def("motor_full_load", "Motor Branch Circuit 430.22 / 430.52 / 430.32", calcMotorBranchCircuit, [
  {
    id: "mtr_10hp_460_itb",
    description: "10 HP 460V 3Ø — Table 430.250 14 A, #14 at 75°C covers 17.5 A, 250% ITB 35 A",
    inputs: { phases: "three", hp: "10", voltage: "460", ocpdType: "itcb", termRating: 75, sfAbove115: "yes" },
    expected: { flc: 14, conductorMinA: 17.5, wireSize: "14", ocpdCalc: 35, ocpdSelected: 35, overloadMaxA: 17.5, overloadFactor: 1.25 },
  },
  {
    id: "mtr_dtef",
    description: "Same motor dual-element fuse 175% → 25 A",
    inputs: { phases: "three", hp: "10", voltage: "460", ocpdType: "dtef", termRating: 75, sfAbove115: "yes" },
    expected: { ocpdCalc: 24.5, ocpdSelected: 25 },
  },
  {
    id: "mtr_sf_115",
    description: "430.32 SF < 1.15 → 115% overload",
    inputs: { phases: "three", hp: "10", voltage: "460", ocpdType: "itcb", sfAbove115: "no" },
    expected: { overloadFactor: 1.15, overloadMaxA: 16.1 },
  },
  {
    id: "mtr_1ph_230",
    description: "1.5 HP 230V 1Ø — Table 430.248 10 A (not object*230)",
    inputs: { phases: "single", hp: "1.5", voltage: "230", ocpdType: "itcb", termRating: 75, sfAbove115: "yes" },
    expected: { flc: 10, conductorMinA: 12.5, ocpdSelected: 25 },
  },
  {
    id: "mtr_1ph_115",
    description: "1.5 HP 115V 1Ø — Table 430.248 20 A",
    inputs: { phases: "single", hp: "1.5", voltage: "115", ocpdType: "itcb", termRating: 75, sfAbove115: "yes" },
    expected: { flc: 20, conductorMinA: 25 },
  },
]);

def("motor_feeder", "Motor Feeder 430.24 / 430.62", calcMotorFeeder, [
  {
    id: "mf_430_24",
    description: "125% largest + sum of others",
    inputs: { motors: [{ flc: 14 }, { flc: 11 }, { flc: 7.6 }], voltage: 460, phases: "three" },
    expected: { largest: 14, sumOthers: 18.6, feederAmpacity: 36.1, largestOCPD: 35, feederOCPD: 60 },
  },
  {
    id: "mf_single",
    description: "One motor — feeder equals 125% FLC",
    inputs: { motors: [{ flc: 14 }] },
    expected: { feederAmpacity: 17.5, sumOthers: 0 },
  },
]);

def("hvac_load", "HVAC Load 440", calcHVACLoad, [
  {
    id: "hvac_single_175",
    description: "440.22 175% next size down; 125% conductors; 2017 no 210.8(E)",
    inputs: { nameplateAmps: 40, voltage: 240, phases: "single", compressorFLA: 32, fanFLA: 8, conductorType: "single" },
    expected: { conductorA: 50, maxOCPD_calc: 70, selectedOCPD: 70, GFCI_servicing_note: null },
  },
  {
    id: "hvac_multi",
    description: "Multi-motor: 125% compressor + 100% fan",
    inputs: { nameplateAmps: 40, compressorFLA: 30, fanFLA: 10, conductorType: "multi", voltage: 240, phases: "single" },
    expected: { conductorA: 47.5, totalFLA: 40 },
  },
]);

def("fixed_electric_heat", "Fixed Electric Heat 220.51 / 424", calcFixedElectricHeat, [
  {
    id: "heat_2x4000",
    description: "220.51 nameplate + 125% continuous",
    inputs: { heatersCount: 2, wattsPerHeater: 4000, voltage: 240, phases: "single" },
    expected: { totalW: 8000, totalA: 33.3, conductorA: 41.7, ocpd: 45 },
  },
]);

def("continuous_load", "Continuous Load 210.19 / 210.20", calcContinuousLoad, [
  {
    id: "cont_16_4",
    description: "125% continuous + 100% noncontinuous",
    inputs: { continuousA: 16, noncontinuousA: 4, voltage: 120, phases: "single" },
    expected: { minOCPD_A: 24, selectedOCPD: 25, continuousMult: 1.25 },
  },
]);

def("welding_receptacle", "Welder Load 630.11 / 630.12", calcWelderLoad, [
  {
    id: "weld_60pct_table",
    description: "Table 630.11(A) 60% = 0.78 (not raw √DC); 200% OCPD",
    inputs: { nameplateAmps: 60, dutyCycle: 60, voltage: 240, phases: "single" },
    expected: { dcFactor: 0.78, conductorA: 46.8, maxOCPD_calc: 120, maxOCPD: 110 },
  },
  {
    id: "weld_100pct",
    description: "100% duty cycle multiplier 1.00",
    inputs: { nameplateAmps: 60, dutyCycle: 100, voltage: 240, phases: "single" },
    expected: { dcFactor: 1, conductorA: 60 },
  },
]);

def("ev_charging", "EV Charging 625.42", calcEVCharging, [
  {
    id: "ev_32a",
    description: "625.42 125%; 2017 no 625.54 GFCI, no min load VA",
    inputs: { voltage: 240, evseA: 32, numUnits: 1, demandManaged: "no" },
    expected: { conductorA_each: 40, ocpd_each_A: 40, feederAmps: 40, GFCI_required: false, min_load_VA: 0, SPD_required: false, outdoor_disconnect: false },
  },
  {
    id: "ev_managed",
    description: "Demand-managed simultaneous load",
    inputs: { voltage: 240, evseA: 32, numUnits: 2, demandManaged: "yes", simultaneousLoad: 50 },
    expected: { feederAmps: 40 },
  },
]);

def("solar_pv", "Solar PV 690 / 705.12(D)", calcSolarPV, [
  {
    id: "pv_120_pass",
    description: "120% busbar rule passes (2017 705.12(D)(2)(3)(b))",
    inputs: { inverterOutputA: 40, busbarA: 225, mainBreakerA: 200, backfeedCB: 40, systemDC_kW: 10, inverterAC_kW: 9.6 },
    expected: { minConductorA: 50, minBackfeedCB: 50, rule120_limit: 270, rule120_used: 240, rule120_ok: true },
  },
  {
    id: "pv_120_fail",
    description: "120% rule fails when combined breakers exceed 120% of bus",
    inputs: { inverterOutputA: 40, busbarA: 200, mainBreakerA: 200, backfeedCB: 60, systemDC_kW: 10, inverterAC_kW: 9.6 },
    expected: { rule120_limit: 240, rule120_used: 260, rule120_ok: false },
  },
]);

def("pool_spa", "Pool / Spa 680 / 430", calcPoolSpa, [
  {
    id: "pool_1_5_240",
    description: "1.5 HP 240V uses 430.248 230V column 10 A (not 115V 20 A)",
    inputs: { pumpHP: 1.5, pumpV: 240, heaterKW: 0, lightingW: 0, installType: "pool" },
    expected: { flc: 10, pumpConductorA: 12.5, pumpOCPD: 25, pool_pump_gfci_required: true },
  },
  {
    id: "pool_heater",
    description: "Heater at 125% plus lighting",
    inputs: { pumpHP: 1.5, pumpV: 240, heaterKW: 5.5, lightingW: 300, installType: "pool" },
    expected: { heaterA: 22.9, lightingA: 2.5, totalA: 43.6 },
  },
]);

def("data_center", "Data Center 708 engineering", calcDataCenter, [
  {
    id: "dc_n1",
    description: "PUE × IT, N+1 redundancy, 125% continuous breaker",
    inputs: { itLoad_kW: 100, pue: 1.4, voltage: 480, phases: "three", redundancy: "N+1", ups_efficiency: 94 },
    expected: { totalFacilityKW: 140, coolingKW: 40, redundancyMultiplier: 1.25, breaker: 300 },
  },
], 0.2);

def("generator_sizing", "Generator Sizing 445 / 702", calcGeneratorSizing, [
  {
    id: "gen_service",
    description: "Service-based 200 A 240 V 80% demand",
    inputs: { mode: "service", serviceA: 200, serviceV: 240, servicePhases: "single", demandFactor: 80, pf: 0.8 },
    expected: { serviceTotalVA: 48000, demandKW: 30.7, serviceKW_withStarting: 38.4, recommendedGenSize: 45 },
  },
  {
    id: "gen_load",
    description: "Load-based 6× motor starting",
    inputs: { mode: "load", criticalLoadsVA: 5000, motorLoadsVA: 3000, lightingVA: 2000, otherVA: 1000, pf: 0.8 },
    expected: { totalRunningVA: 11000, totalWithStarting: 26000, recommendedGenSize: 25 },
  },
]);

def("transformer_sizing", "Transformer 450.3(B) 125% path", calcTransformerSizing, [
  {
    id: "xfmr_75kva",
    description: "75 kVA 480–208 3Ø — 125% both sides (conservative vs 250% primary+secondary)",
    inputs: { loadVA: 75000, primaryV: 480, secondaryV: 208, phases: "three", impedance: 5.75 },
    expected: { kVA: 75, primaryFLC: 90.2, secondaryFLC: 208.2, primaryOCPD: 100, secondaryOCPD: 225 },
  },
]);

def("service_sizing", "Service Sizing 230.42", calcServiceSizing, [
  {
    id: "svc_40kva",
    description: "230.42(A)(1) 125% continuous; 2017 min 100 A; no 230.67/230.85",
    inputs: { totalVA: 40000, voltage: 240, phases: "single", continuousPct: 80 },
    expected: { totalAmps: 166.7, adjustedAmps: 200, minService_A: 200, SPD_required: false, outdoor_disconnect: false, minServiceAmps_field: 100 },
  },
  {
    id: "svc_min_100",
    description: "230.42(B) dwelling minimum 100 A",
    inputs: { totalVA: 5000, voltage: 240, phases: "single", continuousPct: 80 },
    expected: { minService_A: 100 },
  },
  {
    id: "svc_220_governs",
    description: "230.42(A)(2) Art. 220 load governs when larger",
    inputs: { totalVA: 40000, voltage: 240, phases: "single", continuousPct: 80, calculatedLoadA: 250 },
    expected: { designLoad: 250, minService_A: 250 },
  },
]);

def("demand_factor", "Demand Factor 220.42 / 220.44 / 220.53 / 220.61", calcDemandFactor, [
  {
    id: "df_dwelling_lt",
    description: "Dwelling lighting 30 kVA → Table 220.42",
    inputs: { loadType: "lighting_dwelling", totalVA: 30000 },
    expected: { demandVA: 12450 },
  },
  {
    id: "df_hotel_2017",
    description: "Hotel 50 kVA — 2017 50/40/30",
    inputs: { loadType: "lighting_hotel", totalVA: 50000 },
    expected: { demandVA: 22000 },
  },
  {
    id: "df_receptacle",
    description: "220.44 18 kVA receptacles",
    inputs: { loadType: "receptacle_commercial", totalVA: 18000 },
    expected: { demandVA: 14000 },
  },
  {
    id: "df_fixed",
    description: "220.53 75% of 10 kVA",
    inputs: { loadType: "fixed_appliance", totalVA: 10000 },
    expected: { demandVA: 7500 },
  },
  {
    id: "df_neutral_b1",
    description: "220.61(B)(1) 70% cooking/dryer utility",
    inputs: { loadType: "neutral_conductor", totalVA: 10000 },
    expected: { demandVA: 7000 },
  },
]);

def("voltage_drop", "Voltage Drop Ch.9 Table 8", calcVoltageDrop, [
  {
    id: "vd_12awg_100ft",
    description: "#12 Cu 20 A 100 ft 120 V 1Ø",
    inputs: { voltage: 120, current: 20, length: 100, material: "copper", phases: "single", selectedAWG: "12" },
    expected: { VD: 7.9, VD_pct: 6.58, ok3: false, ok5: false, minWire3_awg: "8" },
  },
]);

def("conductor_ampacity", "Conductor Ampacity 310.15", calcConductorAmpacity, [
  {
    id: "amp_6_40c_6ccc",
    description: "#6 Cu 75°C, 40°C ambient, 6 CCC",
    inputs: { awg: "6", material: "copper", tempRating: "75", ambient: 40, bundled: 6, useTerminal: "75" },
    expected: { baseAmpacity: 65, tempCorrectionFactor: 0.88, bundleFactor: 0.8, finalAmpacity: 45.8 },
  },
  {
    id: "amp_b7_2_0",
    description: "2017 310.15(B)(7) 83% dwelling — 2/0 Cu 75°C",
    inputs: { awg: "2/0", material: "copper", tempRating: "75", ambient: 30, bundled: 3, useTerminal: "75", isDwellingService: true },
    expected: { finalAmpacity: 175, maxDwellingServiceA: 210.8 },
  },
]);

def("box_fill", "Box Fill 314.16", calcBoxFill, [
  {
    id: "box_12_fail",
    description: "Table 314.16(B) #12 = 2.25 in³; 21.5 in³ box fails",
    inputs: { awg: "12", conductors: 6, grounding: 1, devices: 1, clamps: 1, supportFittings: 0, boxVolume: "custom", customBoxVolume: 21.5 },
    expected: { volPerConductor: 2.25, totalFill: 22.5, remaining: -1, pass: false },
  },
  {
    id: "box_12_pass",
    description: "30.3 in³ 4-square 2-1/8 in passes",
    inputs: { awg: "12", conductors: 6, grounding: 1, devices: 1, clamps: 1, supportFittings: 0, boxVolume: "custom", customBoxVolume: 30.3 },
    expected: { totalFill: 22.5, remaining: 7.8, pass: true },
  },
]);

def("conduit_fill", "Conduit Fill Ch.9 Tables 1/4/5", calcConduitFill, [
  {
    id: "emt_4x12",
    description: "4 × 12 THHN in EMT — 40% fill, 1/2 in",
    inputs: { wires: [{ type: "12 THHN", count: 4 }], conduitType: "EMT" },
    expected: { totalWireArea: 0.0532, fillLimitPct: 40, recommendedSize: "1/2", fillPctActual: 17.5 },
  },
  {
    id: "emt_1_wire",
    description: "Single conductor 53% fill",
    inputs: { wires: [{ type: "12 THHN", count: 1 }], conduitType: "EMT" },
    expected: { fillLimitPct: 53, recommendedSize: "1/2" },
  },
]);

def("egc_sizing", "EGC Table 250.122", calcEGCSizing, [
  { id: "egc_100_cu", description: "100 A copper → #8", inputs: { ocpd: "100", material: "copper" }, expected: { awg: "8" } },
  { id: "egc_200_cu", description: "200 A copper → #6", inputs: { ocpd: "200", material: "copper" }, expected: { awg: "6" } },
  { id: "egc_5000_al_2017", description: "2017 5000 A aluminum → 1200 kcmil", inputs: { ocpd: "5000", material: "aluminum" }, expected: { awg: "1200" } },
  { id: "egc_6000_al_2017", description: "2017 6000 A aluminum → 1200 kcmil", inputs: { ocpd: "6000", material: "aluminum" }, expected: { awg: "1200" } },
  {
    id: "egc_upsize",
    description: "250.122(B) proportional upsize 2× from #8",
    inputs: { ocpd: "100", material: "copper", voltageDropUpsizeRatio: 2 },
    expected: { awg: "8", adjustedAwg: "4" },
  },
]);

def("grounding_electrode", "GEC Table 250.66", calcGECSizing, [
  { id: "gec_2awg", description: "2 AWG or smaller copper → #8", inputs: { serviceSize: "0", material: "copper" }, expected: { gecSize: "8" } },
  { id: "gec_2awg_al", description: "2 AWG or smaller aluminum → #6", inputs: { serviceSize: "0", material: "aluminum" }, expected: { gecSize: "6" } },
  { id: "gec_over_1100_al", description: "Over 1100 kcmil aluminum → 250 kcmil", inputs: { serviceSize: "6", material: "aluminum" }, expected: { gecSize: "250 kcmil" } },
  {
    id: "gec_made_electrode",
    description: "250.66(A) made electrode cap #6 Cu",
    inputs: { serviceSize: "4", material: "copper", electrodeType: "made_electrode" },
    expected: { gecSize: "6" },
  },
]);

def("main_bonding_jumper", "Main Bonding Jumper 250.28(D)", calcMainBondingJumper, [
  {
    id: "mbj_4_0",
    description: "One 4/0 set → Table 250.102(C)(1) 2 AWG",
    inputs: { conductorSize: "4/0", parallelSets: 1, mbjMaterial: "copper" },
    expected: { totalCM: 211600, mbjSize: "2 AWG" },
  },
  {
    id: "mbj_2x4_0",
    description: "Two 4/0 sets → 1/0 AWG",
    inputs: { conductorSize: "4/0", parallelSets: 2, mbjMaterial: "copper" },
    expected: { totalCM: 423200, mbjSize: "1/0 AWG" },
  },
]);

def("system_bonding_jumper", "System Bonding Jumper 250.30(A)(1)", calcSystemBondingJumper, [
  {
    id: "sbj_4_0",
    description: "Same Table 250.102(C)(1) as MBJ",
    inputs: { conductorSize: "4/0", parallelSets: 1, sbjMaterial: "copper", kva: 75, voltage: 208, phases: "three" },
    expected: { sbjSize: "2 AWG", secFLC: 208.2 },
  },
]);

def("gec_for_sds", "GEC for SDS 250.30 / 250.66", calcGECforSDS, [
  { id: "sds_gec_0", description: "Index 0 copper → #8", inputs: { serviceSize: "0", material: "copper" }, expected: { gecSize: "8" } },
]);

def("bonding_jumper_parallel", "Bonding Jumper Parallel 250.102(C)", calcBondingJumperParallel, [
  {
    id: "bj_par_2x4_0",
    description: "Total vs per-raceway Table 250.102(C)(1)",
    inputs: { conductorSize: "4/0", parallelSets: 2, bjMaterial: "copper" },
    expected: { totalBJSize: "1/0 AWG", perRacewayBJSize: "2 AWG" },
  },
]);

def("supplemental_grounding_electrode", "Supplemental Electrode 250.53(A)(2)", calcSupplementalGrounding, [
  {
    id: "sg_8ft_rod",
    description: "8 ft × 5/8 in rod in 10,000 Ω·cm — R > 25 Ω",
    inputs: { soilType: 0, rodLength: 8, rodDiameter: 0.625 },
    expected: { compliant: false, needsSupplemental: true, twoRodCompliant: true },
  },
]);

def("overcurrent_protection", "Overcurrent 240.4 / 240.6", calcOvercurrentProtection, [
  {
    id: "ocpd_12_240_4d",
    description: "240.4(D) caps #12 at 20 A even if next-size-up is 30",
    inputs: { conductorAmpacity: 25, awg: "12", allowNextUp: true, isContinuous: false, continuousLoad: 0, noncontinuousLoad: 0 },
    expected: { recommendedOCPD: 20, smallCondMax: 20 },
  },
  {
    id: "ocpd_next_up",
    description: "240.4(B) next size up under 800 A",
    inputs: { conductorAmpacity: 65, awg: "6", allowNextUp: true, continuousLoad: 0, noncontinuousLoad: 0 },
    expected: { recommendedOCPD: 70, nextUpBlocked: false },
  },
  {
    id: "ocpd_800_block",
    description: "240.4(B) next-up blocked at ≥ 800 A",
    inputs: { conductorAmpacity: 850, allowNextUp: true, awg: "500", continuousLoad: 0, noncontinuousLoad: 0 },
    expected: { recommendedOCPD: 800, nextUpBlocked: true },
  },
  {
    id: "ocpd_arc_2017",
    description: "2017 240.87 threshold 1200 A",
    inputs: { conductorAmpacity: 1200, allowNextUp: false, awg: "500", continuousLoad: 0, noncontinuousLoad: 0 },
    expected: { arc_energy_reduction_threshold_A: 1200, arc_energy_reduction_applies: true, recommendedOCPD: 1200 },
  },
]);

def("power_factor", "Power Factor Correction 460.8", calcPowerFactor, [
  {
    id: "pf_100kw",
    description: "100 kW 0.75 → 0.95 at 480 V 3Ø",
    inputs: { kw: 100, currentPF: 0.75, targetPF: 0.95, voltage: 480, phases: "three" },
    expected: { kVAR_correction: 55.3, capacitorConductorMult: 1.35 },
  },
], 0.15);

def("three_phase_power", "Three-Phase Power", (v) => calcThreePhasePower(v), [
  {
    id: "3ph_480_100",
    description: "480 V 100 A PF 0.85",
    inputs: { mode: "vip", voltage: 480, current: 100, pf: 0.85 },
    expected: { kVA: 83.14, kW: 70.67, amps: 100 },
  },
]);

def("single_phase_power", "Single-Phase Power", (v) => calcSinglePhasePower(v), [
  {
    id: "1ph_120_20",
    description: "120 V 20 A PF 1.0",
    inputs: { mode: "vip", voltage: 120, current: 20, pf: 1 },
    expected: { VA: 2400, W: 2400, kVAR: 0, amps: 20 },
  },
]);

def("short_circuit", "Short Circuit 110.9 / 110.10", calcShortCircuit, [
  {
    id: "scc_150kva",
    description: "150 kVA 208 V 5.75% infinite-primary AFC",
    inputs: { kva: 150, secondaryV: 208, phases: "three", impedance: 5.75, cableLength: 0, cableSize: "4/0", cableMaterial: "copper" },
    expected: { transAFC: 7242 },
  },
], 2);

def("multiwire_branch", "Multiwire Branch Circuits 210.4", (v) => calcMultiwire(v), [
  {
    id: "mwbc_3w",
    description: "120/240 V MWBC neutral = |A−B|; handle tie required",
    inputs: { circuitType: "single_phase_3w", phaseA: 15, phaseB: 12, voltage: 120 },
    expected: { neutralI: 3, needsHandle: true },
  },
  {
    id: "mwbc_balanced",
    description: "Balanced 3Ø 4W neutral 0 A",
    inputs: { circuitType: "three_phase_4w", phaseA: 10, phaseB: 10, phaseC: 10, voltage: 120 },
    expected: { neutralI: 0, needsHandle: true },
  },
]);

def("multifamily_standard", "Multifamily Standard 220.40", calcMultifamilyStandard, [
  {
    id: "mfs_10u",
    description: "10 units 1,000 ft², 12 kW ranges, 5 kW dryers",
    inputs: { numUnits: 10, sqftPerUnit: 1000, smallApplianceCircuits: 2, laundryCircuits: 1, rangeKW: 12, dryerKW: 5, heatingVA: 0, voltage: 240, phases: "single" },
    expected: { lightingVA: 30000, smallAppVA: 30000, laundryVA: 15000, totalGeneralVA: 75000, generalDemandVA: 28200, rangeDemandVA: 25000, dryerDemandVA: 25000, netLoadVA: 78200, totalA: 325.8, minService_A: 350 },
  },
]);

def("pull_box_sizing", "Pull Box 314.28", calcPullBoxSizing, [
  {
    id: "pb_straight_2in",
    description: "Straight pull 2 in raceways — 8× = 16 in",
    inputs: {
      conductorSize: "4",
      raceways: [
        { id: "a", size: "2", wall: "left", row: "1" },
        { id: "b", size: "2", wall: "right", row: "1" },
      ],
      paths: [{ id: "p1", entryA: "a", entryB: "b" }],
    },
    expected: { applicable: true, minX: 16 },
  },
]);

def("neutral_load", "Neutral Load 220.61", calcNeutralLoad, [
  {
    id: "n_1ph_unbalance",
    description: "1Ø 3W maximum unbalanced = |L1−L2|",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { type: "linear_ln", va: 3600, phase: "L1" },
        { type: "linear_ln", va: 1200, phase: "L2" },
      ],
    },
    expected: { necFundamentalNeutral_VA: 2400, necFundamentalNeutral_A: 20 },
  },
]);

export function runRemaining2017Baseline() {
  const suites = [
    suite("year_flags", "2017 year-owned flags", () => ({
      EV_GFCI_REQUIRED: !!NEC.EV_GFCI_REQUIRED,
      EV_MINIMUM_LOAD_VA: NEC.EV_MINIMUM_LOAD_VA || 0,
      SOLAR_120_RULE_ARTICLE: NEC.SOLAR_120_RULE_ARTICLE,
      POOL_PUMP_GFCI_REQUIRED: !!NEC.POOL_PUMP_GFCI_REQUIRED,
      POOL_PUMP_GFCI_ALL_PHASES: !!NEC.POOL_PUMP_GFCI_ALL_PHASES,
      DWELLING_SPD_REQUIRED: !!NEC.DWELLING_SPD_REQUIRED,
      DWELLING_OUTDOOR_DISCONNECT_REQUIRED: !!NEC.DWELLING_OUTDOOR_DISCONNECT_REQUIRED,
      DWELLING_MIN_SERVICE_AMPS: NEC.DWELLING_MIN_SERVICE_AMPS,
      OCCUPANCY_UNIT_LOAD_DEFAULT: NEC.OCCUPANCY_UNIT_LOAD_DEFAULT,
      HVAC_OCPD_MULTIPLIER: NEC.HVAC_OCPD_MULTIPLIER,
      ARC_ENERGY_REDUCTION_THRESHOLD_AMPS: NEC.ARC_ENERGY_REDUCTION_THRESHOLD_AMPS,
      RECEPTACLE_YOKE_VA: NEC.RECEPTACLE_YOKE_VA,
    }), [
      {
        id: "flags_2017",
        description: "2017-only flags (no 625.54 / 230.67 / 230.85; 120% rule under 705.12(D))",
        inputs: {},
        expected: {
          EV_GFCI_REQUIRED: false,
          EV_MINIMUM_LOAD_VA: 0,
          SOLAR_120_RULE_ARTICLE: "705.12(D)(2)(3)(b)",
          POOL_PUMP_GFCI_REQUIRED: true,
          POOL_PUMP_GFCI_ALL_PHASES: false,
          DWELLING_SPD_REQUIRED: false,
          DWELLING_OUTDOOR_DISCONNECT_REQUIRED: false,
          DWELLING_MIN_SERVICE_AMPS: 100,
          OCCUPANCY_UNIT_LOAD_DEFAULT: 2,
          HVAC_OCPD_MULTIPLIER: 1.75,
          ARC_ENERGY_REDUCTION_THRESHOLD_AMPS: 1200,
          RECEPTACLE_YOKE_VA: 180,
        },
      },
    ]),

    ...REMAINING_NUMERIC_SUITE_DEFS.map((s) => suite(s.id, s.title, s.calcFn, s.tests, s.tolerance)),
  ];

  const total = suites.reduce((s, x) => s + x.total, 0);
  const passed = suites.reduce((s, x) => s + x.passed, 0);
  const failed = suites.reduce((s, x) => s + x.failed, 0);
  return {
    baselineVersion: BASELINE_VERSION,
    baselineDate: BASELINE_FROZEN_DATE,
    allPass: failed === 0,
    total,
    passed,
    failed,
    suites,
    failures: suites.filter((s) => !s.allPass),
  };
}
