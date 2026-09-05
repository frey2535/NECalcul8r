/**
 * Neutral Load — Regression Test Suite (NEC 220.61)
 *
 * REDESIGNED (v3): Addresses additional defects found in review.
 *
 * CHANGES FROM v2:
 *   - Arithmetic sum of fundamental + harmonic REMOVED.
 *   - NL-H replaced with NL-H1 (harmonic-only RSS) and NL-H2 (total RMS direct).
 *   - NL-H2 replaced with NL-H2a (harmonic-only + excess RSS) and NL-H2b (total RMS + excess).
 *   - Individual spectrum mode labeled UNSUPPORTED.
 *   - Range/dryer tests NL-RD1 through NL-RD7 added with incorporation traces.
 *   - Four concepts distinguished: NEC fundamental, NEC reduction, external harmonic, final design.
 *
 * Source: 2020 NEC (NFPA 70-2020) Article 220.61
 * Verification Status: Corrected model pending source verification
 */

import { calcNeutralLoad } from "@/components/calculator/calcs/logic/neutralLoadCalc";
import { getNecData } from "@/data/nec";

const NEC = getNecData("2020");

const TOLERANCE = 1.0; // VA tolerance for rounding

function withinTolerance(actual, expected, tol = TOLERANCE) {
  return Math.abs(actual - expected) <= tol;
}

const SQRT3_OVER_2 = Math.sqrt(3) / 2;

function vectorSumNeutral(l1, l2, l3, V) {
  const i1 = l1 / V, i2 = l2 / V, i3 = l3 / V;
  const real = i1 - 0.5 * i2 - 0.5 * i3;
  const imag = SQRT3_OVER_2 * (i3 - i2);
  return Math.sqrt(real * real + imag * imag) * V;
}

// ─── Test Cases ────────────────────────────────────────────────────

