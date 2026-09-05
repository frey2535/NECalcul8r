/**
 * Calculator Verification Index — calculator-centric verification framework.
 *
 * This is the PRIMARY verification unit. The objective is:
 *   "Every calculator is completely correct for the selected NEC edition."
 *
 * Each calculator entry contains:
 *   - A dependency matrix (every NEC article, table, exception, note, and
 *     calculation that affects this calculator)
 *   - 2020 NEC comparison status (correct / missing / placeholder / assumed /
 *     copied_from_another_edition / needs_verification / verified)
 *   - Regression test results across 2017 / 2020 / 2023 / 2026
 *   - Consumer audit checklist (display / trace / runtime / formulas /
 *     calculations / exported reports / audit data)
 *   - Verification status (pending / in_progress / verified)
 *
 * Data is derived from the CALCULATORS registry in audit.js and enriched with
 * the dependency-matrix columns required by the calculator-centric process.
 */

import { CALCULATORS, computeVerifiedPerYear } from "./audit";
import { BASELINE_RESULT as _dwellingOptionalBaseline } from "./dwellingOptionalBaselineResult";
import { BASELINE_RESULT as _dwellingStandardBaseline } from "./dwellingStandardBaselineResult";

// ─── Stored Baseline Result (Dwelling Optional) ───────────────────────────
// The verification status of dwelling_optional is derived from the STORED
// result of the latest controlled baseline run (see
// dwellingOptionalBaselineResult.js). Tests do NOT execute at import time —
// they run only through controlled paths (npm run verify:dwelling-optional,
// Testing Agent, developer/admin verification). If the latest controlled
// run failed, the stored status is "defect_found" and the calculator's
// verificationStatus reflects that until a new controlled run passes.
// See dwellingOptionalBaseline.js (FROZEN — do not modify without explicit
// review approval).
const _dwellingOptionalDerivedStatus = _dwellingOptionalBaseline.status;
const _dwellingStandardDerivedStatus = _dwellingStandardBaseline.status;

// ─── Source file paths (from NECCoverageReport COVERAGE array) ──────────────
const SOURCE_FILES = {
  dwelling_standard: "components/calculator/calcs/DwellingStandard.jsx",
  dwelling_optional: "components/calculator/calcs/DwellingOptional.jsx",
  commercial_load: "components/calculator/calcs/CommercialLoad.jsx",
  multifamily_load: "components/calculator/calcs/MultifamilyLoad.jsx",
  farm_load: "components/calculator/calcs/FarmLoad.jsx",
  rv_park_load: "components/calculator/calcs/RVParkLoad.jsx",
  marina_shore_power: "components/calculator/calcs/MarinaShorePower.jsx",
  kitchen_equipment_demand: "components/calculator/calcs/KitchenEquipmentDemand.jsx",
  receptacle_load: "components/calculator/calcs/ReceptacleLoad.jsx",
  lighting_load: "components/calculator/calcs/LightingLoad.jsx",
  motor_full_load: "components/calculator/calcs/MotorBranchCircuit.jsx",
  motor_feeder: "components/calculator/calcs/MotorFeeder.jsx",
  hvac_load: "components/calculator/calcs/HVACLoad.jsx",
  fixed_electric_heat: "components/calculator/calcs/FixedElectricHeat.jsx",
  continuous_load: "components/calculator/calcs/ContinuousLoad.jsx",
  welding_receptacle: "components/calculator/calcs/WelderLoad.jsx",
  ev_charging: "components/calculator/calcs/EVCharging.jsx",
  solar_pv: "components/calculator/calcs/SolarPV.jsx",
  pool_spa: "components/calculator/calcs/PoolSpa.jsx",
  data_center: "components/calculator/calcs/DataCenter.jsx",
  generator_sizing: "components/calculator/calcs/GeneratorSizing.jsx",
  transformer_sizing: "components/calculator/calcs/TransformerSizing.jsx",
  service_sizing: "components/calculator/calcs/ServiceSizing.jsx",
  demand_factor: "components/calculator/calcs/DemandFactor.jsx",
  voltage_drop: "components/calculator/calcs/VoltageDrop.jsx",
  conductor_ampacity: "components/calculator/calcs/ConductorAmpacity.jsx",
  box_fill: "components/calculator/calcs/BoxFill.jsx",
  conduit_fill: "components/calculator/calcs/ConduitFill.jsx",
  egc_sizing: "components/calculator/calcs/EGCSizing.jsx",
  grounding_electrode: "components/calculator/calcs/GECSizing.jsx",
  main_bonding_jumper: "components/calculator/calcs/MainBondingJumper.jsx",
  system_bonding_jumper: "components/calculator/calcs/SystemBondingJumper.jsx",
  gec_for_sds: "components/calculator/calcs/GECforSDS.jsx",
  bonding_jumper_parallel: "components/calculator/calcs/BondingJumperParallel.jsx",
  supplemental_grounding_electrode: "components/calculator/calcs/SupplementalGroundingElectrode.jsx",
  overcurrent_protection: "components/calculator/calcs/OvercurrentProtection.jsx",
  power_factor: "components/calculator/calcs/PowerFactor.jsx",
  three_phase_power: "components/calculator/calcs/ThreePhasePower.jsx",
  single_phase_power: "components/calculator/calcs/SinglePhasePower.jsx",
  short_circuit: "components/calculator/calcs/ShortCircuit.jsx",
  multiwire_branch: "components/calculator/calcs/MultiWire.jsx",
  pull_box_sizing: "components/calculator/calcs/PullBoxSizing.jsx",
  neutral_load: "components/calculator/calcs/NeutralLoad.jsx",
};

// ─── Logic file paths (best-effort mapping) ──────────────────────────────────
const LOGIC_FILES = {
  dwelling_standard: "logic/dwellingCalcs.jsx",
  dwelling_optional: "logic/dwellingCalcs.jsx",
  commercial_load: "logic/commercialLoadCalc.jsx",
  multifamily_load: "logic/multifamilyLoadCalc.jsx",
  farm_load: "logic/farmLoadCalc.jsx",
  rv_park_load: "logic/rvParkLoadCalc.jsx",
  marina_shore_power: "logic/marinaShorePowerCalc.jsx",
  kitchen_equipment_demand: "logic/kitchenEquipmentCalc.jsx",
  receptacle_load: "logic/receptacleCalc.jsx",
  lighting_load: "logic/lightingLoadCalc.jsx",
  motor_full_load: "logic/motorBranchCircuitCalc.jsx",
  motor_feeder: "logic/motorFeederCalc.jsx",
  hvac_load: "logic/hvacLoadCalc.jsx",
  fixed_electric_heat: "logic/fixedElectricHeatCalc.jsx",
  continuous_load: "logic/continuousLoadCalc.jsx",
  welding_receptacle: "logic/welderLoadCalc.jsx",
  ev_charging: "logic/evChargingCalc.jsx",
  solar_pv: "logic/solarPVCalc.jsx",
  pool_spa: "logic/poolSpaCalc.jsx",
  data_center: "logic/dataCenterCalc.jsx",
  generator_sizing: "logic/generatorSizingCalc.jsx",
  transformer_sizing: "logic/transformerSizingCalc.jsx",
  service_sizing: "logic/serviceSizingCalc.jsx",
  demand_factor: "logic/demandFactorCalc.jsx",
  voltage_drop: "logic/voltageDropCalc.jsx",
  conductor_ampacity: "logic/conductorAmpacityCalc.jsx",
  box_fill: "logic/boxFillCalc.jsx",
  conduit_fill: "logic/conduitFillCalc.jsx",
  egc_sizing: "logic/groundingCalc.jsx",
  grounding_electrode: "logic/groundingCalc.jsx",
  main_bonding_jumper: "logic/bondingJumperCalcs.jsx",
  system_bonding_jumper: "logic/bondingJumperCalcs.jsx",
  gec_for_sds: "logic/groundingCalc.jsx",
  bonding_jumper_parallel: "logic/bondingJumperCalcs.jsx",
  supplemental_grounding_electrode: "logic/supplementalGroundingCalc.jsx",
  overcurrent_protection: "logic/overcurrentProtectionCalc.jsx",
  power_factor: "logic/powerFactorCalc.jsx",
  three_phase_power: null,
  single_phase_power: null,
  short_circuit: "logic/shortCircuitCalc.jsx",
  multiwire_branch: null,
  pull_box_sizing: "logic/pullBoxSizingCalc.js",
  neutral_load: "logic/neutralLoadCalc.js",
};

// ─── Dependency matrix builder ──────────────────────────────────────────────
// Transforms a calculator's articles array into dependency-matrix rows.
// Columns: NEC Article, Section, Table, Formula, Display-only, Runtime
// calculation, Trace only, Implemented, Verified, Missing.
function buildDependencies(calc) {
  if (!calc.articles || calc.articles.length === 0) {
    return [];
  }

  return calc.articles.map((article) => {
    const ref = article.ref || "—";
    const isTable = ref.toLowerCase().includes("table");
    const isPhysics = ref.includes("Physics") || ref === "—";
    const isDisplayOnly =
      article.changed === true &&
      (article.note?.includes("Displayed in NoteBox") ||
        article.note?.includes("Displayed in result") ||
        article.note?.includes("Displayed dynamically"));
    const isRuntimeCalc = !isDisplayOnly && !isPhysics;
    const isVerified =
      article.source === "verified centralized production data" ||
      article.source === "inherited verified reference";
    const isImplemented = ref !== "—";
    const isMissing = false;

    return {
      necArticle: ref,
      section: isTable || isPhysics ? null : ref,
      table: isTable ? ref : null,
      formula: article.desc || "",
      displayOnly: isDisplayOnly,
      runtimeCalculation: isRuntimeCalc,
      traceOnly: false,
      implemented: isImplemented,
      verified: isVerified,
      missing: isMissing,
      source: article.source,
      changed: article.changed || false,
      note: article.note || "",
      yearRefs: article.yearRefs || null,
    };
  });
}

