/**
 * FROZEN BASELINE — RV Park Load (NEC 551.73(A)) — 2017
 * v1.0.0 — 2026-08-22
 */

import { calcRVParkLoad } from "@/components/calculator/calcs/logic/rvParkLoadCalc";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");

const TESTS = [
  {
    id: "rv_1_site_100",
    description: "1 × 50A site — 100%",
    inputs: { sites20A: 0, sites30A: 0, sites50A: 1, additionalLoads: [], voltage: 240, phases: "single", length: 0 },
    expected: { totalSites: 1, demandFactorPct: 100, totalConnectedRV: 12000, demandLoadRV: 12000 },
  },
  {
    id: "rv_2_sites_90",
    description: "2 sites — 90%",
    inputs: { sites50A: 2, sites20A: 0, sites30A: 0, additionalLoads: [], length: 0 },
    expected: { demandFactorPct: 90, demandLoadRV: 21600 },
  },
  {
    id: "rv_6_60_7_55",
    description: "6 sites 60%; 7 sites enter 7–9 band at 55%",
    inputs: { sites50A: 6, sites20A: 0, sites30A: 0, additionalLoads: [], length: 0 },
    expected: { demandFactorPct: 60 },
  },
  {
    id: "rv_7_55",
    description: "7 sites — 55%",
    inputs: { sites50A: 7, additionalLoads: [], length: 0 },
    expected: { demandFactorPct: 55 },
  },
  {
    id: "rv_10_50",
    description: "10 sites — 50%",
    inputs: { sites50A: 10, additionalLoads: [], length: 0 },
    expected: { demandFactorPct: 50 },
  },
  {
    id: "rv_35_42",
    description: "35 sites — last of 25–35 band at 42%",
    inputs: { sites50A: 35, additionalLoads: [], length: 0 },
    expected: { demandFactorPct: 42 },
  },
  {
    id: "rv_36_41",
    description: "2017: 36 plus sites at 41%",
    inputs: { sites50A: 36, additionalLoads: [], length: 0 },
    expected: { demandFactorPct: 41 },
  },
  {
    id: "rv_va_ratings",
    description: "551.73(A) site VA — 20A 2400, 30A 3600, 50A 12000",
    inputs: { sites20A: 1, sites30A: 1, sites50A: 1, additionalLoads: [], length: 0 },
    expected: { connected20A: 2400, connected30A: 3600, connected50A: 12000, totalConnectedRV: 18000, demandFactorPct: 80 },
  },
  {
    id: "rv_amenities_not_in_df",
    description: "Amenities added after Table 551.73(A), not demand-factored",
    inputs: { sites50A: 1, sites20A: 0, sites30A: 0, additionalLoads: [{ name: "Office", va: 5000 }], length: 0 },
    expected: { demandLoadRV: 12000, totalAdditional: 5000, totalServiceVA: 17000 },
  },
  {
    id: "rv_negative_clamp",
    description: "Negative site counts clamped to 0",
    inputs: { sites20A: -4, sites30A: 0, sites50A: 0, additionalLoads: [{ va: -100 }], length: 0 },
    expected: { totalSites: 0, demandFactorPct: 0, demandLoadRV: 0, totalAdditional: 0 },
  },
  {
    id: "rv_default_35",
    description: "Default 10+20+5 = 35 sites at 42% plus amenities",
    inputs: {
      sites20A: 10, sites30A: 20, sites50A: 5,
      additionalLoads: [{ name: "Office", va: 5000 }, { name: "Bathhouse", va: 2000 }, { name: "Laundry", va: 3000 }],
      voltage: 240, phases: "single", length: 0,
    },
    expected: { totalSites: 35, totalConnectedRV: 156000, demandFactorPct: 42, demandLoadRV: 65520, totalAdditional: 10000, totalServiceVA: 75520 },
  },
];

export function runRVParkLoadBaseline(calcFn = calcRVParkLoad) {
  const tests = TESTS.map((t) => {
    const actual = calcFn(t.inputs, NEC_2017);
    const fieldResults = {};
    let pass = true;
    for (const key of Object.keys(t.expected)) {
      const exp = t.expected[key];
      const act = actual[key];
      const match = Math.abs(act - exp) < 0.05;
      fieldResults[key] = { actual: act, expected: exp, match };
      if (!match) pass = false;
    }
    return { id: t.id, description: t.description, pass, fieldResults };
  });
  const passed = tests.filter((t) => t.pass).length;
  const failed = tests.filter((t) => !t.pass).length;
  return {
    baselineVersion: BASELINE_VERSION,
    baselineDate: BASELINE_FROZEN_DATE,
    allPass: failed === 0,
    total: tests.length,
    passed,
    failed,
    tests,
    failures: tests.filter((t) => !t.pass),
  };
}
