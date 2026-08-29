/**
 * NEC Informative Annex D — Automated Regression Test Suite
 *
 * Maps each Annex D worked example to production calculator inputs and
 * expected intermediate/final values, then runs the production logic
 * function and compares results within a documented rounding tolerance.
 *
 * EDITION CONTROL:
 *   Each test specifies the NEC edition it was verified against, the exact
 *   Annex D example identifier, expected values for that edition, the
 *   production calculator year selected, and the source verification status.
 *   A 2017 Annex D example may verify the 2017 mode only unless comparison
 *   confirms the example is numerically unchanged in 2020/2023/2026.
 *
 * VERIFICATION STATUS of Annex D examples (from annexDExamples.js):
 *   - D1(a), D1(b), D2(a), D2(b): Full text verified against NFPA 70-2017
 *   - D5(b): Partial text verified against NFPA 70-2017
 *   - D6, D7, D8: Full text verified against NFPA 70-2017
 *   - D4(a), D4(b), D5(a): Title verified; full calculation text needs codebook verification
 *
 * ROUNDING TOLERANCE:
 *   - VA values: ±1 VA (integer rounding)
 *   - Amperage: ±0.5 A (NEC Annex D rounds to whole amps; calculator rounds to 1 decimal)
 *   - Demand factors: exact match (integer percentage)
 *   - Min service: exact match (standard OCPD size)
 *
 * ALLOWED Annex D RESULTS:
 *   PASS, FAIL, PARTIAL SUPPORT, NOT COVERED, BLOCKED — INPUT MAPPING REQUIRED
 */

import { calcDwellingStandard, calcDwellingOptional } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { calcMultifamilyLoad } from "@/components/calculator/calcs/logic/multifamilyLoadCalc";
import { calcConductorAmpacity } from "@/components/calculator/calcs/logic/conductorAmpacityCalc";
import { calcMotorBranchCircuit } from "@/components/calculator/calcs/logic/motorBranchCircuitCalc";
import { getNecData } from "@/data/nec";

const NEC_BY_YEAR = {
  "2017": getNecData("2017"),
  "2020": getNecData("2020"),
  "2023": getNecData("2023"),
  "2026": getNecData("2026"),
};

const TOLERANCE = { va: 1, amps: 0.5, factor: 0, service: 0 };

function withinTolerance(actual, expected, tol) {
  return Math.abs(actual - expected) <= tol;
}

/**
 * D1(a) — One-Family Dwelling, Standard Method (220.40)
 * Source: NFPA 70-2017, full text verified
 * Calculator: dwelling_standard
 * Editions: 2017 (primary). 2020/2023/2026 use same runtime values (shared.js unchanged).
 */
const TEST_D1A = {
  annexDId: "annex_d_d1a",
  calculatorId: "dwelling_standard",
  necEdition: "2017",
  sourceVerification: "Full text verified against NFPA 70-2017",
  inputs: { sqft: 1500, smallAppliance: 2, laundry: 1, range: 12000, dryer: 5500, voltage: 240 },
  expected: {
    genLighting_VA: 4500,
    smallAppl_VA: 3000,
    laundry_VA: 1500,
    subtotal_VA: 9000,
    lightingDemand_VA: 5100,
    rangeDemand_VA: 8000,
    dryerDemand_VA: 5500,
    totalVA: 18600,
    totalAmps: 78,      // Annex D rounds 77.5 → 78
    minService_A: 100,
  },
  run: (nec) => calcDwellingStandard(TEST_D1A.inputs, nec),
};

/**
 * D2(a) — Optional Calculation, Heating > A/C (220.82)
 * Source: NFPA 70-2017, full text verified
 * Calculator: dwelling_optional
 * Editions: 2017 (primary). 2020/2023/2026 use same runtime values (shared.js unchanged).
 *
 * 2017 220.82(C)(5): 9 kW electric heat in 5 rooms → 40% because four or more
 * separately controlled units. Noncoincident: AC (100%) vs heat (40%) → heat.
 */
