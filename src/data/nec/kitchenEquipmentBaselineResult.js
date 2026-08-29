import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./kitchenEquipmentBaseline";

export const BASELINE_RESULT = Object.freeze({
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,
  dateExecuted: "2026-08-22",
  total: 6,
  passed: 6,
  failed: 0,
  allPass: true,
  status: "verified",
  failingTestIds: [],
  notes: "2017 Table 220.56: 1–2 100%, 3 90%, 4 80%, 5 70%, 6+ 65% (not stepped down). Two-largest floor applied.",
});
