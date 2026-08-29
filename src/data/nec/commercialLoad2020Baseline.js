/**
 * FROZEN BASELINE — Commercial Load — 2020
 * v1.0.0 — 2026-08-22
 *
 * 2017 immutability is asserted here (same calc, 2017 data). Confirmed 2020
 * Table 220.12 deltas are gated. Occupancies still parked at 2017 VA/ft² are
 * tested as pending placeholders — not claimed verified-unchanged.
 */

import { calcCommercialLoad } from "@/components/calculator/calcs/logic/commercialLoadCalc";
import { getNecData } from "@/data/nec";
import { runCalcTests } from "@/data/nec/baselineHarness";

export const BASELINE_FROZEN = true;
export const BASELINE_FROZEN_DATE = "2026-08-22";
export const BASELINE_VERSION = "1.0.0";

const NEC_2017 = getNecData("2017");
const NEC_2020 = getNecData("2020");

export function runCommercialLoad2020Baseline(calcFn = calcCommercialLoad) {
  const immut = runCalcTests({
    nec: NEC_2017,
    calcFn,
    tests: [
      {
        id: "immut_hotel_2017",
        description: "2017 hotel 50,000 ft² stays 2.0 VA / 42,000 demand (immutability)",
        inputs: { occupancy: "hotel_motel", sqft: 50000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 2, lightingVA: 100000, lightingDemand: 42000, lightingArticle: "Table 220.12" },
      },
      {
        id: "immut_hospital_2017",
        description: "2017 hospital 100,000 ft² stays 2.0 VA / 50,000 demand",
        inputs: { occupancy: "hospital", sqft: 100000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 2, lightingVA: 200000, lightingDemand: 50000 },
      },
      {
        id: "immut_garage_2017",
        description: "2017 garage 0.5 VA/ft²",
        inputs: { occupancy: "garage", sqft: 20000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 0.5, lightingVA: 10000 },
      },
      {
        id: "immut_armory_2017",
        description: "2017 armory 1.0 VA/ft²",
        inputs: { occupancy: "armory", sqft: 10000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 1, lightingVA: 10000 },
      },
    ],
  });

  const changed = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "com20_hotel_1_70",
        description: "2020 hotel 1.70 VA/ft² (220.14(M)) — 50,000 ft² → 85,000 VA, 220.42 36,000",
        inputs: { occupancy: "hotel_motel", sqft: 50000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 1.7, lightingVA: 85000, lightingDemand: 36000, lightingArticle: "220.14(M)" },
      },
      {
        id: "com20_hospital_1_6",
        description: "2020 hospital 1.6 VA/ft² — 100,000 ft² → 160,000 VA, 220.42 42,000",
        inputs: { occupancy: "hospital", sqft: 100000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 1.6, lightingVA: 160000, lightingDemand: 42000, lightingArticle: "Table 220.12" },
      },
      {
        id: "com20_garage_0_3",
        description: "2020 garage 0.3 VA/ft²",
        inputs: { occupancy: "garage", sqft: 20000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 0.3, lightingVA: 6000, lightingDemand: 6000 },
      },
      {
        id: "com20_armory_1_7",
        description: "2020 armory 1.7 VA/ft² (gymnasium-type)",
        inputs: { occupancy: "armory", sqft: 10000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 1.7, lightingVA: 17000, lightingDemand: 17000 },
      },
      {
        id: "com20_dwelling_220_14j",
        description: "2020 dwelling lighting 3 VA via 220.14(J), value unchanged",
        inputs: { occupancy: "dwelling", sqft: 10000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 3, lightingVA: 30000, lightingDemand: 12450, lightingArticle: "220.14(J)" },
      },
      {
        id: "com20_hospital_footnote",
        description: "Table 220.42 footnote still skips demand when lighting used at one time",
        inputs: { occupancy: "hospital", sqft: 100000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0, lightingUsedAtOneTime: true },
        expected: { lightingDemand: 160000, lightingDemandSkipped: true },
      },
      {
        id: "com20_220_14k",
        description: "220.14(K) office 1 VA/ft² floor still applies (not a 2020-only rule)",
        inputs: { occupancy: "office", sqft: 10000, receptacles: 10, receptacleVA: 180, showWindow: 0, outsideSign: 0, majorAppliances: 0, hvac: 0 },
        expected: { receptacleTotal: 1800, receptacleDemand: 10000 },
      },
      {
        id: "com20_220_44",
        description: "220.44 100 yokes unchanged",
        inputs: { occupancy: "store", sqft: 0, receptacles: 100, receptacleVA: 180, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { receptacleTotal: 18000, receptacleDemand: 14000 },
      },
      {
        id: "com20_sign_show",
        description: "Sign min 1200 VA and show window 200 VA/ft",
        inputs: { occupancy: "store", sqft: 0, receptacles: 0, outsideSign: 500, showWindow: 10, showWindowVA: 200, hvac: 0, majorAppliances: 0 },
        expected: { signVA: 1200, showWindowVA: 2000 },
      },
    ],
  });

  const pending = runCalcTests({
    nec: NEC_2020,
    calcFn,
    tests: [
      {
        id: "pending_office_3_5",
        description: "PENDING 2020 office still 3.5 — placeholder, not verified-unchanged",
        inputs: { occupancy: "office", sqft: 5000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 3.5, lightingVA: 17500, lightingDemand: 17500 },
      },
      {
        id: "pending_warehouse_0_25",
        description: "PENDING 2020 warehouse still 0.25 — placeholder, not verified-unchanged",
        inputs: { occupancy: "warehouse", sqft: 60000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 0.25, lightingVA: 15000, lightingDemand: 13750 },
      },
      {
        id: "pending_bank_3_5",
        description: "PENDING 2020 bank 3.5 (with office) so 220.14(K) still has a unit load",
        inputs: { occupancy: "bank", sqft: 2000, receptacles: 0, showWindow: 0, outsideSign: 0, hvac: 0, majorAppliances: 0 },
        expected: { unitLoad: 3.5, lightingVA: 7000, receptacleDemand: 2000 },
      },
    ],
  });

  const suites = [
    { id: "immut_2017", title: "2017 immutability", ...immut },
    { id: "changed_2020", title: "2020 confirmed Table 220.12 deltas", ...changed },
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
