/**
 * FROZEN BASELINE — Marina Shore Power — 2020
 * v1.0.0 — 2026-08-22
 *
 * 2017 immutability: Table 555.12 identity + 71+ at 30%.
 * 2020 change: table identity is Table 555.6. Numeric bands are an owned copy
 * of 2017 and are pending NFPA 70-2020 confirmation — not claimed verified-equal.
 */

import { calcMarinaShorePower } from "@/components/calculator/calcs/logic/marinaShorePowerCalc";
import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

function marina(inputs, nec) {
  return calcMarinaShorePower(
    { additionalLoads: [], length: 0, voltage: 208, phases: "three", ...inputs },
    nec,
    nec.year,
  );
}

export function runMarinaShorePower2020Baseline(calcFn = marina) {
  const flags = runCalcTests({
    nec: NEC_2020,
    calcFn: () => ({
      MARINA_DEMAND_TABLE: NEC_2020.MARINA_DEMAND_TABLE,
      lastBand: NEC_2020.MARINA_DEMAND[NEC_2020.MARINA_DEMAND.length - 1].factor,
      fiveBand: NEC_2020.MARINA_DEMAND.find((r) => r.count >= 5).factor,
    }),
    tests: [
      {
        id: "flags_marina_2020",
        description: "2020 owns Table 555.6; last band still 30% (pending codebook)",
        inputs: {},
        expected: { MARINA_DEMAND_TABLE: "Table 555.6", lastBand: 30, fiveBand: 90 },
      },
    ],
  });

  const immut = runCalcTests({
    nec: NEC_2017,
    calcFn,
    tests: [
      {
        id: "immut_mar_71_2017",
        description: "2017 71 receptacles stay Table 555.12 at 30%",
        inputs: { receptacles: [{ rating: "30A", quantity: 71 }] },
        expected: { demandFactorPct: 30, demandTableRef: "Table 555.12" },
      },
      {
        id: "immut_mar_5_2017",
        description: "2017 5 receptacles stay 90%",
        inputs: { receptacles: [{ rating: "30A", quantity: 5 }] },
        expected: { demandFactorPct: 90, demandLoadShore: 16200, demandTableRef: "Table 555.12" },
      },
    ],
  });

  const changed = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "mar20_table_555_6",
        description: "2020 cites Table 555.6; 71 receptacles still 30% (pending-same factors)",
        inputs: { receptacles: [{ rating: "30A", quantity: 71 }] },
        expected: { demandFactorPct: 30, demandTableRef: "Table 555.6" },
      },
      {
        id: "mar20_5_90",
        description: "PENDING: 2020 5 receptacles still 90%",
        inputs: { receptacles: [{ rating: "30A", quantity: 5 }] },
        expected: { demandFactorPct: 90, demandLoadShore: 16200, demandTableRef: "Table 555.6" },
      },
      {
        id: "mar20_50a_12000",
        description: "2020 50A shore power still 50 × 240 V = 12,000 VA",
        inputs: { receptacles: [{ rating: "50A", quantity: 1 }] },
        expected: { totalConnectedReceptacles: 12000, demandLoadShore: 12000, demandTableRef: "Table 555.6" },
      },
      {
        id: "mar20_amenities_after",
        description: "2020 non-shore loads still added after demand",
        inputs: {
          receptacles: [{ rating: "30A", quantity: 1 }],
          additionalLoads: [{ type: "office", va: 5000 }],
        },
        expected: { demandLoadShore: 3600, totalAdditional: 5000, totalServiceVA: 8600 },
      },
    ],
  });

  const suites = [
    { id: "flags", title: "2020 marina table identity", ...flags },
    { id: "immut_2017", title: "2017 immutability", ...immut },
    { id: "changed_2020", title: "2020 Table 555.6 (factors pending-same)", ...changed },
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
