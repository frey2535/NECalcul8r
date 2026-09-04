/**
 * Pure calculation logic for Dwelling Standard (NEC 220.40) and Dwelling Optional (NEC 220.82).
 * Shared by the live calculator UI and the /admin/coverage year-switch parity test.
 */

import { withTrace } from "@/lib/calculatorTrace";

function dwellingYearArticles(nec, base) {
  const articles = [...base];
  if (nec.DISHWASHER_GFCI_REQUIRED) articles.push("210.8(D)");
  if (nec.GFCI_OUTDOOR_DWELLING_50A) articles.push("210.8(F)");
  if (nec.DWELLING_SPD_REQUIRED) articles.push("230.67");
  if (nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED) articles.push("230.85");
  return articles;
}

function lightingDemandTiers(nec) {
  return nec.LIGHTING_DEMAND?.dwelling?.tiers || nec.DWELLING_DEMAND_TABLE;
}

/** Table 220.55 Note 1: kW or major fraction (0.5 kW) over 12 kW. */
function rangeKwOver12(nameplateVA, nec) {
  const over = Math.max(0, nameplateVA - 12000);
  if (over <= 0) return 0;
  return Math.round(over / 1000);
}

function rangeRow(nec, count) {
  const table = nec.RANGE_DEMAND;
  return table.find((r) => r.count >= count) || table[table.length - 1];
}

function rowPct(nec, count, col) {
  const row = rangeRow(nec, count);
  return col === "A" ? row.pct : row.colB;
}

/** Table 220.55 Column C demand in VA for `count` household ranges ≤12 kW. */
function rangeColumnC_VA(nec, count) {
  const row = rangeRow(nec, count);
  if (row.max_12kW != null) return row.max_12kW * 1000;
  if (row.colCFormula === "15 + 1 * count") return (15 + count) * 1000;
  if (row.colCFormula === "25 + 0.75 * count") return (25 + 0.75 * count) * 1000;
  return 8000;
}

/**
 * NEC 220.40 Standard Method
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 * @returns {object} calculation outputs
 */
