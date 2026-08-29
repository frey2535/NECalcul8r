/**
 * Pure calculation logic for Lighting Load (NEC 220.12 / 220.42).
 */

/**
 * @param {object} v - inputs: occupancy, sqft, voltage, phases, actualFixtureW
 * @param {object} nec - necData from getNecData(year)
 */
function lightingLoadCite(nec, occupancyKey) {
  if (occupancyKey === "dwelling") return nec.DWELLING_LIGHTING_ARTICLE || "Table 220.12";
  if (occupancyKey === "hotel_motel") return nec.HOTEL_LIGHTING_ARTICLE || nec.OCCUPANCY_UNIT_LOAD_TABLE || "Table 220.12";
  return nec.OCCUPANCY_UNIT_LOAD_TABLE || "Table 220.12";
}

export function calcLightingLoad(v, nec) {
  const occupancyKey = v.occupancy === "hotel" ? "hotel_motel" : v.occupancy;
  const occVA = (occupancyKey && nec.OCCUPANCY_UNIT_LOADS[occupancyKey] != null)
    ? nec.OCCUPANCY_UNIT_LOADS[occupancyKey]
    : (nec.OCCUPANCY_UNIT_LOAD_DEFAULT ?? 2.0);
  const sqft = Math.max(0, parseFloat(v.sqft) || 0);
  const nec_VA = sqft * occVA;
  const actualW = parseFloat(v.actualFixtureW) || 0;

  const voltage = parseFloat(v.voltage) || 277;
  const factor = v.phases === "three" ? 1.732 : 1;
  const totalAmps = nec_VA / (voltage * factor);
  const actualAmps = actualW > 0 ? actualW / (voltage * factor) : totalAmps;

  const circuitCapacity = voltage * 20;
  const numCircuits = nec_VA > 0 ? Math.ceil(nec_VA / circuitCapacity) : 0;

  const demandKey = occupancyKey;
  const demandCfg = nec.LIGHTING_DEMAND[demandKey]
    || (demandKey === "dwelling" ? { tiers: nec.DWELLING_DEMAND_TABLE } : null);
  let demand = nec_VA;
  if (demandCfg?.tiers) {
    demand = 0;
    let remaining = nec_VA;
    for (const tier of demandCfg.tiers) {
      const band = Math.min(remaining, tier.band);
      demand += band * tier.factor;
      remaining -= band;
      if (remaining <= 0) break;
    }
  }

  const lightingArticle = lightingLoadCite(nec, occupancyKey);
  const demandNote = demandCfg?.tiers
    ? `Table 220.42 ${demandKey} tiers applied`
    : `${Math.round(nec_VA)} @ 100% (occupancy not listed in Table 220.42)`;

  const steps = [
    { label: `NEC Lighting Load (${lightingArticle})`, formula: "VA = sqft × unit load (VA/ft²)", expression: `${sqft} ft² × ${occVA} VA/ft²`, result: Math.round(nec_VA), unit: "VA", note: `${v.occupancy} occupancy` },
    { label: "Demand-Adjusted Load (Table 220.42)", formula: "Demand = tiered demand factors by occupancy", expression: demandNote, result: Math.round(demand), unit: "VA" },
    { label: "Total Amps", formula: "A = VA ÷ (V × √3)", expression: `${Math.round(nec_VA)} ÷ (${voltage} ${v.phases === "three" ? "× 1.732" : ""})`, result: Math.round(totalAmps * 10) / 10, unit: "A" },
    { label: "Circuits Needed", formula: "Circuits = ceil(VA ÷ 20A circuit capacity)", expression: `ceil(${Math.round(nec_VA)} ÷ ${circuitCapacity} VA per 20A circuit)`, result: numCircuits },
  ];
  return {
    occVA,
    lightingArticle,
    nec_VA: Math.round(nec_VA),
    demand: Math.round(demand),
    totalAmps: Math.round(totalAmps * 10) / 10,
    actualAmps: Math.round(actualAmps * 10) / 10,
    numCircuits,
    steps,
  };
}