/**
 * FROZEN BASELINE — Kitchen Equipment (NEC 220.56) — 2017
 * v1.0.0 — 2026-08-22
 */

import { calcKitchenEquipment } from "@/components/calculator/calcs/logic/kitchenEquipmentCalc";
import { getNecData } from "@/data/nec";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");

const TESTS = [
  {
    id: "k_1_unit_100",
    description: "1 unit — 100%",
    inputs: { equipment: [{ kw: 12 }], voltage: 208, phases: "three" },
    expected: { demandFactor: 100, demandedKW: 12, twoLargestFloorApplied: false },
  },
  {
    id: "k_3_units_90",
    description: "3 units — 90%",
    inputs: { equipment: [{ kw: 10 }, { kw: 10 }, { kw: 10 }], voltage: 208, phases: "three" },
    expected: { demandFactor: 90, demandedKW: 27 },
  },
  {
    id: "k_5_units_70",
    description: "5 units — 70%",
    inputs: { equipment: [{ kw: 12 }, { kw: 15 }, { kw: 10 }, { kw: 8 }, { kw: 10 }], voltage: 208, phases: "three" },
    expected: { demandFactor: 70, tableDemandKW: 38.5, demandedKW: 38.5 },
  },
  {
    id: "k_6_units_65_2017",
    description: "2017: 6 units at 65% (not stepped down further)",
    inputs: { equipment: [{ kw: 10 }, { kw: 10 }, { kw: 10 }, { kw: 10 }, { kw: 10 }, { kw: 10 }], voltage: 208, phases: "three" },
    expected: { demandFactor: 65, demandedKW: 39 },
  },
  {
    id: "k_10_still_65_2017",
    description: "2017: 10 units still 65%",
    inputs: { equipment: Array.from({ length: 10 }, () => ({ kw: 5 })), voltage: 208, phases: "three" },
    expected: { demandFactor: 65, demandedKW: 32.5 },
  },
  {
    id: "k_two_largest_floor",
    description: "Table 220.56 note — not less than two largest",
    inputs: { equipment: [{ kw: 2 }, { kw: 2 }, { kw: 2 }, { kw: 2 }, { kw: 20 }, { kw: 20 }], voltage: 208, phases: "three" },
    expected: { demandFactor: 65, tableDemandKW: 31.2, twoLargestKW: 40, demandedKW: 40, twoLargestFloorApplied: true },
  },
];

export function runKitchenEquipmentBaseline(calcFn = calcKitchenEquipment) {
  const tests = TESTS.map((t) => {
    const actual = calcFn(t.inputs, NEC_2017);
    const fieldResults = {};
    let pass = true;
    for (const key of Object.keys(t.expected)) {
      const exp = t.expected[key];
      const act = actual[key];
      const match = typeof exp === "boolean" ? act === exp : Math.abs(act - exp) < 0.05;
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