export function calcDwellingStandard(v, nec) {
  const sqft = Math.max(0, parseFloat(v.sqft) || 0);
  const saMin = nec.SMALL_APPLIANCE_MIN_CIRCUITS ?? 2;
  const laMin = nec.LAUNDRY_MIN_CIRCUITS ?? 1;
  const smallCount = Math.max(saMin, Math.max(0, parseFloat(v.smallAppliance) || 0) || saMin);
  const laundryCount = Math.max(laMin, Math.max(0, parseFloat(v.laundry) || 0) || laMin);

  const genLighting = sqft * nec.DWELLING_LIGHTING_VA_PER_SQFT;
  const smallApplVA = smallCount * nec.SMALL_APPLIANCE_VA;
  const laundryVA = laundryCount * nec.LAUNDRY_VA;
  // 210.11(C)(3) bathroom circuits are included in general lighting/receptacle
  // load per 220.14(J). Do not add extra 1500 VA (220.52 is small-appliance + laundry only).
  const bathroomCount = Math.max(0, parseFloat(v.bathroom) || 0);
  const subtotal = genLighting + smallApplVA + laundryVA;

  let lightingDemand = 0;
  let remaining = subtotal;
  for (const tier of lightingDemandTiers(nec)) {
    const bandSize = Math.min(remaining, tier.band);
    lightingDemand += bandSize * tier.factor;
    remaining -= bandSize;
    if (remaining <= 0) break;
  }

  const rangeW = Math.max(0, parseFloat(v.range) || 0);
  const rangeCount = Math.max(1, parseInt(v.rangeCount) || 1);
  let rangeDemand = 0;
  let rangeColumn = null;
  if (rangeW > 0) {
    const table = nec.RANGE_DEMAND;
    const row = table.find((r) => r.count >= rangeCount) || table[table.length - 1];
    const kWOver12 = rangeKwOver12(rangeW, nec);
    if (rangeW < 3500) {
      rangeColumn = "A";
      rangeDemand = rangeW * rangeCount * (row.pct / 100);
    } else if (rangeW <= 8750) {
      rangeColumn = "B";
      rangeDemand = rangeW * rangeCount * (row.colB / 100);
    } else {
      rangeColumn = "C";
      const colC = rangeColumnC_VA(nec, rangeCount);
      rangeDemand = kWOver12 > 0 ? colC * (1 + 0.05 * kWOver12) : colC;
    }
  }

  const dryerW = Math.max(0, parseFloat(v.dryer) || 0);
  const dryerDemand = dryerW > 0 ? Math.max(5000, dryerW) : 0;

  const dishwasherVA = Math.max(0, parseFloat(v.dishwasher) || 0);
  const disposerVA = Math.max(0, parseFloat(v.disposer) || 0);
  const waterHeaterVA = Math.max(0, parseFloat(v.waterHeater) || 0);
  const hvacVA = Math.max(0, parseFloat(v.hvac) || 0);
  const otherVA = Math.max(0, parseFloat(v.other) || 0);
  // 220.53: 75% permitted for four or more fastened-in-place appliances other
  // than ranges, dryers, space-heating, or air-conditioning equipment.
  const qualifyingAppliances = [
    dishwasherVA, disposerVA, waterHeaterVA, otherVA,
  ].filter((va) => va > 0);
  const apply220_53 = qualifyingAppliances.length >= 4;
  const qualifyingDemand = apply220_53
    ? qualifyingAppliances.reduce((s, va) => s + va, 0) * (nec.FIXED_APPLIANCE_DEMAND_FACTOR || 0.75)
    : qualifyingAppliances.reduce((s, va) => s + va, 0);
  const fixedLoads = qualifyingDemand + hvacVA;

  const totalVA = lightingDemand + rangeDemand + dryerDemand + fixedLoads;
  const voltage = parseFloat(v.voltage) || 240;
  const totalAmps = totalVA / voltage;

  const minServiceFromLoad = nec.STD_OCPD_SIZES.find(s => s >= totalAmps) || 400;
  const minService = Math.max(minServiceFromLoad, nec.DWELLING_MIN_SERVICE_AMPS || 100);
  const rangeDemandArticle = nec.RANGE_DEMAND_ARTICLE || "Table 220.55";

  const steps = [
    { label: "General Lighting Load (Table 220.12)", formula: "VA = sqft × 3 VA/ft² (exclude unused cellar, unfinished attic, open porches)", expression: `${sqft} ft² × ${nec.DWELLING_LIGHTING_VA_PER_SQFT} VA/ft²`, result: Math.round(genLighting), unit: "VA" },
    { label: "Small Appliance + Laundry (220.52)", formula: `VA = (max(${saMin}, circuits) × 1500) + (max(${laMin}, laundry) × 1500)`, expression: `${smallCount} × ${nec.SMALL_APPLIANCE_VA} + ${laundryCount} × ${nec.LAUNDRY_VA}`, result: Math.round(smallApplVA + laundryVA), unit: "VA", note: bathroomCount > 0 ? "Bathroom circuits are included in general lighting (220.14(J)); 1500 VA is not added" : "210.11(C)(1) min 2 small-appliance; 210.11(C)(2) min 1 laundry" },
    { label: "Lighting Demand (Table 220.42)", formula: "Demand = first 3,000 @ 100% + next 117,000 @ 35% + remainder @ 25%", expression: `First 3,000 @ 100% + remainder @ 35%`, result: Math.round(lightingDemand), unit: "VA", note: `Subtotal: ${Math.round(subtotal)} VA` },
    { label: `Range Demand (${rangeDemandArticle})`, formula: rangeColumn === "C" && rangeKwOver12(rangeW, nec) > 0 ? "Column C × (1 + 5% per kW or major fraction over 12 kW) Note 1" : rangeCount > 1 ? `Multiple ranges (${rangeCount}) — ${rangeDemandArticle} Column ${rangeColumn || "C"}` : "Col A: <3½ kW 80% | Col B: 3½–8¾ kW 80% (1 range) | Col C: 8 kW (8¾–12 kW) | Note 1: +5%/kW over 12", expression: rangeW > 0 ? (rangeColumn === "A" || rangeColumn === "B" ? `${rangeCount} × ${rangeW} × ${(rangeColumn === "A" ? rowPct(nec, rangeCount, "A") : rowPct(nec, rangeCount, "B"))}%` : `${Math.round(rangeColumnC_VA(nec, rangeCount))} × (1 + 0.05 × ${rangeKwOver12(rangeW, nec)})`) : "0", result: Math.round(rangeDemand), unit: "VA", note: rangeColumn ? `Column ${rangeColumn}${rangeKwOver12(rangeW, nec) > 0 ? " + Note 1" : ""}` : undefined },
    { label: "Dryer Demand (Table 220.54)", formula: "Demand = max(5,000, nameplate) for one household dryer", expression: dryerW > 0 ? `max(5,000, ${dryerW})` : "0", result: Math.round(dryerDemand), unit: "VA" },
    { label: apply220_53 ? "Fixed Appliances (220.53 at 75%)" : "Fixed Appliances (nameplate)", formula: apply220_53 ? "Demand = (dishwasher + disposer + WH + other) × 75%; HVAC at 100% (220.60 largest heating/cooling)" : "Demand = nameplate (220.53 75% applies only with 4+ fastened appliances, excluding range/dryer/HVAC)", expression: `${Math.round(qualifyingDemand)} + HVAC ${Math.round(hvacVA)}`, result: Math.round(fixedLoads), unit: "VA" },
    { label: "Total Calculated Load", formula: "Total = lighting demand + range + dryer + fixed loads", expression: `${Math.round(lightingDemand)} + ${Math.round(rangeDemand)} + ${Math.round(dryerDemand)} + ${Math.round(fixedLoads)}`, result: Math.round(totalVA), unit: "VA" },
    { label: "Service Size", formula: "Amps = Total VA ÷ V", expression: `${Math.round(totalVA)} ÷ ${voltage}`, result: Math.round(totalAmps * 10) / 10, unit: "A", note: `→ min ${minService} A (230.42(B))` },
  ];
  const result = {
    genLighting_VA: Math.round(genLighting),
    smallAppl_VA: Math.round(smallApplVA),
    laundry_VA: Math.round(laundryVA),
    subtotal_VA: Math.round(subtotal),
    lightingDemand_VA: Math.round(lightingDemand),
    rangeDemand_VA: Math.round(rangeDemand),
    rangeDemandArticle,
    rangeColumn,
    dryerDemand_VA: Math.round(dryerDemand),
    fixedLoads_VA: Math.round(fixedLoads),
    fixedApplianceDemandApplied: apply220_53,
    bathroomExcludedFromLoad: bathroomCount > 0,
    smallApplCircuits: smallCount,
    laundryCircuits: laundryCount,
    totalVA: Math.round(totalVA),
    totalAmps: Math.round(totalAmps * 10) / 10,
    minService_A: minService,
    SPD_required: !!nec.DWELLING_SPD_REQUIRED,
    outdoor_disconnect: !!nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED,
    GFCI_scope: nec.GFCI_SCOPE_DWELLING || null,
    island_peninsula_rule: nec.ISLAND_PENINSULA_RULE || null,
    dishwasher_gfci_required: !!nec.DISHWASHER_GFCI_REQUIRED,
    sump_pump_gfci_required: !!nec.SUMP_PUMP_GFCI_REQUIRED,
    outdoor_50A_gfci_note: nec.GFCI_OUTDOOR_DWELLING_50A || null,
    garage_basement_scope: nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE || null,
    steps,
  };
  return withTrace(result, {
    articles_used: dwellingYearArticles(nec, [
      "220.12", "220.14(J)", "220.40", "220.42", "220.52(A)", "220.52(B)",
      "220.54", rangeDemandArticle.replace(/^Table /, ""), "220.60", "210.11(C)(1)", "210.11(C)(2)", "210.11(C)(3)",
      "240.6(A)", "230.42", "210.8(A)", "210.52(C)(2)",
      ...(apply220_53 ? ["220.53"] : []),
    ]),
    tables_used: ["Table 220.12", "Table 220.42", "Table 220.54", rangeDemandArticle, "Table 240.6(A)"],
    fields_used: ["DWELLING_LIGHTING_VA_PER_SQFT", "SMALL_APPLIANCE_VA", "LAUNDRY_VA", "SMALL_APPLIANCE_MIN_CIRCUITS", "LAUNDRY_MIN_CIRCUITS", "LIGHTING_DEMAND", "RANGE_DEMAND", "RANGE_DEMAND_ARTICLE", "FIXED_APPLIANCE_DEMAND_FACTOR", "STD_OCPD_SIZES", "DWELLING_MIN_SERVICE_AMPS", "DWELLING_SPD_REQUIRED", "DWELLING_OUTDOOR_DISCONNECT_REQUIRED", "GFCI_SCOPE_DWELLING", "ISLAND_PENINSULA_RULE", "DISHWASHER_GFCI_REQUIRED", "SUMP_PUMP_GFCI_REQUIRED", "GFCI_OUTDOOR_DWELLING_50A", "GARAGE_BASEMENT_RECEPTACLE_SCOPE"],
  });
}

