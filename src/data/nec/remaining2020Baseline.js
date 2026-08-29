/**
 * FROZEN BASELINE — Remaining 2020 flag/table deltas
 * v1.0.0 — 2026-08-22
 *
 * Calculators whose 2020 change is already owned in 2020.js (GFCI/SPD/disconnect,
 * pool 3-phase, solar 705.12(B) numbering, kitchen 220.56 pending-same-as-2017).
 * 2017 immutability is included. Does not claim Table 220.56 or 220.82 HVAC
 * factors as codebook-verified unchanged.
 */

import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";
import { calcEVCharging } from "@/components/calculator/calcs/logic/evChargingCalc";
import { calcServiceSizing } from "@/components/calculator/calcs/logic/serviceSizingCalc";
import { calcPoolSpa } from "@/components/calculator/calcs/logic/poolSpaCalc";
import { calcHVACLoad } from "@/components/calculator/calcs/logic/hvacLoadCalc";
import { calcSolarPV } from "@/components/calculator/calcs/logic/solarPVCalc";
import { calcKitchenEquipment } from "@/components/calculator/calcs/logic/kitchenEquipmentCalc";
import { calcDwellingStandard } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { calcFarmLoad } from "@/components/calculator/calcs/logic/farmLoadCalc";
import { calcMultifamilyLoad } from "@/components/calculator/calcs/logic/multifamilyLoadCalc";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

function suite(id, title, calcFn, nec, tests) {
  return { id, title, ...runCalcTests({ tests, calcFn, nec }) };
}

