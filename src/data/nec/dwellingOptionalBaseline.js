/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FROZEN BASELINE — Dwelling Optional (NEC 220.82) Regression Suite
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ⚠️  DO NOT MODIFY THIS FILE WITHOUT EXPLICIT REVIEW APPROVAL.  ⚠️
 *
 *  This file contains the immutable baseline test snapshots that gate the
 *  verification status of the Dwelling Optional (NEC 220.82) calculator.
 *
 *  BASELINE TESTS (17 total):
 *    • Annex D D2(a) — Optional Calculation, Heating > A/C (220.82)
 *    • Annex D D2(b) — Optional Calculation, A/C > Heating (220.82)
 *    • 15 HVAC regression tests covering NEC 220.82(C)(1)–(C)(6)
 *
 *  GATE BEHAVIOR:
 *    If ANY baseline test fails, getDwellingOptionalBaselineStatus() returns
 *    "defect_found" and the calculator's verificationStatus in
 *    CalculatorVerificationIndex.js automatically flips from "verified" to
 *    "defect_found" until the failure is resolved.
 *
 *  PROTECTION:
 *    • BASELINE_FROZEN = true  — marks this suite as immutable
 *    • BASELINE_FROZEN_DATE    — date the baseline was frozen
 *    • BASELINE_VERSION       — semantic version of the baseline
 *    • EXPECTED values are defined as frozen constants (Object.freeze)
 *    • Any change to expected values requires a new baseline version and
 *      explicit review approval.
 *
 *  CONTROLLED EXECUTION:
 *    These tests do NOT execute during normal page loads or production UI
 *    imports. They run only through controlled paths:
 *      • npm run verify:dwelling-optional  (build-gate command)
 *      • npm run verify:release            (pre-release verification)
 *      • Testing Agent execution
 *      • Developer/admin verification action
 *
 *  The latest controlled run result is stored as static evidence in
 *  dwellingOptionalBaselineResult.js. CalculatorVerificationIndex.js
 *  reads that stored result — it does not execute tests at import time.
 *
 *  ═════════════════════════════════════════════════════════════════════════
 *  CHANGE LOG — Required for any modification to this file
 *  ═════════════════════════════════════════════════════════════════════════
 *  Each change to expected values or test definitions MUST be recorded here:
 *    - reason for modification
 *    - approving reviewer
 *    - previous version → new version
 *    - affected test IDs
 *    - whether expected NEC values changed
 *    - source used to justify the change
 *
 *  Do not silently change expected results merely to make tests pass.
 *
 *  ───────────────────────────────────────────────────────────────────────
 *  v1.0.0 — 2026-07-19 — Initial frozen baseline
 *    Reason: Establish regression gate for NEC 220.82(C) HVAC calculation fix
 *    Reviewer: Base44 AI (pending human approval)
 *    Previous version: N/A (initial creation)
 *    Affected test IDs: ALL (15 tests)
 *    Expected NEC values changed: N/A (initial baseline)
 *    Source: NEC Annex D Examples D2(a)/D2(b) — NFPA 70-2017, full text verified
 *
 *  v1.1.0 — 2026-08-22 — 2017 220.82(C) factor and article correction
 *    Reason: Live calc and v1.0.0 expected HVAC percents used 40% / 25% and
 *            cited them as 220.82(C)(6). 2017 220.82(C) is: (C)(4) 65% if
 *            fewer than 4 separately controlled units; (C)(5) 40% if four or
 *            more; (C)(3) supplemental 65%; (C)(6) thermal storage 100%.
 *            Annex D D2(a) 21,480 VA / 90 A / 100 A is unchanged — 9 kW in
 *            5 rooms is 40% because 5 units ≥ 4, not because <4 units use 40%.
 *            Annex D D2(b) 29,200 VA / 122 A / 125 A is unchanged — 1.5 kW
 *            bathroom heater at 65% (one unit) is still omitted vs 10.08 kVA AC.
 *            General-load demand remains 220.82(B), not 220.82(A).
 *    Reviewer: 2017 dwelling-optional accuracy pass (user-directed)
 *    Previous version: 1.0.0 → 1.1.0
 *    Affected test IDs: D2(a) heatUnits 1→5; D2(b) heatStrip 0→1500;
 *      HVAC expected percents for (C)(3)/(C)(4)/(C)(5); hvac_09 equal-load
 *      inputs; added hvac_13 (C)(6) and hvac_14 max-not-sum
 *    Expected NEC values changed: HVAC regression expected VA for 65%/40%/65%
 *      supplemental. Annex D D2(a)/D2(b) SERVICE TOTALS unchanged.
 *    Source: 2017 220.82(C) structure (UpCodes 2017/2023 secondary text);
 *      Annex D D2(a)/D2(b) 2017 totals already in annexDExamples.js
 *  ═══════════════════════════════════════════════════════════════════════════
 */

