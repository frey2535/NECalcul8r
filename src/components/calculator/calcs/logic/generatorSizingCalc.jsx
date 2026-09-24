/**
 * Pure calculation logic for Generator Sizing (NEC 702 / 445).
 *
 * Supports:
 * - service: back-calculate from service size
 * - loads / load: essential/managed load list (legacy + commercial-friendly)
 * - whole_house: residential/commercial appliance inventory with optional load shedding
 */

const GEN_SIZES = [7.5, 10, 15, 20, 25, 30, 45, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];

function num(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function truthy(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function nextGenSize(kw) {
  return GEN_SIZES.find((size) => size >= kw) || GEN_SIZES[GEN_SIZES.length - 1];
}

function applianceRows(v, occupancy) {
  const residential = [
    { key: "lightingVA", label: "Lighting", va: num(v.lightingVA), motor: false, shedKey: null },
    { key: "smallApplianceVA", label: "Small-appliance circuits", va: num(v.smallApplianceVA), motor: false, shedKey: null },
    { key: "laundryVA", label: "Laundry circuit", va: num(v.laundryVA), motor: false, shedKey: null },
    { key: "refrigeratorVA", label: "Refrigerator", va: num(v.refrigeratorVA), motor: true, shedKey: null },
    { key: "rangeVA", label: "Range / stove", va: num(v.rangeVA), motor: false, shedKey: "shedRange" },
    { key: "cooktopVA", label: "Cooktop", va: num(v.cooktopVA), motor: false, shedKey: "shedCooktop" },
    { key: "ovenVA", label: "Wall oven", va: num(v.ovenVA), motor: false, shedKey: "shedOven" },
    { key: "dryerVA", label: "Clothes dryer", va: num(v.dryerVA), motor: true, shedKey: "shedDryer" },
    { key: "waterHeaterVA", label: "Water heater", va: num(v.waterHeaterVA), motor: false, shedKey: "shedWaterHeater" },
    { key: "dishwasherVA", label: "Dishwasher", va: num(v.dishwasherVA), motor: true, shedKey: "shedDishwasher" },
    { key: "hvacCoolingVA", label: "HVAC cooling / A/C", va: num(v.hvacCoolingVA), motor: true, shedKey: "shedHvacCooling" },
    { key: "hvacHeatingVA", label: "HVAC heating / heat strips", va: num(v.hvacHeatingVA), motor: true, shedKey: "shedHvacHeating" },
    { key: "wellPumpVA", label: "Well / sump pump", va: num(v.wellPumpVA), motor: true, shedKey: null },
    { key: "otherEssentialVA", label: "Other essential loads", va: num(v.otherEssentialVA), motor: false, shedKey: null },
    { key: "otherOptionalVA", label: "Other optional loads", va: num(v.otherOptionalVA), motor: false, shedKey: "shedOtherOptional" },
  ];

  const commercial = [
    { key: "lightingVA", label: "Lighting", va: num(v.lightingVA), motor: false, shedKey: null },
    { key: "receptacleVA", label: "Receptacle / general", va: num(v.receptacleVA), motor: false, shedKey: "shedOtherOptional" },
    { key: "hvacCoolingVA", label: "HVAC cooling", va: num(v.hvacCoolingVA), motor: true, shedKey: "shedHvacCooling" },
    { key: "hvacHeatingVA", label: "HVAC heating", va: num(v.hvacHeatingVA), motor: true, shedKey: "shedHvacHeating" },
    { key: "motorLoadsVA", label: "Motors / process", va: num(v.motorLoadsVA), motor: true, shedKey: null },
    { key: "elevatorVA", label: "Elevator / lift", va: num(v.elevatorVA), motor: true, shedKey: "shedOtherOptional" },
    { key: "criticalLoadsVA", label: "Critical / life-safety", va: num(v.criticalLoadsVA), motor: false, shedKey: null },
    { key: "otherEssentialVA", label: "Other essential", va: num(v.otherEssentialVA), motor: false, shedKey: null },
    { key: "otherOptionalVA", label: "Discretionary / shedable", va: num(v.otherOptionalVA), motor: false, shedKey: "shedOtherOptional" },
  ];

  return occupancy === "commercial" ? commercial : residential;
}

/**
 * @param {object} v
 * @param {object} nec
 */
export function calcGeneratorSizing(v, nec) {
  const pf = num(v.pf, 0.8) || 0.8;
  const occupancy = v.occupancy === "commercial" ? "commercial" : "residential";
  const rawMode = v.mode || "service";
  const mode = rawMode === "load" ? "loads" : rawMode;
  const loadSheddingEnabled = truthy(v.loadSheddingEnabled);
  const continuousMult = nec?.CONTINUOUS_LOAD_MULTIPLIER || 1.25;

  // Service-based
  const serviceA = num(v.serviceA, 200);
  const serviceV = num(v.serviceV, 240);
  const serviceFactor = v.servicePhases === "three" ? 1.732 : 1;
  const demandPct = num(v.demandFactor, 80);
  const serviceTotalVA = serviceA * serviceV * serviceFactor;
  const demandVA = serviceTotalVA * (demandPct / 100);
  const demandKVA = demandVA / 1000;
  const demandKW = demandKVA * pf;
  const serviceKW_withStarting = demandKW * continuousMult;
  const serviceGenSize = nextGenSize(serviceKW_withStarting);

  // Legacy essential-load path (mode loads/load)
  const critical = num(v.criticalLoadsVA);
  const motor = num(v.motorLoadsVA);
  const lighting = num(v.lightingVA);
  const other = num(v.otherVA);
  const motorStarting = motor * 6;
  const totalRunningVA = critical + motor + lighting + other;
  const totalWithStarting = critical + motorStarting + lighting + other;
  const requiredKVA = totalWithStarting / 1000;
  const requiredKW = requiredKVA * pf;
  const loadGenSize = nextGenSize(requiredKW);

  // Whole-house / detailed inventory
  const rows = applianceRows(v, occupancy).map((row) => {
    const shed = loadSheddingEnabled && row.shedKey ? truthy(v[row.shedKey]) : false;
    return {
      ...row,
      shed,
      includedVA: shed ? 0 : row.va,
    };
  });
  const connectedRows = rows.filter((row) => row.includedVA > 0);
  const shedRows = rows.filter((row) => row.shed && row.va > 0);
  const wholeHouseRunningVA = connectedRows.reduce((sum, row) => sum + row.includedVA, 0);
  const motorCandidates = connectedRows.filter((row) => row.motor && row.includedVA > 0);
  const largestMotorVA = motorCandidates.reduce((max, row) => Math.max(max, row.includedVA), 0);
  // Running VA already includes the largest motor at 1×; add 5× more so peak uses 6× LRC.
  const wholeHouseWithStartingVA = wholeHouseRunningVA + largestMotorVA * 5;
  const wholeHouseKW = (wholeHouseWithStartingVA / 1000) * pf;
  const wholeHouseGenSize = nextGenSize(wholeHouseKW);
  const shedVA = shedRows.reduce((sum, row) => sum + row.va, 0);

  let steps;
  let recommendedGenSize;
  if (mode === "service") {
    recommendedGenSize = serviceGenSize;
    steps = [
      { label: "Service Total VA", formula: "VA = service A × V × √3", expression: `${serviceA} × ${serviceV} × ${serviceFactor}`, result: Math.round(serviceTotalVA), unit: "VA" },
      { label: "Demand VA", expression: `${Math.round(serviceTotalVA)} × ${demandPct}%`, result: Math.round(demandVA), unit: "VA" },
      { label: "Demand kW", formula: "kW = kVA × PF", expression: `${Math.round(demandKVA * 10) / 10} × ${pf} (PF)`, result: Math.round(demandKW * 10) / 10, unit: "kW" },
      { label: "With Motor Starting", formula: "kW = demand kW × 125%", expression: `${Math.round(demandKW * 10) / 10} × ${continuousMult}`, result: Math.round(serviceKW_withStarting * 10) / 10, unit: "kW", note: "125% for motor starting / continuous" },
      { label: "Generator Size", formula: "Size = next standard ≥ kW", expression: `next standard ≥ ${Math.round(serviceKW_withStarting * 10) / 10} kW`, result: serviceGenSize, unit: "kW" },
    ];
  } else if (mode === "whole_house") {
    recommendedGenSize = wholeHouseGenSize;
    steps = [
      { label: "Connected running VA", formula: "Sum of loads kept on generator", expression: connectedRows.filter((r) => r.includedVA).map((r) => `${r.label} ${r.includedVA}`).join(" + ") || "0", result: Math.round(wholeHouseRunningVA), unit: "VA" },
      ...(loadSheddingEnabled ? [{ label: "Load-shed VA (off generator)", formula: "Managed loads shed by controller", expression: shedRows.map((r) => `${r.label} ${r.va}`).join(" + ") || "0", result: Math.round(shedVA), unit: "VA", note: "Excluded from standby generator sizing" }] : []),
      { label: "With largest-motor starting", formula: "Running VA + largest motor × 5 (to reach 6×)", expression: `${Math.round(wholeHouseRunningVA)} + ${Math.round(largestMotorVA)} × 5`, result: Math.round(wholeHouseWithStartingVA), unit: "VA", note: largestMotorVA ? "Largest connected motor at 6× LRC" : "No motor loads entered" },
      { label: "Required kW", formula: "kW = VA × PF ÷ 1000", expression: `${Math.round(wholeHouseWithStartingVA / 1000 * 10) / 10} × ${pf}`, result: Math.round(wholeHouseKW * 10) / 10, unit: "kW" },
      { label: "Generator Size", formula: "Size = next standard ≥ kW", expression: `next standard ≥ ${Math.round(wholeHouseKW * 10) / 10} kW`, result: wholeHouseGenSize, unit: "kW" },
    ];
  } else {
    recommendedGenSize = loadGenSize;
    steps = [
      { label: "Total Running VA", formula: "VA = critical + motor + lighting + other", expression: `${critical} + ${motor} + ${lighting} + ${other}`, result: Math.round(totalRunningVA), unit: "VA" },
      { label: "With Motor Starting", formula: "VA = critical + motor × 6 + lighting + other", expression: `${critical} + ${motor} × 6 + ${lighting} + ${other}`, result: Math.round(totalWithStarting), unit: "VA", note: "6× motor LRC for starting" },
      { label: "Required kW", formula: "kW = VA × PF ÷ 1000", expression: `${Math.round(totalWithStarting / 1000 * 10) / 10} × ${pf}`, result: Math.round(requiredKW * 10) / 10, unit: "kW" },
      { label: "Generator Size", formula: "Size = next standard ≥ kW", expression: `next standard ≥ ${Math.round(requiredKW * 10) / 10} kW`, result: loadGenSize, unit: "kW" },
    ];
  }

  return {
    occupancy,
    mode,
    loadSheddingEnabled,
    // Service-based
    serviceTotalVA: Math.round(serviceTotalVA),
    demandKVA: Math.round(demandKVA * 10) / 10,
    demandKW: Math.round(demandKW * 10) / 10,
    serviceKW_withStarting: Math.round(serviceKW_withStarting * 10) / 10,
    serviceGenSize,
    // Load-based (legacy)
    totalRunningVA: Math.round(totalRunningVA),
    totalWithStarting: Math.round(totalWithStarting),
    requiredKW: Math.round(requiredKW * 10) / 10,
    loadGenSize,
    // Whole-house
    applianceRows: rows,
    connectedRunningVA: Math.round(wholeHouseRunningVA),
    shedVA: Math.round(shedVA),
    largestMotorVA: Math.round(largestMotorVA),
    wholeHouseWithStartingVA: Math.round(wholeHouseWithStartingVA),
    wholeHouseKW: Math.round(wholeHouseKW * 10) / 10,
    wholeHouseGenSize,
    // Active
    recommendedGenSize,
    dwelling_generator_shutdown_article: occupancy === "residential" ? (nec.DWELLING_GENERATOR_SHUTDOWN_ARTICLE || null) : null,
    dwelling_generator_shutdown_note: occupancy === "residential" ? (nec.DWELLING_GENERATOR_SHUTDOWN_NOTE || null) : null,
    steps,
  };
}
