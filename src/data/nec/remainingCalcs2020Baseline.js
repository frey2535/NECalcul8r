/**
 * FROZEN BASELINE — Remaining calculators — 2020 pending-same
 * v1.0.0 — 2026-08-22
 *
 * Re-runs the remaining-2017 numeric suites against 2020 year data.
 * Lighting occupancy VA is skipped (dedicated lighting-2020 / commercial-2020).
 * Year-flag fields (GFCI/SPD/disconnect notes) are stripped so this suite
 * asserts math only. Those flags are gated in remaining-2020.
 *
 * Numeric equality is an owned copy / pending codebook — not claimed verified
 * unchanged against NFPA 70-2020.
 */

import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";
import { REMAINING_NUMERIC_SUITE_DEFS } from "@/data/nec/remaining2017Baseline";
import { calcDwellingOptional, calcDwellingStandard } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { calcGeneratorSizing } from "@/components/calculator/calcs/logic/generatorSizingCalc";
import { calcEGCSizing } from "@/components/calculator/calcs/logic/groundingCalc";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

const SKIP_2020 = new Set(["lighting_load"]);
const STRIP_2020 = {
  hvac_load: ["GFCI_servicing_note"],
  ev_charging: ["GFCI_required", "SPD_required", "outdoor_disconnect"],
  service_sizing: ["SPD_required", "outdoor_disconnect"],
};

function stripTests(tests, keys) {
  if (!keys?.length) return tests;
  return tests.map((t) => {
    const expected = { ...t.expected };
    for (const k of keys) delete expected[k];
    return { ...t, expected };
  });
}

export function runRemainingCalcs2020Baseline() {
  const suites = [];

  for (const s of REMAINING_NUMERIC_SUITE_DEFS) {
    suites.push({
      id: `${s.id}_2017`,
      title: `${s.title} 2017 immutability`,
      ...runCalcTests({ tests: s.tests, calcFn: s.calcFn, nec: NEC_2017, tolerance: s.tolerance }),
    });
    if (SKIP_2020.has(s.id)) continue;
    suites.push({
      id: `${s.id}_2020`,
      title: `${s.title} 2020 pending-same`,
      ...runCalcTests({
        tests: stripTests(s.tests, STRIP_2020[s.id]),
        calcFn: s.calcFn,
        nec: NEC_2020,
        tolerance: s.tolerance,
      }),
    });
  }

  suites.push({
    id: "dwelling_optional_2020",
    title: "Dwelling Optional 220.82 2020 pending-same D2(a)/D2(b)",
    ...runCalcTests({
      nec: NEC_2020,
      calcFn: calcDwellingOptional,
      tolerance: 0.5,
      tests: [
        {
          id: "opt20_d2a",
          description: "PENDING: 2020 D2(a) totals still 21,480 VA / 100 A",
          inputs: {
            sqft: 1500, airCond: 1380, heatStrip: 9000, heatPump: 0, heatUnits: 5,
            supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0, otherLoads: 20700, voltage: 240,
          },
          expected: { totalVA: 21480, totalAmps: 90, minService_A: 100, hvacLoad_VA: 3600 },
        },
        {
          id: "opt20_d2b",
          description: "PENDING: 2020 D2(b) totals still 29,200 VA / 125 A",
          inputs: {
            sqft: 1500, airCond: 10080, heatStrip: 1500, heatPump: 0, heatUnits: 1,
            supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0, otherLoads: 23800, voltage: 240,
          },
          expected: { totalVA: 29200, minService_A: 125, hvacLoad_VA: 10080 },
        },
      ],
    }),
  });

  suites.push({
    id: "dwelling_standard_2020",
    title: "Dwelling Standard 220.40 / 220.55 2020 pending-same",
    ...runCalcTests({
      nec: NEC_2020,
      calcFn: calcDwellingStandard,
      tests: [
        {
          id: "std20_d1a",
          description: "PENDING: 2020 D1(a)-shape still 18,600 VA / 100 A",
          inputs: {
            sqft: 1500, smallAppliance: 2, laundry: 1, bathroom: 1, range: 12000, rangeCount: 1,
            dryer: 5500, dishwasher: 0, disposer: 0, waterHeater: 0, hvac: 0, other: 0, voltage: 240,
          },
          expected: { rangeDemand_VA: 8000, dryerDemand_VA: 5500, totalVA: 18600, minService_A: 100 },
        },
        {
          id: "std20_note1",
          description: "PENDING: 2020 Table 220.55 Note 1 12.5 kW still +5%",
          inputs: {
            sqft: 0, smallAppliance: 2, laundry: 1, bathroom: 0, range: 12500, rangeCount: 1,
            dryer: 0, dishwasher: 0, disposer: 0, waterHeater: 0, hvac: 0, other: 0, voltage: 240,
          },
          expected: { rangeDemand_VA: 8400 },
        },
      ],
    }),
  });

  suites.push({
    id: "notes_2020",
    title: "2020 remaining notes (445 / 250.122(B) / 242 / 250.25)",
    ...runCalcTests({
      nec: NEC_2020,
      calcFn: () => ({
        DWELLING_GENERATOR_SHUTDOWN_ARTICLE: NEC_2020.DWELLING_GENERATOR_SHUTDOWN_ARTICLE,
        EGC_UPSIZE_ARTICLE: NEC_2020.EGC_UPSIZE_ARTICLE,
        SPD_ARTICLE: NEC_2020.SPD_ARTICLE,
        OVERVOLTAGE_ARTICLE: NEC_2020.OVERVOLTAGE_ARTICLE,
        SUPPLY_SIDE_DISCONNECT_ARTICLE: NEC_2020.SUPPLY_SIDE_DISCONNECT_ARTICLE,
      }),
      tests: [
        {
          id: "notes_owned_2020",
          description: "2020 owns generator shutdown, 250.122(B), 230.67/242, 250.25 notes",
          inputs: {},
          expected: {
            DWELLING_GENERATOR_SHUTDOWN_ARTICLE: "445.18",
            EGC_UPSIZE_ARTICLE: "250.122(B)",
            SPD_ARTICLE: "230.67",
            OVERVOLTAGE_ARTICLE: "242",
            SUPPLY_SIDE_DISCONNECT_ARTICLE: "250.25",
          },
        },
      ],
    }),
  });

  suites.push({
    id: "gen_note_2020",
    title: "Generator 445.18 note 2020",
    ...runCalcTests({
      nec: NEC_2020,
      calcFn: calcGeneratorSizing,
      tests: [
        {
          id: "gen20_shutdown_note",
          description: "2020 same 45 kW size; dwelling generator shutdown note present",
          inputs: { mode: "service", serviceA: 200, serviceV: 240, servicePhases: "single", demandFactor: 80, pf: 0.8 },
          expected: { recommendedGenSize: 45, dwelling_generator_shutdown_article: "445.18" },
        },
      ],
    }),
  });

  suites.push({
    id: "egc_article_2020",
    title: "EGC 250.122(B) article 2020",
    ...runCalcTests({
      nec: NEC_2020,
      calcFn: calcEGCSizing,
      tests: [
        {
          id: "egc20_122b",
          description: "2020 same #8/#4 upsize; cites 250.122(B)",
          inputs: { ocpd: "100", material: "copper", voltageDropUpsizeRatio: 2 },
          expected: { awg: "8", adjustedAwg: "4", egcUpsizeArticle: "250.122(B)" },
        },
      ],
    }),
  });

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
