import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./rvParkLoadBaseline";

export const BASELINE_RESULT = Object.freeze({
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,
  dateExecuted: "2026-08-22",
  total: 11,
  passed: 11,
  failed: 0,
  allPass: true,
  status: "verified",
  failingTestIds: [],
  notes: "2017 Table 551.73(A): site VA 2400/3600/12000, demand 100% (1) through 41% (36+), amenities added after demand. Conductor/EGC/VD reuse other engines.",
});