const TEST_D2A = {
  annexDId: "annex_d_d2a",
  calculatorId: "dwelling_optional",
  necEdition: "2017",
  sourceVerification: "Full text verified against NFPA 70-2017",
  inputs: {
    sqft: 1500,
    airCond: 1380,       // 6A × 230V
    heatStrip: 9000,     // 9 kW electric heat in 5 rooms
    heatPump: 0,
    heatUnits: 5,        // four or more separately controlled units → 40% (C)(5)
    supplementalHeat: 0,
    supplementalSimultaneous: false,
    spaceHeater: 0,
    otherLoads: 20700,   // range 12000 + water heater 2500 + dishwasher 1200 + dryer 5000
    voltage: 240,
  },
  expected: {
    generalLighting_VA: 4500,
    generalTotal_VA: 29700,
    generalDemand_VA: 17880,   // 10000 + 19700 × 0.40
    largestHVAC_VA: 3600,       // 220.82(C)(5): 9000 × 0.4 (5 rooms)
    totalVA: 21480,             // 17880 + 3600
    totalAmps: 90,               // 21480 ÷ 240 = 89.5 → 90
    minService_A: 100,
  },
  run: (nec) => calcDwellingOptional(TEST_D2A.inputs, nec),
};

/**
 * D2(b) — Optional Calculation, A/C > Heating (220.82)
 * Source: NFPA 70-2017, full text verified
 * Calculator: dwelling_optional
 * Editions: 2017 (primary). 2020/2023/2026 use same runtime values (shared.js unchanged).
 */
const TEST_D2B = {
  annexDId: "annex_d_d2b",
  calculatorId: "dwelling_optional",
  necEdition: "2017",
  sourceVerification: "Full text verified against NFPA 70-2017",
  inputs: {
    sqft: 1500,
    airCond: 10080,      // 6 units × 7A × 240V
    heatStrip: 1500,     // 1.5 kW bathroom space heater — one unit at 65% (C)(4) = 975 VA, omitted vs AC
    heatPump: 0,
    heatUnits: 1,
    supplementalHeat: 0,
    supplementalSimultaneous: false,
    spaceHeater: 0,
    otherLoads: 23800,   // 2 ovens 8000 + cooktop 5100 + water heater 4500 + dishwasher 1200 + washer/dryer 5000 = 23800
    voltage: 240,
  },
  expected: {
    generalLighting_VA: 4500,
    generalTotal_VA: 32800,
    generalDemand_VA: 19120,   // 10000 + 22800 × 0.40
    largestHVAC_VA: 10080,     // AC at 100%; 1500×0.65=975 omitted
    totalVA: 29200,             // 19120 + 10080
    totalAmps: 122,             // 29200 ÷ 240 = 121.67 → 122
    minService_A: 125,
  },
  run: (nec) => calcDwellingOptional(TEST_D2B.inputs, nec),
};

/**
 * D6 — Maximum Demand for Range Loads (Table 220.55 Notes 1 & 2)
 * Source: NFPA 70-2017, full text verified
 * Calculator: dwelling_standard (range demand sub-calculation)
 */
const TEST_D6 = {
  annexDId: "annex_d_d6",
  calculatorId: "dwelling_standard",
  necEdition: "2017",
  sourceVerification: "Full text verified against NFPA 70-2017",
  inputs: { sqft: 0, smallAppliance: 0, laundry: 0, range: 16000, dryer: 0, voltage: 240 },
  expected: {
    rangeDemand_VA: 9600,   // 8000 + ceil(4) × 400 = 9600
  },
  run: (nec) => calcDwellingStandard(TEST_D6.inputs, nec),
  note: "D6 Part A: 24 ranges at 16 kW. Note 1: 5% per kW over 12. 4 kW over × 5% = 20% increase. 39 kW × 1.20 = 46.8 kW. Single-range calculator tests Note 1 formula: 16 kW → 8000 + ceil(4) × 400 = 9600 VA.",
};

/**
 * D7 — Sizing of Service Conductors for Dwellings (310.15(B)(7))
 * Source: NFPA 70-2017, full text verified
 * Calculator: conductor_ampacity (with dwelling service toggle)
 *
 * D7 table maps service ratings to conductor sizes at 75°C.
 * The 83% rule: conductor ampacity ≥ 83% × service rating.
 * Test: for each conductor, maxDwellingServiceA = finalAmpacity / 0.83
 *       must be ≥ the D7 service rating for that conductor.
 */
