/**
 * Pure calculation logic for Conduit Fill (NEC Ch.9 Tables 1/4/5).
 */

import { withTrace } from "@/lib/calculatorTrace";

const CONDUIT_SIZE_ORDER = ["1/2","3/4","1","1-1/4","1-1/2","2","2-1/2","3","3-1/2","4"];

/**
 * @param {object} v - inputs: wires (array of {type, count}), conduitType
 * @param {object} nec - necData from getNecData(year)
 */
export function calcConduitFill(v, nec) {
  const wires = v.wires || [];
  const conduitType = v.conduitType || "EMT";

  const totalWireArea = wires.reduce((s, w) => {
    const cnt = parseFloat(w.count) || 0;
    const area = nec.WIRE_AREAS[w.type] || 0;
    return s + cnt * area;
  }, 0);

  const totalWiresCount = wires.reduce((s, w) => s + (parseFloat(w.count) || 0), 0);
  const limitKey = totalWiresCount === 1 ? 1 : totalWiresCount === 2 ? 2 : 3;
  const fillLimit = nec.FILL_LIMITS[limitKey];

  const conduitSizes = CONDUIT_SIZE_ORDER.filter(s => nec.CONDUIT_AREAS[s]);

  let recommendedSize = null;
  let recommendedArea = 0;
  for (const size of conduitSizes) {
    const condArea = nec.CONDUIT_AREAS[size][conduitType] || 0;
    if (condArea * fillLimit >= totalWireArea) {
      recommendedSize = size;
      recommendedArea = condArea;
      break;
    }
  }

  const fillPctActual = recommendedArea > 0 ? (totalWireArea / recommendedArea) * 100 : 0;

  const allSizes = conduitSizes.map(size => {
    const area = nec.CONDUIT_AREAS[size][conduitType] || 0;
    const pct = area > 0 ? (totalWireArea / area) * 100 : 999;
    return { size, area, pct: Math.round(pct * 10) / 10, fits: pct <= fillLimit * 100 };
  });

  const wireBreakdown = wires.map(w => `${parseFloat(w.count) || 0} × ${(nec.WIRE_AREAS[w.type] || 0).toFixed(4)} in²`).join(" + ");
  const steps = [
    { label: "Total Wire Area", formula: "Area = Σ(count × wire area per conductor)", expression: wireBreakdown, result: Math.round(totalWireArea * 10000) / 10000, unit: "in²" },
    { label: "Fill Limit (Ch.9 Table 1)", formula: "Fill% = Table 1 lookup by conductor count", expression: `${totalWiresCount} conductor(s) → ${fillLimit * 100}% fill`, result: `${fillLimit * 100}%` },
    { label: "Required Conduit Size", formula: "Min Area = Total Wire Area ÷ Fill Limit", expression: `${(Math.round(totalWireArea * 10000) / 10000).toFixed(4)} ÷ ${fillLimit} = min ${(totalWireArea / fillLimit).toFixed(4)} in²`, result: recommendedSize ? `${recommendedSize}" ${conduitType}` : "—", note: recommendedSize ? `Actual fill: ${Math.round(fillPctActual * 10) / 10}%` : "No suitable conduit found" },
  ];
  const result = {
    totalWireArea: Math.round(totalWireArea * 10000) / 10000,
    totalWiresCount,
    fillLimit,
    fillLimitPct: fillLimit * 100,
    recommendedSize,
    recommendedArea: Math.round(recommendedArea * 1000) / 1000,
    fillPctActual: Math.round(fillPctActual * 10) / 10,
    allSizes,
    steps,
  };
  return withTrace(result, {
    articles_used: ["Ch.9 Table 1", "Ch.9 Table 4", "Ch.9 Table 5"],
    tables_used: ["Table 1 (Percentage fill)", "Table 4 (Conduit areas)", "Table 5 (Wire areas)"],
    fields_used: ["WIRE_AREAS", "CONDUIT_AREAS", "FILL_LIMITS", "FILL_LIMIT_LABELS"],
  });
}