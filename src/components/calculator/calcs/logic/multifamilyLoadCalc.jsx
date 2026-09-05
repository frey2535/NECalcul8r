/**
 * Pure calculation logic for Multifamily Optional Method (NEC 220.84).
 */

import { withTrace } from "@/lib/calculatorTrace";

function isYes(val) {
  return val === true || val === "true";
}

export function getDemandFactor(nec, units) {
  if (units < 3) return 100;
  const table = nec.MULTIFAMILY_DEMAND_TABLE || [];
  const row = table.find((r) => units <= r.units);
  return row ? row.factor : (table[table.length - 1]?.factor ?? 23);
}

/**
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 */
export function calcMultifamilyLoad(v, nec) {
  const units = Math.max(0, parseInt(v.numUnits, 10) || 0);
  const sqft = Math.max(0, parseFloat(v.sqftPerUnit) || 0);
  const saMin = nec.SMALL_APPLIANCE_MIN_CIRCUITS ?? 2;
  const laMin = nec.LAUNDRY_MIN_CIRCUITS ?? 1;
  const commonLaundry = isYes(v.commonLaundry);
  const smallCount = Math.max(saMin, Math.max(0, parseInt(v.smallApplianceCircuits, 10) || 0) || saMin);
  const laundryCount = commonLaundry
    ? 0
    : Math.max(laMin, Math.max(0, parseInt(v.laundryCircuits, 10) || 0) || laMin);

  const lightingVA = sqft * nec.DWELLING_LIGHTING_VA_PER_SQFT;
  const smallAppVA = smallCount * nec.SMALL_APPLIANCE_VA;
  const laundryVA = laundryCount * nec.LAUNDRY_VA;
  const rangeVA = Math.max(0, parseFloat(v.rangeKW) || 0) * 1000;
  const dryerVA = Math.max(0, parseFloat(v.dryerKW) || 0) * 1000;
  const acVA = Math.max(0, parseFloat(v.acKW) || 0) * 1000;
  const heatVA = Math.max(0, parseFloat(v.heatKW) || 0) * 1000;
  const waterHtrVA = Math.max(0, parseFloat(v.waterHeaterKW) || 0) * 1000;
  const otherFixedVA = Math.max(0, parseFloat(v.otherFixedKW) || 0) * 1000;
  const hvacVA = Math.max(acVA, heatVA);

  const electricCooking = rangeVA > 0;
  const hasHVAC = hvacVA > 0;
  const meetsUnitCount = units >= 3;
  const meets220_84A = meetsUnitCount && electricCooking && hasHVAC;
  const tableApplied = meetsUnitCount;

  const perUnitVA = lightingVA + smallAppVA + laundryVA + rangeVA + dryerVA + hvacVA + waterHtrVA + otherFixedVA;
  const totalConnectedVA = perUnitVA * units;

  const demandFactor = getDemandFactor(nec, units);
  const demandedVA = tableApplied ? totalConnectedVA * (demandFactor / 100) : totalConnectedVA;

  // 220.84(B): house loads calculated per Part III, then added (this input is that result).
  const houseVA = Math.max(0, parseFloat(v.houseLighting) || 0) + Math.max(0, parseFloat(v.houseHVAC) || 0);
  const totalServiceVA = demandedVA + houseVA;

  const factor = v.phases === "three" ? 1.732 : 1;
  const voltage = parseFloat(v.voltage) || 208;
  const totalA = voltage * factor ? totalServiceVA / (voltage * factor) : 0;

  const minService = nec.STD_OCPD_SIZES.find((s) => s >= totalA) || 2000;

  const steps = [
    { label: "Per-Unit Load (220.84(C))", formula: "VA = lighting + small app + laundry + nameplate fastened + larger of A/C or heat", expression: `${Math.round(perUnitVA)} VA/unit`, result: Math.round(perUnitVA), unit: "VA" },
    { label: "Total Connected Load", formula: "VA = per-unit × number of units", expression: `${Math.round(perUnitVA)} × ${units}`, result: Math.round(totalConnectedVA), unit: "VA" },
    { label: "Demand Factor (Table 220.84)", formula: tableApplied ? "Factor = Table 220.84 lookup by unit count" : "Table 220.84 does not apply below 3 dwelling units", expression: tableApplied ? `${units} units → ${demandFactor}%` : `${units} units — 100% connected`, result: `${demandFactor}%` },
    { label: "Dwelling-Unit Demand", formula: "VA = total connected × demand factor", expression: `${Math.round(totalConnectedVA)} × ${demandFactor}%`, result: Math.round(demandedVA), unit: "VA" },
    { label: "House Load (220.84(B))", formula: "Part III calculated house load added after Table 220.84", expression: `${Math.round(houseVA)} VA`, result: Math.round(houseVA), unit: "VA" },
    { label: "Total Service Load", formula: "VA = dwelling-unit demand + house load", expression: `${Math.round(demandedVA)} + ${Math.round(houseVA)}`, result: Math.round(totalServiceVA), unit: "VA" },
    { label: "Service Amps", formula: "A = VA ÷ (V × √3)", expression: `${Math.round(totalServiceVA)} ÷ (${voltage} ${v.phases === "three" ? "× 1.732" : ""})`, result: Math.round(totalA * 10) / 10, unit: "A" },
    { label: "Minimum Service Size", formula: "Size = next standard ≥ amps", expression: `next standard ≥ ${Math.round(totalA * 10) / 10} A`, result: minService, unit: "A" },
  ];

  const result = {
    units,
    lightingVA: Math.round(lightingVA),
    smallAppVA: Math.round(smallAppVA),
    laundryVA: Math.round(laundryVA),
    smallCount,
    laundryCount,
    commonLaundry,
    perUnitVA: Math.round(perUnitVA),
    totalConnectedVA: Math.round(totalConnectedVA),
    demandFactor,
    tableApplied,
    demandedVA: Math.round(demandedVA),
    houseVA: Math.round(houseVA),
    totalServiceVA: Math.round(totalServiceVA),
    totalA: Math.round(totalA * 10) / 10,
    minService_A: minService,
    electricCooking,
    hasHVAC,
    meetsUnitCount,
    meets220_84A,
    hvacVA: Math.round(hvacVA),
    steps,
  };
  return withTrace(result, {
    articles_used: ["220.84(A)", "220.84(B)", "220.84(C)", "210.11(C)(1)", "210.11(C)(2)", "240.6(A)"],
    tables_used: ["Table 220.84", "Table 220.12"],
    fields_used: ["MULTIFAMILY_DEMAND_TABLE", "DWELLING_LIGHTING_VA_PER_SQFT", "SMALL_APPLIANCE_VA", "LAUNDRY_VA", "STD_OCPD_SIZES"],
  });
}
