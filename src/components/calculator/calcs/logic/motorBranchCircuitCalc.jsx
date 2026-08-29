/**
 * Pure calculation logic for Motor Branch Circuit (NEC 430).
 */

import { withTrace } from "@/lib/calculatorTrace";

export function getMinWireSize(ampacity, copperAmpacity, termRating = 75) {
  const col = termRating === 60 ? "t60" : "t75";
  const sizes = Object.entries(copperAmpacity)
    .sort((a, b) => (a[1][col] || 0) - (b[1][col] || 0));
  const match = sizes.find(([, r]) => (r[col] || 0) >= ampacity);
  return match ? match[0] : sizes[sizes.length - 1]?.[0] || "500";
}

export function getMaxOCPD(flc, mult, stdSizes, roundDown = false) {
  const calc = flc * mult;
  if (roundDown) {
    // 430.52(C)(1) Exception 1: For fuses, the next lower standard size may be used
    const nextDown = [...stdSizes].reverse().find(s => s <= calc);
    const nextUp = stdSizes.find(s => s >= calc);
    // Use next size down if >= FLC, otherwise next size up
    const selected = (nextDown && nextDown >= flc) ? nextDown : (nextUp || stdSizes[stdSizes.length - 1]);
    return { calc: Math.round(calc * 10) / 10, selected };
  }
  const nextUp = stdSizes.find(s => s >= calc);
  return { calc: Math.round(calc * 10) / 10, selected: nextUp || stdSizes[stdSizes.length - 1] };
}

/**
 * @param {object} v - inputs: phases, hp, voltage, ocpdType, termRating, nameplateFL, sfAbove115
 * @param {object} nec - necData from getNecData(year)
 */
export function calcMotorBranchCircuit(v, nec) {
  const is3ph = v.phases === "three";
  const FLC_3PH = nec.MOTOR_FLC_3PHASE;
  const FLC_1PH = nec.MOTOR_FLC_1PHASE;

  const motorType = v.motorType || "AC Polyphase (Other than Wound-Rotor)";
  const typeMultipliers = (nec.MOTOR_OCPD_TABLE_430_52 && nec.MOTOR_OCPD_TABLE_430_52[motorType]) || nec.MOTOR_OCPD_MULTIPLIERS;
  const ocpdMultipliers = {
    ntdf:  typeMultipliers["Non-Time Delay Fuse"],
    dtef:  typeMultipliers["Dual Element Fuse"],
    itb:   typeMultipliers["Instantaneous Trip Breaker"],
    itcb:  typeMultipliers["Inverse Time Breaker"],
  };

  let flc = 0;
  if (is3ph) {
    const isSync = motorType === "Synchronous";
    const table = isSync ? (nec.MOTOR_FLC_3PHASE_SYNCHRONOUS || FLC_3PH) : FLC_3PH;
    const row = table[v.hp];
    const vol = parseInt(v.voltage) || 460;
    flc = row ? (row[vol] ?? row[460]) : 0;
  } else {
    const row = FLC_1PH[v.hp] || FLC_1PH[String(v.hp)];
    const vol = parseInt(v.voltage) || 230;
    if (row && typeof row === "object") {
      flc = row[vol] ?? row[String(vol)] ?? (vol === 240 ? row[230] : undefined) ?? row[230] ?? 0;
    } else {
      flc = parseFloat((((row || 0) * 230 / vol).toFixed(1)));
    }
  }

  const conductorMinA = flc * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const termRating = parseInt(v.termRating) || 75;
  const wireSize = getMinWireSize(conductorMinA, nec.COPPER_AMPACITY, termRating);

  const mult = ocpdMultipliers[v.ocpdType] || 2.5;
  // 430.52(C)(1): Next size up for all types. Exception 1 allows next lower for fuses.
  const isFuse = v.ocpdType === "ntdf" || v.ocpdType === "dtef";
  const { calc: ocpdCalc, selected: ocpdSelected } = getMaxOCPD(flc, mult, nec.STD_OCPD_SIZES, false);

  const fla = parseFloat(v.nameplateFL) || flc;
  // NEC 430.32(A)(1): SF ≥ 1.15 → 125% of nameplate FLC
  // NEC 430.32(A)(2): SF < 1.15 → 115% of nameplate FLC
  const overloadFactor = v.sfAbove115 === "yes" ? 1.25 : 1.15;
  const overloadMaxA = fla * overloadFactor;

  // All OCPD types for reference (next size up per main rule)
  const allOCPD = {};
  for (const [key, m] of Object.entries(ocpdMultipliers)) {
    allOCPD[key] = getMaxOCPD(flc, m, nec.STD_OCPD_SIZES, false).selected;
  }

  const steps = [
    { label: "Motor FLC (Table 430.250)", formula: "FLC = Table 430.248/250 lookup by HP & voltage", expression: `${v.hp} HP @ ${v.voltage}V ${is3ph ? "3-phase" : "single-phase"}`, result: flc, unit: "A" },
    { label: "Conductor Ampacity (430.22)", formula: "Ampacity = FLC × 125%", expression: `${flc} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: Math.round(conductorMinA * 10) / 10, unit: "A", note: `→ #${wireSize} AWG` },
    { label: `OCPD Rating (Table 430.52 — ${v.ocpdType})`, formula: "OCPD = FLC × multiplier (Table 430.52)", expression: `${flc} × ${mult}`, result: ocpdCalc, unit: "A", note: `→ next standard: ${ocpdSelected} A${isFuse ? " (430.52(C)(1) Exc. 1: next lower also permitted for fuses)" : ""}` },
    { label: "Overload Protection (430.32)", formula: "Overload = FLA × factor (125% or 115%)", expression: `${fla} × ${overloadFactor}`, result: Math.round(overloadMaxA * 10) / 10, unit: "A", note: v.sfAbove115 === "yes" ? "SF ≥ 1.15 → 125%" : "SF < 1.15 → 115%" },
  ];
  const result = {
    flc,
    conductorMinA: Math.round(conductorMinA * 10) / 10,
    wireSize,
    ocpdCalc,
    ocpdSelected,
    overloadMaxA: Math.round(overloadMaxA * 10) / 10,
    overloadFactor,
    allOCPD,
    steps,
  };
  return withTrace(result, {
    articles_used: ["430.22", "430.52(C)", "430.32", "430.6"],
    tables_used: ["Table 430.248", "Table 430.250", nec.AMPACITY_TABLE || "Table 310.15(B)(16)"],
    fields_used: ["MOTOR_FLC_3PHASE", "MOTOR_FLC_1PHASE", "MOTOR_OCPD_MULTIPLIERS", "CONTINUOUS_LOAD_MULTIPLIER", "COPPER_AMPACITY", "STD_OCPD_SIZES"],
  });
}