function getOptionalHvac(nec) {
  const hvac = nec.OPTIONAL_HVAC;
  if (!hvac) {
    throw new Error(
      `[calcDwellingOptional] OPTIONAL_HVAC missing for NEC ${nec.year || "unknown"}. Year data must define 220.82(C) factors.`
    );
  }
  return hvac;
}

/**
 * NEC 220.82 Optional Method — One- and Two-Family Dwellings
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 * @returns {object} calculation outputs + trace
 *
 * HVAC inputs (NEC 220.82(C) — largest of the six selections):
 *   airCond           — Air conditioning nameplate VA, 100% per (C)(1)
 *   heatPump          — Heat pump compressor VA, 100% per (C)(2); still competes
 *                       as cooling equipment when supplemental heat is present
 *   heatStrip         — Electric space heating VA, (C)(4) 65% if fewer than 4
 *                       separately controlled units, (C)(5) 40% if 4 or more
 *   heatUnits         — Number of separately controlled heating units
 *   supplementalHeat  — Heat pump supplemental electric heat VA, 65% per (C)(3)
 *   supplementalSimultaneous — true if supplemental can operate with compressor;
 *                       if false, omit compressor from the (C)(3) selection
 *   spaceHeater       — Electric thermal storage / continuous full-nameplate
 *                       heating VA, 100% per (C)(6); do not also enter that
 *                       same system under heatStrip
 */
