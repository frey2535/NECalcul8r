/**
 * External Worked Examples — Automated Regression Test Suite
 *
 * Test cases sourced from NEC exam prep guides, trade magazines, and
 * educational resources (not Annex D). Each test maps a published worked
 * example to production calculator inputs and expected values.
 *
 * SOURCES:
 *   - Electrician Prep (electricianprep.co) — Voltage drop worked examples
 *   - JADE Learning (jadelearning.com) — Box fill worked example
 *   - NEC Mastery (necmastery.com) — Conduit fill worked example
 *   - IAEI Magazine (iaeimagazine.org) — Dwelling load calculation example
 *
 * ROUNDING TOLERANCE:
 *   - Voltage: ±0.1V
 *   - Percentage: ±0.1%
 *   - Box fill: ±0.1 cu.in.
 *   - Conduit size: exact match
 */

import { calcVoltageDrop } from "@/components/calculator/calcs/logic/voltageDropCalc";
import { calcBoxFill } from "@/components/calculator/calcs/logic/boxFillCalc";
import { calcConduitFill } from "@/components/calculator/calcs/logic/conduitFillCalc";
import { getNecData } from "@/data/nec";

const NEC_BY_YEAR = {
  "2017": getNecData("2017"),
  "2020": getNecData("2020"),
};

const TOLERANCE = { voltage: 0.1, pct: 0.1, volume: 0.1 };

function withinTolerance(actual, expected, tol) {
  return Math.abs(actual - expected) <= tol;
}

// ─── Voltage Drop Examples (Source: Electrician Prep) ───────────────

/**
 * VD-EX1: Basic Single-Phase Voltage Drop
 * Source: electricianprep.co — Example 1
 * 120V, 20A, #10 Cu, 150ft → VD = 7.46V, VD% = 6.22%
 */
const TEST_VD_EX1 = {
  sourceId: "vd_ex1_single_phase",
  source: "Electrician Prep — Example 1",
  calculatorId: "voltage_drop",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Ch.9 Table 8 formula",
  inputs: { voltage: 120, current: 20, length: 150, material: "copper", phases: "single", selectedAWG: "10" },
  expected: {
    VD: 7.46,       // (2 × 12.9 × 20 × 150) / 10380 = 7.46V
    VD_pct: 6.22,   // 7.46 / 120 × 100 = 6.22%
  },
  run: (nec) => calcVoltageDrop(TEST_VD_EX1.inputs, nec),
  note: "120V single-phase, 20A, #10 Cu, 150ft. VD = (2 × 12.9 × 20 × 150) / 10380 = 7.46V (6.22%). Exceeds 3% — conductor needs upsizing.",
};

/**
 * VD-EX3: Three-Phase Voltage Drop
 * Source: electricianprep.co — Example 3
 * 480V 3φ, 60A, #6 Cu, 200ft → VD = 10.22V, VD% = 2.13%
 */
const TEST_VD_EX3 = {
  sourceId: "vd_ex3_three_phase",
  source: "Electrician Prep — Example 3",
  calculatorId: "voltage_drop",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Ch.9 Table 8 formula",
  inputs: { voltage: 480, current: 60, length: 200, material: "copper", phases: "three", selectedAWG: "6" },
  expected: {
    VD: 10.22,      // (1.732 × 12.9 × 60 × 200) / 26240 = 10.22V
    VD_pct: 2.13,   // 10.22 / 480 × 100 = 2.13%
  },
  run: (nec) => calcVoltageDrop(TEST_VD_EX3.inputs, nec),
  note: "480V 3-phase, 60A, #6 Cu, 200ft. VD = (1.732 × 12.9 × 60 × 200) / 26240 = 10.22V (2.13%). Within 3% branch circuit limit.",
};

/**
 * VD-EX5: Aluminum Conductor Voltage Drop
 * Source: electricianprep.co — Example 5
 * 240V, 40A, #4 Al, 175ft → VD = 7.11V, VD% = 2.96%
 */
