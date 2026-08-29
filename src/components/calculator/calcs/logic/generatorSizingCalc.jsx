/**
 * Pure calculation logic for Generator Sizing (NEC 702 / 445).
 */

const GEN_SIZES = [7.5, 10, 15, 20, 25, 30, 45, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];

/**
 * @param {object} v - inputs: mode, serviceA, serviceV, servicePhases, demandFactor, pf, criticalLoadsVA, motorLoadsVA, lightingVA, otherVA
 * @param {object} nec - necData from getNecData(year)
 */
export function calcGeneratorSizing(v, nec) {
  const pf = parseFloat(v.pf) || 0.8;
  const mode = v.mode || "service";

  // Service-based
  const serviceA = parseFloat(v.serviceA) || 200;
  const serviceV = parseFloat(v.serviceV) || 240;
  const serviceFactor = v.servicePhases === "three" ? 1.732 : 1;
  const demandPct = parseFloat(v.demandFactor) || 80;
  const serviceTotalVA = serviceA * serviceV * serviceFactor;
  const demandVA = serviceTotalVA * (demandPct / 100);
  const demandKVA = demandVA / 1000;
  const demandKW = demandKVA * pf;
  const serviceKW_withStarting = demandKW * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const serviceGenSize = GEN_SIZES.find(s => s >= serviceKW_withStarting) || GEN_SIZES[GEN_SIZES.length - 1];

  // Load-based
  const critical = parseFloat(v.criticalLoadsVA) || 0;
  const motor = parseFloat(v.motorLoadsVA) || 0;
  const lighting = parseFloat(v.lightingVA) || 0;
  const other = parseFloat(v.otherVA) || 0;
  const motorStarting = motor * 6;
  const totalRunningVA = critical + motor + lighting + other;
  const totalWithStarting = critical + motorStarting + lighting + other;
  const requiredKVA = totalWithStarting / 1000;
  const requiredKW = requiredKVA * pf;
  const loadGenSize = GEN_SIZES.find(s => s >= requiredKW) || GEN_SIZES[GEN_SIZES.length - 1];

  const steps = mode === "service" ? [
    { label: "Service Total VA", formula: "VA = service A × V × √3", expression: `${serviceA} × ${serviceV} × ${serviceFactor}`, result: Math.round(serviceTotalVA), unit: "VA" },
    { label: "Demand VA", expression: `${Math.round(serviceTotalVA)} × ${demandPct}%`, result: Math.round(demandVA), unit: "VA" },
    { label: "Demand kW", formula: "kW = kVA × PF", expression: `${Math.round(demandKVA * 10) / 10} × ${pf} (PF)`, result: Math.round(demandKW * 10) / 10, unit: "kW" },
    { label: "With Motor Starting", formula: "kW = demand kW × 125%", expression: `${Math.round(demandKW * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: Math.round(serviceKW_withStarting * 10) / 10, unit: "kW", note: "125% for motor starting" },
    { label: "Generator Size", formula: "Size = next standard ≥ kW", expression: `next standard ≥ ${Math.round(serviceKW_withStarting * 10) / 10} kW`, result: serviceGenSize, unit: "kW" },
  ] : [
    { label: "Total Running VA", formula: "VA = critical + motor + lighting + other", expression: `${critical} + ${motor} + ${lighting} + ${other}`, result: Math.round(totalRunningVA), unit: "VA" },
    { label: "With Motor Starting", formula: "VA = critical + motor × 6 + lighting + other", expression: `${critical} + ${motor} × 6 + ${lighting} + ${other}`, result: Math.round(totalWithStarting), unit: "VA", note: "6× motor LRC for starting" },
    { label: "Required kW", formula: "kW = VA × PF ÷ 1000", expression: `${Math.round(totalWithStarting / 1000 * 10) / 10} × ${pf}`, result: Math.round(requiredKW * 10) / 10, unit: "kW" },
    { label: "Generator Size", formula: "Size = next standard ≥ kW", expression: `next standard ≥ ${Math.round(requiredKW * 10) / 10} kW`, result: loadGenSize, unit: "kW" },
  ];
  return {
    // Service-based
    serviceTotalVA: Math.round(serviceTotalVA),
    demandKVA: Math.round(demandKVA * 10) / 10,
    demandKW: Math.round(demandKW * 10) / 10,
    serviceKW_withStarting: Math.round(serviceKW_withStarting * 10) / 10,
    serviceGenSize,
    // Load-based
    totalRunningVA: Math.round(totalRunningVA),
    totalWithStarting: Math.round(totalWithStarting),
    requiredKW: Math.round(requiredKW * 10) / 10,
    loadGenSize,
    // Active
    recommendedGenSize: mode === "service" ? serviceGenSize : loadGenSize,
    dwelling_generator_shutdown_article: nec.DWELLING_GENERATOR_SHUTDOWN_ARTICLE || null,
    dwelling_generator_shutdown_note: nec.DWELLING_GENERATOR_SHUTDOWN_NOTE || null,
    steps,
  };
}