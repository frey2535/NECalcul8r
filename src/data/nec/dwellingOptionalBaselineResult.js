/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  STORED BASELINE RESULT — Dwelling Optional (NEC 220.82)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  This file is STATIC EVIDENCE — it does NOT execute tests. It records the
 *  outcome of the most recent controlled baseline run for the Dwelling
 *  Optional calculator.
 *
 *  CalculatorVerificationIndex.js reads this stored result to determine the
 *  calculator's verification status. Normal page loads and production UI
 *  imports do NOT execute the baseline tests.
 *
 *  To update this result:
 *    1. Run:  npm run verify:dwelling-optional
 *    2. Record the output below (status, counts, failing test IDs, date)
 *    3. Do NOT change the status to "verified" without a passing controlled run.
 *
 *  Independence: The expected values in the baseline tests are derived from
 *  NEC Annex D benchmark values and independent hand calculations — NOT from
 *  the production calculator function. See dwellingOptionalBaseline.js.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./dwellingOptionalBaseline";

// Application version tested (from package.json — update when app version changes)
const APP_VERSION_TESTED = "1.0.0";

export const BASELINE_RESULT = Object.freeze({
  // Baseline metadata
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,

  // Execution metadata
  dateExecuted: "2026-08-22",
  appVersionTested: APP_VERSION_TESTED,
  executionPath: "npm run verify:dwelling-optional",
  executedBy: "2017 dwelling-optional accuracy pass",

  // Test counts
  total: 17,
  passed: 17,
  failed: 0,

  // Final status
  allPass: true,
  status: "verified", // "verified" | "defect_found"
  failingTestIds: [],

  // Notes
  notes:
    "All 17 frozen baseline tests pass (v1.1.0). Annex D D2(a) 21,480 VA / 90 A / 100 A " +
    "and D2(b) 29,200 VA / 122 A / 125 A match NFPA 70-2017. HVAC uses 2017 220.82(C): " +
    "(C)(4) 65% if fewer than 4 units, (C)(5) 40% if 4 or more, (C)(3) supplemental 65%, " +
    "(C)(6) thermal storage 100%. D2(a) maps 9 kW in 5 rooms to (C)(5). Mutation test " +
    "still catches 100% heat.",
});
