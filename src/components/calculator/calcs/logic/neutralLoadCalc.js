/**
 * Neutral Load — NEC 220.61 (2020 NEC primary source)
 *
 * REDESIGNED (v3): Addresses additional defects found in review:
 *   1. REMOVED unsupported arithmetic sum of fundamental + harmonic.
 *      The final neutral amperes is now combined via root-sum-square (RSS)
 *      for harmonic-only inputs, or taken directly for total-RMS inputs.
 *   2. Neutral study input now distinguishes FOUR value types:
 *      A. Total neutral RMS current (includes fundamental)
 *      B. Harmonic-only neutral RMS current
 *      C. Individual harmonic spectrum (UNSUPPORTED — labeled, requires total RMS)
 *      D. Measured total neutral RMS current
 *   3. Four concepts are clearly distinguished in output:
 *      - NEC-calculated maximum unbalanced fundamental load (220.61(A))
 *      - NEC-permitted neutral demand reduction (220.61(B))
 *      - Externally determined harmonic neutral current (NOT a 220.61 formula)
 *      - Final conductor design current (RMS combination)
 *   4. Range/dryer trace shows: appliance demand, permitted %, neutral portion,
 *      system type, connection, assigned legs, incorporation method, and
 *      resulting maximum unbalanced neutral load.
 *   5. 220.61(A) is NOT described as a "vector-sum formula" — it supplies the
 *      maximum unbalanced load calculation. 220.61(C) is NOT described as a
 *      harmonic-sizing formula — it prohibits reduction.
 *
 * ─── NEC 220.61 DEPENDENCY MATRIX ───────────────────────────────────
 *
 * 220.61(A) — Basic Calculation
 *   The feeder or service neutral load = maximum unbalance of the load.
 *   The maximum unbalanced load = maximum net calculated load between
 *   the neutral conductor and any one ungrounded conductor.
 *
 *   For 1φ 3W 120/240V:
 *     Loads on opposing legs CANCEL. Net unbalanced = |L1 - L2|.
 *     Line-to-line (240V) loads do not contribute to the neutral.
 *
 *   For 3φ 4W wye:
 *     Linear L-N loads cancel via vector summation (balanced = 0).
 *
 *   This subsection supplies the maximum unbalanced load calculation.
 *   It does NOT supply a harmonic-current formula.
 *
 * 220.61(B)(1) — Permitted Reduction: Cooking/Dryer
 *   Household ranges, wall ovens, counter-mounted cooking units, and
 *   electric dryers: the neutral load may be calculated at 70% of the
 *   demand factor (Tables 220.54/220.55).
 *   This is a PERMITTED reduction, not a formula for exact neutral current.
 *
 * 220.61(B)(2) — Permitted Reduction: Excess Over 200A
 *   70% demand factor on the portion of unbalanced load exceeding 200A.
 *   Applies to 3-wire DC/1φ AC, 4-wire 3φ, 3-wire 2φ, 5-wire 2φ systems.
 *   NOT applied to the nonlinear harmonic portion or nonreducible portion.
 *
 * 220.61(C) — Prohibited Reductions
 *   No reduction of neutral capacity for nonlinear loads on 3φ 4W wye.
 *   220.61(C) PROHIBITS reduction — it does NOT supply a formula
 *   for the exact nonlinear neutral current. The exact harmonic neutral
 *   current requires external input (harmonic study, equipment data,
 *   measurement, or manufacturer information).
 *
 * ─── LOAD CLASSIFICATION ────────────────────────────────────────────
 * linear_ln       — Linear L-N load (cancellable, reducible)
 * other_reducible — Other reducible L-N load (cancellable, reducible)
 * nonreducible    — Nonreducible L-N load (cancellable, NOT reducible)
 * range_dryer     — Range/dryer (70% per 220.61(B)(1), with appliance type,
 *                   connection, phase/legs, count)
 * line_to_line    — L-L load (excluded from neutral)
 *
 * ─── NEUTRAL STUDY INPUT ────────────────────────────────────────────
 * The externally determined harmonic neutral current is entered via
 * a neutral study with a value type and source:
 *   A. total_rms           — Total neutral RMS current (includes fundamental)
 *   B. harmonic_only_rms   — Harmonic-only neutral RMS current
 *   C. individual_spectrum — Individual harmonic spectrum (UNSUPPORTED)
 *   D. measured_total_rms  — Measured total neutral RMS current
 *
 * ─── RMS COMBINATION ────────────────────────────────────────────────
 * Total RMS / Measured Total RMS:
 *   finalConductorDesign_A = enteredTotalRmsA
 *   (Do NOT add the independently calculated fundamental current again)
 *
 * Harmonic-only RMS:
 *   finalConductorDesign_A = sqrt(necFundamentalNeutral_A² + harmonicOnlyRmsA²)
 *   (Root-sum-square, NOT arithmetic sum)
 *
 * Individual spectrum:
 *   finalConductorDesign_A = sqrt(fundamentalA² + h3² + h5² + h7² + ...)
 *   (UNSUPPORTED — input definitions and engineering method not verified)
 *
 * ─── VERIFICATION STATUS ───────────────────────────────────────────
 * Source: 2020 NEC (NFPA 70-2020) — primary source per user requirement.
 * Status: DEFECT CORRECTED — ADDITIONAL DEFECT FOUND
 *   - Arithmetic sum of fundamental + harmonic REMOVED
 *   - RMS combination implemented (total RMS direct, harmonic-only RSS)
 *   - Four concepts distinguished in output
 *   - Range/dryer trace enhanced with incorporation method
 *   - Individual spectrum labeled unsupported
 * Pending: verification against authorized 2020 NFPA 70 text.
 */