export function calcDwellingOptional(v, nec) {
  const optHvac = getOptionalHvac(nec);
  const generalArticle = nec.OPTIONAL_GENERAL_LOAD_ARTICLE || "220.82(B)";
  const remainderFactor = nec.OPTIONAL_DEMAND_FACTOR;
  const remainderPct = Math.round(remainderFactor * 100);

  // ─── General load per 220.82(B) ───────────────────────────────────
  const sqft = Math.max(0, parseFloat(v.sqft) || 0);
  const generalLighting = sqft * nec.DWELLING_LIGHTING_VA_PER_SQFT;
  const smallAppliance = 2 * nec.SMALL_APPLIANCE_VA;
  const laundry = nec.LAUNDRY_VA;
  const other = Math.max(0, parseFloat(v.otherLoads) || 0);
  const generalTotal = generalLighting + smallAppliance + laundry + other;

  let generalDemand = 0;
  if (generalTotal <= 10000) {
    generalDemand = generalTotal;
  } else {
    generalDemand = 10000 + (generalTotal - 10000) * remainderFactor;
  }

  // ─── HVAC per 220.82(C) — largest of (C)(1)–(C)(6) ───────────────
  const ac = Math.max(0, parseFloat(v.airCond) || 0);
  const heatPump = Math.max(0, parseFloat(v.heatPump) || 0);
  const heatStrip = Math.max(0, parseFloat(v.heatStrip) || 0);
  const heatUnits = Math.max(1, parseInt(v.heatUnits) || 1);
  const supplementalHeat = Math.max(0, parseFloat(v.supplementalHeat) || 0);
  const supplementalSimultaneous =
    v.supplementalSimultaneous === true || v.supplementalSimultaneous === "true";
  const thermalStorage = Math.max(0, parseFloat(v.spaceHeater) || 0);

  const threshold = optHvac.spaceHeatUnitThreshold || 4;
  const fourOrMore = heatUnits >= threshold;
  const heatDemandFactor = fourOrMore
    ? optHvac.spaceHeatGe4Factor
    : optHvac.spaceHeatLt4Factor;
  const spaceHeatArticle = fourOrMore ? "220.82(C)(5)" : "220.82(C)(4)";

  const acLoad = ac * optHvac.acFactor; // (C)(1)
  const heatPumpCompressorLoad = heatPump * optHvac.heatPumpOnlyFactor; // (C)(2) nameplate
  const electricHeatLoad = heatStrip * heatDemandFactor; // (C)(4) or (C)(5)
  const supplementalHeatLoad = supplementalHeat * optHvac.supplementalHeatFactor; // (C)(3)
  const thermalStorageLoad = thermalStorage * optHvac.thermalStorageFactor; // (C)(6)

  // (C)(3): 100% compressor + 65% supplemental. If the compressor cannot run
  // with the supplemental heat, omit the compressor from this selection.
  let heatPumpSystemLoad = 0;
  if (supplementalHeatLoad > 0) {
    if (heatPumpCompressorLoad > 0 && supplementalSimultaneous) {
      heatPumpSystemLoad = heatPumpCompressorLoad + supplementalHeatLoad;
    } else {
      heatPumpSystemLoad = supplementalHeatLoad;
    }
  } else {
    heatPumpSystemLoad = heatPumpCompressorLoad;
  }

  // Cooling equipment (C)(1) and heat-pump compressor still compete when
  // (C)(3) omits the compressor from the heating selection.
  const coolingLoad = Math.max(acLoad, heatPumpCompressorLoad);
  const heatingLoad = Math.max(
    electricHeatLoad,
    thermalStorageLoad,
    supplementalHeatLoad > 0 ? heatPumpSystemLoad : heatPumpCompressorLoad
  );
  const hvacLoad = Math.max(coolingLoad, heatingLoad);
  const noncoincidentSelected = coolingLoad >= heatingLoad ? "cooling" : "heating";

  // ─── Total load ───────────────────────────────────────────────────
  const totalVA = hvacLoad + generalDemand;
  const voltage = parseFloat(v.voltage) || 240;
  const totalAmps = totalVA / voltage;

  const minServiceFromLoad = nec.STD_OCPD_SIZES.find(s => s >= totalAmps) || 400;
  const minService = Math.max(minServiceFromLoad, nec.DWELLING_MIN_SERVICE_AMPS || 100);

  const heatPct = (heatDemandFactor * 100).toFixed(0);
  const suppPct = (optHvac.supplementalHeatFactor * 100).toFixed(0);
  const steps = [
    { label: "General Lighting (Table 220.12)", formula: "VA = sqft × 3 VA/ft²", expression: `${sqft} ft² × ${nec.DWELLING_LIGHTING_VA_PER_SQFT}`, result: Math.round(generalLighting), unit: "VA" },
    { label: "General Load Total", formula: "Total = lighting + small app + laundry + other nameplate (220.82(B))", expression: `${Math.round(generalLighting)} + ${2 * nec.SMALL_APPLIANCE_VA} + ${nec.LAUNDRY_VA} + ${other}`, result: Math.round(generalTotal), unit: "VA" },
    { label: `General Demand (${generalArticle})`, formula: `Demand = first 10,000 @ 100% + remainder @ ${remainderPct}%`, expression: generalTotal <= 10000 ? `${Math.round(generalTotal)} @ 100%` : `10,000 + (${Math.round(generalTotal)} − 10,000) × ${remainderFactor}`, result: Math.round(generalDemand), unit: "VA" },
    { label: "AC Load (220.82(C)(1))", formula: "AC at 100%", expression: `${ac} VA`, result: Math.round(acLoad), unit: "VA" },
    { label: `Electric Heat (${spaceHeatArticle})`, formula: `Heat at ${heatPct}% (${heatUnits} unit${heatUnits !== 1 ? "s" : ""})`, expression: `${heatStrip} × ${heatDemandFactor}`, result: Math.round(electricHeatLoad), unit: "VA" },
    { label: "Heat Pump Compressor (220.82(C)(2))", formula: "Compressor at 100%", expression: `${heatPump} VA`, result: Math.round(heatPumpCompressorLoad), unit: "VA" },
    { label: "Supplemental Heat (220.82(C)(3))", formula: `Supplemental at ${suppPct}%`, expression: `${supplementalHeat} × ${optHvac.supplementalHeatFactor}`, result: Math.round(supplementalHeatLoad), unit: "VA", note: supplementalHeatLoad > 0 && !supplementalSimultaneous ? "Compressor omitted from (C)(3) — cannot run with supplemental" : undefined },
    { label: "Thermal Storage (220.82(C)(6))", formula: "Continuous full-nameplate heating at 100%", expression: `${thermalStorage} VA`, result: Math.round(thermalStorageLoad), unit: "VA" },
    { label: "Noncoincident HVAC (220.82(C))", formula: `Largest of (C)(1)–(C)(6) → ${noncoincidentSelected}`, expression: `max(cooling ${Math.round(coolingLoad)}, heating ${Math.round(heatingLoad)})`, result: Math.round(hvacLoad), unit: "VA" },
    { label: "Total Calculated Load", formula: "Total = HVAC + general demand", expression: `${Math.round(hvacLoad)} + ${Math.round(generalDemand)}`, result: Math.round(totalVA), unit: "VA" },
    { label: "Service Size", formula: "Amps = Total VA ÷ V", expression: `${Math.round(totalVA)} ÷ ${voltage}`, result: Math.round(totalAmps * 10) / 10, unit: "A", note: `→ min ${minService} A` },
  ];
  const result = {
    largestHVAC_VA: Math.round(hvacLoad),
    hvacLoad_VA: Math.round(hvacLoad),
    acLoad_VA: Math.round(acLoad),
    electricHeatLoad_VA: Math.round(electricHeatLoad),
    heatPumpCompressorLoad_VA: Math.round(heatPumpCompressorLoad),
    supplementalHeatLoad_VA: Math.round(supplementalHeatLoad),
    spaceHeaterLoad_VA: Math.round(thermalStorageLoad),
    heatPumpSystemLoad_VA: Math.round(heatPumpSystemLoad),
    coolingLoad_VA: Math.round(coolingLoad),
    heatingLoad_VA: Math.round(heatingLoad),
    heatDemandFactor: heatDemandFactor,
    spaceHeatArticle,
    noncoincidentSelected: noncoincidentSelected,
    generalLighting_VA: Math.round(generalLighting),
    generalTotal_VA: Math.round(generalTotal),
    generalDemand_VA: Math.round(generalDemand),
    totalVA: Math.round(totalVA),
    totalAmps: Math.round(totalAmps * 10) / 10,
    minService_A: minService,
    SPD_required: !!nec.DWELLING_SPD_REQUIRED,
    outdoor_disconnect: !!nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED,
    GFCI_scope: nec.GFCI_SCOPE_DWELLING || null,
    island_peninsula_rule: nec.ISLAND_PENINSULA_RULE || null,
    dishwasher_gfci_required: !!nec.DISHWASHER_GFCI_REQUIRED,
    sump_pump_gfci_required: !!nec.SUMP_PUMP_GFCI_REQUIRED,
    outdoor_50A_gfci_note: nec.GFCI_OUTDOOR_DWELLING_50A || null,
    garage_basement_scope: nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE || null,
    steps,
  };
  return withTrace(result, {
    articles_used: dwellingYearArticles(nec, [
      "220.12",
      nec.OPTIONAL_APPLICABILITY_ARTICLE || "220.82(A)",
      generalArticle,
      "220.82(C)(1)",
      "220.82(C)(2)",
      "220.82(C)(3)",
      "220.82(C)(4)",
      "220.82(C)(5)",
      "220.82(C)(6)",
      "240.6(A)",
      "230.42",
      "210.8(A)",
      "210.52(C)(2)",
    ]),
    tables_used: ["Table 220.12", "Table 240.6(A)"],
    fields_used: ["DWELLING_LIGHTING_VA_PER_SQFT", "SMALL_APPLIANCE_VA", "LAUNDRY_VA", "OPTIONAL_DEMAND_FACTOR", "OPTIONAL_HVAC", "STD_OCPD_SIZES", "DWELLING_MIN_SERVICE_AMPS", "DWELLING_SPD_REQUIRED", "DWELLING_OUTDOOR_DISCONNECT_REQUIRED", "GFCI_SCOPE_DWELLING", "ISLAND_PENINSULA_RULE", "DISHWASHER_GFCI_REQUIRED", "SUMP_PUMP_GFCI_REQUIRED", "GFCI_OUTDOOR_DWELLING_50A", "GARAGE_BASEMENT_RECEPTACLE_SCOPE"],
  });
}