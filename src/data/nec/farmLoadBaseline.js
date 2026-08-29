/**
 * FROZEN BASELINE — Farm Load (NEC 220.102 / 220.103) — 2017
 * v1.0.0 — 2026-08-22
 */

import { calcFarmLoad } from "@/components/calculator/calcs/logic/farmLoadCalc";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");

const TESTS = [
  {
    id: "farm_102_first_60a",
    description: "Table 220.102 — 60 A at 240 V stays 100%",
    inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 14400 }], voltage: 240, phases: "single" },
    expected: { totalBuildingDemand: 14400, totalServiceVA: 14400 },
  },
  {
    id: "farm_102_next_60a",
    description: "Table 220.102 — next 60 A at 50%",
    inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 28800 }], voltage: 240, phases: "single" },
    expected: { totalBuildingDemand: 21600 },
  },
  {
    id: "farm_102_remainder_25",
    description: "Table 220.102 — remainder over 120 A at 25%",
    inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 36000 }], voltage: 240, phases: "single" },
    expected: { totalBuildingDemand: 23400 },
  },
  {
    id: "farm_102_simultaneous_floor",
    description: "Table 220.102 — simultaneous loads not less than",
    inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 35000, simultaneousVA: 35000 }], voltage: 240, phases: "single" },
    expected: { totalBuildingDemand: 35000 },
  },
  {
    id: "farm_102_motor_125",
    description: "Table 220.102 — 125% of largest motor",
    inputs: { dwellingVA: 0, buildings: [{ name: "A", va: 20000, largestMotorVA: 20000 }], voltage: 240, phases: "single" },
    expected: { totalBuildingDemand: 25000 },
  },
  {
    id: "farm_103_three_rank",
    description: "Table 220.103 — three equal 220.102 loads at 100/75/65",
    inputs: {
      dwellingVA: 0,
      buildings: [{ name: "A", va: 14400 }, { name: "B", va: 14400 }, { name: "C", va: 14400 }],
      voltage: 240, phases: "single",
    },
    expected: { totalBuildingDemand: 34560 },
  },
  {
    id: "farm_103_fourth_50",
    description: "Table 220.103 — fourth load at 50%",
    inputs: {
      dwellingVA: 0,
      buildings: [{ name: "A", va: 14400 }, { name: "B", va: 14400 }, { name: "C", va: 14400 }, { name: "D", va: 14400 }],
      voltage: 240, phases: "single",
    },
    expected: { totalBuildingDemand: 41760 },
  },
  {
    id: "farm_dwelling_after_103",
    description: "220.103 note — dwelling added after ranking",
    inputs: {
      dwellingVA: 23000,
      buildings: [{ name: "A", va: 14400 }, { name: "B", va: 14400 }, { name: "C", va: 14400 }],
      voltage: 240, phases: "single",
    },
    expected: { dwelling: 23000, totalBuildingDemand: 34560, totalServiceVA: 57560 },
  },
  {
    id: "farm_same_function",
    description: "220.103 — same-function loads combined after 220.102",
    inputs: {
      dwellingVA: 0,
      buildings: [
        { name: "Pump 1", va: 14400, functionGroup: "pumps" },
        { name: "Pump 2", va: 14400, functionGroup: "pumps" },
      ],
      voltage: 240, phases: "single",
    },
    expected: { totalBuildingDemand: 28800 },
  },
  {
    id: "farm_part_iv_blocked",
    description: "220.102(A) — Part IV blocked when electric heat + grain drying",
    inputs: { dwellingVA: 10000, buildings: [], dwellingElectricHeat: true, grainDrying: true, voltage: 240, phases: "single" },
    expected: { partIVBlocked: true, totalServiceVA: 10000 },
  },
  {
    id: "farm_negative_clamp",
    description: "Negative dwelling and building VA clamped to 0",
    inputs: { dwellingVA: -5000, buildings: [{ name: "A", va: -100 }], voltage: 240, phases: "single" },
    expected: { dwelling: 0, totalServiceVA: 0 },
  },
  {
    id: "farm_default_job",
    description: "Default 3-building job — 102 then 103 then dwelling",
    inputs: {
      dwellingVA: 23000,
      buildings: [{ name: "Dairy Barn", va: 35000 }, { name: "Grain Storage", va: 15000 }, { name: "Equipment Shed", va: 8000 }],
      voltage: 240, phases: "single",
    },
    expected: { totalBuildingDemand: 39375, totalServiceVA: 62375, totalA: 259.9, minService_A: 300 },
  },
];

export function runFarmLoadBaseline(calcFn = calcFarmLoad) {
  const tests = TESTS.map((t) => {
    const actual = calcFn(t.inputs, NEC_2017);
    const fieldResults = {};
    let pass = true;
    for (const key of Object.keys(t.expected)) {
      const exp = t.expected[key];
      const act = actual[key];
      const match = typeof exp === "boolean" ? act === exp : Math.abs(act - exp) < 0.15;
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
