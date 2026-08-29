/**
 * Dwelling Optional (NEC 220.82) — HVAC Regression Test Suite
 *
 * Tests every supported HVAC category and noncoincident load path per
 * NEC 220.82(C):
 *   (C)(1) Air conditioning — 100%
 *   (C)(2) Heat pump compressor — 100%
 *   (C)(3) Heat pump with supplemental electric heat — supplemental 65%
 *   (C)(4) Electric space heating, fewer than 4 units — 65%
 *   (C)(5) Electric space heating, 4 or more units — 40%
 *   (C)(6) Thermal storage / continuous full-nameplate — 100%
 *
 * Each test records:
 *   - raw input VA
 *   - applicable demand percentage
 *   - calculated heating VA
 *   - calculated cooling VA
 *   - noncoincident load selected
 *   - general demand
 *   - total VA
 *   - amperes
 *   - standard service size
 *   - expected value
 *   - actual value
 *   - pass/fail
 */

import { calcDwellingOptional } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { getNecData } from "@/data/nec";

const NEC_2017 = getNecData("2017");

const BASE_INPUTS = {
  sqft: 1500,        // general lighting = 4500 VA
  otherLoads: 0,     // general total = 4500 + 3000 + 1500 + 0 = 9000 VA
  voltage: 240,
  // general demand = 9000 (≤ 10000, so 100%)
};

function runHVACTest(test) {
  const inputs = { ...BASE_INPUTS, ...test.inputs };
  const actual = calcDwellingOptional(inputs, NEC_2017);
  const pass = test.expected.totalVA === actual.totalVA &&
               test.expected.hvacLoad_VA === actual.hvacLoad_VA &&
               test.expected.minService_A === actual.minService_A;
  return {
    ...test,
    actual: {
      hvacLoad_VA: actual.hvacLoad_VA,
      coolingLoad_VA: actual.coolingLoad_VA,
      heatingLoad_VA: actual.heatingLoad_VA,
      noncoincidentSelected: actual.noncoincidentSelected,
      heatDemandFactor: actual.heatDemandFactor,
      generalDemand_VA: actual.generalDemand_VA,
      totalVA: actual.totalVA,
      totalAmps: actual.totalAmps,
      minService_A: actual.minService_A,
    },
    pass,
  };
}

/**
 * The 12 required HVAC regression tests.
 * Each test specifies raw inputs, applicable demand %, expected calculated values.
 */