const TEST_VD_EX5 = {
  sourceId: "vd_ex5_aluminum",
  source: "Electrician Prep — Example 5",
  calculatorId: "voltage_drop",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Ch.9 Table 8 formula",
  inputs: { voltage: 240, current: 40, length: 175, material: "aluminum", phases: "single", selectedAWG: "4" },
  expected: {
    VD: 7.11,       // (2 × 21.2 × 40 × 175) / 41740 = 7.11V
    VD_pct: 2.96,   // 7.11 / 240 × 100 = 2.96%
  },
  run: (nec) => calcVoltageDrop(TEST_VD_EX5.inputs, nec),
  note: "240V single-phase, 40A, #4 Al, 175ft. VD = (2 × 21.2 × 40 × 175) / 41740 = 7.11V (2.96%). Just within 3% limit.",
};

// ─── Box Fill Example (Source: JADE Learning) ──────────────────────

/**
 * BF-EX1: Box Fill Calculation
 * Source: jadelearning.com — NEC 2017 Article 314.16
 *
 * Simplified single-AWG version of the JADE Learning example:
 * Box: 18 cu.in. (custom), 4 #14 conductors, 1 device, 0 clamps, 1 ground
 * Fill: 4 × 2.0 + 1 × 2 × 2.0 + 0 + 1 × 2.0 = 14.0 cu.in.
 * Remaining: 18 - 14 = 4.0 cu.in. → PASS
 */
const TEST_BF_EX1 = {
  sourceId: "bf_ex1_single_awg",
  source: "JADE Learning — NEC 314.16 (simplified single-AWG)",
  calculatorId: "box_fill",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Table 314.16(B)",
  inputs: { awg: "14", conductors: 4, grounding: 1, devices: 1, clamps: 0, supportFittings: 0, boxVolume: "custom", customBoxVolume: 18 },
  expected: {
    totalFill: 14.0,    // 4×2.0 + 1×2×2.0 + 1×2.0 = 14
    remaining: 4.0,     // 18 - 14 = 4
    pass: true,
  },
  run: (nec) => calcBoxFill(TEST_BF_EX1.inputs, nec),
  note: "18 cu.in. box, 4 #14 conductors, 1 device, 1 ground. Fill = 8 + 4 + 2 = 14 cu.in. Remaining = 4 cu.in. PASS.",
};

/**
 * BF-EX2: Box Fill — Overfilled Box
 * Source: JADE Learning (adapted) — box over capacity
 * Box: 12.5 cu.in., 6 #12 conductors, 1 device, 1 clamp, 1 ground
 * Fill: 6 × 2.25 + 1 × 2 × 2.25 + 1 × 2.25 + 1 × 2.25 = 22.5 cu.in.
 * Remaining: 12.5 - 22.5 = -10.0 → FAIL
 */
const TEST_BF_EX2 = {
  sourceId: "bf_ex2_overfilled",
  source: "JADE Learning (adapted) — overfilled box",
  calculatorId: "box_fill",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Table 314.16(B)",
  inputs: { awg: "12", conductors: 6, grounding: 1, devices: 1, clamps: 1, supportFittings: 0, boxVolume: "custom", customBoxVolume: 12.5 },
  expected: {
    totalFill: 22.5,   // 6×2.25 + 1×2×2.25 + 1×2.25 + 1×2.25 = 22.5
    remaining: -10.0,  // 12.5 - 22.5 = -10
    pass: false,
  },
  run: (nec) => calcBoxFill(TEST_BF_EX2.inputs, nec),
  note: "12.5 cu.in. box, 6 #12 conductors, 1 device, 1 clamp, 1 ground. Fill = 13.5 + 4.5 + 2.25 + 2.25 = 22.5 cu.in. Exceeds 12.5. FAIL.",
};

// ─── Conduit Fill Example ─────────────────────────────────────────

/**
 * CF-EX1: Conduit Fill — THHN in EMT
 * Source: Standard NEC Chapter 9 calculation
 * 6 × #10 THHN in EMT
 * Wire area: 6 × 0.0211 = 0.1266 sq.in.
 * Fill limit: 40% (over 2 conductors)
 * 1/2" EMT: 0.304 × 0.40 = 0.1216 → too small
 * 3/4" EMT: 0.533 × 0.40 = 0.2132 → fits
 * Recommended: 3/4" EMT
 */
