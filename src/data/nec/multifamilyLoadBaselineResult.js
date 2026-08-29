import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./multifamilyLoadBaseline";

export const BASELINE_RESULT = Object.freeze({
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,
  dateExecuted: "2026-08-22",
  total: 18,
  passed: 18,
  failed: 0,
  allPass: true,
  status: "verified",
  failingTestIds: [],
  notes: "2017 220.84: Table bands including 51–61 at 27% and 62+ at 26%; cooking + HVAC applicability; common laundry; HVAC larger-of; house load after demand. D5(b) phase-leg balancing and 220.84 Exception (no-cooking comparison) not in this calculator.",
});