export const HVAC_REGRESSION_TESTS = [
  // 1. Air conditioning greater than calculated heating
  {
    id: "hvac_01_ac_gt_heat",
    description: "Air conditioning greater than calculated heating",
    inputs: { airCond: 10000, heatStrip: 5000, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "AC 100%, Heat 65% (C)(4)",
    expected: {
      hvacLoad_VA: 10000,   // AC 10000 > heat 5000×0.65=3250 → cooling
      coolingLoad_VA: 10000,
      heatingLoad_VA: 3250,
      noncoincidentSelected: "cooling",
      generalDemand_VA: 9000,
      totalVA: 19000,
      totalAmps: 79.2,
      minService_A: 100,
    },
  },
  // 2. Calculated heating greater than air conditioning
  {
    id: "hvac_02_heat_gt_ac",
    description: "Calculated heating greater than air conditioning",
    inputs: { airCond: 1380, heatStrip: 9000, heatPump: 0, heatUnits: 5, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "AC 100%, Heat 40% (C)(5) five rooms",
    expected: {
      hvacLoad_VA: 3600,    // heat 9000×0.4=3600 > AC 1380 → heating
      coolingLoad_VA: 1380,
      heatingLoad_VA: 3600,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 12600,
      totalAmps: 52.5,
      minService_A: 100,
    },
  },
  // 3. Heat pump without supplemental heat
  {
    id: "hvac_03_heat_pump_no_supp",
    description: "Heat pump without supplemental electric heat",
    inputs: { airCond: 0, heatStrip: 0, heatPump: 8000, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "Heat pump compressor 100%",
    expected: {
      hvacLoad_VA: 8000,   // compressor at 100%
      coolingLoad_VA: 8000,
      heatingLoad_VA: 8000,
      noncoincidentSelected: "cooling",
      generalDemand_VA: 9000,
      totalVA: 17000,
      totalAmps: 70.8,
      minService_A: 100,
    },
  },
  // 4. Heat pump with supplemental electric heat (simultaneous)
  {
    id: "hvac_04_heat_pump_supp_sim",
    description: "Heat pump with supplemental electric heat (simultaneous)",
    inputs: { airCond: 0, heatStrip: 0, heatPump: 8000, heatUnits: 1, supplementalHeat: 5000, supplementalSimultaneous: true, spaceHeater: 0 },
    demandPct: "Compressor 100%, Supplemental 65%",
    expected: {
      hvacLoad_VA: 11250,  // 8000 + 5000×0.65=3250 → 11250
      coolingLoad_VA: 8000,
      heatingLoad_VA: 11250,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 20250,
      totalAmps: 84.4,
      minService_A: 100,
    },
  },
  // 5. Supplemental heat that can operate simultaneously with the compressor
  {
    id: "hvac_05_supp_simultaneous",
    description: "Supplemental heat can operate simultaneously with compressor",
    inputs: { airCond: 5000, heatStrip: 0, heatPump: 6000, heatUnits: 1, supplementalHeat: 4000, supplementalSimultaneous: true, spaceHeater: 0 },
    demandPct: "Compressor 100%, Supplemental 65%",
    expected: {
      hvacLoad_VA: 8600,   // hp system = 6000 + 4000×0.65=2600 → 8600; cooling = max(5000,6000)=6000
      coolingLoad_VA: 6000,
      heatingLoad_VA: 8600,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 17600,
      totalAmps: 73.3,
      minService_A: 100,
    },
  },
  // 6. Supplemental heat prevented from simultaneous operation
  {
    id: "hvac_06_supp_not_simultaneous",
    description: "Supplemental heat prevented from simultaneous operation",
    inputs: { airCond: 5000, heatStrip: 0, heatPump: 6000, heatUnits: 1, supplementalHeat: 4000, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "Compressor 100% as cooling; (C)(3) supplemental 65% only",
    expected: {
      hvacLoad_VA: 6000,   // (C)(3)=4000×0.65=2600; cooling = max(5000,6000)=6000
      coolingLoad_VA: 6000,
      heatingLoad_VA: 2600,
      noncoincidentSelected: "cooling",
      generalDemand_VA: 9000,
      totalVA: 15000,
      totalAmps: 62.5,
      minService_A: 100,
    },
  },
  // 7. Four or more separately controlled heating units (40%)
  {
    id: "hvac_07_four_plus_units",
    description: "Four or more separately controlled heating units (40%)",
    inputs: { airCond: 2000, heatStrip: 10000, heatPump: 0, heatUnits: 4, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "Heat 40% (C)(5) 4+ units",
    expected: {
      hvacLoad_VA: 4000,   // heat 10000×0.40=4000 > AC 2000 → heating
      coolingLoad_VA: 2000,
      heatingLoad_VA: 4000,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 13000,
      totalAmps: 54.2,
      minService_A: 100,
    },
  },
  // 8. Fewer than four separately controlled heating units (65%)
  {
    id: "hvac_08_fewer_than_four_units",
    description: "Fewer than four separately controlled heating units (65%)",
    inputs: { airCond: 2000, heatStrip: 10000, heatPump: 0, heatUnits: 3, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "Heat 65% (C)(4) <4 units",
    expected: {
      hvacLoad_VA: 6500,   // heat 10000×0.65=6500 > AC 2000 → heating
      coolingLoad_VA: 2000,
      heatingLoad_VA: 6500,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 15500,
      totalAmps: 64.6,
      minService_A: 100,
    },
  },
  // 9. Equal heating and cooling calculated loads
  {
    id: "hvac_09_equal_heat_cool",
    description: "Equal heating and cooling calculated loads",
    inputs: { airCond: 6500, heatStrip: 10000, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "AC 100%, Heat 65%",
    expected: {
      hvacLoad_VA: 6500,   // AC 6500 = heat 10000×0.65=6500 → equal, cooling wins tie-break
      coolingLoad_VA: 6500,
      heatingLoad_VA: 6500,
      noncoincidentSelected: "cooling",
      generalDemand_VA: 9000,
      totalVA: 15500,
      totalAmps: 64.6,
      minService_A: 100,
    },
  },
  // 10. Zero HVAC
  {
    id: "hvac_10_zero_hvac",
    description: "Zero HVAC",
    inputs: { airCond: 0, heatStrip: 0, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "N/A",
    expected: {
      hvacLoad_VA: 0,
      coolingLoad_VA: 0,
      heatingLoad_VA: 0,
      noncoincidentSelected: "cooling",
      generalDemand_VA: 9000,
      totalVA: 9000,
      totalAmps: 37.5,
      minService_A: 100,
    },
  },
  // 11. Invalid negative HVAC input (should clamp to 0)
  {
    id: "hvac_11_negative_input",
    description: "Invalid negative HVAC input (clamped to 0)",
    inputs: { airCond: -5000, heatStrip: -3000, heatPump: -2000, heatUnits: 1, supplementalHeat: -1000, supplementalSimultaneous: false, spaceHeater: -500 },
    demandPct: "N/A (negative → 0)",
    expected: {
      hvacLoad_VA: 0,
      coolingLoad_VA: 0,
      heatingLoad_VA: 0,
      noncoincidentSelected: "cooling",
      generalDemand_VA: 9000,
      totalVA: 9000,
      totalAmps: 37.5,
      minService_A: 100,
    },
  },
  // 12. Boundary values around every demand-factor threshold
  {
    id: "hvac_12_boundary_thresholds",
    description: "Boundary values around demand-factor thresholds (heatUnits 3 vs 4)",
    inputs: { airCond: 0, heatStrip: 10000, heatPump: 0, heatUnits: 3, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
    demandPct: "Heat 65% (C)(4) boundary: 3 units",
    expected: {
      hvacLoad_VA: 6500,   // 3 units → 65% → 10000×0.65=6500
      coolingLoad_VA: 0,
      heatingLoad_VA: 6500,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 15500,
      totalAmps: 64.6,
      minService_A: 100,
    },
    boundaryCompanion: {
      description: "Boundary: 4 units → 40%",
      inputs: { airCond: 0, heatStrip: 10000, heatPump: 0, heatUnits: 4, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0 },
      expected: {
        hvacLoad_VA: 4000,  // 4 units → 40% → 10000×0.40=4000
        coolingLoad_VA: 0,
        heatingLoad_VA: 4000,
        noncoincidentSelected: "heating",
        generalDemand_VA: 9000,
        totalVA: 13000,
        totalAmps: 54.2,
        minService_A: 100,
      },
    },
  },
  // 13. (C)(6) thermal storage at 100%
  {
    id: "hvac_13_thermal_storage_c6",
    description: "Electric thermal storage / continuous heat at 100% (C)(6)",
    inputs: { airCond: 5000, heatStrip: 0, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 12000 },
    demandPct: "Thermal storage 100% (C)(6)",
    expected: {
      hvacLoad_VA: 12000,
      coolingLoad_VA: 5000,
      heatingLoad_VA: 12000,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 21000,
      totalAmps: 87.5,
      minService_A: 100,
    },
  },
  // 14. (C)(6) vs (C)(4) — largest of, not sum
  {
    id: "hvac_14_c6_not_added_to_c4",
    description: "(C)(6) and (C)(4) are selections — take the larger, do not add",
    inputs: { airCond: 0, heatStrip: 10000, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 8000 },
    demandPct: "max(65% of 10 kW, 100% of 8 kW) = 8000",
    expected: {
      hvacLoad_VA: 8000,
      coolingLoad_VA: 0,
      heatingLoad_VA: 8000,
      noncoincidentSelected: "heating",
      generalDemand_VA: 9000,
      totalVA: 17000,
      totalAmps: 70.8,
      minService_A: 100,
    },
  },
];

/**
 * Run all HVAC regression tests and return detailed results.
 */
export function runAllHVACRegressionTests() {
  const results = [];
  for (const test of HVAC_REGRESSION_TESTS) {
    const r = runHVACTest(test);
    results.push({
      id: r.id,
      description: r.description,
      demandPct: r.demandPct,
      rawInputVA: r.inputs,
      actual: r.actual,
      expected: r.expected,
      pass: r.pass,
    });
    // Run boundary companion if present
    if (r.boundaryCompanion) {
      const bc = runHVACTest({ ...r.boundaryCompanion, id: r.id + "_boundary" });
      results.push({
        id: bc.id,
        description: bc.description,
        demandPct: bc.demandPct,
        rawInputVA: bc.inputs,
        actual: bc.actual,
        expected: bc.expected,
        pass: bc.pass,
      });
    }
  }
  return results;
}

/**
 * Get HVAC regression test summary.
 */
export function getHVACRegressionSummary() {
  const results = runAllHVACRegressionTests();
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  return {
    total: results.length,
    passed,
    failed,
    allPass: failed === 0,
    results,
  };
}