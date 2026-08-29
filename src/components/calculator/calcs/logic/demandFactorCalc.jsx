/**
 * Pure calculation logic for Demand Factor (NEC 220.42 / 220.44 / 220.53 / 220.61).
 */

function applyTier(tiers, total) {
  let result = 0;
  let remaining = total;
  for (const tier of tiers) {
    const band = Math.min(remaining, tier.band);
    result += band * tier.factor;
    remaining -= band;
    if (remaining <= 0) break;
  }
  return result;
}

/**
 * @param {object} v - inputs: loadType, totalVA
 * @param {object} nec - necData from getNecData(year)
 */
export function calcDemandFactor(v, nec) {
  const total = parseFloat(v.totalVA) || 0;
  let demand = 0;
  let explanation = "";

  if (v.loadType === "lighting_dwelling") {
    demand = applyTier(nec.DWELLING_DEMAND_TABLE, total);
    explanation = "NEC 220.42: 100% first 3 kVA, 35% next 117 kVA, 25% remainder";
  } else if (v.loadType === "lighting_hotel") {
    const hotelTiers = nec.LIGHTING_DEMAND.hotel_motel?.tiers || nec.LIGHTING_DEMAND.hotel?.tiers;
    demand = applyTier(hotelTiers, total);
    explanation = "NEC Table 220.42 hotels/motels: 50% first 20 kVA, 40% next 80 kVA, 30% remainder";
  } else if (v.loadType === "lighting_warehouse") {
    demand = applyTier(nec.LIGHTING_DEMAND.warehouse.tiers, total);
    explanation = "NEC 220.42: 100% first 12.5 kVA, 50% remainder";
  } else if (v.loadType === "receptacle_commercial") {
    demand = applyTier(nec.RECEPTACLE_DEMAND_TIERS, total);
    explanation = "NEC 220.44: 100% first 10 kVA, 50% remainder";
  } else if (v.loadType === "dryer_dwelling") {
    demand = Math.max(5000, total);
    explanation = "NEC 220.54: 1 dryer = 100% (min 5000W)";
  } else if (v.loadType === "fixed_appliance") {
    demand = total * nec.FIXED_APPLIANCE_DEMAND_FACTOR;
    explanation = `NEC 220.53: 4+ fixed appliances = ${(nec.FIXED_APPLIANCE_DEMAND_FACTOR * 100).toFixed(0)}% demand`;
  } else if (v.loadType === "neutral_conductor") {
    const factor = nec.NEUTRAL_DEMAND_TIER1_FACTOR;
    // 220.61(B)(1): 70% of household range/dryer unbalanced load (VA-based utility).
    // 220.61(B)(2) is 100% of first 200 A + 70% of remainder — use Neutral Load calc.
    demand = total * factor;
    explanation = "NEC 220.61(B)(1): 70% of household range/dryer unbalanced load. For 220.61(B)(2) (100% of first 200 A, 70% of remainder), use the Neutral Load calculator.";
  }

  const savingsVA = total - demand;
  const savingsPct = total > 0 ? (savingsVA / total) * 100 : 0;

  const steps = [
    { label: "Total Connected Load", formula: "VA = input value", expression: `${Math.round(total)} VA`, result: Math.round(total), unit: "VA" },
    { label: "Demand-Adjusted Load", formula: "Demand = tiered demand factors by load type", expression: explanation, result: Math.round(demand), unit: "VA" },
    { label: "Savings", formula: "Savings = Total − Demand", expression: `${Math.round(total)} − ${Math.round(demand)}`, result: Math.round(savingsVA), unit: "VA", note: `${Math.round(savingsPct * 10) / 10}% reduction` },
  ];
  return {
    totalVA: Math.round(total),
    demandVA: Math.round(demand),
    savingsVA: Math.round(savingsVA),
    savingsPct: Math.round(savingsPct * 10) / 10,
    explanation,
    steps,
  };
}