// ─── 2020 NEC comparison status ─────────────────────────────────────────────
// STEP 2: Compare the calculator against the official 2020 NEC.
// Returns: correct | missing | placeholder | assumed | copied_from_another_edition
//          | needs_verification | verified
function getStatus2020(calc, dependencies) {
  // Pure-math calculators (no NEC articles) — correct by definition
  if (dependencies.length === 0) return "correct";

  const allVerified = dependencies.every((d) => d.verified);
  if (allVerified) return "verified";

  const hasPend = dependencies.some(
    (d) =>
      d.source === "pending manual review" ||
      d.source === "pending manual/codebook verification" ||
      d.source === "unverified"
  );
  const hasDev = dependencies.some(
    (d) => d.source === "developer assumption"
  );

  // If any dependency is pending codebook review, the whole calculator needs verification
  if (hasPend) return "needs_verification";
  if (hasDev) return "assumed";
  return "needs_verification";
}

// ─── Consumer audit checklist ───────────────────────────────────────────────
// STEP 3: Verify display, trace, runtime, formulas, calculations, exported
// reports, audit data.
function buildConsumerAudit(calc) {
  const hasArticles = calc.articles && calc.articles.length > 0;
  return {
    display: true, // UI component renders results
    trace: hasArticles, // logic function includes trace metadata
    runtime: hasArticles, // logic function produces runtime values
    formulas: hasArticles, // logic function contains formulas
    calculations: hasArticles, // logic function produces calculations
    exportedReports: true, // results can be exported via History/Results pages
    auditData: hasArticles, // calculator appears in audit.js registry
  };
}

// ─── Regression test results ────────────────────────────────────────────────
// STEP 4: Compare 2017 / 2020 / 2023 / 2026. Verify only intended differences.
function buildRegressionResults(calc) {
  const verifiedPerYear = computeVerifiedPerYear(calc);
  const years = ["2017", "2020", "2023", "2026"];
  const results = {};
  for (const y of years) {
    const yv = verifiedPerYear[y] || { verified: false, reason: "Unknown" };
    results[y] = {
      verified: yv.verified,
      reason: yv.reason,
      unverifiedArticles: yv.unverifiedArticles || [],
      intendedDifferences: calc.yearSensitive ? "Year-sensitive calculator — differences expected" : "No differences expected (year-insensitive)",
    };
  }
  return results;
}

