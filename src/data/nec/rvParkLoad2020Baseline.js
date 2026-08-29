/**
 * FROZEN BASELINE — RV Park Load — 2020
 * v1.0.0 — 2026-08-22
 *
 * Table 551.73(A) identity is unchanged from 2017. 2020 owns a copy of the
 * bands and site VA so they are not inherited from shared. 36+ at 41% is
 * pending codebook. 551.71 vs 210.8 GFCI coordination is not computed.
 */

import { calcRVParkLoad } from "@/components/calculator/calcs/logic/rvParkLoadCalc";
import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

export function runRVParkLoad2020Baseline(calcFn = calcRVParkLoad) {
  const flags = runCalcTests({
    nec: NEC_2020,
    calcFn: () => ({
      RV_PARK_DEMAND_TABLE: NEC_2020.RV_PARK_DEMAND_TABLE,
      lastBand: NEC_2020.RV_PARK_DEMAND[NEC_2020.RV_PARK_DEMAND.length - 1].factor,
      site50: NEC_2020.RV_SITE_VA["50A"],
    }),
    tests: [
      {
        id: "flags_rv_2020",
        description: "2020 owns Table 551.73(A); 36+ still 41%; 50A still 12,000 VA",
        inputs: {},
        expected: { RV_PARK_DEMAND_TABLE: "Table 551.73(A)", lastBand: 41, site50: 12000 },
      },
    ],
  });

  const immut = runCalcTests({
    nec: NEC_2017,
    calcFn,
    tests: [
      {
        id: "immut_rv_36_2017",
        description: "2017 36 sites stay 41% at Table 551.73(A)",
        inputs: { sites50A: 36, sites20A: 0, sites30A: 0, additionalLoads: [], length: 0 },
        expected: { demandFactorPct: 41, demandTableRef: "Table 551.73(A)" },
      },
    ],
  });

  const pending = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "rv20_36_41",
        description: "PENDING: 2020 36+ still 41%",
        inputs: { sites50A: 36, sites20A: 0, sites30A: 0, additionalLoads: [], length: 0 },
        expected: { demandFactorPct: 41, demandTableRef: "Table 551.73(A)" },
      },
      {
        id: "rv20_va_ratings",
        description: "PENDING: 2020 site VA still 2400/3600/12000",
        inputs: { sites20A: 1, sites30A: 1, sites50A: 1, additionalLoads: [], length: 0 },
        expected: { connected20A: 2400, connected30A: 3600, connected50A: 12000, demandFactorPct: 80 },
      },
    ],
  });

  const suites = [
    { id: "flags", title: "2020 RV table identity", ...flags },
    { id: "immut_2017", title: "2017 immutability", ...immut },
    { id: "pending_2020", title: "2020 Table 551.73(A) pending-same", ...pending },
  ];
  const total = suites.reduce((s, x) => s + x.total, 0);
  const passed = suites.reduce((s, x) => s + x.passed, 0);
  const failed = suites.reduce((s, x) => s + x.failed, 0);
  return {
    baselineVersion: BASELINE_VERSION,
    baselineDate: BASELINE_FROZEN_DATE,
    allPass: failed === 0,
    total,
    passed,
    failed,
    suites,
    tests: suites.flatMap((s) => s.tests),
    failures: suites.filter((s) => !s.allPass),
  };
}
