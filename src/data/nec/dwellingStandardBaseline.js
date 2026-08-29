/**
 * FROZEN BASELINE — Dwelling Standard (NEC 220.40) — 2017
 *
 * v1.0.0 — 2026-08-22 — 2017 accuracy gate
 *   Annex D D1(a) / D6 totals unchanged. Columns A/B, Note 1 major fraction,
 *   220.52 circuit mins, 220.14(J), 220.53, and Column C 26+ ranges included.
 */

import { calcDwellingStandard } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";
export const BASELINE_CALCULATOR_ID = "dwelling_standard";
export const BASELINE_NEC_METHOD = "NEC 220.40";

const NEC_2017 = getNecData("2017");
const TOLERANCE = { va: 1, amps: 0.5, service: 0 };

function withinTolerance(actual, expected, tol) {
  return Math.abs(actual - expected) <= tol;
}

const BASELINE_D1A = Object.freeze({
  id: "baseline_d1a_annex_d",
  source: "NEC Annex D Example D1(a) — NFPA 70-2017",
  necMethod: "220.40 standard method",
  inputs: Object.freeze({
    sqft: 1500,
    smallAppliance: 2,
    laundry: 1,
    bathroom: 1,
    range: 12000,
    rangeCount: 1,
    dryer: 5500,
    dishwasher: 0,
    disposer: 0,
    waterHeater: 0,
    hvac: 0,
    other: 0,
    voltage: 240,
  }),
  expected: Object.freeze({
    genLighting_VA: 4500,
    smallAppl_VA: 3000,
    laundry_VA: 1500,
    subtotal_VA: 9000,
    lightingDemand_VA: 5100,
    rangeDemand_VA: 8000,
    dryerDemand_VA: 5500,
    totalVA: 18600,
    totalAmps: 77.5,
    minService_A: 100,
  }),
});

const BASELINE_D6 = Object.freeze({
  id: "baseline_d6_range_note1",
  source: "NEC Annex D Example D6 — Table 220.55 Note 1 (16 kW single range)",
  necMethod: "Table 220.55 Note 1 — 4 kW over 12 → +20% of Column C",
  inputs: Object.freeze({
    sqft: 0, smallAppliance: 2, laundry: 1, bathroom: 0,
    range: 16000, rangeCount: 1, dryer: 0,
    dishwasher: 0, disposer: 0, waterHeater: 0, hvac: 0, other: 0, voltage: 240,
  }),
  expected: Object.freeze({
    rangeDemand_VA: 9600,
  }),
});