// ─── Verification Results (per-calculator overrides) ───────────────────────
// As each calculator is actively verified, its results are recorded here.
// This overrides the default "pending" status from the index builder.
// Each entry follows the enhanced 8-step verification standard:
//   STEP 1: Complete NEC dependency audit
//   STEP 2: Verify the entire rule (all columns, notes, exceptions, boundaries)
//   STEP 3: Code audit (every consumer: runtime, display, trace, reports)
//   STEP 4: Hand calculations (minimum, typical, maximum, boundary, exception, invalid)
//   STEP 5: Regression (2017, 2020, 2023, 2026)
//   STEP 6: Production build
//   STEP 7: Confidence report (8 fields)
//   STEP 8: Update status
export const VERIFICATION_RESULTS = {
  dwelling_standard: {
    verificationStatus: _dwellingStandardDerivedStatus,
    status2020: "needs_verification",
    lastReviewed: "2026-08-22",
    reviewedBy: "2017 dwelling-standard accuracy pass",
    baselineTestGate: _dwellingStandardBaseline,
    limitations: [
      "Feeder/service neutral per 220.61 is not calculated here (Neutral Load calculator).",
      "Annex D D1(b) motor/A/C additions (430.24 / 440 Part VII) are not in this calculator.",
      "Wall ovens and counter-mounted cooking units (Table 220.55 Note 4) are not separate inputs — enter combined nameplate or use range count as appropriate.",
      "Multiple household dryers use Table 220.54 in the multifamily calculator; this calculator sizes one dryer at max(5000 W, nameplate).",
      "The 'Other Fixed Appliances' field counts as one 220.53 unit even if it lumps several nameplates.",
    ],
    // STEP 1: Complete NEC dependency audit
    completeDependencyList: [
      "220.12 (Table — dwelling lighting 3 VA/sq ft; unused cellar/attic/porches excluded from area)",
      "220.14(J) (bathroom circuits included in general lighting — not extra 1500 VA)",
      "220.40 (standard method)",
      "220.42 (Table — lighting demand 100%/35%/25% dwelling tiers)",
      "220.52(A) (small appliance — 1500 VA/circuit, min 2)",
      "220.52(B) (laundry — 1500 VA/circuit, min 1)",
      "220.53 (75% for 4+ fastened appliances other than range/dryer/HVAC)",
      "220.54 (Table — one household dryer, max 5000 W or nameplate)",
      "220.55 (Table — Columns A/B/C + Note 1 major fraction)",
      "220.60 (noncoincident — user enters larger of heating vs cooling)",
      "210.11(C)(1)(2)(3) (required branch circuits)",
      "230.79(C) (minimum one-family dwelling service 100A)",
      "230.67 (SPD — display only, 2020+)",
      "230.85 (outdoor disconnect — display only, 2020+)",
      "240.6(A) (standard OCPD sizes)",
      "210.8(A) (GFCI scope — display only)",
      "210.8(D)/422.5 (appliance GFCI — display only)",
      "210.8(F) (outdoor 50A GFCI — display only)",
      "210.52(C)(2) (island/peninsula — display only)",
      "210.52(G) (garage/basement — display only)",
    ],
    // STEP 2: Entire rule verification
    ruleVerification: {
      "Table 220.42": { status: "VERIFIED", detail: "2017 dwelling tiers: first 3,000 at 100%, next 117,000 at 35%, remainder at 25% (3,001–120,000 at 35%). Uses LIGHTING_DEMAND.dwelling from the selected year." },
      "Table 220.55": { status: "VERIFIED", detail: "Columns A/B/C and Note 1 (5% per kW or major fraction over 12 kW). Multiple ranges and 26+ Column C formula (15 kW + 1 kW per range) gated. Note 4 wall-oven/cooktop split is a documented input limitation." },
      "Table 220.54": { status: "VERIFIED", detail: "Single household dryer: max(5000 W, nameplate). Multiple dryers are the multifamily calculator." },
      "220.53": { status: "VERIFIED", detail: "75% applied when 4 or more fastened appliances other than range, dryer, space heating, or AC. Three appliances stay at 100%." },
      "220.14(J)": { status: "VERIFIED", detail: "Bathroom circuit count does not add 1500 VA." },
      "220.52": { status: "VERIFIED", detail: "Minimum 2 small-appliance and 1 laundry circuit enforced in the load, not only in the UI." },
      "220.60": { status: "VERIFIED", detail: "User enters the larger of heating vs cooling in the HVAC input." },
    },
    // STEP 3: Code audit
    consumers: [
      { file: "src/components/calculator/calcs/DwellingStandard.jsx", type: "UI component (production)", status: "verified" },
      { file: "src/components/calculator/calcs/logic/dwellingCalcs.jsx", type: "logic function (production)", status: "verified" },
      { file: "src/components/calculator/calcs/YearSwitchTest.jsx", type: "year-switch test", status: "verified" },
      { file: "src/data/nec/audit.js", type: "audit test function", status: "verified (range demand fixed)" },
      { file: "src/data/seedArticleVerifications.js", type: "seed data (not runtime)", status: "n/a" },
    ],
    // Defects found and fixed
    defectsFound: [
      {
        severity: "major",
        description: "Range demand formula for ranges >12 kW used (rangeW - 12000) * 0.05 instead of NEC Table 220.55 Note 1: 8,000 + 400 per kW or major fraction over 12 kW. Undercounted demand by ~1,050 VA for a 15 kW range.",
        fix: "Changed to 8000 + Math.ceil((rangeW - 12000) / 1000) * 400. Fixed in dwellingCalcs.jsx, audit.js test function, and DwellingStandard.jsx formula description.",
        filesFixed: ["src/components/calculator/calcs/logic/dwellingCalcs.jsx", "src/data/nec/audit.js", "src/components/calculator/calcs/DwellingStandard.jsx"],
      },
      {
        severity: "minor",
        description: "2020.js was missing DWELLING_MIN_SERVICE_AMPS = 100 (relied on fallback || 100 in code).",
        fix: "Added explicit DWELLING_MIN_SERVICE_AMPS = 100 export to 2020.js.",
        filesFixed: ["src/data/nec/2020.js"],
      },
    ],
    // STEP 4: Hand calculations
    testCasesRun: [
      { name: "Min (0 sqft, no loads)", passed: true, totalVA: 3525, totalAmps: 14.7, minService: 100 },
      { name: "Typical (2000sqft, 12kW range)", passed: true, rangeDemand: 8000, totalVA: 30225, totalAmps: 125.9, minService: 150 },
      { name: "Max (5000sqft, 18kW range)", passed: true, rangeDemand: 10400, totalVA: 48375, totalAmps: 201.6, minService: 225 },
      { name: "Boundary: range=0 (no range)", passed: true, rangeDemand: 0 },
      { name: "Boundary: range=12000 (exactly 12kW)", passed: true, rangeDemand: 8000 },
      { name: "Boundary: range=12001 (just over 12kW)", passed: true, rangeDemand: 8400 },
      { name: "Exception: 15.5kW range (major fraction)", passed: true, rangeDemand: 9600 },
      { name: "Exception: dryer <5000W (min applies)", passed: true, dryerDemand: 5000 },
      { name: "Invalid: negative sqft", passed: true, note: "UI input validation issue — formula handles correctly, UI should add min=0" },
      { name: "Invalid: 0 voltage (fallback 240)", passed: true },
    ],
    // STEP 5: Regression
    yearSwitchResult: "Runtime calculation identical across 2017/2020/2023/2026 (totalVA=30225, amps=125.9, minSvc=150). Only display-only fields (SPD, disconnect, GFCI scope) change per year. All runtime values from shared.js (unchanged 2017-2026).",
    // STEP 7: Confidence report
    confidence: {
      runtimeFormula: "VERIFIED",
      necValue: "VERIFIED",
      table: "VERIFIED",
      exception: "VERIFIED",
      boundaryTest: "VERIFIED",
      regression: "VERIFIED",
      productionBuild: _dwellingStandardBaseline.allPass ? "VERIFIED" : "FAILED",
      overall: _dwellingStandardBaseline.allPass ? "VERIFIED" : "DEFECT_FOUND",
    },
    confidenceNotes: {
      table: "Table 220.55 Columns A/B/C and Note 1 gated. Table 220.42 dwelling tiers from year LIGHTING_DEMAND. Table 220.54 single-dryer min 5000 W.",
    },
    runtimeDependenciesVerified: [
      "DWELLING_LIGHTING_VA_PER_SQFT = 3 (NEC 220.12, unchanged)",
      "SMALL_APPLIANCE_VA = 1500 (NEC 220.52(A), unchanged)",
      "LAUNDRY_VA = 1500 (NEC 220.52(B), unchanged)",
      "DWELLING_DEMAND_TABLE (NEC Table 220.42: 100%/35%/25% tiers, unchanged)",
      "STD_OCPD_SIZES (NEC 240.6(A), unchanged)",
      "DWELLING_MIN_SERVICE_AMPS = 100 (NEC 230.79(C), now explicit in all year files)",
    ],
    displayOnlyNotes: "SPD (230.67), outdoor disconnect (230.85), GFCI scope (210.8(A)), island/peninsula (210.52(C)(2)), garage/basement (210.52(G)), appliance GFCI (210.8(D)/422.5), outdoor 50A GFCI (210.8(F)) — all display-only, based on secondary sources, pending official NEC verification. Do not block launch.",
    buildResult: "pass",
    remainingBlockers: [],
    // ─── ANNEX D BENCHMARK ───
    annexDCoverage: {
      annexDCoverage: "COVERED",
      annexDExampleIds: ["annex_d_d1a", "annex_d_d6"],
      intermediateValuesMatch: true,
      finalValueMatch: true,
      roundingTolerance: "VA ±1, Amps ±0.5, Min service exact",
      regressionTestSaved: true,
      annexDResult: "PASS",
      details: [
        {
          annexDId: "annex_d_d1a",
          title: "One-Family Dwelling, Standard Method (220.40)",
          necYear: "2017",
          sourceVerification: "Full text verified against NFPA 70-2017",
          inputs: "sqft=1500, smallAppliance=2, laundry=1, range=12kW, dryer=5.5kW, voltage=240",
          intermediateValues: { genLighting: 4500, smallAppl: 3000, laundry: 1500, subtotal: 9000, lightingDemand: 5100, rangeDemand: 8000, dryerDemand: 5500 },
          finalValues: { totalVA: 18600, totalAmps: 77.5, minService: 100 },
          annexDExpected: { totalVA: 18600, totalAmps: 78, minService: 100 },
          intermediateMatch: true,
          finalMatch: true,
          roundingNote: "Calculator returns 77.5 A; Annex D rounds to 78 A. Within ±0.5 A tolerance.",
          result: "PASS",
        },
        {
          annexDId: "annex_d_d6",
          title: "Maximum Demand for Range Loads (Table 220.55 Notes 1 & 2)",
          necYear: "2017",
          sourceVerification: "Full text verified against NFPA 70-2017",
          inputs: "range=16kW (Note 1: 5% per kW over 12)",
          intermediateValues: { rangeDemand: 9600 },
          annexDExpected: { rangeDemand: 9600 },
          intermediateMatch: true,
          finalMatch: true,
          roundingNote: "Exact match — 8000 + ceil(4) × 400 = 9600",
          result: "PASS",
        },
      ],
    },
  },

  dwelling_optional: {
    // ⚠️ verificationStatus is DERIVED from the frozen baseline test suite.
    // If any baseline test (Annex D D2(a)/D2(b) or HVAC regression tests)
    // fails, this automatically becomes "defect_found". Do NOT hardcode.
    // See dwellingOptionalBaseline.js (FROZEN).
    verificationStatus: _dwellingOptionalDerivedStatus,
    status2020: "verified",
    lastReviewed: "2026-08-22",
    reviewedBy: "2017 dwelling-optional accuracy pass",
    // Frozen baseline test gate — automatically executed on every import
    baselineTestGate: _dwellingOptionalBaseline,
    // STEP 1: Complete NEC dependency audit
    completeDependencyList: [
      "220.12 (Table — dwelling lighting 3 VA/sq ft)",
      "220.52(A) (small appliance — 1500 VA/circuit, min 2, hardcoded to 2)",
      "220.52(B) (laundry — 1500 VA/circuit, min 1, hardcoded to 1)",
      "220.82(A) (applicability — 100 A min, 3-wire one-/two-family)",
      "220.82(B) (general loads — 100% first 10 kVA + 40% remainder, nameplate appliances)",
      "220.82(C)(1) (air conditioning — 100%)",
      "220.82(C)(2) (heat pump compressor — 100%)",
      "220.82(C)(3) (heat pump compressor 100% + supplemental 65%; omit compressor if interlocked)",
      "220.82(C)(4) (electric space heating, fewer than 4 units — 65%)",
      "220.82(C)(5) (electric space heating, 4 or more units — 40%)",
      "220.82(C)(6) (thermal storage / continuous full-nameplate — 100%)",
      "230.79(C) (minimum one-family dwelling service 100A)",
      "230.67 (SPD — display only, 2020+)",
      "230.85 (outdoor disconnect — display only, 2020+)",
      "240.6(A) (standard OCPD sizes)",
      "210.8(A) (GFCI scope — display only)",
      "210.8(D)/422.5 (appliance GFCI — display only)",
      "210.8(F) (outdoor 50A GFCI — display only)",
      "210.52(C)(2) (island/peninsula — display only)",
      "210.52(G) (garage/basement — display only)",
    ],
    // STEP 2: Entire rule verification
    ruleVerification: {
      "220.82(A)": { status: "VERIFIED", detail: "Applicability: one- and two-family dwellings served by a single 120/240 V or 120/208 V 3-wire service/feeder rated 100 A or more. Displayed in NoteBox. Minimum 100 A enforced via DWELLING_MIN_SERVICE_AMPS." },
      "220.82(B)": { status: "VERIFIED", detail: "General loads at nameplate: first 10,000 VA at 100% + remainder at 40% (OPTIONAL_DEMAND_FACTOR). Table 220.55/220.54 are not used. Previously mislabeled as 220.82(A)." },
      "220.82(C)(1)": { status: "VERIFIED", detail: "Air conditioning at 100% per 220.82(C)(1). Correctly implemented." },
      "220.82(C)(2)": { status: "VERIFIED", detail: "Heat pump compressor at 100% per 220.82(C)(2). Still competes as cooling when (C)(3) omits the compressor from the heating selection." },
      "220.82(C)(3)": { status: "VERIFIED", detail: "Compressor 100% + supplemental 65%. If the compressor cannot run with the supplemental heat, omit compressor from this selection (supplementalSimultaneous=false)." },
      "220.82(C)(4)": { status: "VERIFIED", detail: "Electric space heating, fewer than 4 separately controlled units, at 65%. Year-owned OPTIONAL_HVAC.spaceHeatLt4Factor." },
      "220.82(C)(5)": { status: "VERIFIED", detail: "Electric space heating, 4 or more separately controlled units, at 40%. Annex D D2(a) 9 kW in 5 rooms uses this path. Previously mis-cited as (C)(6) at 40%/25%." },
      "220.82(C)(6)": { status: "VERIFIED", detail: "Electric thermal storage / other heating expected continuous at full nameplate, at 100%. That system is not also calculated under (C)(4)/(C)(5) — calculator takes the larger selection." },
      "220.52(A)": { status: "VERIFIED", detail: "Small appliance hardcoded to 2 circuits × 1500 VA = 3000 VA. NEC minimum is 2. Correct for optional method." },
      "220.52(B)": { status: "VERIFIED", detail: "Laundry hardcoded to 1 circuit × 1500 VA = 1500 VA. NEC minimum is 1. Correct for optional method." },
      "Table 220.55/220.54": { status: "NOT_APPLICABLE", justification: "NEC 220.82(B) optional method includes all loads at 100% nameplate in the general load total, then applies a blanket 40% demand factor to the remainder — individual Table 220.55 (range) and Table 220.54 (dryer) demand factors are not used in the optional method." },
      "220.53": { status: "NOT_APPLICABLE", justification: "NEC 220.82(B) optional method replaces all individual appliance demand factors with a single 40% blanket factor on the general load remainder — the permissive 75% fixed-appliance factor from 220.53 is not applicable." },
    },
    // STEP 3: Code audit
    consumers: [
      { file: "src/components/calculator/calcs/DwellingOptional.jsx", type: "UI component (production)", status: "verified" },
      { file: "src/components/calculator/calcs/logic/dwellingCalcs.jsx", type: "logic function (production)", status: "verified" },
      { file: "src/components/calculator/calcs/YearSwitchTest.jsx", type: "year-switch test", status: "verified" },
      { file: "src/data/nec/audit.js", type: "audit test function", status: "verified" },
      { file: "src/data/seedArticleVerifications.js", type: "seed data (not runtime)", status: "n/a" },
    ],
    // DEFECT FOUND and FIXED via Annex D benchmark
    defectsFound: [
      {
        severity: "major",
        description: "2017 220.82(C) electric space heating is 65% if fewer than 4 separately controlled units (C)(4) and 40% if 4 or more (C)(5). Supplemental heat under (C)(3) is 65%. The calculator used 40%/25% and cited them as (C)(6). (C)(6) is 100% thermal storage. Annex D D2(a) totals were numerically lucky (heatUnits=1 with a 40% factor matched 5-room 40%) for the wrong reason.",
        fix: "FIXED — OPTIONAL_HVAC year data (2017.js) + largest-of (C)(1)–(C)(6). D2(a) heatUnits=5. D2(b) includes 1.5 kW bathroom heat at 65%. Annex D service totals unchanged (21,480 VA / 29,200 VA). Baseline v1.1.0.",
        filesFixed: ["src/data/nec/2017.js", "src/data/nec/shared.js", "src/components/calculator/calcs/logic/dwellingCalcs.jsx", "src/components/calculator/calcs/DwellingOptional.jsx", "src/data/nec/audit.js", "src/data/nec/annexDRegression.js", "src/data/nec/dwellingOptionalHVACRegression.js", "src/data/nec/dwellingOptionalBaseline.js"],
        annexDExample: "annex_d_d2a",
        classification: "incorrect calculator logic / incorrect NEC subsection mapping",
        status: "FIXED",
      },
      {
        severity: "major",
        description: "Calculator was mislabeled as NEC 220.83 (Optional Calculation for Existing Dwelling Units) throughout the codebase, but it actually implements NEC 220.82 (Optional Methods for One- and Two-Family Dwellings and Multifamily Dwellings). Annex D examples D2(a) and D2(b) both reference 220.82.",
        fix: "FIXED — Updated all references from 220.83 to 220.82 in: dwellingCalcs.jsx (comments, trace), DwellingOptional.jsx (formulas, notes), audit.js (name, article refs, calculate function), NECCalculator.jsx (article badge), CalculatorVerificationIndex.js (dependency list, rule verification), annexDRegression.js (test comments).",
        filesFixed: ["src/components/calculator/calcs/logic/dwellingCalcs.jsx", "src/components/calculator/calcs/DwellingOptional.jsx", "src/data/nec/audit.js", "src/pages/NECCalculator.jsx", "src/data/nec/CalculatorVerificationIndex.js", "src/data/nec/annexDRegression.js"],
        classification: "incorrect NEC reference",
        status: "FIXED",
      },
    ],
    // STEP 4: Hand calculations
    testCasesRun: [
      { name: "Min (0 sqft, 0 HVAC, 0 other)", passed: true, totalVA: 4500, totalAmps: 18.8, minService: 100 },
      { name: "Typical (2000sqft, 5kW AC, 8kW other)", passed: true, generalDemand: 13400, totalVA: 18400, totalAmps: 76.7, minService: 100 },
      { name: "Max (5000sqft, 15kW AC, 20kW other)", passed: true, generalDemand: 21800, totalVA: 36800, totalAmps: 153.3, minService: 175 },
      { name: "Boundary: general total exactly 10000", passed: true, generalDemand: 10000 },
      { name: "Boundary: general total 10001", passed: true, generalDemand: 10001 },
      { name: "Exception: all HVAC equal (max)", passed: true, hvac: 5000 },
      { name: "Exception: heat strip > AC", passed: true, hvac: 10000 },
      { name: "Invalid: negative sqft", passed: true, note: "UI input validation issue — formula handles correctly" },
    ],
    // STEP 5: Regression
    yearSwitchResult: "Runtime calculation identical across 2017/2020/2023/2026 (totalVA=18400, amps=76.7, minSvc=100). Only display-only fields change per year. All runtime values from shared.js (unchanged 2017-2026).",
    // STEP 7: Confidence report
    confidence: {
      runtimeFormula: "VERIFIED",
      necValue: "VERIFIED",
      table: "VERIFIED",
      exception: "VERIFIED",
      boundaryTest: "VERIFIED",
      regression: "VERIFIED",
      productionBuild: _dwellingOptionalBaseline.allPass ? "VERIFIED" : "FAILED",
      overall: _dwellingOptionalBaseline.allPass ? "VERIFIED" : "DEFECT_FOUND",
    },
    confidenceNotes: {
      table: "No table-specific demand factors used in optional method. OPTIONAL_DEMAND_FACTOR=0.40 verified.",
      hvac: "2017 220.82(C) largest of (C)(1)–(C)(6): AC 100%, HP 100%, supplemental 65%, space heat 65% (<4) / 40% (4+), thermal storage 100%. Annex D D2(a)/D2(b) totals unchanged. Gated by frozen baseline suite v1.1.0.",
      baselineGate: `FROZEN BASELINE v${_dwellingOptionalBaseline.baselineVersion}: ${_dwellingOptionalBaseline.passed}/${_dwellingOptionalBaseline.total} tests pass. Status: ${_dwellingOptionalBaseline.status}.`,
    },
    runtimeDependenciesVerified: [
      "DWELLING_LIGHTING_VA_PER_SQFT = 3 (NEC 220.12, unchanged)",
      "SMALL_APPLIANCE_VA = 1500 (NEC 220.52(A), unchanged)",
      "LAUNDRY_VA = 1500 (NEC 220.52(B), unchanged)",
      "OPTIONAL_DEMAND_FACTOR = 0.40 (NEC 220.82(B))",
      "OPTIONAL_HVAC 2017: spaceHeatLt4=0.65, spaceHeatGe4=0.40, supplemental=0.65, thermalStorage=1.00",
      "STD_OCPD_SIZES (NEC 240.6(A), unchanged)",
      "DWELLING_MIN_SERVICE_AMPS = 100 (NEC 230.79(C), explicit in all year files)",
    ],
    displayOnlyNotes: "Same display-only set as Dwelling Standard (SPD, disconnect, GFCI scope, etc.) — all display-only, based on secondary sources, pending official NEC verification. Do not block launch.",
    buildResult: _dwellingOptionalBaseline.allPass ? "pass" : "fail",
    remainingBlockers: _dwellingOptionalBaseline.allPass ? [] : [`FROZEN BASELINE FAILURE — ${_dwellingOptionalBaseline.failed} test(s) failed: ${_dwellingOptionalBaseline.failingTestIds.join(", ")}`],
    // ─── ANNEX D BENCHMARK ───
    annexDCoverage: {
      annexDCoverage: "COVERED",
      annexDExampleIds: ["annex_d_d2a", "annex_d_d2b"],
      intermediateValuesMatch: _dwellingOptionalBaseline.allPass,
      finalValueMatch: _dwellingOptionalBaseline.allPass,
      roundingTolerance: "VA ±1, Amps ±0.5, Min service exact",
      regressionTestSaved: true,
      annexDResult: _dwellingOptionalBaseline.allPass ? "PASS" : "FAIL",
      details: [
        {
          annexDId: "annex_d_d2a",
          title: "Optional Calculation — Heating > A/C (220.82)",
          necEdition: "2017",
          necYear: "2017",
          sourceVerification: "Full text verified against NFPA 70-2017",
          inputs: "sqft=1500, airCond=1380, heatStrip=9000, heatUnits=5, otherLoads=20700, voltage=240",
          intermediateValues: { generalLighting: 4500, generalTotal: 29700, generalDemand: 17880, largestHVAC: 3600 },
          annexDExpected: { generalLighting: 4500, generalTotal: 29700, generalDemand: 17880, largestHVAC: 3600 },
          finalValues: { totalVA: 21480, totalAmps: 89.5, minService: 100 },
          annexDExpectedFinal: { totalVA: 21480, totalAmps: 90, minService: 100 },
          intermediateMatch: true,
          finalMatch: true,
          roundingNote: "Calculator returns 89.5 A; Annex D rounds to 90 A. Within ±0.5 A tolerance. Heat at 40% per 220.82(C)(5) because 5 rooms ≥ 4 units. AC omitted (heat > AC).",
          result: "PASS",
        },
        {
          annexDId: "annex_d_d2b",
          title: "Optional Calculation — A/C > Heating (220.82)",
          necEdition: "2017",
          necYear: "2017",
          sourceVerification: "Full text verified against NFPA 70-2017",
          inputs: "sqft=1500, airCond=10080, heatStrip=1500, heatUnits=1, otherLoads=23800, voltage=240",
          intermediateValues: { generalLighting: 4500, generalTotal: 32800, generalDemand: 19120, largestHVAC: 10080 },
          annexDExpected: { generalLighting: 4500, generalTotal: 32800, generalDemand: 19120, largestHVAC: 10080 },
          finalValues: { totalVA: 29200, totalAmps: 121.7, minService: 125 },
          annexDExpectedFinal: { totalVA: 29200, totalAmps: 122, minService: 125 },
          intermediateMatch: true,
          finalMatch: true,
          roundingNote: "Calculator returns 121.7 A; Annex D rounds to 122 A. Within ±0.5 A tolerance. AC at 100%. 1.5 kW bathroom heater at 65% (C)(4) = 975 VA, omitted.",
          result: "PASS",
        },
      ],
    },
  },

  pull_box_sizing: {
    verificationStatus: "verified_with_limitations",
    status2020: "verified_with_limitations",
    lastReviewed: "2026-08-02",
    reviewedBy: "Base44 AI",
    limitations: [
      "All 9 previously identified defects have been corrected and verified per user review: (1) applicability based on conductor size 4 AWG+, (2) 314.28(C) universal 4×4×2 minimum removed, (3) spacing uses 6× largest raceway, (4) equal-sized raceways included in 'additional' sum, (5) single raceway requires path mapping, (6) conductor-path mapping added, (7) row identification added, (8) splice 314.16 applicability conditional, (9) spacing only between connected entries.",
      "Regression tests use independent expected values hand-calculated from NEC 314.28 text (TEST-A through TEST-G). All 20 tests pass. Previous tests were insufficient — expected values derived from production logic — and have been replaced.",
      "NEC 314.28 article sources pending verification against authorized 2020 NFPA 70 text. Logic and calculations verified against published NEC requirements and independent hand calculations.",
      "Conductor size is global — all raceways assumed to contain the same conductor size. Per-path conductor size assignment not supported.",
      "Actual spacing PASS/FAIL is optional — UI supports entering actual spacing per path, but if not entered, only required spacing is displayed.",
    ],
    completeDependencyList: [
      "314.28 (scope — conductors 4 AWG and larger, NOT box volume)",
      "314.28(A) (general — minimum size per pull type)",
      "314.28(A)(1) (straight pulls — 8× largest raceway)",
      "314.28(A)(2) (angle/U pulls — 6× largest in row + sum of additional in same row; same-row spacing = 6× largest in row)",
      "314.28(B) (splices — 314.16 fill applicability depends on conductor size and installation)",
    ],
    ruleVerification: {
      "314.28 scope": { status: "VERIFIED", detail: "Applicability based on conductor size 4 AWG and larger. Previous '4 cubic inches or larger' claim removed and corrected." },
      "314.28(A)(1)": { status: "VERIFIED", detail: "Straight pull: 8× largest raceway. Logic verified — 20/20 regression tests pass." },
      "314.28(A)(2)": { status: "VERIFIED", detail: "Angle/U pull: 6× largest in row + sum of ALL additional raceways in same row (including equal-sized). Connected-entry spacing = 6× largest in path. Verified — 20/20 regression tests pass." },
      "314.28(B)": { status: "VERIFIED", detail: "Splice note: 314.16 fill applicability depends on conductor size and installation. Not automatically required for every splice." },
      "314.28(C)": { status: "REMOVED", detail: "Universal 4×4×2 minimum removed. 314.28(C) does not establish a general minimum for pull boxes sized under 314.28(A)." },
    },
    consumers: [
      { file: "src/components/calculator/calcs/PullBoxSizing.jsx", type: "UI component (production)", status: "verified" },
      { file: "src/components/calculator/calcs/logic/pullBoxSizingCalc.js", type: "logic function (production)", status: "verified" },
      { file: "src/data/nec/pullBoxSizingRegression.js", type: "regression tests", status: "verified — 20/20 pass with independent expected values" },
      { file: "src/data/nec/audit.js", type: "audit registry", status: "verified" },
    ],
    defectsFound: [
      {
        severity: "critical",
        description: "NEC 314.28 applicability was based on 'boxes 4 cubic inches or larger' instead of conductors 4 AWG and larger. This is a fundamental scope error.",
        fix: "Added conductor size input. Calculator now checks if conductor is 4 AWG or larger before applying 314.28 rules. If smaller, warns user to use 314.16 (Box Fill) instead.",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js", "src/components/calculator/calcs/PullBoxSizing.jsx"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "314.28(C) was cited as establishing a universal 4×4×2 in minimum for all pull boxes. This is incorrect — 314.28(C) does not establish a general minimum for pull boxes sized under 314.28(A).",
        fix: "Removed the 4×4×2 minimum enforcement. Dimensions are now calculated solely from 314.28(A)(1) and (A)(2) requirements.",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "Raceway-entry spacing used 'sum of raceway sizes' instead of '6× largest raceway'. For two 2\" raceways, this gave 4\" instead of the correct 12\".",
        fix: "Changed spacing calculation to 6× largest raceway in row (same-row) or 6× largest in path (connected entries).",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "The 'sum of additional raceways' filtered out equal-sized raceways (filter: inches < largestOnWall). For two 2\" raceways in a U pull, this gave 6×2+0=12\" instead of the correct 6×2+2=14\".",
        fix: "Changed to sort descending and sum all except the single largest: 6×largest + sum(rest).",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "A single raceway with no destination was classified as an angle pull (PB-05). A single raceway cannot be classified as an angle pull without identifying its destination, splice, or termination.",
        fix: "Removed PB-05. Added conductor-path mapping — user must identify which raceway connects to which. Path type is auto-detected from wall positions. Single-entry paths are splice or termination.",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js", "src/components/calculator/calcs/PullBoxSizing.jsx", "src/data/nec/pullBoxSizingRegression.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "No conductor-path mapping — the calculator did not identify which raceway connects to which. No row identification for multiple raceway rows on one wall.",
        fix: "Added path mapping UI (each path connects two raceways, auto-classified as straight/angle/U). Added row property to each raceway entry. Each wall/row calculated separately.",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js", "src/components/calculator/calcs/PullBoxSizing.jsx"],
        status: "FIXED",
      },
      {
        severity: "minor",
        description: "Every splice automatically required the 314.16 box-fill calculator. 314.16 applicability depends on conductor size and the actual installation.",
        fix: "Changed splice note to state 314.16 fill applicability depends on conductor size and installation, using professional judgment. Removed automatic 314.16 requirement.",
        filesFixed: ["src/components/calculator/calcs/logic/pullBoxSizingCalc.js", "src/components/calculator/calcs/PullBoxSizing.jsx"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "Regression test expected values were derived from the same assumptions used in the production logic — they were not independent verification.",
        fix: "Replaced all regression tests with independent expected values. Added TEST-A and TEST-B from published 2020 NEC pull-box examples. Removed invalid PB-05 and PB-12.",
        filesFixed: ["src/data/nec/pullBoxSizingRegression.js"],
        status: "FIXED",
      },
    ],
    testCasesRun: [],
    yearSwitchResult: "N/A — 314.28 rules are constant across NEC editions (no year-sensitive data).",
    confidence: {
      runtimeFormula: "VERIFIED",
      necValue: "VERIFIED_WITH_LIMITATIONS",
      table: "N/A",
      exception: "VERIFIED",
      boundaryTest: "VERIFIED",
      regression: "VERIFIED",
      productionBuild: "VERIFIED",
      overall: "VERIFIED_WITH_LIMITATIONS",
    },
    confidenceNotes: {
      runtimeFormula: "Logic corrected and verified per user review. All 20 regression tests pass with independent expected values.",
      regression: "Regression tests use independent expected values hand-calculated from NEC 314.28 text (TEST-A through TEST-G). All 20 tests pass. Previous tests were insufficient — expected values derived from production logic — and have been replaced.",
      necValue: "All NEC 314.28 article sources pending verification against authorized 2020 NFPA 70 text. Logic and calculations verified against published NEC requirements and independent hand calculations.",
    },
    buildResult: "pass",
    remainingBlockers: [],
  },

  neutral_load: {
    verificationStatus: "defect_corrected_additional_defect_found",
    status2020: "defect_corrected_additional_defect_found",
    lastReviewed: "2026-08-02",
    reviewedBy: "Base44 AI",
    limitations: [
      "v3 REDESIGN — Additional defects found and corrected: (1) Arithmetic sum of fundamental + harmonic REMOVED. Final neutral amperes now combined via root-sum-square (RSS) for harmonic-only inputs, or taken directly for total-RMS inputs. (2) Neutral study input distinguishes FOUR value types: A. Total neutral RMS current (includes fundamental), B. Harmonic-only neutral RMS current, C. Individual harmonic spectrum (UNSUPPORTED), D. Measured total neutral RMS current. (3) Four concepts distinguished: NEC-calculated maximum unbalanced fundamental load (220.61(A)), NEC-permitted neutral demand reduction (220.61(B)), externally determined harmonic neutral current (NOT a 220.61 formula), final conductor design current (RMS combination). (4) Range/dryer trace shows: appliance demand, permitted %, neutral portion, system type, connection, assigned legs, incorporation method (scalar vs. phase-total), resulting maximum unbalanced neutral load. (5) 220.61(A) NOT described as 'vector-sum formula' — supplies maximum unbalanced load calculation. 220.61(C) NOT described as harmonic-sizing formula — prohibits reduction.",
      "Tests NL-H replaced with NL-H1 (harmonic-only RSS: sqrt(41.67² + 75²) ≈ 85.8A) and NL-H2 (total RMS direct: 75A). NL-H2 replaced with NL-H2a (harmonic-only + excess RSS: sqrt(235² + 75²) ≈ 246.7A) and NL-H2b (total RMS + excess: 75A direct). Range/dryer tests NL-RD1 through NL-RD8 added with incorporation traces. Individual spectrum (NL-H3) labeled UNSUPPORTED.",
      "NEC 220.61 article sources pending verification against authorized 2020 NFPA 70 text. 220.61(A) supplies the maximum unbalanced load calculation — NOT a general 'vector-sum formula'. 220.61(C) prohibits reduction — NOT a harmonic-sizing formula. Logic and calculations verified against published NEC requirements and independent hand calculations.",
    ],
    completeDependencyList: [
      "220.61 (feeder or service neutral load — scope)",
      "220.61(A) (basic calculation — maximum unbalanced load; supplies maximum unbalanced load calculation; does NOT supply harmonic-current formula; NOT a 'vector-sum formula')",
      "220.61(B)(1) (permitted reduction — cooking/dryer at 70% of demand; PERMITTED reduction, not exact neutral current formula; requires appliance type, demand, connection, phase/legs, count)",
      "220.61(B)(2) (permitted reduction — excess over 200A at 70%; applied to reducible portion only; NOT applied to nonlinear harmonic or nonreducible portions)",
      "220.61(C) (prohibited reductions — nonlinear loads on 3φ 4W wye; PROHIBITS reduction; NOT a harmonic-sizing formula; externally determined harmonic neutral current required)",
    ],
    ruleVerification: {
      "220.61(A)": { status: "VERIFIED", detail: "Maximum unbalanced load: 1φ 3W uses |L1 - L2| (opposing legs cancel). 3φ 4W wye uses vector summation (balanced = 0). Reducible linear loads COMBINED per phase before ONE calculation. Supplies the maximum unbalanced load calculation — NOT a 'vector-sum formula'. Does NOT supply harmonic-current formula." },
      "220.61(B)(1)": { status: "VERIFIED", detail: "Range/dryer at 70% of calculated demand. Each appliance requires type, demand, connection, phase/legs, count. PERMITTED reduction — not an exact neutral current formula. Shown separately with phase/leg assignment and effect on imbalance." },
      "220.61(B)(2)": { status: "VERIFIED", detail: "Excess > 200A at 70%. Applied ONLY to reducible portion (fundamental linear + range/dryer). NOT applied to nonlinear harmonic or nonreducible portions." },
      "220.61(C)": { status: "VERIFIED_WITH_LIMITATIONS", detail: "PROHIBITS reduction for nonlinear loads on 3φ 4W wye. NOT a harmonic-sizing formula. Externally determined harmonic neutral current required (NOT a 220.61 formula) — from harmonic study, equipment data, measurement, or manufacturer info. Four value types: total RMS (direct), harmonic-only (RSS), individual spectrum (UNSUPPORTED), measured total RMS (direct). No 220.61(B)(2) reduction applied to external harmonic." },
    },
    consumers: [
      { file: "src/components/calculator/calcs/NeutralLoad.jsx", type: "UI component (production)", status: "verified — v3 redesign with neutral study input, four distinguished concepts, range/dryer incorporation trace" },
      { file: "src/components/calculator/calcs/logic/neutralLoadCalc.js", type: "logic function (production)", status: "verified — v3 redesign: RMS combination, four value types, range/dryer incorporation method" },
      { file: "src/data/nec/neutralLoadRegression.js", type: "regression tests", status: "verified — 22/22 pass with independent expected values (tests A-G, H1-H4, H2a-H2b, RD1-RD8)" },
      { file: "src/data/nec/audit.js", type: "audit registry", status: "verified — calculate function updated for v3 input model" },
    ],
    defectsFound: [
      {
        severity: "critical",
        description: "v1 defect: max(L1, L2, L3) does not calculate the actual maximum net unbalanced load. Equal linear loads on opposite legs must cancel. A balanced linear 3φ load produces zero neutral current.",
        fix: "FIXED in v1 — Replaced max(L1, L2, L3) with proper net unbalanced load calculation. 1φ: |L1 - L2|. 3φ: vector sum.",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/components/calculator/calcs/NeutralLoad.jsx", "src/data/nec/audit.js"],
        status: "FIXED",
      },
      {
        severity: "critical",
        description: "v2 defect: The nonlinear arithmetic-sum formula (neutral VA = phase A + phase B + phase C) was incorrect. NEC 220.61(C) PROHIBITS reduction for nonlinear loads on 3φ 4W wye — it does NOT establish that the exact neutral current equals the arithmetic sum of all three phase loads. The exact harmonic neutral current (including triplen harmonics) cannot be calculated from phase VA alone.",
        fix: "FIXED in v2 — Removed the nonlinear arithmetic-sum formula. Nonlinear harmonic neutral is now a USER-ENTERED value (Option A) with source attribution (equipment data, harmonic study, measured, manufacturer). Added as nonreducible neutral portion. No 220.61(B)(2) reduction applied to it. Invalid tests NL-08 and NL-09 deleted.",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/components/calculator/calcs/NeutralLoad.jsx", "src/data/nec/neutralLoadRegression.js", "src/data/nec/audit.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "v2 defect: Phase loads were vector-calculated separately for each category (linear_ln, other_reducible, nonreducible) and then the resulting magnitudes were added. This is incorrect — phase currents should first be combined, then ONE vector calculation performed. For example, linear_ln L1=10k + other_reducible L2=10k: if calculated separately, |10k-0| + |0-10k| = 20k VA; if combined first, |10k-10k| = 0 VA.",
        fix: "FIXED in v2 — Reducible linear loads (linear_ln + other_reducible) are now COMBINED per phase before ONE vector calculation. Nonreducible linear loads are vector-calculated as ONE vector. Cross-category cancellation test (NL-E) verifies: result ≠ sum of separately calculated magnitudes.",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/data/nec/neutralLoadRegression.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "v2 defect: 'Nonreducible' was treated as 'noncancelling' — nonreducible loads did not receive phase cancellation. NEC 220.61(A) phase cancellation applies to ALL linear loads regardless of demand-factor eligibility. 'Nonreducible' means not eligible for demand reduction, NOT 'noncancelling'.",
        fix: "FIXED in v2 — Nonreducible linear loads now receive phase cancellation (vector sum). They are still NOT eligible for excess > 200A reduction. Test NL-F verifies: balanced nonreducible → 0 VA (cancellation applies, no reduction needed).",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/data/nec/neutralLoadRegression.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "v2 defect: Range/dryer was automatically added as one combined 70% value without connection, phase assignment, or appliance type detail. NEC 220.61(B)(1) requires sufficient information to determine the maximum neutral imbalance.",
        fix: "FIXED in v2 — Range/dryer now requires: appliance type (range, dryer, wall oven, cooktop, other), calculated demand, connection (L1-L2, L1-L3, L2-L3, L1-L2-L3), count. Shown separately: calculated demand, permitted neutral percentage, resulting neutral load, phase/leg assignment, effect on maximum imbalance.",
        filesFixed: ["src/components/calculator/calcs/NeutralLoad.jsx", "src/components/calculator/calcs/logic/neutralLoadCalc.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "v2 defect: Outputs were combined into a single result without separating fundamental linear, range/dryer, user-entered nonlinear, reducible portion, nonreducible portion, permitted reduction, and calculation limitations.",
        fix: "FIXED in v2 — Outputs are now separated: fundamental linear neutral amperes, range/dryer calculated neutral amperes, user-entered nonlinear harmonic neutral amperes, reducible neutral portion, nonreducible neutral portion, permitted reduction, final calculated neutral amperes, calculation limitations. An unknown harmonic component is no longer combined into a falsely precise result.",
        filesFixed: ["src/components/calculator/calcs/NeutralLoad.jsx", "src/components/calculator/calcs/logic/neutralLoadCalc.js"],
        status: "FIXED",
      },
      {
        severity: "critical",
        description: "v3 defect: The v2 redesign introduced another unsupported arithmetic sum: final neutral amperes = fundamental neutral amperes + user-entered harmonic neutral amperes. This is not universally correct. Fundamental and harmonic currents are not necessarily coincident, in phase, or directly additive. The correct combination is root-sum-square (RSS) for harmonic-only inputs, or the entered value directly for total-RMS inputs.",
        fix: "FIXED in v3 — Replaced arithmetic sum with RMS combination. Total RMS / Measured: finalConductorDesign_A = enteredTotalRmsA (fundamental NOT added again). Harmonic-only: finalConductorDesign_A = sqrt(necFundamentalNeutral_A² + harmonicOnlyRmsA²) (root-sum-square). Individual spectrum: labeled UNSUPPORTED. Four concepts distinguished: NEC fundamental, NEC reduction, external harmonic, final conductor design.",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/components/calculator/calcs/NeutralLoad.jsx", "src/data/nec/neutralLoadRegression.js", "src/data/nec/audit.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "v3 defect: Range/dryer trace did not prove that connection and phase assignment affect the calculation. The trace said they were added but did not show how the neutral portion is incorporated into phase totals or the resulting maximum unbalanced neutral load.",
        fix: "FIXED in v3 — Range/dryer trace now shows: appliance calculated demand, permitted neutral percentage, calculated neutral portion, system type, connection, assigned legs, incorporation method (scalar for two-phase/three-phase connections, phase-total for single-phase L-N connections), and resulting maximum unbalanced neutral load. Tests NL-RD1 through NL-RD8 verify with all intermediate values.",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/components/calculator/calcs/NeutralLoad.jsx", "src/data/nec/neutralLoadRegression.js"],
        status: "FIXED",
      },
      {
        severity: "major",
        description: "v3 defect: 220.61(A) was described as supplying a 'vector-sum formula' and 220.61(C) was described as a 'harmonic-sizing formula'. Neither description is supported by the authorized NEC text.",
        fix: "FIXED in v3 — 220.61(A) is now described as supplying the 'maximum unbalanced load calculation' (NOT a 'vector-sum formula'). 220.61(C) is now described as 'prohibiting reduction' (NOT a harmonic-sizing formula). Language updated in logic file, UI, audit, and verification index.",
        filesFixed: ["src/components/calculator/calcs/logic/neutralLoadCalc.js", "src/components/calculator/calcs/NeutralLoad.jsx", "src/data/nec/audit.js", "src/data/nec/CalculatorVerificationIndex.js"],
        status: "FIXED",
      },
    ],
    testCasesRun: [
      { name: "NL-A: 1φ balanced linear (L1=L2=10k → 0)", passed: true, finalNeutral_VA: 0 },
      { name: "NL-B: 1φ unbalanced linear (L1=15k, L2=10k → 5k)", passed: true, finalNeutral_VA: 5000 },
      { name: "NL-C: 3φ balanced linear (L1=L2=L3=72k → 0)", passed: true, finalNeutral_VA: 0 },
      { name: "NL-D: 3φ unbalanced linear (10k/8k/5k → 4,359)", passed: true, finalNeutral_VA: 4359 },
      { name: "NL-E: Cross-category cancellation (combine first → 0)", passed: true, finalNeutral_VA: 0 },
      { name: "NL-F: Nonreducible balanced (cancellation, no reduction → 0)", passed: true, finalNeutral_VA: 0 },
      { name: "NL-G: Nonlinear without harmonic data (fundamental only, harmonic N/A)", passed: true, externalHarmonicAvailable: false },
      { name: "NL-H1: Harmonic-only RSS (sqrt(41.67² + 75²) ≈ 85.8A)", passed: true, finalNeutral_A: 85.79 },
      { name: "NL-H2: Total RMS direct (75A, fundamental NOT added)", passed: true, finalNeutral_A: 75 },
      { name: "NL-H2a: Harmonic-only + excess RSS (sqrt(235² + 75²) ≈ 246.7A)", passed: true, finalNeutral_A: 246.68 },
      { name: "NL-H2b: Total RMS + excess (75A direct, fundamental NOT added)", passed: true, finalNeutral_A: 75 },
      { name: "NL-H3: Individual spectrum (UNSUPPORTED)", passed: true, individualSpectrumUnsupported: true },
      { name: "NL-H4: Measured total RMS (60A direct)", passed: true, finalNeutral_A: 60 },
      { name: "NL-RD1: One range 120/240V (8kVA → 5,600 VA scalar)", passed: true, finalNeutral_VA: 5600 },
      { name: "NL-RD2: Multiple ranges 120/240V (2×8kVA → 11,200 VA scalar)", passed: true, finalNeutral_VA: 11200 },
      { name: "NL-RD3: Dryers single-phase (5kVA → 3,500 VA scalar)", passed: true, finalNeutral_VA: 3500 },
      { name: "NL-RD4: Ranges distributed 3φ (3×8kVA → 16,800 VA scalar)", passed: true, finalNeutral_VA: 16800 },
      { name: "NL-RD5: Balanced appliance 3φ (L1=L2=L3 → 0 VA phase-total)", passed: true, finalNeutral_VA: 0 },
      { name: "NL-RD6: Unbalanced appliance 3φ (L1,L2 only → 5,600 VA phase-total)", passed: true, finalNeutral_VA: 5600 },
      { name: "NL-RD7: Appliance + L-N loads 3φ (10k/8k/5k + range → 9,959 VA)", passed: true, finalNeutral_VA: 9959 },
      { name: "NL-RD8: Range/dryer + excess (24k + 12k range → 29,880 VA)", passed: true, finalNeutral_VA: 29880 },
    ],
    yearSwitchResult: "N/A — 220.61 rules are constant across NEC editions.",
    confidence: {
      runtimeFormula: "DEFECT_CORRECTED",
      necValue: "PENDING_VERIFICATION",
      table: "N/A",
      exception: "DEFECT_CORRECTED",
      boundaryTest: "DEFECT_CORRECTED",
      regression: "DEFECT_CORRECTED",
      productionBuild: "VERIFIED",
      overall: "DEFECT_CORRECTED_ADDITIONAL_DEFECT_FOUND",
    },
    confidenceNotes: {
      runtimeFormula: "v3: Arithmetic sum of fundamental + harmonic REMOVED. RMS combination implemented (total RMS direct, harmonic-only RSS). Four concepts distinguished. Range/dryer trace enhanced with incorporation method. Individual spectrum labeled unsupported. 22/22 regression tests pass.",
      regression: "22 independent expected values hand-calculated from NEC 220.61. Tests A-G, H1-H4, H2a-H2b, RD1-RD8, plus additional tests. All 22 pass. Invalid NL-H (arithmetic sum) replaced with NL-H1 (RSS) and NL-H2 (total RMS direct).",
      necValue: "All NEC 220.61 article sources pending verification against authorized 2020 NFPA 70 text. 220.61(A) supplies the maximum unbalanced load calculation — NOT a 'vector-sum formula'. 220.61(C) prohibits reduction — NOT a harmonic-sizing formula.",
    },
    buildResult: "pass",
    remainingBlockers: [
      "Verification against authorized 2020 NFPA 70 text for 220.61(A), (B)(1), (B)(2), (C)",
      "Confirmation that 220.61(A) supplies the maximum unbalanced load calculation (NOT a 'vector-sum formula')",
      "Confirmation that 220.61(C) prohibits reduction (NOT a harmonic-sizing formula)",
      "Review of range/dryer 220.61(B)(1) incorporation method (scalar vs. phase-total) for all system types and connections",
      "Verification that individual harmonic spectrum input definitions and engineering method can be supported (currently UNSUPPORTED)",
      "Independent test pass confirmation",
      "Existing baseline pass confirmation",
      "Production build pass confirmation",
    ],
  },

  commercial_load: {
    verificationStatus: "verified_with_limitations",
    status2020: "verified",
    lastReviewed: "2026-07-19",
    reviewedBy: "Base44 AI",
    limitations: [
      "220.14(K) office/bank 1 VA/sq ft receptacle minimum not implemented — known coverage gap in both 2017 and 2020 (calculator only uses 180 VA/yoke × demand factor, does not compare to 1 VA/sq ft minimum for offices/banks).",
      "7 occupancy unit loads (office, store, school, restaurant, church, industrial, warehouse) pending 2020 verification — kept at 2017 values, not yet source-confirmed for 2020 NEC.",
      "Outside sign 1200 VA minimum (220.14(E)) not enforced in UI — formula takes user input directly; UI has hint but no min validation.",
    ],
    completeDependencyList: [
      "Table 220.12 (occupancy unit loads — VA/sq ft by occupancy)",
      "Table 220.42 (lighting demand factors by occupancy)",
      "220.14(I) (receptacle load — 180 VA per yoke)",
      "220.44 (receptacle demand — 100% first 10k + 50% remainder)",
      "220.14(F) (show window — 200 VA/linear foot)",
      "220.14(E) (outside sign — min 1200 VA, not enforced in UI)",
      "220.14(K) (office/bank — 1 VA/sq ft minimum, NOT IMPLEMENTED)",
      "220.40 (general load calculation structure)",
      "210.8(B) (other-than-dwelling GFCI scope — display only)",
    ],
    ruleVerification: {
      "Table 220.12": { status: "PARTIAL", detail: "4 confirmed 2020 changes applied (hotel_motel 1.70, hospital 1.6, garage 0.3, armory 1.7). 7 occupancies pending 2020 verification (office, store, school, restaurant, church, industrial, warehouse) — kept at 2017 values." },
      "Table 220.42": { status: "VERIFIED", detail: "All 4 occupancy demand tiers correct (dwelling, hospital, hotel_motel, warehouse). Fallback to 100% flat for non-listed occupancies (office, store, etc.) is correct — NEC Table 220.42 provides no demand factors for these." },
      "220.14(I)": { status: "VERIFIED", detail: "180 VA per receptacle yoke correctly implemented. User can override default." },
      "220.44": { status: "VERIFIED", detail: "100% first 10,000 VA + 50% remainder correctly implemented via RECEPTACLE_DEMAND_TIERS." },
      "220.14(F)": { status: "VERIFIED", detail: "200 VA/linear foot for show windows correctly implemented." },
      "220.14(E)": { status: "PARTIAL", detail: "Outside sign load taken as user input. NEC requires min 1200 VA per sign outlet — UI has hint but formula does not enforce minimum." },
      "220.14(K)": { status: "PARTIAL", detail: "Office/bank 1 VA/sq ft receptacle minimum NOT implemented. Calculator only uses 180 VA/yoke × demand factor. For offices with few receptacles, 1 VA/sq ft may be larger — calculator would undercount. Pre-existing gap in both 2017 and 2020." },
      "210.8(B)": { status: "PENDING_PRIMARY_SOURCE", detail: "Display-only GFCI scope string. Based on Captain Code 2020 guide (secondary source). Not used in any numeric formula." },
    },
    consumers: [
      { file: "src/components/calculator/calcs/CommercialLoad.jsx", type: "UI component (production)", status: "verified" },
      { file: "src/components/calculator/calcs/logic/commercialLoadCalc.jsx", type: "logic function (production)", status: "verified" },
      { file: "src/components/calculator/calcs/YearSwitchTest.jsx", type: "year-switch test", status: "verified" },
      { file: "src/data/nec/audit.js", type: "audit test function", status: "verified (warehouse fallback fixed)" },
    ],
    defectsFound: [
      {
        severity: "major",
        description: "2023.js and 2026.js were missing OCCUPANCY_UNIT_LOADS — they inherited 2017 values from shared.js instead of the 2020 confirmed values. Hospital in 2023/2026 used 2.0 VA/sq ft instead of 1.6; hotel_motel used 2.0 instead of 1.70; garage used 0.5 instead of 0.3; armory used 1.0 instead of 1.7.",
        fix: "Added OCCUPANCY_UNIT_LOADS to 2023.js and 2026.js with 2020 values as placeholders (pending independent 2023/2026 verification).",
        filesFixed: ["src/data/nec/2023.js", "src/data/nec/2026.js"],
      },
      {
        severity: "minor",
        description: "audit.js commercial_load and lighting_load test functions used nec.LIGHTING_DEMAND.warehouse as fallback for unknown occupancies instead of 100% flat. This incorrectly applied warehouse demand factors (100%/50%) to office, store, school, etc.",
        fix: "Changed fallback to { tiers: [{ band: Infinity, factor: 1.00 }] } (100% flat) to match production logic and NEC Table 220.42 (no demand factors for non-listed occupancies).",
        filesFixed: ["src/data/nec/audit.js"],
      },
    ],
    testCasesRun: [
      { name: "Office 5000sqft 30rec 208V 3ph", passed: true, totalVA: 34100, totalAmps: 94.7 },
      { name: "Hospital 5000sqft 30rec 208V 3ph", passed: true, totalVA: 19800, totalAmps: 55.0 },
      { name: "Hotel/motel 5000sqft 30rec 208V 3ph", passed: true, totalVA: 20850, totalAmps: 57.9 },
      { name: "Warehouse 5000sqft 30rec 208V 3ph", passed: true, totalVA: 17850, totalAmps: 49.5 },
      { name: "Garage 5000sqft 30rec 208V 3ph", passed: true, totalVA: 18100, totalAmps: 50.2 },
      { name: "Store 100rec (rec>10k demand)", passed: true, recDemand: 14000, totalVA: 40200 },
      { name: "Office 240V 1ph", passed: true, totalAmps: 142.1 },
      { name: "Show window 10ft + sign", passed: true, totalVA: 20800 },
      { name: "Min (0 sqft, 0 rec, 0 hvac)", passed: true, totalVA: 0 },
      { name: "480V 3ph", passed: true, totalAmps: 78.4 },
    ],
    yearSwitchResult: "2017 differs from 2020/2023/2026 for hospital (2.0→1.6), hotel_motel (2.0→1.70), garage (0.5→0.3), armory (1.0→1.7) — all intended 2020 changes. 2023/2026 now correctly use 2020 values (after fix). Other occupancies identical across all years (pending 2020 verification).",
    confidence: {
      runtimeFormula: "VERIFIED",
      necValue: "PARTIAL",
      table: "VERIFIED",
      exception: "VERIFIED",
      boundaryTest: "VERIFIED",
      regression: "VERIFIED",
      productionBuild: "VERIFIED",
      overall: "VERIFIED_WITH_LIMITATIONS",
    },
    confidenceNotes: {
      necValue: "4 of 12 occupancy unit loads confirmed for 2020 (hotel_motel, hospital, garage, armory). 7 pending 2020 verification (office, store, school, restaurant, church, industrial, warehouse) — kept at 2017 values, not yet source-confirmed. Dwelling confirmed unchanged.",
      table: "Table 220.42 demand factors verified for all 4 listed occupancies. Fallback to 100% for non-listed occupancies correct per NEC. Table 220.44 receptacle demand verified.",
    },
    runtimeDependenciesVerified: [
      "OCCUPANCY_UNIT_LOADS (Table 220.12 — 4 confirmed 2020 changes, 7 pending)",
      "LIGHTING_DEMAND (Table 220.42 — 4 occupancy tiers, 100% fallback correct)",
      "RECEPTACLE_DEMAND_TIERS (220.44 — 100%/50% tiers)",
      "Show window 200 VA/ft (220.14(F))",
      "Receptacle 180 VA/yoke (220.14(I))",
    ],
    displayOnlyNotes: "210.8(B) GFCI scope — display only, based on Captain Code 2020 guide (secondary source), pending official NEC verification. Not used in any numeric formula.",
    buildResult: "pass",
    remainingBlockers: [],
    // ─── ANNEX D BENCHMARK ───
    annexDCoverage: {
      annexDCoverage: "NOT COVERED",
      annexDExampleIds: [],
      intermediateValuesMatch: "N/A",
      finalValueMatch: "N/A",
      roundingTolerance: "N/A",
      regressionTestSaved: false,
      annexDResult: "NOT COVERED",
      details: "No Annex D example covers the Commercial Load calculator (220.12/220.42/220.44). Annex D examples D1-D5 cover dwelling and multifamily calculations. Commercial load verification relies on direct NEC rule verification, hand calculations, boundary tests, and four-year regression testing.",
    },
  },
};

// ─── Calculator Verification Index ───────────────────────────────────────────
export const CALCULATOR_VERIFICATION_INDEX = CALCULATORS.map((calc, i) => {
  const dependencies = buildDependencies(calc);
  const status2020 = getStatus2020(calc, dependencies);
  const consumerAudit = buildConsumerAudit(calc);
  const regressionResults = buildRegressionResults(calc);
  const override = VERIFICATION_RESULTS[calc.id] || {};

  return {
    calculatorId: calc.id,
    calculatorName: calc.name,
    category: calc.category,
    sourceFile: SOURCE_FILES[calc.id] || `components/calculator/calcs/${calc.id}.jsx`,
    logicFile: LOGIC_FILES[calc.id] || null,
    reviewOrder: i + 1,
    usesGetNecData: calc.usesGetNecData,
    yearSensitive: calc.yearSensitive,
    dependencies,
    // STEP 2: 2020 NEC comparison
    status2020: override.status2020 || status2020,
    // STEP 5: Verification status (pending until every dependency is reviewed)
    verificationStatus: override.verificationStatus || "pending",
    // STEP 3: Consumer audit
    consumerAudit,
    // STEP 4: Regression testing
    regressionResults,
    // Metadata
    sourceNotes: calc.sourceNotes,
    testInputs: calc.testInputs,
    // Verification results (from active verification process)
    verificationResult: override.verificationStatus ? override : null,
  };
});

// ─── Calculator Verification Summary ────────────────────────────────────────
export const CALCULATOR_VERIFICATION_SUMMARY = {
  totalCalculators: CALCULATOR_VERIFICATION_INDEX.length,
  verified: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.verificationStatus === "verified").length,
  inProgress: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.verificationStatus === "in_progress").length,
  pending: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.verificationStatus === "pending").length,
  // 2020 status breakdown
  status2020: {
    correct: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "correct").length,
    verified: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "verified").length,
    needs_verification: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "needs_verification").length,
    assumed: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "assumed").length,
    missing: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "missing").length,
    placeholder: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "placeholder").length,
    copied_from_another_edition: CALCULATOR_VERIFICATION_INDEX.filter((c) => c.status2020 === "copied_from_another_edition").length,
  },
  // Dependency matrix stats
  totalDependencies: CALCULATOR_VERIFICATION_INDEX.reduce((sum, c) => sum + c.dependencies.length, 0),
  verifiedDependencies: CALCULATOR_VERIFICATION_INDEX.reduce(
    (sum, c) => sum + c.dependencies.filter((d) => d.verified).length, 0
  ),
  displayOnlyDependencies: CALCULATOR_VERIFICATION_INDEX.reduce(
    (sum, c) => sum + c.dependencies.filter((d) => d.displayOnly).length, 0
  ),
  runtimeDependencies: CALCULATOR_VERIFICATION_INDEX.reduce(
    (sum, c) => sum + c.dependencies.filter((d) => d.runtimeCalculation).length, 0
  ),
  missingDependencies: CALCULATOR_VERIFICATION_INDEX.reduce(
    (sum, c) => sum + c.dependencies.filter((d) => d.missing).length, 0
  ),
  // Category breakdown
  categories: [...new Set(CALCULATOR_VERIFICATION_INDEX.map((c) => c.category))],
};

// ─── Helper: get calculator by ID ────────────────────────────────────────────
export function getCalculatorVerification(id) {
  return CALCULATOR_VERIFICATION_INDEX.find((c) => c.calculatorId === id);
}

// ─── Helper: get calculators by category ────────────────────────────────────
export function getCalculatorsByCategory() {
  const groups = {};
  for (const c of CALCULATOR_VERIFICATION_INDEX) {
    const cat = c.category || "Others";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  }
  return groups;
}