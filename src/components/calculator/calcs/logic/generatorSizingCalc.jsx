/**
 * Generator sizing calculation logic.
 *
 * Whole-house residential mode separates:
 * 1) NEC dwelling load calculation (Article 220 in 2017/2020/2023; Article 120 in 2026)
 * 2) Optional-standby capacity / load management (Article 702)
 * 3) Motor-starting check, which is manufacturer/model specific
 *
 * Important: service ampacity alone is NOT an NEC generator-sizing method.
 */

const GENERIC_GEN_SIZES = [7.5, 10, 14, 15, 18, 20, 22, 24, 26, 28, 30, 32, 36, 38, 40, 45, 48, 50, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];

function num(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function truthy(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function nextGenSize(kw) {
  return GENERIC_GEN_SIZES.find((size) => size >= kw) || GENERIC_GEN_SIZES[GENERIC_GEN_SIZES.length - 1];
}

function generatorRules(nec) {
  const rules = nec?.GENERATOR_SIZING_RULES;
  if (!rules) throw new Error("Generator sizing rules are missing for the selected NEC year.");
  return rules;
}

function applyDemandTiers(connectedVA, tiers) {
  let remaining = Math.max(0, connectedVA);
  let total = 0;
  for (const tier of tiers || []) {
    if (remaining <= 0) break;
    const band = Number.isFinite(tier.bandVA) ? tier.bandVA : remaining;
    const used = Math.min(remaining, band);
    total += used * num(tier.factor, 1);
    remaining -= used;
  }
  return total;
}

function dwellingGeneralConnectedVA(v, nec) {
  const sqft = Math.max(0, num(v.squareFeet));
  const kitchenCircuits = Math.max(0, num(v.kitchenCircuits, 2));
  const laundryCircuits = Math.max(0, num(v.laundryCircuits, 1));
  const rules = generatorRules(nec).dwellingGeneral;
  return sqft * num(rules.vaPerSqFt) +
    kitchenCircuits * num(rules.smallApplianceVA, 1500) +
    laundryCircuits * num(rules.laundryVA, 1500);
}

function dwellingGeneralDemandVA(v, nec) {
  const connected = dwellingGeneralConnectedVA(v, nec);
  return applyDemandTiers(connected, generatorRules(nec).dwellingGeneral.demandTiers);
}

function singleCookingApplianceDemandVA(va, nec) {
  const kw = Math.max(0, num(va)) / 1000;
  if (kw <= 0) return 0;
  if (kw <= 1.75) return kw * 1000;
  if (kw <= 8.75) return kw * 0.8 * 1000;
  const cookingRules = generatorRules(nec).cooking;
  if (kw <= 12) return num(cookingRules.singleRangeUpTo12kWDemandKW, 8) * 1000;
  if (kw <= 27) {
    // Table 220.55 Note 1: increase Column C demand 5% for each kW
    // or major fraction thereof over 12 kW.
    const increments = Math.ceil(kw - 12);
    return num(cookingRules.singleRangeUpTo12kWDemandKW, 8) * 1000 *
      (1 + increments * num(cookingRules.note1IncreasePerKW, 0.05));
  }
  // Outside the common single-household-range range handled by this calculator.
  // Use connected nameplate rather than silently understating the load.
  return kw * 1000;
}

function cookingDemandVA(v, isShed, nec) {
  const range = isShed("shedRange") ? 0 : num(v.rangeVA);
  const cooktop = isShed("shedCooktop") ? 0 : num(v.cooktopVA);
  const oven = isShed("shedOven") ? 0 : num(v.ovenVA);
  const loads = [range, cooktop, oven].filter((x) => x > 0);
  if (!loads.length) return 0;

  if (truthy(v.combineCookingEquipment)) {
    return singleCookingApplianceDemandVA(loads.reduce((a, b) => a + b, 0), nec);
  }

  // Separate devices are each calculated independently. This is conservative for
  // a single dwelling and avoids applying Note 4 when its conditions are not met.
  return loads.reduce((sum, va) => sum + singleCookingApplianceDemandVA(va, nec), 0);
}

function fixedApplianceSummary(v, isShed, nec) {
  // 220.53 applies the 75% demand only to four or more appliances
  // fastened in place. A refrigerator is NOT assumed to qualify merely
  // because a VA value was entered; the user must explicitly identify it
  // as fastened/built-in.
  const refrigeratorQualifies = truthy(v.refrigeratorFastenedInPlace);
  const entries = [
    { va: refrigeratorQualifies ? num(v.refrigeratorVA) : 0, count: refrigeratorQualifies && num(v.refrigeratorVA) > 0 ? 1 : 0 },
    { va: isShed("shedWaterHeater") ? 0 : num(v.waterHeaterVA), count: !isShed("shedWaterHeater") && num(v.waterHeaterVA) > 0 ? 1 : 0 },
    { va: isShed("shedDishwasher") ? 0 : num(v.dishwasherVA), count: !isShed("shedDishwasher") && num(v.dishwasherVA) > 0 ? 1 : 0 },
    { va: num(v.wellPumpVA), count: num(v.wellPumpVA) > 0 ? 1 : 0 },
    { va: num(v.otherFixedApplianceVA), count: Math.max(0, Math.floor(num(v.otherFixedApplianceCount))) },
  ];
  const qualifyingConnectedVA = entries.reduce((s, x) => s + x.va, 0);
  const count = entries.reduce((s, x) => s + x.count, 0);
  const nonQualifyingRefrigeratorVA = refrigeratorQualifies ? 0 : num(v.refrigeratorVA);
  const fixedRules = generatorRules(nec).fixedAppliances;
  const qualifyingDemandVA =
    count >= num(fixedRules.minimumCountForDemandFactor, 4)
      ? qualifyingConnectedVA * num(fixedRules.demandFactor, 0.75)
      : qualifyingConnectedVA;
  const demandVA = qualifyingDemandVA + nonQualifyingRefrigeratorVA;
  return { connectedVA: qualifyingConnectedVA + nonQualifyingRefrigeratorVA, qualifyingConnectedVA, count, demandVA, refrigeratorQualifies };
}

function residentialStandardDemand(v, loadSheddingEnabled, nec) {
  const isShed = (key) => loadSheddingEnabled && truthy(v[key]);

  const rules = generatorRules(nec);
  const generalConnectedVA = dwellingGeneralConnectedVA(v, nec);
  const generalDemandVA = dwellingGeneralDemandVA(v, nec);
  const fixed = fixedApplianceSummary(v, isShed, nec);
  const dryerMinimumVA = num(rules.dryer.singleDryerMinimumVA, 5000);
  const dryerVA = isShed("shedDryer") ? 0 : (num(v.dryerVA) > 0 ? Math.max(dryerMinimumVA, num(v.dryerVA)) : 0);
  const cookingVA = cookingDemandVA(v, isShed, nec);

  // Cooling input is the sum of all outdoor condensers that can run
  // simultaneously. Indoor blower/air-handler load is entered separately
  // because it operates WITH the condensers during cooling; it must not be
  // hidden inside a noncoincident heating value.
  const coolingOutdoorVA = isShed("shedHvacCooling") ? 0 : num(v.hvacCoolingVA);
  const coolingBlowerVA = isShed("shedHvacCooling") ? 0 : num(v.hvacBlowerVA);
  const coolingVA = coolingOutdoorVA + coolingBlowerVA;
  const heatingVA = isShed("shedHvacHeating") ? 0 : num(v.hvacHeatingVA);
  const hvacMode = v.hvacCoincidence || "noncoincident";
  const hvacDemandVA = hvacMode === "simultaneous" ? coolingVA + heatingVA : Math.max(coolingVA, heatingVA);

  const otherEssentialVA = num(v.otherEssentialVA);
  const otherOptionalVA = isShed("shedOtherOptional") ? 0 : num(v.otherOptionalVA);

  // Never infer one "motor" from aggregate HVAC. Multiple condensers are
  // separate motors. If no individual largest-motor value is supplied, use
  // other identifiable individual motors only and require explicit HVAC
  // largest-motor entry for an accurate 25% adder.
  const inferredLargestMotorRunningVA = Math.max(
    0,
    num(v.wellPumpVA),
    num(v.refrigeratorVA),
    isShed("shedDishwasher") ? 0 : num(v.dishwasherVA)
  );
  const largestMotorRunningVA = Math.max(0, num(v.largestMotorRunningVA, inferredLargestMotorRunningVA)) || inferredLargestMotorRunningVA;
  const largestMotorAdderVA = largestMotorRunningVA * num(rules.motor.largestMotorAdderFactor, 0.25);

  const necDemandVA =
    generalDemandVA +
    fixed.demandVA +
    dryerVA +
    cookingVA +
    hvacDemandVA +
    otherEssentialVA +
    otherOptionalVA +
    largestMotorAdderVA;

  return {
    generalConnectedVA,
    generalDemandVA,
    fixedConnectedVA: fixed.connectedVA,
    fixedCount: fixed.count,
    fixedDemandVA: fixed.demandVA,
    dryerDemandVA: dryerVA,
    cookingDemandVA: cookingVA,
    coolingOutdoorVA,
    coolingBlowerVA,
    coolingVA,
    heatingVA,
    hvacDemandVA,
    otherEssentialVA,
    otherOptionalVA,
    largestMotorRunningVA,
    largestMotorAdderVA,
    necDemandVA,
  };
}

function applianceRows(v, occupancy, nec) {
  if (occupancy !== "residential") {
    return [
      { key: "lightingVA", label: "Lighting", va: num(v.lightingVA), motor: false, shedKey: null },
      { key: "receptacleVA", label: "Receptacle / general", va: num(v.receptacleVA), motor: false, shedKey: "shedOtherOptional" },
      { key: "hvacCoolingVA", label: "HVAC cooling", va: num(v.hvacCoolingVA), motor: true, shedKey: "shedHvacCooling" },
      { key: "hvacHeatingVA", label: "HVAC heating", va: num(v.hvacHeatingVA), motor: false, shedKey: "shedHvacHeating" },
      { key: "motorLoadsVA", label: "Motors / process", va: num(v.motorLoadsVA), motor: true, shedKey: null },
      { key: "elevatorVA", label: "Elevator / lift", va: num(v.elevatorVA), motor: true, shedKey: "shedOtherOptional" },
      { key: "criticalLoadsVA", label: "Critical / life-safety", va: num(v.criticalLoadsVA), motor: false, shedKey: null },
      { key: "otherEssentialVA", label: "Other essential", va: num(v.otherEssentialVA), motor: false, shedKey: null },
      { key: "otherOptionalVA", label: "Discretionary / shedable", va: num(v.otherOptionalVA), motor: false, shedKey: "shedOtherOptional" },
    ];
  }

  return [
    { key: "general", label: "General lighting/receptacles", va: Math.max(0, num(v.squareFeet)) * num(generatorRules(nec).dwellingGeneral.vaPerSqFt), motor: false, shedKey: null },
    { key: "smallAppliance", label: "Small-appliance circuits", va: Math.max(0, num(v.kitchenCircuits, 2)) * num(generatorRules(nec).dwellingGeneral.smallApplianceVA, 1500), motor: false, shedKey: null },
    { key: "laundry", label: "Laundry circuits", va: Math.max(0, num(v.laundryCircuits, 1)) * num(generatorRules(nec).dwellingGeneral.laundryVA, 1500), motor: false, shedKey: null },
    { key: "refrigeratorVA", label: "Refrigerator", va: num(v.refrigeratorVA), motor: true, shedKey: null },
    { key: "rangeVA", label: "Range / stove", va: num(v.rangeVA), motor: false, shedKey: "shedRange" },
    { key: "cooktopVA", label: "Cooktop", va: num(v.cooktopVA), motor: false, shedKey: "shedCooktop" },
    { key: "ovenVA", label: "Wall oven", va: num(v.ovenVA), motor: false, shedKey: "shedOven" },
    { key: "dryerVA", label: "Clothes dryer", va: num(v.dryerVA), motor: false, shedKey: "shedDryer" },
    { key: "waterHeaterVA", label: "Water heater", va: num(v.waterHeaterVA), motor: false, shedKey: "shedWaterHeater" },
    { key: "dishwasherVA", label: "Dishwasher", va: num(v.dishwasherVA), motor: true, shedKey: "shedDishwasher" },
    { key: "hvacCoolingVA", label: "HVAC outdoor condensers", va: num(v.hvacCoolingVA), motor: false, shedKey: "shedHvacCooling" },
    { key: "hvacBlowerVA", label: "HVAC indoor blowers / air handlers", va: num(v.hvacBlowerVA), motor: false, shedKey: "shedHvacCooling" },
    { key: "hvacHeatingVA", label: "HVAC heating / heat strips", va: num(v.hvacHeatingVA), motor: false, shedKey: "shedHvacHeating" },
    { key: "wellPumpVA", label: "Well / sump pump", va: num(v.wellPumpVA), motor: true, shedKey: null },
    { key: "otherFixedApplianceVA", label: "Other fixed appliances", va: num(v.otherFixedApplianceVA), motor: false, shedKey: null },
    { key: "otherEssentialVA", label: "Other essential loads", va: num(v.otherEssentialVA), motor: false, shedKey: null },
    { key: "otherOptionalVA", label: "Other optional loads", va: num(v.otherOptionalVA), motor: false, shedKey: "shedOtherOptional" },
  ];
}

export function calcGeneratorSizing(v, nec) {
  const occupancy = v.occupancy === "commercial" ? "commercial" : "residential";
  const rawMode = v.mode || "whole_house";
  const mode = rawMode === "load" ? "loads" : rawMode;
  const loadSheddingEnabled = truthy(v.loadSheddingEnabled);

  // SERVICE-CAPACITY REFERENCE ONLY.
  // Service ampacity does not establish the NEC optional-standby generator load.
  const serviceA = Math.max(0, num(v.serviceA, 200));
  const serviceV = Math.max(0, num(v.serviceV, 240));
  const serviceFactor = v.servicePhases === "three" ? Math.sqrt(3) : 1;
  const serviceTotalVA = serviceA * serviceV * serviceFactor;
  const demandPct = Math.min(100, Math.max(0, num(v.demandFactor, 80)));
  const serviceEstimateVA = serviceTotalVA * demandPct / 100;
  const serviceEstimateKW = serviceEstimateVA / 1000;
  const serviceGenSize = nextGenSize(serviceEstimateKW);

  // SELECTED-LOAD ESTIMATE.
  const critical = Math.max(0, num(v.criticalLoadsVA));
  const motor = Math.max(0, num(v.motorLoadsVA));
  const lighting = Math.max(0, num(v.lightingVA));
  const other = Math.max(0, num(v.otherVA));
  const totalRunningVA = critical + motor + lighting + other;
  const selectedLargestMotorRunningVA = Math.max(0, num(v.largestMotorRunningVA, motor)) || motor;
  const selectedMotorAdderVA = selectedLargestMotorRunningVA * num(generatorRules(nec).motor.largestMotorAdderFactor, 0.25);
  const selectedNecEquivalentVA = totalRunningVA + selectedMotorAdderVA;
  const loadGenSize = nextGenSize(selectedNecEquivalentVA / 1000);

  // WHOLE-HOUSE / DETAILED INVENTORY.
  const rows = applianceRows(v, occupancy, nec).map((row) => {
    const shed = loadSheddingEnabled && row.shedKey ? truthy(v[row.shedKey]) : false;
    return { ...row, shed, includedVA: shed ? 0 : row.va };
  });
  const connectedRows = rows.filter((row) => row.includedVA > 0);
  const shedRows = rows.filter((row) => row.shed && row.va > 0);
  const connectedNameplateVA = connectedRows.reduce((sum, row) => sum + row.includedVA, 0);
  const shedVA = shedRows.reduce((sum, row) => sum + row.va, 0);

  const residential = occupancy === "residential" ? residentialStandardDemand(v, loadSheddingEnabled, nec) : null;
  const necDemandVA = residential ? residential.necDemandVA : connectedNameplateVA;
  const necRequiredKW = necDemandVA / 1000;

  // Motor starting is not an Article 220 demand-factor calculation.
  // Keep it separate and compare against manufacturer/model starting capability.
  const motorStartVoltage = Math.max(1, num(v.motorStartVoltage, serviceV || 240));
  const actualLRA = Math.max(0, num(v.largestMotorLRA));
  const startingKVA = actualLRA > 0 ? (actualLRA * motorStartVoltage) / 1000 : 0;
  const motorStartEquivalentKW = startingKVA > 0 ? Math.ceil(startingKVA) : 0;

  // Generic model suggestion only. Final model must pass manufacturer starting/derating data.
  const suggestedMinimumKW = Math.max(necRequiredKW, motorStartEquivalentKW);
  const wholeHouseGenSize = nextGenSize(suggestedMinimumKW);

  const steps = mode === "whole_house"
    ? [
        { label: "General connected load", formula: `floor area × ${generatorRules(nec).dwellingGeneral.vaPerSqFt} VA/ft² + small-appliance + laundry`, result: Math.round(residential?.generalConnectedVA || 0), unit: "VA", note: `${generatorRules(nec).dwellingGeneral.unitLoadArticle}; ${generatorRules(nec).dwellingGeneral.smallApplianceArticle}; ${generatorRules(nec).dwellingGeneral.laundryArticle}` },
        { label: "General demand", formula: "Apply selected-year dwelling demand tiers", result: Math.round(residential?.generalDemandVA || 0), unit: "VA", note: generatorRules(nec).dwellingGeneral.demandTableArticle },
        { label: "Fixed-appliance demand", formula: residential?.fixedCount >= generatorRules(nec).fixedAppliances.minimumCountForDemandFactor ? `${generatorRules(nec).fixedAppliances.demandFactor * 100}% of qualifying fixed appliances` : `100% (fewer than ${generatorRules(nec).fixedAppliances.minimumCountForDemandFactor} qualifying appliances)`, result: Math.round(residential?.fixedDemandVA || 0), unit: "VA", note: generatorRules(nec).fixedAppliances.article },
        { label: "Dryer demand", formula: `${generatorRules(nec).dryer.singleDryerMinimumVA.toLocaleString()} VA minimum or nameplate, whichever is larger`, result: Math.round(residential?.dryerDemandVA || 0), unit: "VA", note: generatorRules(nec).dryer.article },
        { label: "Cooking demand", formula: generatorRules(nec).cooking.tableArticle, result: Math.round(residential?.cookingDemandVA || 0), unit: "VA", note: generatorRules(nec).cooking.article },
        { label: "Heating / cooling demand", formula: (v.hvacCoincidence || "noncoincident") === "simultaneous" ? "outdoor cooling + cooling blowers + heating loads that can operate simultaneously" : "larger of (outdoor cooling + cooling blowers) or heating", result: Math.round(residential?.hvacDemandVA || 0), unit: "VA", note: generatorRules(nec).noncoincident.article },
        { label: "Largest motor adder", formula: `${generatorRules(nec).motor.largestMotorAdderFactor * 100}% of largest motor running load`, result: Math.round(residential?.largestMotorAdderVA || 0), unit: "VA", note: generatorRules(nec).motor.article },
        { label: "NEC calculated standby load", formula: `sum of applicable ${generatorRules(nec).loadCalculationArticle} demand components`, result: Math.round(necDemandVA), unit: "VA", note: generatorRules(nec).standby.article },
        ...(actualLRA > 0 ? [{ label: "Motor-starting check", formula: "LRA × motor voltage", expression: `${actualLRA} A × ${motorStartVoltage} V`, result: Math.round(startingKVA * 10) / 10, unit: "kVA", note: "Manufacturer/model transient capability must be verified separately." }] : []),
        { label: "Generic nominal size", formula: "next common nominal kW ≥ NEC calculated load; LRA is a separate transient check", result: wholeHouseGenSize, unit: "kW", note: "Final model must be verified against manufacturer fuel-specific continuous rating and motor-starting/transient data." },
      ]
    : mode === "service"
      ? [
          { label: "Service capacity", formula: v.servicePhases === "three" ? "A × V × √3" : "A × V", result: Math.round(serviceTotalVA), unit: "VA" },
          { label: "User-entered utilization estimate", expression: `${demandPct}% of service capacity`, result: Math.round(serviceEstimateVA), unit: "VA", note: "Reference estimate only; service ampacity is not an NEC generator load calculation." },
        ]
      : [
          { label: "Selected running loads", formula: "critical + motor + lighting + other", result: Math.round(totalRunningVA), unit: "VA" },
          { label: "Largest motor adder", formula: "25% of largest motor running load", result: Math.round(selectedMotorAdderVA), unit: "VA" },
          { label: "Selected-load sizing basis", result: Math.round(selectedNecEquivalentVA), unit: "VA" },
        ];

  const recommendedGenSize = mode === "whole_house"
    ? wholeHouseGenSize
    : mode === "loads"
      ? loadGenSize
      : null;

  return {
    occupancy,
    mode,
    loadSheddingEnabled,

    // Service reference
    serviceTotalVA: Math.round(serviceTotalVA),
    demandKVA: Math.round((serviceEstimateVA / 1000) * 10) / 10,
    demandKW: Math.round(serviceEstimateKW * 10) / 10,
    serviceKW_withStarting: null,
    serviceGenSize,
    serviceSizingValid: false,

    // Selected loads
    totalRunningVA: Math.round(totalRunningVA),
    totalWithStarting: null,
    requiredKW: Math.round((selectedNecEquivalentVA / 1000) * 10) / 10,
    loadGenSize,

    // Whole house
    applianceRows: rows,
    connectedRunningVA: Math.round(connectedNameplateVA),
    connectedNameplateVA: Math.round(connectedNameplateVA),
    shedVA: Math.round(shedVA),
    necDemandVA: Math.round(necDemandVA),
    necRequiredKW: Math.round(necRequiredKW * 10) / 10,
    generalConnectedVA: Math.round(residential?.generalConnectedVA || 0),
    generalDemandVA: Math.round(residential?.generalDemandVA || 0),
    fixedApplianceConnectedVA: Math.round(residential?.fixedConnectedVA || 0),
    fixedApplianceCount: residential?.fixedCount || 0,
    fixedApplianceDemandVA: Math.round(residential?.fixedDemandVA || 0),
    dryerDemandVA: Math.round(residential?.dryerDemandVA || 0),
    cookingDemandVA: Math.round(residential?.cookingDemandVA || 0),
    hvacDemandVA: Math.round(residential?.hvacDemandVA || 0),
    largestMotorVA: Math.round(
      mode === "whole_house" && residential
        ? (residential.largestMotorRunningVA || 0)
        : (selectedLargestMotorRunningVA || 0)
    ),
    largestMotorAdderVA: Math.round(
      mode === "whole_house" && residential
        ? (residential.largestMotorAdderVA || 0)
        : selectedMotorAdderVA
    ),
    motorStartingVA: Math.round(startingKVA * 1000),
    motorStartingKVA: Math.round(startingKVA * 10) / 10,
    motorStartEquivalentKW,
    wholeHouseWithStartingVA: Math.round(Math.max(necDemandVA, startingKVA * 1000)),
    wholeHouseKW: Math.round(suggestedMinimumKW * 10) / 10,
    wholeHouseGenSize,

    // Active
    recommendedGenSize,
    dwelling_generator_shutdown_article: occupancy === "residential" ? (nec?.DWELLING_GENERATOR_SHUTDOWN_ARTICLE || null) : null,
    dwelling_generator_shutdown_note: occupancy === "residential" ? (nec?.DWELLING_GENERATOR_SHUTDOWN_NOTE || null) : null,
    steps,
  };
}
