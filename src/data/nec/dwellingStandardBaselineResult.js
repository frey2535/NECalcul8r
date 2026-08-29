/**
 * STORED BASELINE RESULT — Dwelling Standard (NEC 220.40)
 * Last controlled run: npm run verify:dwelling-standard
 */

import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./dwellingStandardBaseline";

export const BASELINE_RESULT = Object.freeze({
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,
  dateExecuted: "2026-08-22",
  appVersionTested: "1.0.0",
  executionPath: "npm run verify:dwelling-standard",
  executedBy: "2017 dwelling-standard accuracy pass",
  total: 16,
  passed: 16,
  failed: 0,
  allPass: true,
  status: "verified",
  failingTestIds: [],
  notes:
    "All 16 tests pass. Annex D D1(a) 18,600 VA / 77.5 A / 100 A and D6 9,600 VA range demand match 2017. " +
    "Table 220.55 Columns A/B/C, Note 1 major fraction, 220.52 mins, 220.14(J), 220.53, and 26+ Column C formula gated. " +
    "2017 does not apply 230.67 / 230.85 / 210.8(F). Neutral 220.61 and D1(b) 430.24 are other calculators.",
});
