/**
 * FROZEN BASELINE — Conductor Ampacity — 2020
 * v1.0.0 — 2026-08-22
 *
 * 2017 immutability: Table 310.15(B)(16) / 310.15(B)(7) 83%.
 * 2020 change: Table 310.16 + 310.12 citations. Ampacity values and 83%
 * factor are owned copies / shared values pending row-for-row codebook.
 */

import { calcConductorAmpacity } from "@/components/calculator/calcs/logic/conductorAmpacityCalc";
import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

export function runConductorAmpacity2020Baseline(calcFn = calcConductorAmpacity) {
  const flags = runCalcTests({
    nec: NEC_2020,
    calcFn: () => ({
      AMPACITY_TABLE: NEC_2020.AMPACITY_TABLE,
      AMPACITY_TEMP_ARTICLE: NEC_2020.AMPACITY_TEMP_ARTICLE,
      AMPACITY_BUNDLE_ARTICLE: NEC_2020.AMPACITY_BUNDLE_ARTICLE,
      DWELLING_SERVICE_ARTICLE: NEC_2020.DWELLING_SERVICE_ARTICLE,
      DWELLING_SERVICE_CONDUCTOR_FACTOR: NEC_2020.DWELLING_SERVICE_CONDUCTOR_FACTOR,
      TABLE_310_12_100_CU: NEC_2020.DWELLING_SERVICE_CONDUCTOR_TABLE.find((row) => row.rating === 100)?.copper,
      TABLE_310_12_200_AL: NEC_2020.DWELLING_SERVICE_CONDUCTOR_TABLE.find((row) => row.rating === 200)?.aluminum,
      TABLE_310_12_400_CU: NEC_2020.DWELLING_SERVICE_CONDUCTOR_TABLE.find((row) => row.rating === 400)?.copper,
      TABLE_310_12_400_AL: NEC_2020.DWELLING_SERVICE_CONDUCTOR_TABLE.find((row) => row.rating === 400)?.aluminum,
    }),
    tests: [
      {
        id: "flags_amp_2020",
        description: "2020: Table 310.16, 310.15(B)(1), 310.15(C)(1), 310.12, 83%",
        inputs: {},
        expected: {
          AMPACITY_TABLE: "Table 310.16",
          AMPACITY_TEMP_ARTICLE: "310.15(B)(1)",
          AMPACITY_BUNDLE_ARTICLE: "310.15(C)(1)",
          DWELLING_SERVICE_ARTICLE: "310.12",
          DWELLING_SERVICE_CONDUCTOR_FACTOR: 0.83,
          TABLE_310_12_100_CU: "4",
          TABLE_310_12_200_AL: "4/0",
          TABLE_310_12_400_CU: "400",
          TABLE_310_12_400_AL: "600",
        },
      },
    ],
  });

  const immut = runCalcTests({
    nec: NEC_2017,
    calcFn,
    tests: [
      {
        id: "immut_amp_6_2017",
        description: "2017 #6 Cu 75°C, 40°C, 6 CCC — Table 310.15(B)(16)",
        inputs: { awg: "6", material: "copper", tempRating: "75", ambient: 40, bundled: 6, useTerminal: "75" },
        expected: {
          baseAmpacity: 65,
          tempCorrectionFactor: 0.88,
          bundleFactor: 0.8,
          finalAmpacity: 45.8,
          ampacityTable: "Table 310.15(B)(16)",
          tempArticle: "310.15(B)(2)(a)",
          bundleArticle: "310.15(B)(3)(a)",
        },
      },
      {
        id: "immut_amp_b7_2017",
        description: "2017 310.15(B)(7) 83% — 2/0 Cu 75°C",
        inputs: { awg: "2/0", material: "copper", tempRating: "75", ambient: 30, bundled: 3, useTerminal: "75", isDwellingService: true },
        expected: {
          finalAmpacity: 175,
          maxDwellingServiceA: 210.8,
          dwellingServiceArticle: "310.15(B)(7)",
        },
      },
    ],
  });

  const changed = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "amp20_table_310_16",
        description: "2020 same #6 math; cites Table 310.16 / 310.15(B)(1) / 310.15(C)(1)",
        inputs: { awg: "6", material: "copper", tempRating: "75", ambient: 40, bundled: 6, useTerminal: "75" },
        expected: {
          baseAmpacity: 65,
          tempCorrectionFactor: 0.88,
          bundleFactor: 0.8,
          finalAmpacity: 45.8,
          ampacityTable: "Table 310.16",
          tempArticle: "310.15(B)(1)",
          bundleArticle: "310.15(C)(1)",
        },
      },
      {
        id: "amp20_310_12",
        description: "2020 same 83% math; cites 310.12 (was 310.15(B)(7))",
        inputs: { awg: "2/0", material: "copper", tempRating: "75", ambient: 30, bundled: 3, useTerminal: "75", isDwellingService: true },
        expected: {
          finalAmpacity: 175,
          maxDwellingServiceA: 210.8,
          dwellingServiceArticle: "310.12",
          ampacityTable: "Table 310.16",
        },
      },
    ],
  });

  const suites = [
    { id: "flags", title: "2020 ampacity article identity", ...flags },
    { id: "immut_2017", title: "2017 immutability", ...immut },
    { id: "changed_2020", title: "2020 Table 310.16 / 310.12 (values pending-same)", ...changed },
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