import { withTrace } from "@/lib/calculatorTrace";

// ─── System type definitions ───────────────────────────────────────
export const SYSTEM_TYPES = {
  "1φ-3W 120/240V": {
    label: "1φ 3W 120/240V (Single-Phase)",
    lineToNeutralV: 120,
    is3PhaseWye: false,
    phases: ["L1", "L2"],
    phaseOptions: [
      { value: "L1", label: "L1 (120V)" },
      { value: "L2", label: "L2 (120V)" },
      { value: "L1-L2", label: "L1-L2 (240V)" },
    ],
  },
  "3φ-4W 208Y/120V": {
    label: "3φ 4W 208Y/120V (3-Phase Wye)",
    lineToNeutralV: 120,
    is3PhaseWye: true,
    phases: ["L1", "L2", "L3"],
    phaseOptions: [
      { value: "L1", label: "L1 (120V)" },
      { value: "L2", label: "L2 (120V)" },
      { value: "L3", label: "L3 (120V)" },
      { value: "L1-L2", label: "L1-L2 (208V)" },
      { value: "L1-L3", label: "L1-L3 (208V)" },
      { value: "L2-L3", label: "L2-L3 (208V)" },
      { value: "L1-L2-L3", label: "L1-L2-L3 (3φ)" },
    ],
  },
  "3φ-4W 480Y/277V": {
    label: "3φ 4W 480Y/277V (3-Phase Wye)",
    lineToNeutralV: 277,
    is3PhaseWye: true,
    phases: ["L1", "L2", "L3"],
    phaseOptions: [
      { value: "L1", label: "L1 (277V)" },
      { value: "L2", label: "L2 (277V)" },
      { value: "L3", label: "L3 (277V)" },
      { value: "L1-L2", label: "L1-L2 (480V)" },
      { value: "L1-L3", label: "L1-L3 (480V)" },
      { value: "L2-L3", label: "L2-L3 (480V)" },
      { value: "L1-L2-L3", label: "L1-L2-L3 (3φ)" },
    ],
  },
};