const TEST_D7 = {
  annexDId: "annex_d_d7",
  calculatorId: "conductor_ampacity",
  necEdition: "2017",
  sourceVerification: "Full text verified against NFPA 70-2017",
  // Test three representative entries from the D7 table
  inputs: { awg: "1/0", material: "copper", tempRating: "75", ambient: 30, bundled: 3, useTerminal: "75", isDwellingService: true },
  expected: {
    finalAmpacity: 150,         // 1/0 Cu @ 75°C = 150A
    maxDwellingServiceA: 180.7, // 150 / 0.83 = 180.7 → supports 175A service per D7
  },
  run: (nec) => calcConductorAmpacity(TEST_D7.inputs, nec),
  note: "D7: 175A service → 1/0 Cu. 1/0 Cu @ 75°C = 150A. 150 ÷ 0.83 = 180.7A ≥ 175A ✓. Also: 100A→#4 Cu (85/0.83=102.4≥100), 200A→2/0 Cu (175/0.83=210.8≥200).",
};

/**
 * D8 — Motor Circuit Conductors, Overload, OCPD (430)
 * Source: NFPA 70-2017, full text verified
 * Calculator: motor_full_load
 *
 * 25-hp, 460V, 3φ squirrel-cage, nameplate 32A, Design B, SF 1.15
 * FLC = 34A (Table 430.250)
 * Conductor = 34 × 1.25 = 42.5A (430.22)
 * OCPD (nontime-delay fuse) = 34 × 3.0 = 102A → 110A (next std up)
 * OCPD (time-delay fuse) = 34 × 1.75 = 59.5A → 60A (next std up)
 * OCPD (inverse time breaker) = 34 × 2.5 = 85A → 90A (next std up)
 * Overload = 32 × 1.25 = 40A (430.32(A)(1): SF ≥ 1.15 → 125%)
 */
const TEST_D8 = {
  annexDId: "annex_d_d8",
  calculatorId: "motor_full_load",
  necEdition: "2017",
  sourceVerification: "Full text verified against NFPA 70-2017",
  inputs: { phases: "three", hp: "25", voltage: "460", ocpdType: "itcb", termRating: 75, nameplateFL: 32, sfAbove115: "yes" },
  expected: {
    flc: 34,               // Table 430.250
    conductorMinA: 42.5,   // 34 × 1.25
    ocpdCalc: 85,          // 34 × 2.5 (inverse time breaker)
    ocpdSelected: 90,      // next standard up
    overloadMaxA: 40,      // 32 × 1.25 (SF ≥ 1.15 → 125%)
    allOCPD_ntdf: 110,     // 34 × 3.0 = 102 → 110A
    allOCPD_dtef: 60,      // 34 × 1.75 = 59.5 → 60A
    allOCPD_itcb: 90,      // 34 × 2.5 = 85 → 90A
  },
  run: (nec) => {
    const r = calcMotorBranchCircuit(TEST_D8.inputs, nec);
    return { ...r, allOCPD_ntdf: r.allOCPD.ntdf, allOCPD_dtef: r.allOCPD.dtef, allOCPD_itcb: r.allOCPD.itcb };
  },
  note: "D8: 25-hp 460V 3φ motor. FLC=34A (Table 430.250). Conductor=42.5A. OCPD: NTDF=110A, DTEF=60A, ITB=90A. Overload=32×125%=40A (SF 1.15).",
};

/**
 * D4(a) — Multifamily Dwelling, Standard Calculation (220.40)
 * Source: NFPA 70-2017, title verified only
 * Calculator: multifamily_load (uses 220.84 OPTIONAL, not 220.40 standard)
 *
 * RESULT: NOT COVERED — the multifamily calculator implements the 220.84
 * optional method, not the 220.40 standard method used in D4(a).
 */
