/**
 * FROZEN BASELINE — Marina Shore Power (NEC Table 555.12) — 2017
 * v1.0.0 — 2026-08-22
 */

import { calcMarinaShorePower } from "@/components/calculator/calcs/logic/marinaShorePowerCalc";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");

function run(inputs) {
  return calcMarinaShorePower({ additionalLoads: [], length: 0, voltage: 208, phases: "three", ...inputs }, NEC_2017, "2017");
}

const TESTS = [
  {
    id: "mar_1_100",
    description: "1 × 30A — Table 555.12 100%",
    inputs: { receptacles: [{ rating: "30A", quantity: 1 }] },
    expected: { totalReceptacleCount: 1, demandFactorPct: 100, totalConnectedReceptacles: 3600, demandLoadShore: 3600 },
  },
  {
    id: "mar_4_100_5_90",
    description: "4 receptacles 100%; 5 enter 90% band",
    inputs: { receptacles: [{ rating: "30A", quantity: 4 }] },
    expected: { demandFactorPct: 100 },
  },
  {
    id: "mar_5_90",
    description: "5 two-pole receptacles on each line — 90%",
    inputs: { receptacles: [{ rating: "50A", quantity: 5 }] },
    expected: { demandReceptacleCount: 5, demandFactorPct: 90, demandLoadShore: 54000 },
  },
  {
    id: "mar_15_70",
    description: "15 two-pole receptacles on each line — 70%",
    inputs: { receptacles: [{ rating: "50A", quantity: 15 }] },
    expected: { demandReceptacleCount: 15, demandFactorPct: 70 },
  },
  {
    id: "mar_71_30",
    description: "2017: 71 plus on each line at 30%",
    inputs: { receptacles: [{ rating: "50A", quantity: 71 }] },
    expected: { demandReceptacleCount: 71, demandFactorPct: 30 },
  },
  {
    id: "mar_50a_12000",
    description: "50A shore power = 50 × 240 V = 12,000 VA",
    inputs: { receptacles: [{ rating: "50A", quantity: 1 }] },
    expected: { totalConnectedReceptacles: 12000, demandLoadShore: 12000 },
  },
  {
    id: "mar_amenities_after",
    description: "Non-shore loads added after Table 555.12",
    inputs: {
      receptacles: [{ rating: "30A", quantity: 1 }],
      additionalLoads: [{ type: "office", va: 5000 }],
    },
    expected: { demandLoadShore: 3600, totalAdditional: 5000, totalServiceVA: 8600 },
  },
  {
    id: "mar_default_mix",
    description: "10×30A balanced + 5×50A + 2×100A = 11 receptacles on max line at 80%",
    inputs: {
      receptacles: [
        { rating: "30A", quantity: 10 },
        { rating: "50A", quantity: 5 },
        { rating: "100A", quantity: 2 },
      ],
    },
    expected: {
      totalReceptacleCount: 17,
      demandReceptacleCount: 11,
      totalConnectedReceptacles: 10 * 3600 + 5 * 12000 + 2 * 24000,
      demandFactorPct: 80,
      demandLoadShore: Math.round((36000 + 60000 + 48000) * 0.80),
    },
  },
  {
    id: "mar_balanced_line_count_basis",
    description: "40 total receptacles can use the 15-30 row when balancing puts 27 on the max line",
    inputs: {
      receptacles: [
        { rating: "30A", quantity: 20 },
        { rating: "50A", quantity: 20 },
      ],
    },
    expected: {
      totalReceptacleCount: 40,
      demandReceptacleCount: 27,
      demandFactorPct: 70,
      totalConnectedReceptacles: 312000,
      demandLoadShore: 218400,
    },
  },
];

export function runMarinaShorePowerBaseline(calcFn = calcMarinaShorePower) {
  const tests = TESTS.map((t) => {
    const actual = calcFn({ additionalLoads: [], length: 0, voltage: 208, phases: "three", ...t.inputs }, NEC_2017, "2017");
    const fieldResults = {};
    let pass = true;
    for (const key of Object.keys(t.expected)) {
      const exp = t.expected[key];
      const act = actual[key];
      const match = Math.abs(act - exp) < 0.5;
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