import { calcDwellingOptional } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { getNecData } from "@/data/nec";

// ─── Baseline Metadata ─────────────────────────────────────────────────────
export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.1.0";
export const BASELINE_CALCULATOR_ID = "dwelling_optional";
export const BASELINE_NEC_METHOD = "NEC 220.82";

// NEC data — all four editions use the same shared.js runtime values
const NEC_2017 = getNecData("2017");

// Rounding tolerance (matches annexDRegression.js)
const TOLERANCE = { va: 1, amps: 0.5, factor: 0, service: 0 };

function withinTolerance(actual, expected, tol) {
  return Math.abs(actual - expected) <= tol;
}

// ═══════════════════════════════════════════════════════════════════════════
// FROZEN BASELINE TEST DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Annex D D2(a) — Heating > A/C (220.82) ───────────────────────────────
const BASELINE_D2A = Object.freeze({
  id: "baseline_d2a_annex_d",
  source: "NEC Annex D Example D2(a) — NFPA 70-2017, full text verified",
  necMethod: "220.82(C)(5) — 9 kW in 5 rooms at 40% (four or more units)",
  inputs: Object.freeze({
    sqft: 1500,
    airCond: 1380,
    heatStrip: 9000,
    heatPump: 0,
    heatUnits: 5,
    supplementalHeat: 0,
    supplementalSimultaneous: false,
    spaceHeater: 0,
    otherLoads: 20700,
    voltage: 240,
  }),
  expected: Object.freeze({
    generalLighting_VA: 4500,
    generalTotal_VA: 29700,
    generalDemand_VA: 17880,
    largestHVAC_VA: 3600,
    hvacLoad_VA: 3600,
    totalVA: 21480,
    totalAmps: 90,
    minService_A: 100,
  }),
});

// ─── Annex D D2(b) — A/C > Heating (220.82) ───────────────────────────────
const BASELINE_D2B = Object.freeze({
  id: "baseline_d2b_annex_d",
  source: "NEC Annex D Example D2(b) — NFPA 70-2017, full text verified",
  necMethod: "220.82(C)(1) AC 100% vs (C)(4) 1.5 kW bathroom heat at 65% — AC larger, heat omitted",
  inputs: Object.freeze({
    sqft: 1500,
    airCond: 10080,
    heatStrip: 1500,
    heatPump: 0,
    heatUnits: 1,
    supplementalHeat: 0,
    supplementalSimultaneous: false,
    spaceHeater: 0,
    otherLoads: 23800,
    voltage: 240,
  }),
  expected: Object.freeze({
    generalLighting_VA: 4500,
    generalTotal_VA: 32800,
    generalDemand_VA: 19120,
    largestHVAC_VA: 10080,
    hvacLoad_VA: 10080,
    totalVA: 29200,
    totalAmps: 122,
    minService_A: 125,
  }),
});