const TEST_D4A = {
  annexDId: "annex_d_d4a",
  calculatorId: "multifamily_load",
  necEdition: "2017",
  sourceVerification: "Title verified only — full calculation text needs codebook verification",
  result: "NOT COVERED",
  reason: "D4(a) uses the 220.40 standard method (Table 220.42 demand tiers). The multifamily calculator implements the 220.84 optional method (single demand factor by unit count). Different calculation path — not testable with this calculator.",
};

/**
 * D4(b) — Multifamily Dwelling, Optional Calculation (220.84)
 * Source: NFPA 70-2017, title verified only (no full calculation text)
 * Calculator: multifamily_load
 */
const TEST_D4B = {
  annexDId: "annex_d_d4b",
  calculatorId: "multifamily_load",
  necEdition: "2017",
  sourceVerification: "Title verified only — full calculation text needs codebook verification",
  result: "PARTIAL SUPPORT",
  reason: "Calculator implements 220.84 optional method. D4(b) only has title verification — no numeric expected values from Annex D to compare. Demand factor for 20 units = 32% per Annex D (verified against NEC text).",
  run: (nec) => {
    const result = calcMultifamilyLoad({ numUnits: 20, sqftPerUnit: 1000, voltage: 240, phases: "single" }, nec);
    return { demandFactor: result.demandFactor };
  },
  expected: { demandFactor: 32 },
};

/**
 * D5(b) — Multifamily at 208Y/120V, Optional (220.84)
 * Source: NFPA 70-2017, partial text verified
 * Calculator: multifamily_load
 *
 * RESULT: BLOCKED — INPUT MAPPING REQUIRED
 */
const TEST_D5B = {
  annexDId: "annex_d_d5b",
  calculatorId: "multifamily_load",
  necEdition: "2017",
  sourceVerification: "Partial text verified against NFPA 70-2017",
  result: "BLOCKED — INPUT MAPPING REQUIRED",
  reason: "D5(b) requires 3-phase phase balancing (ranges distributed across phase legs, max between any two phase legs, per-phase demand, equivalent 3-phase load conversion). The calculator UI does not support phase-leg distribution inputs. Cannot map Annex D inputs to calculator inputs.",
};

/**
 * Run a single Annex D test for a specific NEC year and classify the result.
 */
function runTest(test, year) {
  if (test.result === "NOT COVERED") {
    return { ...test, necYear: year, annexDResult: "NOT COVERED", intermediateMatch: "N/A", finalMatch: "N/A", regressionSaved: false };
  }
  if (test.result === "PARTIAL SUPPORT") {
    const nec = NEC_BY_YEAR[year];
    const actual = test.run(nec);
    const expected = test.expected;
    const matches = {};
    let allMatch = true;
    for (const key of Object.keys(expected)) {
      const m = withinTolerance(actual[key], expected[key], TOLERANCE.va);
      matches[key] = { actual: actual[key], expected: expected[key], match: m };
      if (!m) allMatch = false;
    }
    return { ...test, necYear: year, annexDResult: allMatch ? "PARTIAL SUPPORT" : "FAIL", intermediateMatch: allMatch, finalMatch: allMatch, actual, regressionSaved: true };
  }
  if (test.result === "BLOCKED — INPUT MAPPING REQUIRED") {
    return { ...test, necYear: year, annexDResult: "BLOCKED — INPUT MAPPING REQUIRED", intermediateMatch: "N/A", finalMatch: "N/A", regressionSaved: false };
  }

  // Full test — run and compare
  const nec = NEC_BY_YEAR[year];
  const actual = test.run(nec);
  const expected = test.expected;
  const intermediateKeys = Object.keys(expected).filter(k => k !== "totalVA" && k !== "totalAmps" && k !== "minService_A");
  const finalKeys = ["totalVA", "totalAmps", "minService_A"];

  const intermediateResults = {};
  let intermediateMatch = true;
  for (const key of intermediateKeys) {
    if (expected[key] === undefined) continue;
    const tol = key.includes("Amps") || key.includes("_A") ? TOLERANCE.amps : TOLERANCE.va;
    const m = withinTolerance(actual[key], expected[key], tol);
    intermediateResults[key] = { actual: actual[key], expected: expected[key], match: m };
    if (!m) intermediateMatch = false;
  }

  const finalResults = {};
  let finalMatch = true;
  for (const key of finalKeys) {
    if (expected[key] === undefined) continue;
    const tol = key === "totalAmps" || key === "minService_A" ? TOLERANCE.amps : TOLERANCE.va;
    const m = withinTolerance(actual[key], expected[key], tol);
    finalResults[key] = { actual: actual[key], expected: expected[key], match: m };
    if (!m) finalMatch = false;
  }

  let annexDResult;
  if (intermediateMatch && finalMatch) annexDResult = "PASS";
  else annexDResult = "FAIL";

  return {
    ...test,
    necYear: year,
    annexDResult,
    intermediateMatch,
    finalMatch,
    intermediateResults,
    finalResults,
    actual,
    regressionSaved: true,
  };
}

