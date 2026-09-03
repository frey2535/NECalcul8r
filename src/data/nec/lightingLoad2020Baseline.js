/**
 * FROZEN BASELINE — Lighting Load — 2020
 * v1.0.0 — 2026-08-22
 */

import { calcLightingLoad } from "@/components/calculator/calcs/logic/lightingLoadCalc";
import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

export function runLightingLoad2020Baseline(calcFn = calcLightingLoad) {
  const immut = runCalcTests({
    nec: NEC_2017,
    calcFn,
    tests: [
      {
        id: "immut_lt_hotel_2017",
        description: "2017 hotel 2.0 VA, 220.42 50/40/30",
        inputs: { occupancy: "hotel_motel", sqft: 50000, voltage: 120, phases: "single" },
        expected: { occVA: 2, nec_VA: 100000, demand: 42000, lightingArticle: "Table 220.12" },
      },
      {
        id: "immut_lt_hospital_2017",
        description: "2017 hospital 2.0 VA",
        inputs: { occupancy: "hospital", sqft: 100000, voltage: 277, phases: "single" },
        expected: { occVA: 2, nec_VA: 200000, demand: 50000 },
      },
    ],
  });

  const changed = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "lt20_hotel",
        description: "2020 hotel 1.70 VA / 220.14(M)",
        inputs: { occupancy: "hotel_motel", sqft: 50000, voltage: 120, phases: "single" },
        expected: { occVA: 1.7, nec_VA: 85000, demand: 36000, lightingArticle: "220.14(M)" },
      },
      {
        id: "lt20_hotel_alias",
        description: "hotel key still maps to hotel_motel in 2020",
        inputs: { occupancy: "hotel", sqft: 50000, voltage: 120, phases: "single" },
        expected: { occVA: 1.7, nec_VA: 85000, demand: 36000, lightingArticle: "220.14(M)" },
      },
      {
        id: "lt20_hospital",
        description: "2020 hospital 1.6 VA",
        inputs: { occupancy: "hospital", sqft: 100000, voltage: 277, phases: "single" },
        expected: { occVA: 1.6, nec_VA: 160000, demand: 42000, lightingArticle: "Table 220.12" },
      },
      {
        id: "lt20_garage",
        description: "2020 garage 0.3 VA, All Others 100%",
        inputs: { occupancy: "garage", sqft: 20000, voltage: 277, phases: "single" },
        expected: { occVA: 0.3, nec_VA: 6000, demand: 6000 },
      },
      {
        id: "lt20_armory",
        description: "2020 armory 1.7 VA",
        inputs: { occupancy: "armory", sqft: 10000, voltage: 277, phases: "single" },
        expected: { occVA: 1.7, nec_VA: 17000, demand: 17000 },
      },
      {
        id: "lt20_dwelling",
        description: "2020 dwelling 3 VA at 220.14(J), 220.42 unchanged numerically",
        inputs: { occupancy: "dwelling", sqft: 10000, voltage: 120, phases: "single" },
        expected: { occVA: 3, nec_VA: 30000, demand: 12450, designVA: 12450, totalAmps: 103.8, numCircuits: 6, lightingArticle: "220.14(J)" },
      },
      {
        id: "lt20_dwelling_4500_demand_amps",
        description: "2020 dwelling 4,500 ft² — amps/circuits use 220.42 demand load, not raw lighting VA",
        inputs: { occupancy: "dwelling", sqft: 4500, voltage: 120, phases: "single", actualFixtureW: 0 },
        expected: { occVA: 3, nec_VA: 13500, demand: 6675, designVA: 6675, totalAmps: 55.6, actualAmps: 55.6, numCircuits: 3, lightingArticle: "220.14(J)" },
      },
    ],
  });

  const pending = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "pending_lt_office",
        description: "PENDING 2020 office still 3.5 / 100%",
        inputs: { occupancy: "office", sqft: 5000, voltage: 277, phases: "single" },
        expected: { occVA: 3.5, nec_VA: 17500, demand: 17500 },
      },
      {
        id: "pending_lt_unlisted",
        description: "PENDING 2020 unlisted default still 2 VA/ft²",
        inputs: { occupancy: "museum", sqft: 4000, voltage: 277, phases: "single" },
        expected: { occVA: 2, nec_VA: 8000, demand: 8000 },
      },
    ],
  });

  const suites = [
    { id: "immut_2017", title: "2017 immutability", ...immut },
    { id: "changed_2020", title: "2020 confirmed lighting deltas", ...changed },
    { id: "pending_2020", title: "2020 pending occupancies (placeholders)", ...pending },
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
