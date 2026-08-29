/**
 * FROZEN BASELINE — Commercial Load (NEC 220.12 / 220.42 / 220.44) — 2017
 * v1.0.0 — 2026-08-22
 */

import { calcCommercialLoad } from "@/components/calculator/calcs/logic/commercialLoadCalc";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const TOLERANCE = { va: 1, amps: 0.5 };

function within(a, e, t) {
  return Math.abs(a - e) <= t;
}

const TESTS = Object.freeze([
  Object.freeze({
    id: "com_office_all_others_100",
    description: "Office 5,000 ft² — Table 220.12 3.5 VA, 220.42 All Others 100%",
    inputs: { occupancy: "office", sqft: 5000, receptacles: 30, receptacleVA: 180, showWindow: 0, outsideSign: 0, majorAppliances: 0, hvac: 0, voltage: 208, phases: "three" },
    expected: { lightingVA: 17500, lightingDemand: 17500, receptacleDemand: 5400, totalVA: 22900 },
  }),
  Object.freeze({
    id: "com_220_14k_floor",
    description: "Office 10,000 ft², 10 yokes — 220.14(K) 1 VA/ft² exceeds 220.44",
    inputs: { occupancy: "office", sqft: 10000, receptacles: 10, receptacleVA: 180, showWindow: 0, outsideSign: 0, majorAppliances: 0, hvac: 0 },
    expected: { receptacleTotal: 1800, receptacleDemand: 10000 },
  }),
  Object.freeze({
    id: "com_220_44_tiers",
    description: "100 yokes — 220.44 first 10 kVA 100%, remainder 50%",
    inputs: { occupancy: "store", sqft: 0, receptacles: 100, receptacleVA: 180, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { receptacleTotal: 18000, receptacleDemand: 14000 },
  }),
  Object.freeze({
    id: "com_warehouse_220_42",
    description: "Warehouse 60,000 ft² — 0.25 VA, first 12,500 at 100% then 50%",
    inputs: { occupancy: "warehouse", sqft: 60000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { lightingVA: 15000, lightingDemand: 13750 },
  }),
  Object.freeze({
    id: "com_hotel_220_42_2017",
    description: "Hotel 50,000 ft² — 2017 220.42 50%/40%/30%",
    inputs: { occupancy: "hotel_motel", sqft: 50000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { lightingVA: 100000, lightingDemand: 42000 },
  }),
  Object.freeze({
    id: "com_hospital_220_42",
    description: "Hospital 100,000 ft² — 40% first 50 kVA, 20% remainder",
    inputs: { occupancy: "hospital", sqft: 100000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { lightingVA: 200000, lightingDemand: 50000 },
  }),
  Object.freeze({
    id: "com_hospital_footnote",
    description: "Table 220.42 footnote — lighting used at one time stays 100%",
    inputs: { occupancy: "hospital", sqft: 100000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0, lightingUsedAtOneTime: true },
    expected: { lightingDemand: 200000, lightingDemandSkipped: true },
  }),
  Object.freeze({
    id: "com_sign_min_1200",
    description: "220.14(F) sign not less than 1200 VA",
    inputs: { occupancy: "store", sqft: 0, receptacles: 0, outsideSign: 500, showWindow: 0, hvac: 0, majorAppliances: 0 },
    expected: { signVA: 1200 },
  }),
  Object.freeze({
    id: "com_show_window",
    description: "220.14(G) 200 VA per linear foot",
    inputs: { occupancy: "store", sqft: 0, receptacles: 0, showWindow: 10, showWindowVA: 200, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { showWindowVA: 2000 },
  }),
  Object.freeze({
    id: "com_bank_3_5_and_k",
    description: "2017 banks 3½ VA/ft² and 220.14(K)",
    inputs: { occupancy: "bank", sqft: 2000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { lightingVA: 7000, unitLoad: 3.5, receptacleDemand: 2000 },
  }),
  Object.freeze({
    id: "com_unlisted_default_2",
    description: "Table 220.12 note — occupancy not listed uses 2 VA/ft²",
    inputs: { occupancy: "not_a_real_occupancy", sqft: 1000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
    expected: { unitLoad: 2, lightingVA: 2000 },
  }),
]);

export function runCommercialLoadBaseline(calcFn = calcCommercialLoad) {
  const results = TESTS.map((t) => {
    const actual = calcFn(t.inputs, NEC_2017);
    const fieldResults = {};
    let pass = true;
    for (const key of Object.keys(t.expected)) {
      const exp = t.expected[key];
      const act = actual[key];
      const match = typeof exp === "boolean" ? act === exp : within(act, exp, TOLERANCE.va);
      fieldResults[key] = { actual: act, expected: exp, match };
      if (!match) pass = false;
    }
    return { id: t.id, description: t.description, pass, fieldResults };
  });
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  return {
    baselineFrozen: BASELINE_FROZEN,
    baselineVersion: BASELINE_VERSION,
    baselineDate: BASELINE_FROZEN_DATE,
    allPass: failed === 0,
    total: results.length,
    passed,
    failed,
    tests: results,
    failures: results.filter((r) => !r.pass),
  };
}
