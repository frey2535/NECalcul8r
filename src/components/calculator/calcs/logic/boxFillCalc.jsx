/**
 * Pure calculation logic for Box Fill (NEC 314.16).
 */

import { withTrace } from "@/lib/calculatorTrace";

/**
 * @param {object} v - inputs: awg, conductors, grounding, devices, clamps, supportFittings, boxVolume, customBoxVolume
 * @param {object} nec - necData from getNecData(year)
 */
export function calcBoxFill(v, nec) {
  const vol = nec.CONDUCTOR_VOLUME[v.awg] || 2.25;

  const conductorFill = (parseFloat(v.conductors) || 0) * vol;
  const groundFill = (parseFloat(v.grounding) || 0) > 0 ? vol : 0;
  const deviceFill = (parseFloat(v.devices) || 0) * 2 * vol;
  const clampFill = (parseFloat(v.clamps) || 0) > 0 ? vol : 0;
  const supportFill = (parseFloat(v.supportFittings) || 0) > 0 ? vol : 0;
  const totalFill = conductorFill + groundFill + deviceFill + clampFill + supportFill;

  const isCustom = v.boxVolume === "custom";
  const boxVol = isCustom
    ? parseFloat(v.customBoxVolume) || 0
    : parseFloat(v.boxVolume) || 0;

  const remaining = boxVol - totalFill;
  const pass = boxVol > 0 && remaining >= 0;

  const steps = [
    { label: "Volume per Conductor (Table 314.16(B))", formula: "Vol = Table 314.16(B) lookup by AWG", expression: `#${v.awg} AWG = ${vol} in³/conductor`, result: vol, unit: "in³" },
    { label: "Conductor Fill", formula: "Fill = conductors × vol", expression: `${parseFloat(v.conductors) || 0} × ${vol}`, result: Math.round(conductorFill * 100) / 100, unit: "in³" },
    { label: "Device Fill", formula: "Fill = devices × 2 × vol", expression: `${parseFloat(v.devices) || 0} × 2 × ${vol}`, result: Math.round(deviceFill * 100) / 100, unit: "in³", note: "Each device counts as 2× largest conductor" },
    { label: "Total Box Fill", formula: "Total = conductor + ground + device + clamp + support", expression: `${Math.round(conductorFill * 100) / 100} + ${Math.round(groundFill * 100) / 100} + ${Math.round(deviceFill * 100) / 100} + ${Math.round(clampFill * 100) / 100} + ${Math.round(supportFill * 100) / 100}`, result: Math.round(totalFill * 100) / 100, unit: "in³" },
    { label: "Remaining Capacity", formula: "Remaining = Box Volume − Total Fill", expression: `${boxVol} − ${Math.round(totalFill * 100) / 100}`, result: Math.round(remaining * 100) / 100, unit: "in³", note: pass ? "✓ PASS" : "✗ FAIL" },
  ];
  const result = {
    volPerConductor: vol,
    conductorFill: Math.round(conductorFill * 100) / 100,
    groundFill: Math.round(groundFill * 100) / 100,
    deviceFill: Math.round(deviceFill * 100) / 100,
    clampFill: Math.round(clampFill * 100) / 100,
    supportFill: Math.round(supportFill * 100) / 100,
    totalFill: Math.round(totalFill * 100) / 100,
    boxVol,
    remaining: Math.round(remaining * 100) / 100,
    pass,
    steps,
  };
  return withTrace(result, {
    articles_used: ["314.16(A)", "314.16(B)"],
    tables_used: ["Table 314.16(A)", "Table 314.16(B)"],
    fields_used: ["CONDUCTOR_VOLUME"],
  });
}