// ─── 13 HVAC Regression Tests (NEC 220.82(C) paths) ───────────────────────
const BASELINE_HVAC_TESTS = Object.freeze([
  Object.freeze({
    id: "hvac_01_ac_gt_heat",
    description: "Air conditioning greater than calculated heating",
    necMethod: "220.82(C)(1) AC 100% vs (C)(4) heat 65%",
    inputs: Object.freeze({ airCond: 10000, heatStrip: 5000, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 10000, totalVA: 19000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_02_heat_gt_ac",
    description: "Calculated heating greater than air conditioning (D2(a) HVAC path, 5 rooms)",
    necMethod: "220.82(C)(5) heat 40% (5 units) > (C)(1) AC 100%",
    inputs: Object.freeze({ airCond: 1380, heatStrip: 9000, heatPump: 0, heatUnits: 5, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 3600, totalVA: 12600, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_03_heat_pump_no_supp",
    description: "Heat pump without supplemental electric heat",
    necMethod: "220.82(C)(2) compressor 100%",
    inputs: Object.freeze({ airCond: 0, heatStrip: 0, heatPump: 8000, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 8000, totalVA: 17000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_04_heat_pump_supp_sim",
    description: "Heat pump with supplemental electric heat (simultaneous)",
    necMethod: "220.82(C)(3) compressor 100% + supplemental 65%",
    inputs: Object.freeze({ airCond: 0, heatStrip: 0, heatPump: 8000, heatUnits: 1, supplementalHeat: 5000, supplementalSimultaneous: true, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 11250, totalVA: 20250, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_05_supp_simultaneous",
    description: "Supplemental heat can operate simultaneously with compressor",
    necMethod: "220.82(C)(3) simultaneous: compressor 100% + supplemental 65%",
    inputs: Object.freeze({ airCond: 5000, heatStrip: 0, heatPump: 6000, heatUnits: 1, supplementalHeat: 4000, supplementalSimultaneous: true, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 8600, totalVA: 17600, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_06_supp_not_simultaneous",
    description: "Supplemental heat prevented from simultaneous operation",
    necMethod: "220.82(C)(3) interlocked: omit compressor from (C)(3); compressor still competes as cooling",
    inputs: Object.freeze({ airCond: 5000, heatStrip: 0, heatPump: 6000, heatUnits: 1, supplementalHeat: 4000, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 6000, totalVA: 15000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_07_four_plus_units",
    description: "Four or more separately controlled heating units (40%)",
    necMethod: "220.82(C)(5) heat 40% (4+ units)",
    inputs: Object.freeze({ airCond: 2000, heatStrip: 10000, heatPump: 0, heatUnits: 4, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 4000, totalVA: 13000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_08_fewer_than_four_units",
    description: "Fewer than four separately controlled heating units (65%)",
    necMethod: "220.82(C)(4) heat 65% (<4 units)",
    inputs: Object.freeze({ airCond: 2000, heatStrip: 10000, heatPump: 0, heatUnits: 3, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 6500, totalVA: 15500, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_09_equal_heat_cool",
    description: "Equal heating and cooling calculated loads",
    necMethod: "220.82(C) noncoincident — equal, cooling wins tie-break",
    inputs: Object.freeze({ airCond: 6500, heatStrip: 10000, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 6500, totalVA: 15500, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_10_zero_hvac",
    description: "Zero HVAC",
    necMethod: "N/A — no HVAC load",
    inputs: Object.freeze({ airCond: 0, heatStrip: 0, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 0, totalVA: 9000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_11_negative_input",
    description: "Invalid negative HVAC input (clamped to 0)",
    necMethod: "N/A — negative inputs clamped to 0",
    inputs: Object.freeze({ airCond: -5000, heatStrip: -3000, heatPump: -2000, heatUnits: 1, supplementalHeat: -1000, supplementalSimultaneous: false, spaceHeater: -500 }),
    expected: Object.freeze({ hvacLoad_VA: 0, totalVA: 9000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_12a_boundary_3_units",
    description: "Boundary: 3 units → 65% demand factor",
    necMethod: "220.82(C)(4) boundary: <4 units → 65%",
    inputs: Object.freeze({ airCond: 0, heatStrip: 10000, heatPump: 0, heatUnits: 3, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 6500, totalVA: 15500, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_12b_boundary_4_units",
    description: "Boundary: 4 units → 40% demand factor",
    necMethod: "220.82(C)(5) boundary: 4+ units → 40%",
    inputs: Object.freeze({ airCond: 0, heatStrip: 10000, heatPump: 0, heatUnits: 4, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 }),
    expected: Object.freeze({ hvacLoad_VA: 4000, totalVA: 13000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_13_thermal_storage_c6",
    description: "Electric thermal storage / continuous heat at 100% (C)(6)",
    necMethod: "220.82(C)(6) thermal storage 100% > (C)(1) AC",
    inputs: Object.freeze({ airCond: 5000, heatStrip: 0, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 12000 }),
    expected: Object.freeze({ hvacLoad_VA: 12000, totalVA: 21000, minService_A: 100 }),
  }),
  Object.freeze({
    id: "hvac_14_c6_not_added_to_c4",
    description: "(C)(6) and (C)(4) are selections — take the larger, do not add",
    necMethod: "220.82(C) largest-of: max(65% of 10 kW, 100% of 8 kW C6) = 8000",
    inputs: Object.freeze({ airCond: 0, heatStrip: 10000, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 8000 }),
    expected: Object.freeze({ hvacLoad_VA: 8000, totalVA: 17000, minService_A: 100 }),
  }),
]);

// ═══════════════════════════════════════════════════════════════════════════
// BASELINE TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

const BASE_INPUTS = { sqft: 1500, otherLoads: 0, voltage: 240 };

function runAnnexDBaselineTest(test, calcFn = calcDwellingOptional) {
  const actual = calcFn(test.inputs, NEC_2017);
  const expected = test.expected;
  const fields = Object.keys(expected);
  const fieldResults = {};
  let allMatch = true;
  for (const key of fields) {
    const tol = key === "totalAmps" || key === "minService_A" ? TOLERANCE.amps : TOLERANCE.va;
    const match = withinTolerance(actual[key], expected[key], tol);
    fieldResults[key] = { actual: actual[key], expected: expected[key], match };
    if (!match) allMatch = false;
  }
  return {
    id: test.id,
    source: test.source,
    necMethod: test.necMethod,
    pass: allMatch,
    fieldResults,
  };
}

function runHVACBaselineTest(test, calcFn = calcDwellingOptional) {
  const inputs = { ...BASE_INPUTS, ...test.inputs };
  const actual = calcFn(inputs, NEC_2017);
  const expected = test.expected;
  const fields = Object.keys(expected);
  const fieldResults = {};
  let allMatch = true;
  for (const key of fields) {
    const tol = key === "minService_A" ? TOLERANCE.amps : TOLERANCE.va;
    const match = withinTolerance(actual[key], expected[key], tol);
    fieldResults[key] = { actual: actual[key], expected: expected[key], match };
    if (!match) allMatch = false;
  }
  return {
    id: test.id,
    description: test.description,
    necMethod: test.necMethod,
    pass: allMatch,
    fieldResults,
  };
}

/**
 * Run all frozen baseline tests and return detailed results.
 * @returns {object} { allPass, total, passed, failed, annexDTests, hvacTests, failures }
 */
export function runDwellingOptionalBaseline(calcFn = calcDwellingOptional) {
  const annexDTests = [BASELINE_D2A, BASELINE_D2B].map(t => runAnnexDBaselineTest(t, calcFn));
  const hvacTests = BASELINE_HVAC_TESTS.map(t => runHVACBaselineTest(t, calcFn));
  const allTests = [...annexDTests, ...hvacTests];
  const passed = allTests.filter(t => t.pass).length;
  const failed = allTests.filter(t => !t.pass).length;
  const failures = allTests.filter(t => !t.pass);
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
    hvacTests,
    failures,
  };
}

/**
 * Get the verification status derived from the frozen baseline tests.
 * @returns {"verified"|"defect_found"} — "verified" only if ALL baseline tests pass
 */
export function getDwellingOptionalBaselineStatus() {
  const results = runDwellingOptionalBaseline();
  return results.allPass ? "verified" : "defect_found";
}

/**
 * Get a compact summary suitable for embedding in the verification index.
 */
export function getDwellingOptionalBaselineSummary() {
  const results = runDwellingOptionalBaseline();
  return {
    baselineFrozen: results.baselineFrozen,
    baselineVersion: results.baselineVersion,
    baselineDate: results.baselineDate,
    allPass: results.allPass,
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    status: results.allPass ? "verified" : "defect_found",
    failingTestIds: results.failures.map(f => f.id),
  };
}