const TEST_CF_EX1 = {
  sourceId: "cf_ex1_thhn_emt",
  source: "NEC Chapter 9 Tables 1/4/5 — standard calculation",
  calculatorId: "conduit_fill",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Ch.9 Tables 1, 4, 5",
  inputs: {
    wires: [{ type: "10 THHN", count: 6 }],
    conduitType: "EMT",
  },
  expected: {
    totalWireArea: 0.1266,   // 6 × 0.0211
    fillLimit: 0.40,          // over 2 conductors
    recommendedSize: "3/4",   // 1/2" too small, 3/4" fits
  },
  run: (nec) => calcConduitFill(TEST_CF_EX1.inputs, nec),
  note: "6 × #10 THHN in EMT. Area = 0.1266 sq.in. 1/2\" EMT 40% = 0.1216 (too small). 3/4\" EMT 40% = 0.2132 (fits). Answer: 3/4\" EMT.",
};

/**
 * CF-EX2: Conduit Fill — Single Conductor (53% fill)
 * Source: Standard NEC Chapter 9 calculation
 * 1 × #4 THHN in RMC
 * Wire area: 0.0824 sq.in.
 * Fill limit: 53% (single conductor)
 * 1/2" RMC: 0.304 × 0.53 = 0.1611 → fits
 * Recommended: 1/2" RMC
 */
const TEST_CF_EX2 = {
  sourceId: "cf_ex2_single_conductor",
  source: "NEC Chapter 9 Tables 1/4/5 — single conductor (53%)",
  calculatorId: "conduit_fill",
  necEdition: "2017",
  sourceVerification: "Worked example verified against NEC Ch.9 Tables 1, 4, 5",
  inputs: {
    wires: [{ type: "4 THHN", count: 1 }],
    conduitType: "RMC",
  },
  expected: {
    totalWireArea: 0.0824,    // 1 × 0.0824
    fillLimit: 0.53,           // single conductor
    recommendedSize: "1/2",    // 0.304 × 0.53 = 0.1611 ≥ 0.0824
  },
  run: (nec) => calcConduitFill(TEST_CF_EX2.inputs, nec),
  note: "1 × #4 THHN in RMC. Area = 0.0824 sq.in. Single conductor → 53% fill. 1/2\" RMC 53% = 0.1611 ≥ 0.0824. Answer: 1/2\" RMC.",
};

// ─── Test Runner ──────────────────────────────────────────────────

function runSingleTest(test, year) {
  const nec = NEC_BY_YEAR[year];
  if (!nec) return { ...test, necYear: year, result: "SKIP", reason: "No NEC data for year" };

  const actual = test.run(nec);
  const expected = test.expected;
  const matches = {};
  let allMatch = true;

  for (const key of Object.keys(expected)) {
    const expVal = expected[key];
    const actVal = actual[key];
    let m;
    if (typeof expVal === "boolean") {
      m = expVal === actVal;
    } else if (typeof expVal === "string") {
      m = expVal === actVal;
    } else {
      const tol = key.includes("VD") && !key.includes("pct") ? TOLERANCE.voltage
        : key.includes("pct") || key.includes("Pct") ? TOLERANCE.pct
        : key.includes("Fill") || key.includes("remaining") || key.includes("Area") ? TOLERANCE.volume
        : 0.1;
      m = withinTolerance(actVal, expVal, tol);
    }
    matches[key] = { actual: actVal, expected: expVal, match: m };
    if (!m) allMatch = false;
  }

  return {
    ...test,
    necYear: year,
    result: allMatch ? "PASS" : "FAIL",
    matches,
    actual,
  };
}

export function runAllExternalTests() {
  const tests = [TEST_VD_EX1, TEST_VD_EX3, TEST_VD_EX5, TEST_BF_EX1, TEST_BF_EX2, TEST_CF_EX1, TEST_CF_EX2];
  const years = ["2017"];
  const results = {};
  for (const test of tests) {
    if (!results[test.calculatorId]) results[test.calculatorId] = [];
    for (const year of years) {
      const r = runSingleTest(test, year);
      results[test.calculatorId].push({
        sourceId: r.sourceId,
        source: r.source,
        calculatorId: r.calculatorId,
        necEdition: r.necEdition,
        necYear: r.necYear,
        sourceVerification: r.sourceVerification,
        result: r.result,
        matches: r.matches,
        actual: r.actual,
        expected: r.expected,
        note: r.note,
        reason: r.reason,
      });
    }
  }
  return results;
}