export const SYSTEM_TYPE_OPTIONS = Object.entries(SYSTEM_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// ─── Load type definitions ─────────────────────────────────────────
export const LOAD_TYPES = {
  linear_ln: { label: "Linear L-N", contributesToNeutral: true, cancellable: true, eligibleForExcess: true },
  other_reducible: { label: "Other Reducible L-N", contributesToNeutral: true, cancellable: true, eligibleForExcess: true },
  nonreducible: { label: "Nonreducible L-N", contributesToNeutral: true, cancellable: true, eligibleForExcess: false },
  range_dryer: { label: "Range/Dryer (70%)", contributesToNeutral: true, cancellable: false, eligibleForExcess: true, factor: 0.70 },
  line_to_line: { label: "Line-to-Line", contributesToNeutral: false, cancellable: false, eligibleForExcess: false },
};

export const LOAD_TYPE_OPTIONS = Object.entries(LOAD_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// ─── Appliance types for range/dryer ───────────────────────────────
export const APPLIANCE_TYPES = {
  range: "Range (Table 220.55)",
  dryer: "Dryer (Table 220.54)",
  wall_oven: "Wall Oven",
  cooktop: "Counter-Mounted Cooking Unit",
  other: "Other Cooking/Appliance",
};

export const APPLIANCE_TYPE_OPTIONS = Object.entries(APPLIANCE_TYPES).map(([key, val]) => ({
  value: key,
  label: val,
}));

// ─── Neutral study value types ─────────────────────────────────────
export const NEUTRAL_STUDY_VALUE_TYPES = {
  total_rms: "A. Total neutral RMS current",
  harmonic_only_rms: "B. Harmonic-only neutral RMS current",
  individual_spectrum: "C. Individual harmonic spectrum (UNSUPPORTED)",
  measured_total_rms: "D. Measured total neutral RMS current",
};

export const NEUTRAL_STUDY_VALUE_TYPE_OPTIONS = Object.entries(NEUTRAL_STUDY_VALUE_TYPES).map(([key, val]) => ({
  value: key,
  label: val,
}));

// ─── Neutral study sources ─────────────────────────────────────────
export const NEUTRAL_STUDY_SOURCES = {
  engineered_harmonic_study: "Engineered Harmonic Study",
  equipment_data: "Equipment Data",
  manufacturer_information: "Manufacturer Information",
  field_measurement: "Field Measurement",
};

export const NEUTRAL_STUDY_SOURCE_OPTIONS = Object.entries(NEUTRAL_STUDY_SOURCES).map(([key, val]) => ({
  value: key,
  label: val,
}));

// ─── Constants from NEC 220.61 ─────────────────────────────────────
const COOKING_DRYER_FACTOR = 0.70;
const EXCESS_THRESHOLD_AMPS = 200;
const EXCESS_FACTOR = 0.70;
const SQRT3_OVER_2 = Math.sqrt(3) / 2;

/**
 * 3φ 4W wye vector summation: |I_A + I_B∠-120° + I_C∠120°| × V
 * Returns the fundamental-frequency neutral VA.
 */
function vectorSum3ph(l1, l2, l3, V) {
  const i1 = l1 / V, i2 = l2 / V, i3 = l3 / V;
  const real = i1 - 0.5 * i2 - 0.5 * i3;
  const imag = SQRT3_OVER_2 * (i3 - i2);
  return Math.sqrt(real * real + imag * imag) * V;
}

/**
 * 1φ 3W net unbalanced: |L1 - L2| (opposing legs cancel)
 */
function netUnbalanced1ph(l1, l2) {
  return Math.abs(l1 - l2);
}

/**
 * Parse assigned legs from a connection string.
 * "L1" → ["L1"], "L1-L2" → ["L1", "L2"], "L1-L2-L3" → ["L1", "L2", "L3"]
 */
function parseLegs(connection) {
  if (!connection) return [];
  return connection.split("-").filter(l => l.startsWith("L"));
}

/**
 * Determine the incorporation method for a range/dryer neutral.
 * Single-phase (L-N) connections: added to phase total before vector calculation.
 * Two-phase/three-phase connections: scalar addition after vector calculation.
 */
function getIncorporationMethod(connection, is3ph) {
  const legs = parseLegs(connection);
  if (legs.length <= 1) {
    return {
      method: "phase_total",
      legs,
      description: `Added to ${legs[0] || "L1"} phase total before ${is3ph ? "vector calculation" : "|L1 - L2| calculation"}`,
    };
  }
  return {
    method: "scalar",
    legs,
    description: is3ph
      ? `Scalar addition to vector sum result — 70% factor is permitted reduction per 220.61(B)(1). Method of incorporation into vector sum pending verification against authorized NEC text.`
      : `Scalar addition to |L1 - L2| — 70% factor represents maximum unbalanced neutral contribution from appliance per 220.61(B)(1)`,
  };
}

/**
 * Calculate the feeder or service neutral load per NEC 220.61.
 *
 * @param {object} v - inputs
 *   v.systemType: "1φ-3W 120/240V" | "3φ-4W 208Y/120V" | "3φ-4W 480Y/277V"
 *   v.loads: [{ id, type, va, phase, applianceType?, count? }]
 *   v.neutralStudy: { valueType, source, totalRmsA, harmonicOnlyRmsA, harmonics }
 * @param {object} nec - NEC data (unused — 220.61 rules are constant)
 * @returns {object} calculation outputs + trace
 */
export function calcNeutralLoad(v, nec) {
  const systemType = v.systemType || "1φ-3W 120/240V";
  const sys = SYSTEM_TYPES[systemType] || SYSTEM_TYPES["1φ-3W 120/240V"];
  const V = sys.lineToNeutralV;
  const is3ph = sys.is3PhaseWye;

  // Parse and filter loads
  const loads = (v.loads || []).map(l => ({
    ...l,
    va: Math.max(0, parseFloat(l.va) || 0),
    count: Math.max(1, parseInt(l.count) || 1),
  })).filter(l => l.va > 0);

  // Group loads by type and phase
  const byTypePhase = {};
  for (const load of loads) {
    const type = load.type || "linear_ln";
    const phase = load.phase || "L1";
    if (!byTypePhase[type]) byTypePhase[type] = {};
    if (!byTypePhase[type][phase]) byTypePhase[type][phase] = 0;
    byTypePhase[type][phase] += load.va * (type === "range_dryer" ? load.count : 1);
  }

  // ─── Step 1: Range/dryer at 70% (220.61(B)(1)) ─────────────────
  // Split into phase-total and scalar incorporation
  const rangeDryerItems = loads.filter(l => l.type === "range_dryer");
  let rangeDryerTotalDemandVA = 0;
  let rangeDryerNeutralPhaseTotal = 0;  // added to phase totals
  let rangeDryerNeutralScalar = 0;      // added as scalar after vector
  const rangeDryerDetails = [];
  const rangeDryerPhaseAdditions = {};  // phase -> VA added

  for (const ph of sys.phases) rangeDryerPhaseAdditions[ph] = 0;

  for (const rd of rangeDryerItems) {
    const demand = rd.va * rd.count;
    const neutral = demand * COOKING_DRYER_FACTOR;
    rangeDryerTotalDemandVA += demand;
    const inc = getIncorporationMethod(rd.phase, is3ph);
    const detail = {
      applianceType: rd.applianceType || "range",
      applianceLabel: APPLIANCE_TYPES[rd.applianceType] || "Range",
      demandVA: Math.round(demand),
      neutralPercentage: COOKING_DRYER_FACTOR,
      neutralVA: Math.round(neutral),
      connection: rd.phase,
      assignedLegs: inc.legs,
      count: rd.count,
      systemType: sys.label,
      incorporationMethod: inc.method,
      incorporationDescription: inc.description,
    };
    rangeDryerDetails.push(detail);

    if (inc.method === "phase_total" && inc.legs[0]) {
      rangeDryerPhaseAdditions[inc.legs[0]] += neutral;
      rangeDryerNeutralPhaseTotal += neutral;
    } else {
      rangeDryerNeutralScalar += neutral;
    }
  }

  // ─── Step 2: Combine reducible linear loads per phase ──────────
  // linear_ln + other_reducible + range_dryer (phase-total) COMBINED
  const reduciblePhase = {};
  for (const ph of sys.phases) {
    reduciblePhase[ph] = (byTypePhase.linear_ln?.[ph] || 0)
                       + (byTypePhase.other_reducible?.[ph] || 0)
                       + rangeDryerPhaseAdditions[ph];
  }

  // ─── Step 3: Vector-calculate reducible linear neutral (ONE vector) ──
  let reducibleLinearNeutralVA;
  if (is3ph) {
    reducibleLinearNeutralVA = vectorSum3ph(
      reduciblePhase.L1 || 0, reduciblePhase.L2 || 0, reduciblePhase.L3 || 0, V
    );
  } else {
    reducibleLinearNeutralVA = netUnbalanced1ph(
      reduciblePhase.L1 || 0, reduciblePhase.L2 || 0
    );
  }

  // Add scalar range/dryer neutrals
  const reducibleLinearWithScalarVA = reducibleLinearNeutralVA + rangeDryerNeutralScalar;

  // ─── Step 4: Combine nonreducible linear loads per phase ────────
  const nonreduciblePhase = {};
  for (const ph of sys.phases) {
    nonreduciblePhase[ph] = byTypePhase.nonreducible?.[ph] || 0;
  }

  // ─── Step 5: Vector-calculate nonreducible linear neutral ──────
  let nonreducibleLinearNeutralVA;
  if (is3ph) {
    nonreducibleLinearNeutralVA = vectorSum3ph(
      nonreduciblePhase.L1 || 0, nonreduciblePhase.L2 || 0, nonreduciblePhase.L3 || 0, V
    );
  } else {
    nonreducibleLinearNeutralVA = netUnbalanced1ph(
      nonreduciblePhase.L1 || 0, nonreduciblePhase.L2 || 0
    );
  }

  // ─── Step 6: Line-to-line (excluded from neutral) ─────────────
  let lineToLineVA = 0;
  const llByPhase = byTypePhase.line_to_line || {};
  for (const key in llByPhase) lineToLineVA += llByPhase[key];

  // ─── Step 7: NEC reducible portion ────────────────────────────
  // Reducible = fundamental linear neutral (with phase-total range/dryer)
  //           + scalar range/dryer neutral
  const reducibleVA = reducibleLinearWithScalarVA;
  const reducibleAmps = reducibleVA / V;

  // ─── Step 8: NEC excess > 200A reduction (reducible only) ─────
  let excessReductionApplied = false;
  let excessAmps = 0;
  let excessReducedAmps = 0;
  let permittedReductionA = 0;
  let reducedVA = reducibleVA;

  if (reducibleAmps > EXCESS_THRESHOLD_AMPS) {
    excessAmps = reducibleAmps - EXCESS_THRESHOLD_AMPS;
    excessReducedAmps = excessAmps * EXCESS_FACTOR;
    permittedReductionA = excessAmps - excessReducedAmps;
    const reducedAmps = EXCESS_THRESHOLD_AMPS + excessReducedAmps;
    reducedVA = reducedAmps * V;
    excessReductionApplied = true;
  }

  // ─── Step 9: NEC non-reducible portion ────────────────────────
  const nonReducibleVA = nonreducibleLinearNeutralVA;

  // ─── Step 10: NEC fundamental neutral (after reductions) ──────
  const necFundamentalNeutralVA = reducedVA + nonReducibleVA;
  const necFundamentalNeutralA = necFundamentalNeutralVA / V;

  // ─── Step 11: External harmonic neutral (from neutral study) ──
  // NOT a 220.61 formula — externally determined
  const neutralStudy = v.neutralStudy || {};
  const valueType = neutralStudy.valueType || "";
  const source = neutralStudy.source || "";
  const sourceLabel = NEUTRAL_STUDY_SOURCES[source] || "";

  let externalHarmonicNeutralA = 0;
  let externalHarmonicAvailable = false;
  let rssComponents = [];
  let individualSpectrumUnsupported = false;
  let totalRmsDirect = false;

  if (valueType === "total_rms" || valueType === "measured_total_rms") {
    externalHarmonicNeutralA = Math.max(0, parseFloat(neutralStudy.totalRmsA) || 0);
    externalHarmonicAvailable = externalHarmonicNeutralA > 0;
    totalRmsDirect = externalHarmonicAvailable;
  } else if (valueType === "harmonic_only_rms") {
    externalHarmonicNeutralA = Math.max(0, parseFloat(neutralStudy.harmonicOnlyRmsA) || 0);
    externalHarmonicAvailable = externalHarmonicNeutralA > 0;
  } else if (valueType === "individual_spectrum") {
    individualSpectrumUnsupported = true;
    externalHarmonicAvailable = false;
  }

  // ─── Step 12: RMS combination — final conductor design current ─
  let finalConductorDesignA;
  let rmsCombinationMethod = "";

  if (!externalHarmonicAvailable) {
    // No external harmonic — final = NEC fundamental
    finalConductorDesignA = necFundamentalNeutralA;
    rmsCombinationMethod = "No external harmonic data — final = NEC fundamental neutral";
  } else if (totalRmsDirect) {
    // Total RMS — use entered value directly, do NOT add fundamental
    finalConductorDesignA = externalHarmonicNeutralA;
    rmsCombinationMethod = "Total RMS direct — entered value includes all fundamental and harmonic components";
  } else {
    // Harmonic-only — RSS combination
    finalConductorDesignA = Math.sqrt(
      necFundamentalNeutralA * necFundamentalNeutralA + externalHarmonicNeutralA * externalHarmonicNeutralA
    );
    rssComponents = [
      { label: "NEC fundamental neutral", amps: necFundamentalNeutralA },
      { label: "Harmonic-only neutral", amps: externalHarmonicNeutralA },
    ];
    rmsCombinationMethod = "Root-sum-square: sqrt(fundamental² + harmonic-only²)";
  }

  const finalConductorDesignVA = finalConductorDesignA * V;

  // ─── Calculation limitations ────────────────────────────────────
  const limitations = [];
  if (!externalHarmonicAvailable && valueType !== "individual_spectrum") {
    limitations.push(
      "No external harmonic neutral current entered. The calculated neutral does NOT include harmonic neutral current. A harmonic study, equipment data, or measured neutral current is required for nonlinear loads (220.61(C))."
    );
  }
  if (individualSpectrumUnsupported) {
    limitations.push(
      "Individual harmonic spectrum mode is UNSUPPORTED. Input definitions and engineering method cannot be verified. Enter a total RMS value instead."
    );
  }
  limitations.push(
    "The NEC-calculated fundamental neutral (220.61(A)) is the maximum unbalanced load at fundamental frequency. Harmonic neutral current (triplen harmonics) is externally determined — not derived from phase VA."
  );
  if (totalRmsDirect) {
    limitations.push(
      "Entered value is treated as the complete neutral RMS current, including all fundamental and harmonic components. The independently calculated NEC fundamental is NOT added again."
    );
  }
  if (is3ph) {
    limitations.push(
      "220.61(C) prohibits reduction for nonlinear loads on 3φ 4W wye. The exact nonlinear neutral current requires external input — it is not calculated from phase VA alone."
    );
  }
  if (rangeDryerItems.length > 0) {
    limitations.push(
      "Range/dryer neutral is calculated at 70% of demand per 220.61(B)(1). This is a permitted reduction, not an exact neutral current formula. The method of incorporation (scalar vs. phase-total) depends on the connection and pending verification against authorized NEC text."
    );
  }

  // ─── Build calculation trace ────────────────────────────────────
  const steps = [];

  steps.push({
    label: "System Configuration",
    formula: `${sys.label}`,
    expression: `Line-to-neutral voltage = ${V}V`,
    result: V,
    unit: "V",
  });

  // Reducible linear combined by phase
  const redPhaseStr = is3ph
    ? `L1=${Math.round(reduciblePhase.L1 || 0)}, L2=${Math.round(reduciblePhase.L2 || 0)}, L3=${Math.round(reduciblePhase.L3 || 0)}`
    : `L1=${Math.round(reduciblePhase.L1 || 0)}, L2=${Math.round(reduciblePhase.L2 || 0)}`;
  steps.push({
    label: "Reducible Linear Loads — Combined by Phase",
    formula: "linear_ln + other_reducible + range_dryer (phase-total) combined per phase BEFORE calculation",
    expression: redPhaseStr,
    result: Math.round((reduciblePhase.L1 || 0) + (reduciblePhase.L2 || 0) + (reduciblePhase.L3 || 0)),
    unit: "VA",
    note: "Phase loads are combined first, then ONE calculation is performed. Range/dryer with single-phase (L-N) connections are added to phase totals here.",
  });

  // Fundamental linear neutral (vector)
  steps.push({
    label: "Fundamental Linear Neutral (220.61(A))",
    formula: is3ph
      ? "Maximum unbalanced load — vector summation of phase currents"
      : "Maximum unbalanced load — |L1 - L2| (loads on opposing legs cancel)",
    expression: is3ph
      ? `|${Math.round(reduciblePhase.L1 || 0)}/${V} + ${Math.round(reduciblePhase.L2 || 0)}/${V}∠-120° + ${Math.round(reduciblePhase.L3 || 0)}/${V}∠120°| × ${V}`
      : `|${Math.round(reduciblePhase.L1 || 0)} - ${Math.round(reduciblePhase.L2 || 0)}|`,
    result: Math.round(reducibleLinearNeutralVA),
    unit: "VA",
    note: is3ph
      ? "Balanced 3φ linear load produces zero neutral current. This is the maximum unbalanced load at fundamental frequency only."
      : "Loads on opposing legs of a 1φ 3W center-tapped system cancel. This is the maximum unbalanced load at fundamental frequency only.",
  });

  // Scalar range/dryer addition
  if (rangeDryerNeutralScalar > 0) {
    steps.push({
      label: "Range/Dryer Scalar Addition (220.61(B)(1))",
      formula: "Two-phase/three-phase range/dryer neutrals added as scalar",
      expression: `${Math.round(reducibleLinearNeutralVA)} + ${Math.round(rangeDryerNeutralScalar)}`,
      result: Math.round(reducibleLinearWithScalarVA),
      unit: "VA",
      note: "Range/dryer with two-phase or three-phase connections: 70% neutral added as scalar to the maximum unbalanced load result. Method pending verification against authorized NEC text.",
    });
  }

  // Range/dryer details
  if (rangeDryerItems.length > 0) {
    steps.push({
      label: "Range/Dryer Details (220.61(B)(1))",
      formula: "Each appliance: demand × 70% × count, with connection and incorporation method",
      expression: rangeDryerDetails.map(d =>
        `${d.applianceLabel}: ${d.demandVA} × 70% = ${d.neutralVA} VA (conn: ${d.connection}, legs: ${d.assignedLegs.join("-")}, method: ${d.incorporationMethod})`
      ).join("; "),
      result: Math.round(rangeDryerTotalDemandVA * COOKING_DRYER_FACTOR),
      unit: "VA",
      note: "70% is a PERMITTED reduction. Each entry shows demand, permitted %, neutral portion, system type, connection, assigned legs, and incorporation method.",
    });
  }

  // Nonreducible linear
  if (nonreducibleLinearNeutralVA > 0 || byTypePhase.nonreducible) {
    const nrPhaseStr = is3ph
      ? `L1=${Math.round(nonreduciblePhase.L1 || 0)}, L2=${Math.round(nonreduciblePhase.L2 || 0)}, L3=${Math.round(nonreduciblePhase.L3 || 0)}`
      : `L1=${Math.round(nonreduciblePhase.L1 || 0)}, L2=${Math.round(nonreduciblePhase.L2 || 0)}`;
    steps.push({
      label: "Nonreducible Linear Neutral (220.61(A))",
      formula: is3ph
        ? "Maximum unbalanced load of nonreducible L-N loads (cancellation applies, NO demand reduction)"
        : "|L1 - L2| for nonreducible loads (cancellation applies, NO demand reduction)",
      expression: nrPhaseStr,
      result: Math.round(nonreducibleLinearNeutralVA),
      unit: "VA",
      note: '"Nonreducible" = not eligible for demand reduction, NOT "noncancelling". Phase cancellation still applies.',
    });
  }

  // Line-to-line
  if (lineToLineVA > 0) {
    steps.push({
      label: "Line-to-Line Loads (Excluded)",
      formula: "L-L loads do not contribute to the neutral",
      expression: `${Math.round(lineToLineVA)}`,
      result: 0,
      unit: "VA",
      note: "Line-to-line (240V/480V) loads are excluded from the neutral calculation per 220.61(A).",
    });
  }

  // NEC reducible portion
  steps.push({
    label: "NEC Reducible Portion (eligible for excess reduction)",
    formula: "Fundamental linear neutral (with phase-total range/dryer) + scalar range/dryer",
    expression: `${Math.round(reducibleLinearNeutralVA)} + ${Math.round(rangeDryerNeutralScalar)}`,
    result: Math.round(reducibleVA),
    unit: "VA",
  });

  // NEC non-reducible portion
  steps.push({
    label: "NEC Non-Reducible Portion (no excess reduction)",
    formula: "Nonreducible linear neutral",
    expression: `${Math.round(nonReducibleVA)}`,
    result: Math.round(nonReducibleVA),
    unit: "VA",
  });

  // Excess reduction
  if (excessReductionApplied) {
    steps.push({
      label: "NEC Reducible Current Before Excess Reduction",
      formula: "Amps = reducible VA ÷ line-to-neutral voltage",
      expression: `${Math.round(reducibleVA)} ÷ ${V}`,
      result: Math.round(reducibleAmps * 100) / 100,
      unit: "A",
    });
    steps.push({
      label: "Excess Over 200A (220.61(B)(2))",
      formula: "Excess = reducible amps − 200",
      expression: `${Math.round(reducibleAmps * 100) / 100} − ${EXCESS_THRESHOLD_AMPS}`,
      result: Math.round(excessAmps * 100) / 100,
      unit: "A",
    });
    steps.push({
      label: "Excess Reduction (70%)",
      formula: "Reduced excess = excess × 70%",
      expression: `${Math.round(excessAmps * 100) / 100} × ${EXCESS_FACTOR}`,
      result: Math.round(excessReducedAmps * 100) / 100,
      unit: "A",
    });
    steps.push({
      label: "NEC-Permitted Reduction",
      formula: "Reduction = excess − reduced excess",
      expression: `${Math.round(excessAmps * 100) / 100} − ${Math.round(excessReducedAmps * 100) / 100}`,
      result: Math.round(permittedReductionA * 100) / 100,
      unit: "A",
      note: "NEC-permitted neutral demand reduction per 220.61(B)(2). Applied to reducible portion only.",
    });
    steps.push({
      label: "Reduced Reducible Portion",
      formula: "Final reducible amps = 200 + reduced excess",
      expression: `${EXCESS_THRESHOLD_AMPS} + ${Math.round(excessReducedAmps * 100) / 100}`,
      result: Math.round(reducedVA),
      unit: "VA",
      note: `Final reducible amps = ${Math.round((EXCESS_THRESHOLD_AMPS + excessReducedAmps) * 100) / 100}A`,
    });
  }

  // NEC fundamental neutral
  steps.push({
    label: "NEC Fundamental Neutral (220.61(A) + 220.61(B))",
    formula: "Reduced reducible + non-reducible",
    expression: `${Math.round(reducedVA)} + ${Math.round(nonReducibleVA)}`,
    result: Math.round(necFundamentalNeutralVA),
    unit: "VA",
    note: "NEC-calculated maximum unbalanced fundamental load after permitted reductions.",
    highlight: true,
  });
  steps.push({
    label: "NEC Fundamental Neutral Current",
    formula: "NEC fundamental VA ÷ line-to-neutral voltage",
    expression: `${Math.round(necFundamentalNeutralVA)} ÷ ${V}`,
    result: Math.round(necFundamentalNeutralA * 100) / 100,
    unit: "A",
    highlight: true,
  });

  // External harmonic neutral
  if (externalHarmonicAvailable) {
    if (totalRmsDirect) {
      steps.push({
        label: "External Harmonic Neutral — Total RMS (NOT a 220.61 formula)",
        formula: `User-entered total neutral RMS current (${valueType === "measured_total_rms" ? "measured" : "study"})`,
        expression: `${externalHarmonicNeutralA} A (source: ${sourceLabel})`,
        result: Math.round(externalHarmonicNeutralA * 100) / 100,
        unit: "A",
        note: "Externally determined — NOT a 220.61 formula. Entered value includes all fundamental and harmonic components. The independently calculated NEC fundamental is NOT added again.",
      });
    } else {
      steps.push({
        label: "External Harmonic Neutral — Harmonic-Only RMS (NOT a 220.61 formula)",
        formula: "User-entered harmonic-only neutral RMS current",
        expression: `${externalHarmonicNeutralA} A (source: ${sourceLabel})`,
        result: Math.round(externalHarmonicNeutralA * 100) / 100,
        unit: "A",
        note: "Externally determined — NOT a 220.61 formula. Contains harmonic current only. Combined with NEC fundamental via root-sum-square.",
      });
    }
  } else if (individualSpectrumUnsupported) {
    steps.push({
      label: "External Harmonic Neutral — Individual Spectrum (UNSUPPORTED)",
      formula: "Individual harmonic spectrum — input definitions not verified",
      expression: "UNSUPPORTED — enter total RMS value instead",
      result: 0,
      unit: "A",
      note: "Individual harmonic spectrum mode is unsupported. Input definitions and engineering method cannot be verified. Enter a total RMS value instead.",
    });
  } else if (is3ph) {
    steps.push({
      label: "External Harmonic Neutral — NOT AVAILABLE",
      formula: "220.61(C) prohibits reduction; no formula for exact harmonic current",
      expression: "Enter neutral study value (total RMS, harmonic-only RMS, or measured)",
      result: 0,
      unit: "A",
      note: "The exact nonlinear neutral current cannot be calculated from phase VA alone. External input required.",
    });
  }

  // RMS combination
  if (externalHarmonicAvailable) {
    if (totalRmsDirect) {
      steps.push({
        label: "Final Conductor Design Current — Total RMS Direct",
        formula: "finalConductorDesign_A = enteredTotalRmsA",
        expression: `${externalHarmonicNeutralA}`,
        result: Math.round(finalConductorDesignA * 100) / 100,
        unit: "A",
        note: "Entered value is treated as the complete neutral RMS current. The independently calculated NEC fundamental is NOT added again.",
        highlight: true,
      });
    } else {
      steps.push({
        label: "Final Conductor Design Current — Root-Sum-Square",
        formula: "finalConductorDesign_A = sqrt(NEC_fundamental² + harmonic_only²)",
        expression: `sqrt(${Math.round(necFundamentalNeutralA * 100) / 100}² + ${Math.round(externalHarmonicNeutralA * 100) / 100}²)`,
        result: Math.round(finalConductorDesignA * 100) / 100,
        unit: "A",
        note: "Root-sum-square combination. Fundamental and harmonic-only currents are combined as orthogonal components, NOT arithmetic sum.",
        highlight: true,
      });
    }
  } else {
    steps.push({
      label: "Final Conductor Design Current",
      formula: "No external harmonic — final = NEC fundamental",
      expression: `${Math.round(necFundamentalNeutralA * 100) / 100}`,
      result: Math.round(finalConductorDesignA * 100) / 100,
      unit: "A",
      highlight: true,
    });
  }

  steps.push({
    label: "Final Neutral Load",
    formula: "Final conductor design current × line-to-neutral voltage",
    expression: `${Math.round(finalConductorDesignA * 100) / 100} × ${V}`,
    result: Math.round(finalConductorDesignVA),
    unit: "VA",
    highlight: true,
  });

  const result = {
    systemType,
    systemLabel: sys.label,
    lineToNeutralV: V,
    is3PhaseWye: is3ph,
    loads,
    // ─── Four distinguished concepts ───
    // 1. NEC-calculated maximum unbalanced fundamental load
    necFundamentalNeutral_VA: Math.round(necFundamentalNeutralVA),
    necFundamentalNeutral_A: Math.round(necFundamentalNeutralA * 100) / 100,
    // 2. NEC-permitted neutral demand reduction
    necPermittedReduction_A: Math.round(permittedReductionA * 100) / 100,
    necExcessReductionApplied: excessReductionApplied,
    // 3. Externally determined harmonic neutral current
    externalHarmonicNeutral_A: Math.round(externalHarmonicNeutralA * 100) / 100,
    externalHarmonicAvailable,
    externalHarmonicValueType: valueType,
    externalHarmonicSource: source,
    externalHarmonicSourceLabel: sourceLabel,
    externalHarmonicTotalRmsDirect: totalRmsDirect,
    individualSpectrumUnsupported,
    rssComponents,
    rmsCombinationMethod,
    // 4. Final conductor design current
    finalConductorDesign_A: Math.round(finalConductorDesignA * 100) / 100,
    finalConductorDesign_VA: Math.round(finalConductorDesignVA),
    // ─── Separated outputs (backward compat) ───
    fundamentalLinearNeutral_VA: Math.round(reducibleLinearNeutralVA),
    fundamentalLinearNeutral_A: Math.round((reducibleLinearNeutralVA / V) * 100) / 100,
    rangeDryerTotalDemand_VA: Math.round(rangeDryerTotalDemandVA),
    rangeDryerNeutral_VA: Math.round(rangeDryerNeutralPhaseTotal + rangeDryerNeutralScalar),
    rangeDryerNeutral_A: Math.round(((rangeDryerNeutralPhaseTotal + rangeDryerNeutralScalar) / V) * 100) / 100,
    rangeDryerDetails,
    rangeDryerNeutralPhaseTotal: Math.round(rangeDryerNeutralPhaseTotal),
    rangeDryerNeutralScalar: Math.round(rangeDryerNeutralScalar),
    nonreducibleLinearNeutral_VA: Math.round(nonreducibleLinearNeutralVA),
    nonreducibleLinearNeutral_A: Math.round((nonreducibleLinearNeutralVA / V) * 100) / 100,
    // ─── Portions ───
    reducible_VA: Math.round(reducibleVA),
    reducible_A: Math.round(reducibleAmps * 100) / 100,
    nonReducible_VA: Math.round(nonReducibleVA),
    nonReducible_A: Math.round((nonReducibleVA / V) * 100) / 100,
    // ─── Reduction ───
    rangeDryerReductionApplied: rangeDryerTotalDemandVA > 0,
    excessReductionApplied,
    excessAmps: Math.round(excessAmps * 100) / 100,
    excessReducedAmps: Math.round(excessReducedAmps * 100) / 100,
    permittedReduction_A: Math.round(permittedReductionA * 100) / 100,
    // ─── Final (backward compat aliases) ───
    finalNeutral_VA: Math.round(finalConductorDesignVA),
    finalNeutral_A: Math.round(finalConductorDesignA * 100) / 100,
    // ─── Other ───
    lineToLine_VA: Math.round(lineToLineVA),
    limitations,
    // ─── Phase data ───
    reduciblePhase,
    nonreduciblePhase,
    rangeDryerPhaseAdditions,
    // ─── Backward compat ───
    linearNet_VA: Math.round(reducibleLinearNeutralVA),
    nonlinearNet_VA: Math.round(externalHarmonicNeutralA * V),
    otherReducible_VA: 0,
    nonreducible_VA: Math.round(nonreducibleLinearNeutralVA),
    nonlinearHarmonicAvailable: externalHarmonicAvailable,
    nonlinearHarmonicNeutral_A: Math.round(externalHarmonicNeutralA * 100) / 100,
    nonlinearHarmonicNeutral_VA: Math.round(externalHarmonicNeutralA * V),
    nonlinearSource: source,
    nonlinearSourceLabel: sourceLabel,
    nonlinearProhibited: is3ph && externalHarmonicAvailable,
    steps,
  };

  return withTrace(result, {
    articles_used: ["220.61", "220.61(A)", "220.61(B)(1)", "220.61(B)(2)", "220.61(C)"],
    tables_used: [],
    fields_used: [],
  });
}