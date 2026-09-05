import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./marinaShorePowerBaseline";

export const BASELINE_RESULT = Object.freeze({
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,
  dateExecuted: "2026-08-22",
  total: 9,
  passed: 9,
  failed: 0,
  allPass: true,
  status: "verified",
  failingTestIds: [],
  notes: "2017 Table 555.12: 1–4 100% through 71+ 30%. Demand-factor row is selected from the maximum number of shore-power receptacles connected to any one line after balancing. 30A=3600 VA, 50A=12000 VA. Amenities added after demand. Dock/feeder grouping and 2020+ table renumbering not claimed verified for other years.",
});
