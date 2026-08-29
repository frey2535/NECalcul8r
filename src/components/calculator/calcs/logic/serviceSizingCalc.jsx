/**
 * Pure calculation logic for Service Sizing (NEC 230.42).
 * Shared by the live calculator UI and the /admin/coverage year-switch parity test.
 */

import { withTrace } from "@/lib/calculatorTrace";

/**
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 * @returns {object} calculation outputs + trace
 */
export function calcServiceSizing(v, nec) {
  const totalVA = parseFloat(v.totalVA) || 40000;
  const voltage = parseFloat(v.voltage) || 240;
  const factor = v.phases === "three" ? 1.732 : 1;
  const contPct = (parseFloat(v.continuousPct) || 80) / 100;
  const nonContPct = 1 - contPct;

  const totalAmps = totalVA / (voltage * factor);
  const continuousA = totalAmps * contPct;
  const nonContinuousA = totalAmps * nonContPct;
  const adjustedAmps = continuousA * nec.CONTINUOUS_LOAD_MULTIPLIER + nonContinuousA;

  // 230.42(A)(2): Service conductors must also have ampacity ≥ the Article 220
  // calculated load (not just the 125% continuous method in 230.42(A)(1))
  const calculatedLoadA = parseFloat(v.calculatedLoadA) || 0;
  const designLoad = Math.max(adjustedAmps, calculatedLoadA || 0);
  const designMethod = calculatedLoadA > adjustedAmps ? "Art. 220 calculated load (230.42(A)(2))" : "125% continuous (230.42(A)(1))";

  const serviceSizes = nec.STD_OCPD_SIZES.filter(s => s >= 100);
  const minService = serviceSizes.find(s => s >= designLoad) || serviceSizes[serviceSizes.length - 1];
  const minResidential = nec.DWELLING_MIN_SERVICE_AMPS || 100;
  const finalService = Math.max(minService, minResidential);

  const steps = [
    { label: "Total Current", formula: "I = VA ÷ (V × √3)", expression: `${totalVA} ÷ (${voltage} × ${factor})`, result: Math.round(totalAmps * 10) / 10, unit: "A" },
    { label: "Continuous Portion", formula: "I_cont = I × continuous %", expression: `${Math.round(totalAmps * 10) / 10} × ${contPct}`, result: Math.round(continuousA * 10) / 10, unit: "A", note: `${(contPct * 100).toFixed(0)}% continuous` },
    { label: "Non-Continuous Portion", formula: "I_non = I × (1 − continuous %)", expression: `${Math.round(totalAmps * 10) / 10} × ${nonContPct.toFixed(2)}`, result: Math.round(nonContinuousA * 10) / 10, unit: "A" },
    { label: "Adjusted Ampacity (210.19)", formula: "I_adj = I_cont × 125% + I_non", expression: `${Math.round(continuousA * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER} + ${Math.round(nonContinuousA * 10) / 10}`, result: Math.round(adjustedAmps * 10) / 10, unit: "A", note: `125% of continuous + 100% of non-continuous` },
  ];
  if (calculatedLoadA > 0) {
    steps.push({ label: "Art. 220 Calculated Load (230.42(A)(2))", formula: "I_calc = Article 220 total load", expression: `${calculatedLoadA} A`, result: calculatedLoadA, unit: "A", note: calculatedLoadA > adjustedAmps ? "Governs over 125% method" : "Does not govern" });
  }
  steps.push(
    { label: "Design Load (230.42)", formula: "I_design = max(I_adj, I_calc)", expression: `max(${Math.round(adjustedAmps * 10) / 10}, ${calculatedLoadA || 0})`, result: Math.round(designLoad * 10) / 10, unit: "A", note: designMethod },
    { label: "Minimum Service Size", formula: "Size = next standard ≥ design load", expression: `next standard ≥ ${Math.round(designLoad * 10) / 10} A`, result: finalService, unit: "A", note: `Min residential: ${minResidential} A` },
  );
  const result = {
    totalAmps: Math.round(totalAmps * 10) / 10,
    adjustedAmps: Math.round(adjustedAmps * 10) / 10,
    calculatedLoadA,
    designLoad: Math.round(designLoad * 10) / 10,
    designMethod,
    minService_A: finalService,
    minServiceAmps_field: minResidential,
    SPD_required: !!nec.DWELLING_SPD_REQUIRED,
    outdoor_disconnect: !!nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED,
    steps,
  };
  return withTrace(result, {
    articles_used: ["230.42(A)", "230.42(B)", "230.67", "230.85"],
    tables_used: ["Table 240.6(A)"],
    fields_used: ["CONTINUOUS_LOAD_MULTIPLIER", "STD_OCPD_SIZES", "DWELLING_MIN_SERVICE_AMPS", "DWELLING_SPD_REQUIRED", "DWELLING_OUTDOOR_DISCONNECT_REQUIRED"],
  });
}