const REGRESSION = Object.freeze([
  Object.freeze({
    id: "std_col_b_8kw",
    description: "One 8 kW range — Table 220.55 Column B 80% of nameplate",
    inputs: Object.freeze({ range: 8000, rangeCount: 1, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 6400, rangeColumn: "B" }),
  }),
  Object.freeze({
    id: "std_col_c_12kw",
    description: "One 12 kW range — Column C 8 kW",
    inputs: Object.freeze({ range: 12000, rangeCount: 1, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 8000, rangeColumn: "C" }),
  }),
  Object.freeze({
    id: "std_note1_not_major_fraction",
    description: "12.4 kW — 0.4 kW over 12 is not a major fraction",
    inputs: Object.freeze({ range: 12400, rangeCount: 1, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 8000 }),
  }),
  Object.freeze({
    id: "std_note1_major_fraction",
    description: "12.5 kW — 0.5 kW is a major fraction → +5%",
    inputs: Object.freeze({ range: 12500, rangeCount: 1, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 8400 }),
  }),
  Object.freeze({
    id: "std_two_ranges_col_c",
    description: "Two 12 kW ranges — Column C 11 kW",
    inputs: Object.freeze({ range: 12000, rangeCount: 2, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 11000 }),
  }),
  Object.freeze({
    id: "std_two_ranges_note1",
    description: "Two 16 kW ranges — Column C 11 kW × 1.20",
    inputs: Object.freeze({ range: 16000, rangeCount: 2, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 13200 }),
  }),
  Object.freeze({
    id: "std_26_ranges_col_c",
    description: "26 ranges at 12 kW — Column C 15 kW + 1 kW per range = 41 kW",
    inputs: Object.freeze({ range: 12000, rangeCount: 26, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ rangeDemand_VA: 41000 }),
  }),
  Object.freeze({
    id: "std_220_53_three_no_factor",
    description: "Three fastened appliances — 220.53 75% does not apply",
    inputs: Object.freeze({
      sqft: 0, range: 0, dryer: 0, hvac: 0,
      dishwasher: 1200, disposer: 900, waterHeater: 4500, other: 0,
    }),
    expected: Object.freeze({ fixedLoads_VA: 6600, fixedApplianceDemandApplied: false, totalVA: 10125 }),
  }),
  Object.freeze({
    id: "std_220_53_four_at_75",
    description: "Four fastened appliances — 220.53 75%",
    inputs: Object.freeze({
      sqft: 0, range: 0, dryer: 0, hvac: 0,
      dishwasher: 1200, disposer: 900, waterHeater: 4500, other: 1000,
    }),
    expected: Object.freeze({ fixedLoads_VA: 5700, fixedApplianceDemandApplied: true, totalVA: 9225 }),
  }),
  Object.freeze({
    id: "std_sa_min_two",
    description: "220.52(A) enforces minimum 2 small-appliance circuits",
    inputs: Object.freeze({ smallAppliance: 1, laundry: 1, range: 0, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0, sqft: 0 }),
    expected: Object.freeze({ smallAppl_VA: 3000, smallApplCircuits: 2 }),
  }),
  Object.freeze({
    id: "std_bathroom_not_added",
    description: "220.14(J) — bathroom circuits do not add 1500 VA",
    inputs: Object.freeze({
      sqft: 1500, smallAppliance: 2, laundry: 1, bathroom: 2,
      range: 0, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0,
    }),
    expected: Object.freeze({ subtotal_VA: 9000, bathroomExcludedFromLoad: true }),
  }),
  Object.freeze({
    id: "std_dryer_min_5000",
    description: "220.54 — one dryer not less than 5000 W",
    inputs: Object.freeze({ range: 0, dryer: 4000, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0, sqft: 0 }),
    expected: Object.freeze({ dryerDemand_VA: 5000 }),
  }),
  Object.freeze({
    id: "std_negative_sqft",
    description: "Negative floor area clamped to 0",
    inputs: Object.freeze({ sqft: -1500, range: 0, dryer: 0, hvac: 0, dishwasher: 0, disposer: 0, waterHeater: 0, other: 0 }),
    expected: Object.freeze({ genLighting_VA: 0 }),
  }),
  Object.freeze({
    id: "std_2017_no_spd_disconnect_210_8f",
    description: "2017 does not require 230.67, 230.85, or 210.8(F)",
    inputs: Object.freeze({ sqft: 1500, range: 12000, dryer: 5500 }),
    expected: Object.freeze({
      SPD_required: false,
      outdoor_disconnect: false,
      outdoor_50A_gfci_note: null,
      minService_A: 100,
    }),
  }),
]);

const BASE_INPUTS = {
  sqft: 0,
  smallAppliance: 2,
  laundry: 1,
  bathroom: 0,
  range: 0,
  rangeCount: 1,
  dryer: 0,
  dishwasher: 0,
  disposer: 0,
  waterHeater: 0,
  hvac: 0,
  other: 0,
  voltage: 240,
};

function runFields(test, inputs, calcFn) {
  const actual = calcFn(inputs, NEC_2017);
  const expected = test.expected;
  const fieldResults = {};
  let allMatch = true;
  for (const key of Object.keys(expected)) {
    const exp = expected[key];
    const act = actual[key];
    let match;
    if (typeof exp === "boolean" || exp === null || typeof exp === "string") {
      match = act === exp;
    } else {
      const tol = key === "totalAmps" || key === "minService_A" ? TOLERANCE.amps : TOLERANCE.va;
      match = withinTolerance(act, exp, key === "minService_A" ? TOLERANCE.service : tol);
    }
    fieldResults[key] = { actual: act, expected: exp, match };
    if (!match) allMatch = false;
  }
  return {
    id: test.id,
    source: test.source,
    description: test.description,
    necMethod: test.necMethod,
    pass: allMatch,
    fieldResults,
  };
}

export function runDwellingStandardBaseline(calcFn = calcDwellingStandard) {
  const annexDTests = [
    runFields(BASELINE_D1A, BASELINE_D1A.inputs, calcFn),
    runFields(BASELINE_D6, BASELINE_D6.inputs, calcFn),
  ];
  const regressionTests = REGRESSION.map((t) =>
    runFields(t, { ...BASE_INPUTS, ...t.inputs }, calcFn)
  );
  const allTests = [...annexDTests, ...regressionTests];
  const passed = allTests.filter((t) => t.pass).length;
  const failed = allTests.filter((t) => !t.pass).length;
  return {
    baselineFrozen: BASELINE_FROZEN,
    baselineVersion: BASELINE_VERSION,
    baselineDate: BASELINE_FROZEN_DATE,
    calculatorId: BASELINE_CALCULATOR_ID,
    necMethod: BASELINE_NEC_METHOD,
    allPass: failed === 0,
    total: allTests.length,
    passed,
    failed,
    annexDTests,
    regressionTests,
    failures: allTests.filter((t) => !t.pass),
  };
}
