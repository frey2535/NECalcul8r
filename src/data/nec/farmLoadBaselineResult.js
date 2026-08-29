import { BASELINE_VERSION, BASELINE_FROZEN_DATE, BASELINE_FROZEN } from "./farmLoadBaseline";

export const BASELINE_RESULT = Object.freeze({
  baselineFrozen: BASELINE_FROZEN,
  baselineVersion: BASELINE_VERSION,
  baselineDate: BASELINE_FROZEN_DATE,
  dateExecuted: "2026-08-22",
  total: 12,
  passed: 12,
  failed: 0,
  allPass: true,
  status: "verified",
  failingTestIds: [],
  notes: "2017 Part V: Table 220.102 ampere tiers (60 A 100% / next 60 A 50% / remainder 25% at 240 V), simultaneous and 125% motor floors, Table 220.103 100/75/65/50, dwelling added after 220.103, same-function combine, Part IV blocked for electric heat + grain drying.",
});
