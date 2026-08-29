/**
 * Pure calculation logic for Motor Feeder (NEC 430.24 / 430.62).
 */

import { withTrace } from "@/lib/calculatorTrace";

/**
 * @param {object} v - inputs: motors (array of {flc}), voltage, phases
 * @param {object} nec - necData from getNecData(year)
 */
export function calcMotorFeeder(v, nec) {
  const motors = v.motors || [];
  const sortedFLC = [...motors].sort((a, b) => b.flc - a.flc);
  const largest = sortedFLC[0]?.flc || 0;
  const sumOthers = sortedFLC.slice(1).reduce((s, m) => s + (parseFloat(m.flc) || 0), 0);
  const totalFLC = motors.reduce((s, m) => s + (parseFloat(m.flc) || 0), 0);

  // NEC 430.24
  const feederAmpacity = largest * nec.CONTINUOUS_LOAD_MULTIPLIER + sumOthers;

  // NEC 430.62
  const itbMult = nec.MOTOR_OCPD_MULTIPLIERS["Inverse Time Breaker"];
  const largestOCPDCalc = largest * itbMult;
  const largestOCPD = nec.STD_OCPD_SIZES.filter(s => s <= largestOCPDCalc).reverse()[0] || 15;
  const feederOCPD_calc = largestOCPD + sumOthers;
  const feederOCPD = nec.STD_OCPD_SIZES.find(s => s >= feederOCPD_calc) || nec.STD_OCPD_SIZES[nec.STD_OCPD_SIZES.length - 1];

  const motorFLCs = motors.map(m => parseFloat(m.flc) || 0);
  const steps = [
    { label: "Largest Motor FLC", formula: "FLC_largest = max(motor FLCs)", expression: `max(${motorFLCs.join(", ")})`, result: Math.round(largest * 10) / 10, unit: "A" },
    { label: "Sum of Other Motors", expression: motorFLCs.slice(1).join(" + ") || "0", result: Math.round(sumOthers * 10) / 10, unit: "A" },
    { label: "Feeder Ampacity (430.24)", formula: "Ampacity = FLC_largest × 125% + Sum of others", expression: `${Math.round(largest * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER} + ${Math.round(sumOthers * 10) / 10}`, result: Math.round(feederAmpacity * 10) / 10, unit: "A" },
    { label: "Feeder OCPD (430.62)", formula: "OCPD = largest OCPD + Sum of others", expression: `${largestOCPD} + ${Math.round(sumOthers * 10) / 10} = ${Math.round(feederOCPD_calc * 10) / 10}`, result: feederOCPD, unit: "A", note: `→ next standard: ${feederOCPD} A` },
  ];
  const result = {
    largest: Math.round(largest * 10) / 10,
    sumOthers: Math.round(sumOthers * 10) / 10,
    totalFLC: Math.round(totalFLC * 10) / 10,
    feederAmpacity: Math.round(feederAmpacity * 10) / 10,
    largestOCPD,
    feederOCPD_calc: Math.round(feederOCPD_calc * 10) / 10,
    feederOCPD,
    steps,
  };
  return withTrace(result, {
    articles_used: ["430.24", "430.62(A)"],
    tables_used: [],
    fields_used: ["CONTINUOUS_LOAD_MULTIPLIER", "MOTOR_OCPD_MULTIPLIERS", "STD_OCPD_SIZES"],
  });
}