/**
 * FROZEN BASELINE — Multifamily Optional (NEC 220.84) — 2017
 * v1.0.0 — 2026-08-22
 */

import { calcMultifamilyLoad } from "@/components/calculator/calcs/logic/multifamilyLoadCalc";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");

const BASE = {
  sqftPerUnit: 1000,
  smallApplianceCircuits: 2,
  laundryCircuits: 1,
  commonLaundry: false,
  rangeKW: 12,
  dryerKW: 0,
  acKW: 0,
  heatKW: 0,
  waterHeaterKW: 0,
  otherFixedKW: 0,
  houseLighting: 0,
  houseHVAC: 0,
  voltage: 240,
  phases: "single",
};

const TESTS = [
  {
    id: "mf_3_units_45",
    description: "3 units — Table 220.84 45%",
    inputs: { ...BASE, numUnits: 3 },
    expected: { demandFactor: 45, perUnitVA: 19500, totalConnectedVA: 58500, demandedVA: 26325 },
  },
  {
    id: "mf_15_33",
    description: "15 units — 33%",
    inputs: { ...BASE, numUnits: 15 },
    expected: { demandFactor: 33, demandedVA: 96525 },
  },
  {
    id: "mf_16_32",
    description: "16 units — 16–20 band 32%",
    inputs: { ...BASE, numUnits: 16 },
    expected: { demandFactor: 32, demandedVA: 99840 },
  },
  {
    id: "mf_20_32_annex_d4b",
    description: "20 units — 32% (Annex D D4(b) table factor)",
    inputs: { ...BASE, numUnits: 20 },
    expected: { demandFactor: 32, demandedVA: 124800 },
  },
  {
    id: "mf_21_31",
    description: "21 units — 21–25 band 31%",
    inputs: { ...BASE, numUnits: 21 },
    expected: { demandFactor: 31, demandedVA: 126945 },
  },
  {
    id: "mf_50_28",
    description: "50 units — 28%",
    inputs: { ...BASE, numUnits: 50 },
    expected: { demandFactor: 28, demandedVA: 273000 },
  },
  {
    id: "mf_51_27",
    description: "51 units — 51–61 band 27%",
    inputs: { ...BASE, numUnits: 51 },
    expected: { demandFactor: 27, demandedVA: 268515 },
  },
  {
    id: "mf_61_27",
    description: "61 units — last unit of 27% band",
    inputs: { ...BASE, numUnits: 61 },
    expected: { demandFactor: 27, demandedVA: 321165 },
  },
  {
    id: "mf_62_26",
    description: "62 units — 26% (not 27%)",
    inputs: { ...BASE, numUnits: 62 },
    expected: { demandFactor: 26, demandedVA: 314340 },
  },
  {
    id: "mf_hvac_larger_of",
    description: "220.84(C) — larger of A/C or space heat",
    inputs: { ...BASE, numUnits: 3, acKW: 3.5, heatKW: 10 },
    expected: { hvacVA: 10000, perUnitVA: 29500, demandedVA: 39825 },
  },
  {
    id: "mf_common_laundry",
    description: "210.52(F) Exception — common laundry omits in-unit laundry VA",
    inputs: { ...BASE, numUnits: 3, commonLaundry: true },
    expected: { laundryVA: 0, perUnitVA: 18000, demandedVA: 24300 },
  },
  {
    id: "mf_sa_min_two",
    description: "210.11(C)(1) / 220.84(C) — minimum 2 small-appliance circuits",
    inputs: { ...BASE, numUnits: 3, smallApplianceCircuits: 1 },
    expected: { smallAppVA: 3000, perUnitVA: 19500 },
  },
  {
    id: "mf_no_cooking",
    description: "220.84(A)(2) not met without electric cooking",
    inputs: { ...BASE, numUnits: 3, rangeKW: 0 },
    expected: { electricCooking: false, meets220_84A: false, demandFactor: 45, perUnitVA: 7500 },
  },
  {
    id: "mf_no_hvac",
    description: "220.84(A) not met without electric space heat or A/C",
    inputs: { ...BASE, numUnits: 3, acKW: 0, heatKW: 0 },
    expected: { hasHVAC: false, meets220_84A: false, demandFactor: 45 },
  },
  {
    id: "mf_below_3",
    description: "Fewer than 3 units — Table 220.84 not applied",
    inputs: { ...BASE, numUnits: 2 },
    expected: { meetsUnitCount: false, meets220_84A: false, tableApplied: false, demandFactor: 100, demandedVA: 39000 },
  },
  {
    id: "mf_house_after_demand",
    description: "220.84(B) house load added after Table 220.84",
    inputs: { ...BASE, numUnits: 3, houseLighting: 10000, houseHVAC: 5000 },
    expected: { demandedVA: 26325, houseVA: 15000, totalServiceVA: 41325 },
  },
  {
    id: "mf_negative_sqft",
    description: "Negative floor area clamped to 0",
    inputs: { ...BASE, numUnits: 3, sqftPerUnit: -100 },
    expected: { lightingVA: 0, perUnitVA: 16500, demandedVA: 22275 },
  },
  {
    id: "mf_yearswitch_12_unit",
    description: "12-unit default job — 36% + house at 208Y/120V 3φ",
    inputs: {
      numUnits: 12, sqftPerUnit: 900, smallApplianceCircuits: 2, laundryCircuits: 1,
      rangeKW: 12, dryerKW: 5, acKW: 3.5, heatKW: 0, waterHeaterKW: 4.5,
      houseLighting: 3000, houseHVAC: 5000, voltage: 208, phases: "three",
    },
    expected: { perUnitVA: 32200, demandFactor: 36, demandedVA: 139104, totalServiceVA: 147104, totalA: 408.3, minService_A: 450, meets220_84A: true },
  },
];

export function runMultifamilyLoadBaseline(calcFn = calcMultifamilyLoad) {
  const tests = TESTS.map((t) => {
    const actual = calcFn(t.inputs, NEC_2017);
    const fieldResults = {};
    let pass = true;
    for (const key of Object.keys(t.expected)) {
      const exp = t.expected[key];
      const act = actual[key];
      const match = typeof exp === "boolean" ? act === exp : Math.abs(act - exp) < 0.05;
      fieldResults[key] = { actual: act, expected: exp, match };
      if (!match) pass = false;
    }
    return { id: t.id, description: t.description, pass, fieldResults };
  });
  const passed = tests.filter((t) => t.pass).length;
  const failed = tests.filter((t) => !t.pass).length;
  return {
    baselineVersion: BASELINE_VERSION,
    baselineDate: BASELINE_FROZEN_DATE,
    allPass: failed === 0,
    total: tests.length,
    passed,
    failed,
    tests,
    failures: tests.filter((t) => !t.pass),
  };
}
