/**
 * Pure calculation logic for Commercial Load (NEC 220.12 / 220.42 / 220.44 / 220.14).
 */

import { withTrace } from "@/lib/calculatorTrace";

function occupancyUnitLoad(nec, occupancy) {
  if (occupancy && nec.OCCUPANCY_UNIT_LOADS[occupancy] != null) {
    return nec.OCCUPANCY_UNIT_LOADS[occupancy];
  }
  return nec.OCCUPANCY_UNIT_LOAD_DEFAULT ?? 2.0;
}

function lightingLoadCite(nec, occupancy) {
  if (occupancy === "dwelling") return nec.DWELLING_LIGHTING_ARTICLE || "Table 220.12";
  if (occupancy === "hotel_motel" || occupancy === "hotel") return nec.HOTEL_LIGHTING_ARTICLE || nec.OCCUPANCY_UNIT_LOAD_TABLE || "Table 220.12";
  return nec.OCCUPANCY_UNIT_LOAD_TABLE || "Table 220.12";
}

/**
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 */
export function calcCommercialLoad(v, nec) {
  const sqft = Math.max(0, parseFloat(v.sqft) || 0);
  const occupancy = v.occupancy || "office";
  const unitLoad = occupancyUnitLoad(nec, occupancy);
  const lightingVA = sqft * unitLoad;
  const lightingArticle = lightingLoadCite(nec, occupancy);

  const lightingDemandCfg = nec.LIGHTING_DEMAND?.[occupancy] || { tiers: [{ band: Infinity, factor: 1.00 }] };
  // Table 220.42 footnote: demand factors shall not apply to hospitals/hotels/motels
  // where the entire lighting is likely to be used at one time.
  const skipLightingDemand =
    v.lightingUsedAtOneTime === true || v.lightingUsedAtOneTime === "true";
  let lightingDemand = 0;
  if (skipLightingDemand) {
    lightingDemand = lightingVA;
  } else {
    let remaining = lightingVA;
    for (const tier of lightingDemandCfg.tiers) {
      const band = Math.min(remaining, tier.band);
      lightingDemand += band * tier.factor;
      remaining -= band;
      if (remaining <= 0) break;
    }
  }

  const yokeVA = parseFloat(v.receptacleVA) || nec.RECEPTACLE_YOKE_VA || 180;
  const receptacleTotal = Math.max(0, parseFloat(v.receptacles) || 0) * yokeVA;
  let receptacleDemand = 0;
  let recRemaining = receptacleTotal;
  for (const tier of nec.RECEPTACLE_DEMAND_TIERS) {
    const band = Math.min(recRemaining, tier.band);
    receptacleDemand += band * tier.factor;
    recRemaining -= band;
    if (recRemaining <= 0) break;
  }

  // 220.14(K): office buildings (and banks) — receptacle load not less than 1 VA/ft²
  const officeMinApplies = occupancy === "office" || occupancy === "bank";
  const recMinVA = officeMinApplies ? sqft * (nec.OFFICE_RECEPTACLE_MIN_VA_PER_SQFT ?? 1) : 0;
  if (recMinVA > receptacleDemand) receptacleDemand = recMinVA;

  const showFt = Math.max(0, parseFloat(v.showWindow) || 0);
  const showPerFt = parseFloat(v.showWindowVA) || nec.SHOW_WINDOW_VA_PER_FOOT || 200;
  const showWindowVA = showFt * showPerFt;
  const signMin = nec.SIGN_OUTLET_MIN_VA ?? 1200;
  const signInput = Math.max(0, parseFloat(v.outsideSign) || 0);
  const signVA = signInput > 0 ? Math.max(signInput, signMin) : 0;
  const appliancesVA = Math.max(0, parseFloat(v.majorAppliances) || 0);
  const hvacVA = Math.max(0, parseFloat(v.hvac) || 0);

  const totalVA = lightingDemand + receptacleDemand + showWindowVA + signVA + appliancesVA + hvacVA;
  const voltage = parseFloat(v.voltage) || 208;
  const factor = v.phases === "three" ? (voltage * 1.732) : voltage;
  const totalAmps = factor ? totalVA / factor : 0;

  const steps = [
    { label: `Lighting Load (${lightingArticle})`, formula: "VA = sqft × unit load (VA/ft²)", expression: `${sqft} ft² × ${unitLoad} VA/ft²`, result: Math.round(lightingVA), unit: "VA", note: `${occupancy} occupancy` },
    { label: "Lighting Demand (Table 220.42)", formula: skipLightingDemand ? "Table 220.42 footnote — demand not applied (lighting likely used at one time)" : "Demand = tiered factors by occupancy; All Others 100%", expression: skipLightingDemand ? `${Math.round(lightingVA)} @ 100%` : "Tiered demand factors", result: Math.round(lightingDemand), unit: "VA" },
    { label: "Receptacle Load (220.14(I))", formula: "VA = yokes × 180 VA", expression: `${Math.max(0, parseFloat(v.receptacles) || 0)} × ${yokeVA} VA`, result: Math.round(receptacleTotal), unit: "VA" },
    { label: "Receptacle Demand (220.44)", formula: "First 10,000 @ 100% + remainder @ 50%" + (officeMinApplies ? "; not less than 1 VA/ft² (220.14(K))" : ""), expression: officeMinApplies && recMinVA > receptacleDemand ? `max(220.44, ${sqft} × 1)` : "First 10,000 @ 100% + remainder @ 50%", result: Math.round(receptacleDemand), unit: "VA" },
    { label: "Show Window (220.14(G))", formula: "VA = linear feet × 200 VA/ft", expression: `${showFt} ft × ${showPerFt}`, result: Math.round(showWindowVA), unit: "VA" },
    { label: "Signs (220.14(F))", formula: `Not less than ${signMin} VA per installation if a sign load is entered`, expression: signInput > 0 ? `max(${signInput}, ${signMin})` : "0", result: Math.round(signVA), unit: "VA" },
    { label: "Total Calculated Load", formula: "Total = lighting demand + receptacle demand + window + sign + appliances + HVAC", expression: `${Math.round(lightingDemand)} + ${Math.round(receptacleDemand)} + ${Math.round(showWindowVA)} + ${Math.round(signVA)} + ${Math.round(appliancesVA)} + ${Math.round(hvacVA)}`, result: Math.round(totalVA), unit: "VA" },
    { label: "Service Size", formula: "Amps = Total VA ÷ (V × √3) [3φ] or VA ÷ V [1φ]", expression: `${Math.round(totalVA)} ÷ (${voltage}${v.phases === "three" ? " × 1.732" : ""})`, result: Math.round(totalAmps * 10) / 10, unit: "A" },
  ];
  const result = {
    lightingVA: Math.round(lightingVA),
    lightingDemand: Math.round(lightingDemand),
    lightingArticle,
    unitLoad,
    receptacleTotal: Math.round(receptacleTotal),
    receptacleDemand: Math.round(receptacleDemand),
    showWindowVA: Math.round(showWindowVA),
    signVA: Math.round(signVA),
    appliancesVA: Math.round(appliancesVA),
    hvacVA: Math.round(hvacVA),
    totalVA: Math.round(totalVA),
    totalAmps: Math.round(totalAmps * 10) / 10,
    lightingDemandSkipped: skipLightingDemand,
    GFCI_scope_other: nec.GFCI_SCOPE_OTHER_THAN_DWELLING || null,
    steps,
  };
  return withTrace(result, {
    articles_used: ["220.12", "220.14(F)", "220.14(G)", "220.14(I)", "220.14(K)", "220.40", "220.42", "220.44", "210.8(B)"],
    tables_used: ["Table 220.12", "Table 220.42", "Table 220.44"],
    fields_used: ["OCCUPANCY_UNIT_LOADS", "OCCUPANCY_UNIT_LOAD_DEFAULT", "LIGHTING_DEMAND", "RECEPTACLE_DEMAND_TIERS", "OFFICE_RECEPTACLE_MIN_VA_PER_SQFT", "SHOW_WINDOW_VA_PER_FOOT", "SIGN_OUTLET_MIN_VA", "RECEPTACLE_YOKE_VA"],
  });
}