const TESTS = [
  // ═══ USER-SPECIFIED TESTS A-G (fundamental only, no harmonic) ═══════

  {
    id: "NL-A",
    name: "1φ balanced linear — L1=L2=10,000 → 0 VA (cancellation)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 10000, phase: "L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 0, finalNeutral_A: 0, necExcessReductionApplied: false, externalHarmonicAvailable: false },
    note: "220.61(A): Equal linear loads on opposing legs cancel. |10,000 - 10,000| = 0 VA.",
  },

  {
    id: "NL-B",
    name: "1φ unbalanced linear — L1=15k, L2=10k → 5,000 VA",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 15000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 10000, phase: "L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 5000, finalNeutral_A: 41.67, necExcessReductionApplied: false },
    note: "220.61(A): |15,000 - 10,000| = 5,000 VA. 5,000 / 120 = 41.67A.",
  },

  {
    id: "NL-C",
    name: "3φ balanced linear — L1=L2=L3=72k → 0 VA (vector sum cancels)",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 72000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 72000, phase: "L2" },
        { id: "l3", type: "linear_ln", va: 72000, phase: "L3" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 0, finalNeutral_A: 0, necExcessReductionApplied: false },
    note: "220.61(A): Balanced 3φ linear load → vector sum = 0. Fundamental neutral = 0 A.",
  },

  {
    id: "NL-D",
    name: "3φ unbalanced linear — L1=10k, L2=8k, L3=5k → 4,359 VA",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 8000, phase: "L2" },
        { id: "l3", type: "linear_ln", va: 5000, phase: "L3" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 4359, finalNeutral_A: 36.32, necExcessReductionApplied: false },
    note: "220.61(A): Vector sum. I1=83.33, I2=66.67, I3=41.67. Real=29.17. Imag=-21.65. |I_N|=36.32A. 36.32×120=4,359 VA.",
  },

  {
    id: "NL-E",
    name: "Cross-category cancellation (1φ) — linear L1=10k + other_reducible L2=10k → 0 VA",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "other_reducible", va: 10000, phase: "L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 0, finalNeutral_A: 0, necExcessReductionApplied: false },
    note: "Cross-category: combined per phase: L1=10k, L2=10k. |10k - 10k| = 0 VA.",
  },

  {
    id: "NL-F",
    name: "Nonreducible linear balanced (1φ) — L1=L2=10k → 0 VA (cancellation, no reduction)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "nonreducible", va: 10000, phase: "L1" },
        { id: "l2", type: "nonreducible", va: 10000, phase: "L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 0, finalNeutral_A: 0, necExcessReductionApplied: false },
    note: 'Nonreducible balanced: |10k - 10k| = 0 VA. "Nonreducible" = no demand reduction, NOT "noncancelling".',
  },

  {
    id: "NL-G",
    name: "Nonlinear without harmonic data — fundamental calculated, harmonic unavailable",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 8000, phase: "L2" },
        { id: "l3", type: "linear_ln", va: 5000, phase: "L3" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 4359,
      finalNeutral_A: 36.32,
      necExcessReductionApplied: false,
      externalHarmonicAvailable: false,
    },
    note: "Fundamental imbalance = 4,359 VA. No neutral study entered → harmonic NOT included.",
  },

  // ═══ CORRECTED HARMONIC TESTS (RMS combination) ═════════════════════

  {
    id: "NL-H1",
    name: "Harmonic-only RMS input — sqrt(41.67² + 75²) ≈ 85.8A",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 5000, phase: "L2" },
      ],
      neutralStudy: { valueType: "harmonic_only_rms", source: "engineered_harmonic_study", harmonicOnlyRmsA: 75 },
    },
    expected: {
      necFundamentalNeutral_A: 41.67,
      externalHarmonicNeutral_A: 75,
      externalHarmonicAvailable: true,
      externalHarmonicTotalRmsDirect: false,
      finalNeutral_A: 85.79,
      necExcessReductionApplied: false,
    },
    note: "NEC fundamental = |10k - 5k| = 5,000 VA (41.67A, < 200A, no excess). Harmonic-only = 75A. RSS: sqrt(41.67² + 75²) = sqrt(1736.1 + 5625) = sqrt(7361.1) = 85.79A. NOT arithmetic sum (41.67 + 75 = 116.67A would be WRONG).",
  },

  {
    id: "NL-H2",
    name: "Total RMS study input — entered 75A used directly, fundamental NOT added",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 5000, phase: "L2" },
      ],
      neutralStudy: { valueType: "total_rms", source: "engineered_harmonic_study", totalRmsA: 75 },
    },
    expected: {
      necFundamentalNeutral_A: 41.67,
      externalHarmonicNeutral_A: 75,
      externalHarmonicAvailable: true,
      externalHarmonicTotalRmsDirect: true,
      finalNeutral_A: 75,
      necExcessReductionApplied: false,
    },
    note: "NEC fundamental = 41.67A (shown for reference). Total RMS = 75A (entered, includes fundamental). Final = 75A — do NOT add 41.67A again. The study value is the complete neutral RMS current.",
  },

  {
    id: "NL-H2a",
    name: "Harmonic-only RMS + excess — sqrt(235² + 75²) ≈ 246.7A",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 30000, phase: "L1" },
      ],
      neutralStudy: { valueType: "harmonic_only_rms", source: "engineered_harmonic_study", harmonicOnlyRmsA: 75 },
    },
    expected: {
      necFundamentalNeutral_A: 235,
      externalHarmonicNeutral_A: 75,
      externalHarmonicAvailable: true,
      externalHarmonicTotalRmsDirect: false,
      necExcessReductionApplied: true,
      finalNeutral_A: 246.68,
    },
    note: "NEC fundamental: 30,000 VA → 250A. Excess = 50A × 70% = 35A → reduced = 235A → 28,200 VA. Harmonic-only = 75A. RSS: sqrt(235² + 75²) = sqrt(55225 + 5625) = sqrt(60850) = 246.68A. NOT arithmetic sum (235 + 75 = 310A would be WRONG).",
  },

  {
    id: "NL-H2b",
    name: "Total RMS study + excess — entered 75A used directly, fundamental NOT added",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 30000, phase: "L1" },
      ],
      neutralStudy: { valueType: "total_rms", source: "engineered_harmonic_study", totalRmsA: 75 },
    },
    expected: {
      necFundamentalNeutral_A: 235,
      externalHarmonicNeutral_A: 75,
      externalHarmonicAvailable: true,
      externalHarmonicTotalRmsDirect: true,
      necExcessReductionApplied: true,
      finalNeutral_A: 75,
    },
    note: "NEC fundamental: 235A (after excess reduction, shown for reference). Total RMS = 75A (entered, includes fundamental). Final = 75A — do NOT add 235A again. The study value is the complete neutral RMS current.",
  },

  {
    id: "NL-H3",
    name: "Individual spectrum — UNSUPPORTED, no harmonic calculated",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
      ],
      neutralStudy: { valueType: "individual_spectrum", source: "engineered_harmonic_study", harmonics: { h3: 30, h5: 20 } },
    },
    expected: {
      individualSpectrumUnsupported: true,
      externalHarmonicAvailable: false,
      finalNeutral_A: 83.33,
    },
    note: "Individual spectrum mode is UNSUPPORTED. Input definitions and engineering method cannot be verified. Final = NEC fundamental only (83.33A). User must enter total RMS instead.",
  },

  {
    id: "NL-H4",
    name: "Measured total RMS — field measurement used directly",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 5000, phase: "L2" },
      ],
      neutralStudy: { valueType: "measured_total_rms", source: "field_measurement", totalRmsA: 60 },
    },
    expected: {
      necFundamentalNeutral_A: 41.67,
      externalHarmonicNeutral_A: 60,
      externalHarmonicAvailable: true,
      externalHarmonicTotalRmsDirect: true,
      finalNeutral_A: 60,
    },
    note: "NEC fundamental = 41.67A (reference). Measured total RMS = 60A. Final = 60A (measured value used directly, fundamental NOT added).",
  },

  // ═══ ADDITIONAL FUNDAMENTAL TESTS ═══════════════════════════════════

  {
    id: "NL-03",
    name: "1φ single leg — L1=10k, L2=0 → 10,000 VA",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [{ id: "l1", type: "linear_ln", va: 10000, phase: "L1" }],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 10000, finalNeutral_A: 83.33, necExcessReductionApplied: false },
    note: "220.61(A): |10,000 - 0| = 10,000 VA. 83.33A. Under 200A.",
  },

  {
    id: "NL-05",
    name: "1φ excess > 200A — L1=30k → 28,200 VA (235A)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [{ id: "l1", type: "linear_ln", va: 30000, phase: "L1" }],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 28200, finalNeutral_A: 235, necExcessReductionApplied: true, necPermittedReduction_A: 15 },
    note: "30,000 VA → 250A. Excess = 50A × 70% = 35A. Final = 235A. 235 × 120 = 28,200 VA. Permitted reduction = 15A.",
  },

  {
    id: "NL-10",
    name: "Zero loads → 0 VA",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 0, finalNeutral_A: 0, necExcessReductionApplied: false },
    note: "No loads — neutral load = 0.",
  },

  {
    id: "NL-11",
    name: "Line-to-line excluded — L1=10k linear + 15k L-L → 10,000 VA",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "line_to_line", va: 15000, phase: "L1-L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 10000, finalNeutral_A: 83.33, necExcessReductionApplied: false },
    note: "L-L loads do not contribute. Only L1=10,000 counts. |10,000 - 0| = 10,000 VA.",
  },

  {
    id: "NL-12",
    name: "Nonreducible single leg — L1=30k → 30,000 VA, NO excess reduction",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [{ id: "l1", type: "nonreducible", va: 30000, phase: "L1" }],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 30000, finalNeutral_A: 250, necExcessReductionApplied: false },
    note: "Nonreducible: 30,000 VA = 250A but NO excess reduction (nonreducible).",
  },

  {
    id: "NL-13",
    name: "480Y/277V excess > 200A — L1=83.1k linear → 74,790 VA (270A)",
    inputs: {
      systemType: "3φ-4W 480Y/277V",
      loads: [{ id: "l1", type: "linear_ln", va: 83100, phase: "L1" }],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 74790, finalNeutral_A: 270, necExcessReductionApplied: true },
    note: "3φ vector sum with only L1: 83,100/277 = 300A. Excess = 100A × 70% = 70A. Final = 270A. 270 × 277 = 74,790 VA.",
  },

  {
    id: "NL-16",
    name: "3φ two-phase unbalanced — L1=10k, L2=10k, L3=0 → 10,000 VA",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 10000, phase: "L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 10000, finalNeutral_A: 83.33, necExcessReductionApplied: false },
    note: "3φ vector sum: I1=83.33, I2=83.33, I3=0. |I_N|=83.33A. 83.33×120=10,000 VA.",
  },

  {
    id: "NL-17",
    name: "Other reducible excess — L1=30k other_reducible → 28,200 VA (235A)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [{ id: "l1", type: "other_reducible", va: 30000, phase: "L1" }],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 28200, finalNeutral_A: 235, necExcessReductionApplied: true },
    note: "Other reducible: L1=30k, L2=0. |30k - 0| = 30,000 VA. 250A. Excess = 50A × 70% = 35A. Final = 235A.",
  },

  {
    id: "NL-E3",
    name: "Cross-category cancellation (3φ) — linear L1=10k + other_reducible L2=10k → 10,000 VA",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "other_reducible", va: 10000, phase: "L2" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 10000, finalNeutral_A: 83.33, necExcessReductionApplied: false },
    note: "Combined: L1=10k, L2=10k, L3=0. Vector sum = 10,000 VA. If separate: 20,000 VA — WRONG.",
  },

  {
    id: "NL-F3",
    name: "Nonreducible balanced (3φ) — L1=L2=L3=10k → 0 VA (cancellation, no reduction)",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "nonreducible", va: 10000, phase: "L1" },
        { id: "l2", type: "nonreducible", va: 10000, phase: "L2" },
        { id: "l3", type: "nonreducible", va: 10000, phase: "L3" },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: { finalNeutral_VA: 0, finalNeutral_A: 0, necExcessReductionApplied: false },
    note: 'Nonreducible balanced 3φ: vector sum = 0 VA. "Nonreducible" = no reduction, NOT "noncancelling".',
  },

  // ═══ RANGE/DRYER TESTS (NL-RD1 through NL-RD7) ═════════════════════

  {
    id: "NL-RD1",
    name: "One range on 120/240V single-phase — 8kVA demand → 5,600 VA neutral (scalar)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "rd1", type: "range_dryer", va: 8000, phase: "L1-L2", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 5600,
      finalNeutral_A: 46.67,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralScalar: 5600,
      rangeDryerNeutralPhaseTotal: 0,
    },
    note: "One range on L1-L2 (240V). Demand = 8,000 VA. Neutral = 8,000 × 70% = 5,600 VA (scalar, two-phase connection). No L-N loads → vector sum = 0. Reducible = 0 + 5,600 = 5,600 VA. 46.67A < 200A. Final = 5,600 VA.",
  },

  {
    id: "NL-RD2",
    name: "Multiple ranges on 120/240V — two ranges × 8kVA → 11,200 VA neutral (scalar)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "rd1", type: "range_dryer", va: 8000, phase: "L1-L2", applianceType: "range", count: 1 },
        { id: "rd2", type: "range_dryer", va: 8000, phase: "L1-L2", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 11200,
      finalNeutral_A: 93.33,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralScalar: 11200,
    },
    note: "Two ranges on L1-L2. Each: 8,000 × 70% = 5,600 VA (scalar). Total scalar = 11,200 VA. Reducible = 11,200 VA. 93.33A < 200A. Final = 11,200 VA.",
  },

  {
    id: "NL-RD3",
    name: "Dryers on single-phase — 5kVA demand → 3,500 VA neutral (scalar)",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "rd1", type: "range_dryer", va: 5000, phase: "L1-L2", applianceType: "dryer", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 3500,
      finalNeutral_A: 29.17,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralScalar: 3500,
    },
    note: "One dryer on L1-L2. Demand = 5,000 VA. Neutral = 5,000 × 70% = 3,500 VA (scalar). 29.17A < 200A. Final = 3,500 VA.",
  },

  {
    id: "NL-RD4",
    name: "Ranges distributed across 3φ 4W — three ranges on L1-L2, L1-L3, L2-L3 → 16,800 VA (scalar)",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "rd1", type: "range_dryer", va: 8000, phase: "L1-L2", applianceType: "range", count: 1 },
        { id: "rd2", type: "range_dryer", va: 8000, phase: "L1-L3", applianceType: "range", count: 1 },
        { id: "rd3", type: "range_dryer", va: 8000, phase: "L2-L3", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 16800,
      finalNeutral_A: 140,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralScalar: 16800,
    },
    note: "Three ranges on L1-L2, L1-L3, L2-L3. Each: 8,000 × 70% = 5,600 VA (scalar, two-phase). Total scalar = 16,800 VA. No L-N loads → vector sum = 0. Reducible = 16,800 VA. 140A < 200A. Final = 16,800 VA.",
  },

  {
    id: "NL-RD5",
    name: "Balanced appliance distribution (3φ) — ranges on L1, L2, L3 → 0 VA (cancellation)",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "rd1", type: "range_dryer", va: 8000, phase: "L1", applianceType: "range", count: 1 },
        { id: "rd2", type: "range_dryer", va: 8000, phase: "L2", applianceType: "range", count: 1 },
        { id: "rd3", type: "range_dryer", va: 8000, phase: "L3", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 0,
      finalNeutral_A: 0,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralPhaseTotal: 16800,
      rangeDryerNeutralScalar: 0,
    },
    note: "Three ranges on L1, L2, L3 (single-phase L-N connections). Each: 8,000 × 70% = 5,600 VA (phase-total). Phase totals: L1=5,600, L2=5,600, L3=5,600. Vector sum = 0 (balanced). Reducible = 0 VA. Final = 0 VA. Phase-total incorporation allows cancellation.",
  },

  {
    id: "NL-RD6",
    name: "Intentionally unbalanced appliance distribution (3φ) — ranges on L1, L2 only → 5,600 VA",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "rd1", type: "range_dryer", va: 8000, phase: "L1", applianceType: "range", count: 1 },
        { id: "rd2", type: "range_dryer", va: 8000, phase: "L2", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 5600,
      finalNeutral_A: 46.67,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralPhaseTotal: 11200,
      rangeDryerNeutralScalar: 0,
    },
    note: "Two ranges on L1, L2 (single-phase L-N). Each: 5,600 VA (phase-total). Phase totals: L1=5,600, L2=5,600, L3=0. Vector sum = 5,600 VA (same as NL-16 ratio). 46.67A < 200A. Final = 5,600 VA. Phase-total incorporation allows partial cancellation.",
  },

  {
    id: "NL-RD7",
    name: "Appliance neutral reduction + L-N loads (3φ) — linear 10k/8k/5k + range L1-L2 8k → 9,959 VA",
    inputs: {
      systemType: "3φ-4W 208Y/120V",
      loads: [
        { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
        { id: "l2", type: "linear_ln", va: 8000, phase: "L2" },
        { id: "l3", type: "linear_ln", va: 5000, phase: "L3" },
        { id: "rd1", type: "range_dryer", va: 8000, phase: "L1-L2", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 9959,
      finalNeutral_A: 82.99,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: false,
      rangeDryerNeutralScalar: 5600,
    },
    note: "Linear vector sum = 4,359 VA (from NL-D). Range on L1-L2: 8,000 × 70% = 5,600 VA (scalar). Reducible = 4,359 + 5,600 = 9,959 VA. 82.99A < 200A. Final = 9,959 VA. Shows combination of L-N loads and range/dryer scalar.",
  },

  {
    id: "NL-RD8",
    name: "Range/dryer + excess > 200A — L1=24k linear, range=12k → 29,880 VA",
    inputs: {
      systemType: "1φ-3W 120/240V",
      loads: [
        { id: "l1", type: "linear_ln", va: 24000, phase: "L1" },
        { id: "rd1", type: "range_dryer", va: 12000, phase: "L1-L2", applianceType: "range", count: 1 },
      ],
      neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" },
    },
    expected: {
      finalNeutral_VA: 29880,
      finalNeutral_A: 249,
      rangeDryerReductionApplied: true,
      necExcessReductionApplied: true,
      necPermittedReduction_A: 21,
    },
    note: "Linear net = 24,000 VA. Range scalar = 12,000 × 70% = 8,400 VA. Reducible = 32,400 VA. 270A. Excess = 70A × 70% = 49A. Final = 249A. 249 × 120 = 29,880 VA. Permitted reduction = 21A.",
  },
];

// ─── Test Runner ──────────────────────────────────────────────────

export function runNeutralLoadTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    const actual = calcNeutralLoad(test.inputs, NEC);
    const matches = {};
    let allMatch = true;

    for (const [key, expectedVal] of Object.entries(test.expected)) {
      let actualVal;
      let match;

      if (
        key === "rangeDryerReductionApplied" ||
        key === "necExcessReductionApplied" ||
        key === "externalHarmonicAvailable" ||
        key === "externalHarmonicTotalRmsDirect" ||
        key === "individualSpectrumUnsupported"
      ) {
        actualVal = actual[key];
        match = actualVal === expectedVal;
      } else if (
        key === "finalNeutral_A" ||
        key === "necFundamentalNeutral_A" ||
        key === "externalHarmonicNeutral_A" ||
        key === "necPermittedReduction_A" ||
        key === "rangeDryerNeutralScalar" ||
        key === "rangeDryerNeutralPhaseTotal"
      ) {
        actualVal = actual[key];
        match = withinTolerance(actualVal, expectedVal, 0.1);
      } else {
        actualVal = actual[key];
        match = withinTolerance(actualVal, expectedVal);
      }

      matches[key] = { actual: actualVal, expected: expectedVal, match };
      if (!match) allMatch = false;
    }

    if (allMatch) passed++;
    else failed++;

    results.push({
      id: test.id,
      name: test.name,
      note: test.note,
      result: allMatch ? "PASS" : "FAIL",
      matches,
      actual: {
        finalNeutral_VA: actual.finalNeutral_VA,
        finalNeutral_A: actual.finalNeutral_A,
        necFundamentalNeutral_VA: actual.necFundamentalNeutral_VA,
        necFundamentalNeutral_A: actual.necFundamentalNeutral_A,
        necExcessReductionApplied: actual.necExcessReductionApplied,
        necPermittedReduction_A: actual.necPermittedReduction_A,
        externalHarmonicAvailable: actual.externalHarmonicAvailable,
        externalHarmonicNeutral_A: actual.externalHarmonicNeutral_A,
        externalHarmonicTotalRmsDirect: actual.externalHarmonicTotalRmsDirect,
        individualSpectrumUnsupported: actual.individualSpectrumUnsupported,
        rangeDryerReductionApplied: actual.rangeDryerReductionApplied,
        rangeDryerNeutralScalar: actual.rangeDryerNeutralScalar,
        rangeDryerNeutralPhaseTotal: actual.rangeDryerNeutralPhaseTotal,
      },
    });
  }

  return { results, passed, failed, total: TESTS.length };
}