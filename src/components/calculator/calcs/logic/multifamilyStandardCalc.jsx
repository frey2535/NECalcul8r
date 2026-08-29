/**
 * Pure calculation logic for Multifamily Standard Method (NEC 220.40).
 *
 * Standard Method steps:
 *   1. General lighting = total sqft × 3 VA/ft²
 *   2. Small appliance = units × circuits × 1500 VA
 *   3. Laundry = units × circuits × 1500 VA
 *   4. Total general load → Table 220.42 demand (3000 @ 100% + 117k @ 35% + rest @ 25%)
 *   5. Range demand → Table 220.55 Column C (with Note 1 adjustment for >12 kW)
 *   6. Dryer demand → Table 220.54
 *   7. Water/space heating at 100%
 *   8. Net load = general demand + range + dryer + heating
 *   9. Service = net load ÷ (V × √3 for 3φ, V for 1φ)
 */

import { withTrace } from "@/lib/calculatorTrace";

export function calcMultifamilyStandard(v, nec) {
  const units = Math.max(3, parseInt(v.numUnits) || 3);
  const sqft = parseFloat(v.sqftPerUnit) || 1000;
  const smallAppCircuits = parseInt(v.smallApplianceCircuits) || 2;
  const laundryCircuits = parseInt(v.laundryCircuits) || 1;
  const rangeKW = parseFloat(v.rangeKW) || 0;
  const dryerKW = parseFloat(v.dryerKW) || 0;
  const heatingVA = parseFloat(v.heatingVA) || 0;
  const voltage = parseFloat(v.voltage) || 240;
  const phases = v.phases || "single";

  // 1. General lighting
  const totalSqft = units * sqft;
  const lightingVA = totalSqft * nec.DWELLING_LIGHTING_VA_PER_SQFT;

  // 2. Small appliance
  const smallAppVA = units * smallAppCircuits * nec.SMALL_APPLIANCE_VA;

  // 3. Laundry
  const laundryVA = units * laundryCircuits * nec.LAUNDRY_VA;

  // 4. Total general load
  const totalGeneralVA = lightingVA + smallAppVA + laundryVA;

  // 5. Apply Table 220.42 demand
  let generalDemand = 0;
  let remaining = totalGeneralVA;
  for (const tier of nec.DWELLING_DEMAND_TABLE) {
    const bandSize = Math.min(remaining, tier.band);
    generalDemand += bandSize * tier.factor;
    remaining -= bandSize;
    if (remaining <= 0) break;
  }

  // 6. Range demand (Table 220.55 Column C)
  const numRanges = rangeKW > 0 ? units : 0;
  let rangeDemandVA = 0;
  if (numRanges > 0) {
    const row = nec.RANGE_DEMAND.find(r => numRanges <= r.count);
    if (row) {
      let baseDemandKW;
      if (row.max_12kW != null) {
        baseDemandKW = row.max_12kW;
      } else if (row.colCFormula) {
        // 26-40 ranges: 15 + 1*count; 41+: 25 + 0.75*count
        if (row.colCFormula.includes("15 + 1")) {
          baseDemandKW = 15 + 1 * numRanges;
        } else {
          baseDemandKW = 25 + 0.75 * numRanges;
        }
      }
      // Note 1: for ranges > 12 kW, increase by 5% per kW over 12
      if (rangeKW > 12) {
        const kwOver12 = Math.ceil(rangeKW - 12);
        baseDemandKW = baseDemandKW * (1 + 0.05 * kwOver12);
      }
      rangeDemandVA = baseDemandKW * 1000;
    }
  }

  // 7. Dryer demand (Table 220.54)
  const numDryers = dryerKW > 0 ? units : 0;
  let dryerDemandVA = 0;
  if (numDryers > 0) {
    const perDryerVA = Math.max(5000, dryerKW * 1000);
    const totalDryerVA = numDryers * perDryerVA;
    const factor = typeof nec.getDryerDemandFactor === "function"
      ? nec.getDryerDemandFactor(numDryers)
      : (nec.DRYER_DEMAND.find(r => numDryers <= r.count)?.factor ?? 0.25);
    dryerDemandVA = totalDryerVA * factor;
  }

  // 8. Net calculated load
  const netLoadVA = generalDemand + rangeDemandVA + dryerDemandVA + heatingVA;

  // 9. Service amps
  const phaseFactor = phases === "three" ? 1.732 : 1;
  const totalA = netLoadVA / (voltage * phaseFactor);

  // 10. Min service
  const minService = nec.STD_OCPD_SIZES.find(s => s >= totalA) || 2000;

  const steps = [
    { label: "General Lighting (Table 220.12)", formula: "VA = total sqft × 3 VA/ft²", expression: `${totalSqft} ft² × ${nec.DWELLING_LIGHTING_VA_PER_SQFT}`, result: Math.round(lightingVA), unit: "VA" },
    { label: "Small Appliance (220.52(A))", formula: "VA = units × circuits × 1500", expression: `${units} × ${smallAppCircuits} × ${nec.SMALL_APPLIANCE_VA}`, result: Math.round(smallAppVA), unit: "VA" },
    { label: "Laundry (220.52(B))", formula: "VA = units × circuits × 1500", expression: `${units} × ${laundryCircuits} × ${nec.LAUNDRY_VA}`, result: Math.round(laundryVA), unit: "VA" },
    { label: "Total General Load", formula: "VA = lighting + small app + laundry", expression: `${Math.round(lightingVA)} + ${Math.round(smallAppVA)} + ${Math.round(laundryVA)}`, result: Math.round(totalGeneralVA), unit: "VA" },
    { label: "General Demand (Table 220.42)", formula: "3000 @ 100% + 117,000 @ 35% + remainder @ 25%", expression: `Demand of ${Math.round(totalGeneralVA)}`, result: Math.round(generalDemand), unit: "VA" },
    { label: "Range Demand (Table 220.55)", formula: `Column C for ${numRanges} ranges${rangeKW > 12 ? ` + 5% × ${Math.ceil(rangeKW - 12)} kW over 12` : ""}`, expression: `${numRanges} × ${rangeKW} kW`, result: Math.round(rangeDemandVA), unit: "VA" },
    { label: "Dryer Demand (Table 220.54)", formula: `Demand factor × total dryer VA`, expression: `${numDryers} × ${dryerKW} kW`, result: Math.round(dryerDemandVA), unit: "VA" },
    { label: "Water/Space Heating (100%)", formula: "VA at nameplate (no demand)", expression: `${heatingVA}`, result: Math.round(heatingVA), unit: "VA" },
    { label: "Net Calculated Load", formula: "VA = general demand + range + dryer + heating", expression: `${Math.round(generalDemand)} + ${Math.round(rangeDemandVA)} + ${Math.round(dryerDemandVA)} + ${Math.round(heatingVA)}`, result: Math.round(netLoadVA), unit: "VA" },
    { label: "Service Size", formula: "Amps = Net VA ÷ (V × √3)", expression: `${Math.round(netLoadVA)} ÷ (${voltage}${phases === "three" ? " × 1.732" : ""})`, result: Math.round(totalA * 10) / 10, unit: "A", note: `→ min ${minService} A` },
  ];

  const result = {
    lightingVA: Math.round(lightingVA),
    smallAppVA: Math.round(smallAppVA),
    laundryVA: Math.round(laundryVA),
    totalGeneralVA: Math.round(totalGeneralVA),
    generalDemandVA: Math.round(generalDemand),
    rangeDemandVA: Math.round(rangeDemandVA),
    dryerDemandVA: Math.round(dryerDemandVA),
    heatingVA: Math.round(heatingVA),
    netLoadVA: Math.round(netLoadVA),
    totalA: Math.round(totalA * 10) / 10,
    minService_A: minService,
    steps,
  };

  return withTrace(result, {
    articles_used: ["220.12", "220.40", "220.42", "220.52(A)", "220.52(B)", "220.54", "220.55", "240.6(A)"],
    tables_used: ["Table 220.12", "Table 220.42", "Table 220.54", "Table 220.55", "Table 240.6(A)"],
    fields_used: ["DWELLING_LIGHTING_VA_PER_SQFT", "SMALL_APPLIANCE_VA", "LAUNDRY_VA", "DWELLING_DEMAND_TABLE", "RANGE_DEMAND", "DRYER_DEMAND", "STD_OCPD_SIZES"],
  });
}