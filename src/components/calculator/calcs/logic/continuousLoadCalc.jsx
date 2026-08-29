/**
 * Pure calculation logic for Continuous Load (NEC 210.19 / 210.20).
 */

/**
 * @param {object} v - inputs: continuousA, noncontinuousA, voltage, phases
 * @param {object} nec - necData from getNecData(year)
 */
export function calcContinuousLoad(v, nec) {
  const contA = parseFloat(v.continuousA) || 0;
  const nonContA = parseFloat(v.noncontinuousA) || 0;
  const voltage = parseFloat(v.voltage) || 120;
  const factor = v.phases === "three" ? 1.732 : 1;

  const minOCPD_A = contA * nec.CONTINUOUS_LOAD_MULTIPLIER + nonContA;
  const minConductorA = minOCPD_A;
  const selectedOCPD = nec.STD_OCPD_SIZES.find(s => s >= minOCPD_A) || nec.STD_OCPD_SIZES[nec.STD_OCPD_SIZES.length - 1];

  const totalW = (contA + nonContA) * voltage * factor;
  const adjustedW = minOCPD_A * voltage * factor;

  const steps = [
    { label: "Min OCPD (210.20)", formula: "OCPD = continuous × 125% + non-continuous", expression: `${contA} × ${nec.CONTINUOUS_LOAD_MULTIPLIER} + ${nonContA}`, result: Math.round(minOCPD_A * 10) / 10, unit: "A", note: "125% continuous + 100% non-continuous" },
    { label: "Selected OCPD (240.6)", formula: "OCPD = next standard ≥ min OCPD", expression: `next standard ≥ ${Math.round(minOCPD_A * 10) / 10} A`, result: selectedOCPD, unit: "A" },
    { label: "Total Power", formula: "W = (cont + non-cont) × V × √3", expression: `(${contA} + ${nonContA}) × ${voltage} ${v.phases === "three" ? "× 1.732" : ""}`, result: Math.round(totalW), unit: "W" },
    { label: "Adjusted Power", formula: "W = min OCPD × V × √3", expression: `${Math.round(minOCPD_A * 10) / 10} × ${voltage} ${v.phases === "three" ? "× 1.732" : ""}`, result: Math.round(adjustedW), unit: "W" },
  ];
  return {
    minOCPD_A: Math.round(minOCPD_A * 10) / 10,
    minConductorA: Math.round(minConductorA * 10) / 10,
    selectedOCPD,
    totalW: Math.round(totalW),
    adjustedW: Math.round(adjustedW),
    continuousMult: nec.CONTINUOUS_LOAD_MULTIPLIER,
    steps,
  };
}