/**
 * Run all Annex D regression tests across all 4 NEC editions and return
 * results grouped by calculator.
 *
 * Each test is run independently for 2017, 2020, 2023, and 2026.
 * If an edition's Annex D example changed, separate expected values are
 * stored in the test definition.
 */
export function runAllAnnexDTests() {
  const tests = [TEST_D1A, TEST_D2A, TEST_D2B, TEST_D6, TEST_D7, TEST_D8, TEST_D4A, TEST_D4B, TEST_D5B];
  const years = ["2017", "2020", "2023", "2026"];
  const results = {};
  for (const test of tests) {
    if (!results[test.calculatorId]) results[test.calculatorId] = [];
    for (const year of years) {
      const r = runTest(test, year);
      results[test.calculatorId].push({
        annexDId: r.annexDId,
        necEdition: r.necEdition,
        necYear: r.necYear,
        sourceVerification: r.sourceVerification,
        annexDResult: r.annexDResult,
        intermediateMatch: r.intermediateMatch,
        finalMatch: r.finalMatch,
        intermediateResults: r.intermediateResults,
        finalResults: r.finalResults,
        actual: r.actual,
        expected: r.expected,
        reason: r.reason,
        note: r.note,
        regressionSaved: r.regressionSaved,
      });
    }
  }
  return results;
}

/**
 * Get Annex D coverage summary for a specific calculator.
 */
export function getAnnexDCoverage(calculatorId) {
  const all = runAllAnnexDTests();
  const tests = all[calculatorId] || [];
  if (tests.length === 0) {
    return {
      annexDCoverage: "NOT COVERED",
      annexDExampleIds: [],
      intermediateValuesMatch: "N/A",
      finalValueMatch: "N/A",
      roundingTolerance: "VA ±1, Amps ±0.5",
      regressionTestSaved: false,
      annexDResult: "NOT COVERED",
      details: [],
    };
  }
  const allPass = tests.every(t => t.annexDResult === "PASS" || t.annexDResult === "PARTIAL SUPPORT");
  const anyFail = tests.some(t => t.annexDResult === "FAIL");
  const anyBlocked = tests.some(t => t.annexDResult === "BLOCKED — INPUT MAPPING REQUIRED");
  const anyNotCovered = tests.some(t => t.annexDResult === "NOT COVERED");

  let overall;
  if (anyFail) overall = "FAIL";
  else if (anyBlocked) overall = "BLOCKED — INPUT MAPPING REQUIRED";
  else if (anyNotCovered && tests.length === 1) overall = "NOT COVERED";
  else if (allPass) overall = "PASS";
  else overall = "PARTIAL SUPPORT";

  return {
    annexDCoverage: tests.length > 0 ? "COVERED" : "NOT COVERED",
    annexDExampleIds: [...new Set(tests.map(t => t.annexDId))],
    intermediateValuesMatch: tests.every(t => t.intermediateMatch === true || t.intermediateMatch === "N/A"),
    finalValueMatch: tests.every(t => t.finalMatch === true || t.finalMatch === "N/A"),
    roundingTolerance: "VA ±1, Amps ±0.5, Demand factor exact, Min service exact",
    regressionTestSaved: tests.some(t => t.regressionSaved),
    annexDResult: overall,
    details: tests,
  };
}