export function runRemaining2020Baseline() {
  const suites = [
    suite("flags", "2020 year-owned flags", () => ({
      EV_GFCI_REQUIRED: !!NEC_2020.EV_GFCI_REQUIRED,
      EV_MINIMUM_LOAD_VA: NEC_2020.EV_MINIMUM_LOAD_VA || 0,
      SOLAR_120_RULE_ARTICLE: NEC_2020.SOLAR_120_RULE_ARTICLE,
      POOL_PUMP_GFCI_ALL_PHASES: !!NEC_2020.POOL_PUMP_GFCI_ALL_PHASES,
      POOL_PUMP_REPLACEMENT_GFCI_REQUIRED: !!NEC_2020.POOL_PUMP_REPLACEMENT_GFCI_REQUIRED,
      DWELLING_SPD_REQUIRED: !!NEC_2020.DWELLING_SPD_REQUIRED,
      DWELLING_OUTDOOR_DISCONNECT_REQUIRED: !!NEC_2020.DWELLING_OUTDOOR_DISCONNECT_REQUIRED,
      hotelVA: NEC_2020.OCCUPANCY_UNIT_LOADS.hotel_motel,
    }), NEC_2020, [
      {
        id: "flags_2020",
        description: "2020: 625.54, 230.67, 230.85, pool 3Ø GFCI, 705.12(B) numbering",
        inputs: {},
        expected: {
          EV_GFCI_REQUIRED: true,
          EV_MINIMUM_LOAD_VA: 0,
          SOLAR_120_RULE_ARTICLE: "705.12(B)(2)(3)(a)",
          POOL_PUMP_GFCI_ALL_PHASES: true,
          POOL_PUMP_REPLACEMENT_GFCI_REQUIRED: true,
          DWELLING_SPD_REQUIRED: true,
          DWELLING_OUTDOOR_DISCONNECT_REQUIRED: true,
          hotelVA: 1.7,
        },
      },
    ]),

    suite("ev_immut", "EV 2017 immutability", calcEVCharging, NEC_2017, [
      {
        id: "ev_2017_no_gfci",
        description: "2017 32 A EVSE — no 625.54 / 230.67 / 230.85",
        inputs: { voltage: 240, evseA: 32, numUnits: 1, demandManaged: "no" },
        expected: { conductorA_each: 40, GFCI_required: false, SPD_required: false, outdoor_disconnect: false, min_load_VA: 0 },
      },
    ]),
    suite("ev_2020", "EV Charging 2020 625.54", calcEVCharging, NEC_2020, [
      {
        id: "ev_2020_gfci",
        description: "2020 same 125% math; GFCI + dwelling SPD/disconnect true; still no min load VA",
        inputs: { voltage: 240, evseA: 32, numUnits: 1, demandManaged: "no" },
        expected: { conductorA_each: 40, ocpd_each_A: 40, GFCI_required: true, min_load_VA: 0, SPD_required: true, outdoor_disconnect: true },
      },
    ]),

    suite("svc_immut", "Service 2017 immutability", calcServiceSizing, NEC_2017, [
      {
        id: "svc_2017_flags",
        description: "2017 40 kVA service — no SPD/disconnect",
        inputs: { totalVA: 40000, voltage: 240, phases: "single", continuousPct: 80 },
        expected: { minService_A: 200, SPD_required: false, outdoor_disconnect: false },
      },
    ]),
    suite("svc_2020", "Service Sizing 2020 230.67 / 230.85", calcServiceSizing, NEC_2020, [
      {
        id: "svc_2020_flags",
        description: "2020 same 230.42 math; SPD and outdoor disconnect required",
        inputs: { totalVA: 40000, voltage: 240, phases: "single", continuousPct: 80 },
        expected: { totalAmps: 166.7, adjustedAmps: 200, minService_A: 200, SPD_required: true, outdoor_disconnect: true, minServiceAmps_field: 100 },
      },
    ]),

    suite("pool_immut", "Pool 2017 immutability", calcPoolSpa, NEC_2017, [
      {
        id: "pool_2017_1ph_only",
        description: "2017 GFCI true but 3-phase expansion and replacement GFCI false",
        inputs: { pumpHP: 1.5, pumpV: 240, heaterKW: 0, lightingW: 0, installType: "pool" },
        expected: { flc: 10, pool_pump_gfci_required: true, pool_pump_gfci_all_phases: false, pool_pump_replacement_gfci_required: false },
      },
    ]),
    suite("pool_2020", "Pool / Spa 2020 680.21(C)/(D)", calcPoolSpa, NEC_2020, [
      {
        id: "pool_2020_3ph_and_replacement",
        description: "2020 same 10 A FLC; 3-phase GFCI and replacement GFCI true",
        inputs: { pumpHP: 1.5, pumpV: 240, heaterKW: 0, lightingW: 0, installType: "pool" },
        expected: { flc: 10, pumpConductorA: 12.5, pool_pump_gfci_required: true, pool_pump_gfci_all_phases: true, pool_pump_replacement_gfci_required: true },
      },
    ]),

    suite("hvac_immut", "HVAC 2017 immutability", calcHVACLoad, NEC_2017, [
      {
        id: "hvac_2017_no_210_8e",
        description: "2017 210.8(E) note is null",
        inputs: { nameplateAmps: 40, voltage: 240, phases: "single", compressorFLA: 32, fanFLA: 8, conductorType: "single" },
        expected: { conductorA: 50, selectedOCPD: 70, GFCI_servicing_note: null },
      },
    ]),
    suite("hvac_2020", "HVAC 2020 210.8(E)", calcHVACLoad, NEC_2020, [
      {
        id: "hvac_2020_210_8e",
        description: "2020 same 440 math; 210.8(E) servicing-receptacle note renders",
        inputs: { nameplateAmps: 40, voltage: 240, phases: "single", compressorFLA: 32, fanFLA: 8, conductorType: "single" },
        expected: { conductorA: 50, selectedOCPD: 70, GFCI_servicing_note: NEC_2020.GFCI_EQUIPMENT_SERVICING_RECEPTACLE },
      },
    ]),

    suite("solar_immut", "Solar 2017 immutability", calcSolarPV, NEC_2017, [
      {
        id: "pv_2017_article",
        description: "2017 120% rule cited as 705.12(D)(2)(3)(b)",
        inputs: { inverterOutputA: 40, busbarA: 225, mainBreakerA: 200, backfeedCB: 40, systemDC_kW: 10, inverterAC_kW: 9.6 },
        expected: { rule120_ok: true, solar120Article: "705.12(D)(2)(3)(b)" },
      },
    ]),
    suite("solar_2020", "Solar PV 2020 705.12(B)", calcSolarPV, NEC_2020, [
      {
        id: "pv_2020_article",
        description: "2020 same 120% math; article 705.12(B)(2)(3)(a)",
        inputs: { inverterOutputA: 40, busbarA: 225, mainBreakerA: 200, backfeedCB: 40, systemDC_kW: 10, inverterAC_kW: 9.6 },
        expected: { minConductorA: 50, rule120_limit: 270, rule120_ok: true, solar120Article: "705.12(B)(2)(3)(a)" },
      },
    ]),

    suite("kitchen_2020", "Kitchen 220.56 2020 pending-same 65%", calcKitchenEquipment, NEC_2020, [
      {
        id: "k20_6_units_65",
        description: "PENDING: 2020 6+ still 65% (owned copy, not codebook-confirmed)",
        inputs: { equipment: [{ kw: 10 }, { kw: 10 }, { kw: 10 }, { kw: 10 }, { kw: 10 }, { kw: 10 }], voltage: 208, phases: "three" },
        expected: { demandFactor: 65, demandedKW: 39 },
      },
    ]),

    suite("dwelling_2020", "Dwelling Standard 2020 230.67 / 230.85 / 210.8(F)", calcDwellingStandard, NEC_2020, [
      {
        id: "std_2020_spd_disconnect_210_8f",
        description: "2020 dwelling flags: SPD, outdoor disconnect, 210.8(F) note",
        inputs: { sqft: 1500, smallAppliance: 2, laundry: 1, bathroom: 0, range: 12000, rangeCount: 1, dryer: 5500, dishwasher: 0, disposer: 0, waterHeater: 0, hvac: 0, other: 0, voltage: 240 },
        expected: { SPD_required: true, outdoor_disconnect: true, minService_A: 100 },
      },
    ]),

    suite("mf_2017", "Multifamily 2017 immutability", calcMultifamilyLoad, NEC_2017, [
      {
        id: "immut_mf_62_2017",
        description: "2017 62 units stay 26%",
        inputs: {
          sqftPerUnit: 1000, smallApplianceCircuits: 2, laundryCircuits: 1, commonLaundry: false,
          rangeKW: 12, dryerKW: 0, acKW: 0, heatKW: 0, waterHeaterKW: 0, otherFixedKW: 0,
          houseLighting: 0, houseHVAC: 0, voltage: 240, phases: "single", numUnits: 62,
        },
        expected: { demandFactor: 26, demandedVA: 314340 },
      },
    ]),

    suite("mf_2020", "Multifamily 220.84 2020 pending-same 62+ 26%", calcMultifamilyLoad, NEC_2020, [
      {
        id: "mf20_62_26",
        description: "PENDING: 2020 62 units still 26% (owned copy, not codebook-confirmed)",
        inputs: {
          sqftPerUnit: 1000, smallApplianceCircuits: 2, laundryCircuits: 1, commonLaundry: false,
          rangeKW: 12, dryerKW: 0, acKW: 0, heatKW: 0, waterHeaterKW: 0, otherFixedKW: 0,
          houseLighting: 0, houseHVAC: 0, voltage: 240, phases: "single", numUnits: 62,
        },
        expected: { demandFactor: 26, demandedVA: 314340 },
      },
    ]),

    suite("farm_2017", "Farm 2017 immutability", calcFarmLoad, NEC_2017, [
      {
        id: "immut_farm_102_2017",
        description: "2017 Table 220.102 first 60 A at 240 V stays 100%",
        inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 14400 }], voltage: 240, phases: "single" },
        expected: { totalBuildingDemand: 14400, totalServiceVA: 14400 },
      },
    ]),

    suite("farm_2020", "Farm 220.102/103 2020 pending-same", calcFarmLoad, NEC_2020, [
      {
        id: "farm20_102_first_60a",
        description: "PENDING: 2020 Table 220.102 first 60 A still 100% (owned copy)",
        inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 14400 }], voltage: 240, phases: "single" },
        expected: { totalBuildingDemand: 14400, totalServiceVA: 14400 },
      },
      {
        id: "farm20_102_next_60a",
        description: "PENDING: 2020 next 60 A still 50%",
        inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 28800 }], voltage: 240, phases: "single" },
        expected: { totalBuildingDemand: 21600 },
      },
    ]),
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
