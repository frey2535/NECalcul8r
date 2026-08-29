/**
 * Pure calculation logic for Transformer Sizing (NEC 450.3).
 */

import { withTrace } from "@/lib/calculatorTrace";

/**
 * @param {object} v - inputs: loadVA, primaryV, secondaryV, phases, impedance
 * @param {object} nec - necData from getNecData(year)
 */
export function calcTransformerSizing(v, nec) {
  const loadVA = parseFloat(v.loadVA) || 75000;
  const primaryV = parseFloat(v.primaryV) || 480;
  const secondaryV = parseFloat(v.secondaryV) || 208;
  const phases = v.phases || "three";
  const Z = parseFloat(v.impedance) || 5.75;
  const factor = phases === "three" ? 1.732 : 1;

  const kVA = loadVA / 1000;
  const primaryFLC = loadVA / (primaryV * factor);
  const secondaryFLC = loadVA / (secondaryV * factor);

  const primaryOCPD_max = primaryFLC * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const secOCPD_max = secondaryFLC * nec.CONTINUOUS_LOAD_MULTIPLIER;

  const stdSizes = nec.STD_OCPD_SIZES;
  const primaryOCPD = stdSizes.find(s => s >= primaryFLC && s <= primaryOCPD_max) ||
    stdSizes.find(s => s >= primaryFLC) || stdSizes[stdSizes.length - 1];
  const secOCPD = stdSizes.find(s => s >= secondaryFLC && s <= secOCPD_max) ||
    stdSizes.find(s => s >= secondaryFLC) || stdSizes[stdSizes.length - 1];

  const AFC = (loadVA / (secondaryV * factor)) * (100 / Z);
  const primaryConductorA = primaryFLC * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const secConductorA = secondaryFLC * nec.CONTINUOUS_LOAD_MULTIPLIER;

  const steps = [
    { label: "Transformer kVA", formula: "kVA = Load VA ÷ 1000", expression: `${loadVA} ÷ 1000`, result: Math.round(kVA * 10) / 10, unit: "kVA" },
    { label: "Primary FLC", formula: "FLC = VA ÷ (V × √3)", expression: `${loadVA} ÷ (${primaryV} × ${factor})`, result: Math.round(primaryFLC * 10) / 10, unit: "A" },
    { label: "Secondary FLC", formula: "FLC = VA ÷ (V × √3)", expression: `${loadVA} ÷ (${secondaryV} × ${factor})`, result: Math.round(secondaryFLC * 10) / 10, unit: "A" },
    { label: "Primary OCPD (450.3(B))", formula: "OCPD = FLC × 125%", expression: `${Math.round(primaryFLC * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: primaryOCPD, unit: "A", note: "125% of FLC, next standard size" },
    { label: "Secondary OCPD (450.3(B))", formula: "OCPD = FLC × 125%", expression: `${Math.round(secondaryFLC * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: secOCPD, unit: "A", note: "125% of FLC, next standard size" },
    { label: "Available Fault Current", formula: "AFC = (VA ÷ (V × √3)) × (100 ÷ Z%)", expression: `${loadVA} ÷ (${secondaryV} × ${factor}) × (100 ÷ ${Z})`, result: Math.round(AFC), unit: "A" },
  ];
  const result = {
    kVA: Math.round(kVA * 10) / 10,
    primaryFLC: Math.round(primaryFLC * 10) / 10,
    secondaryFLC: Math.round(secondaryFLC * 10) / 10,
    primaryOCPD,
    secondaryOCPD: secOCPD,
    primaryConductorA: Math.round(primaryConductorA * 10) / 10,
    secondaryConductorA: Math.round(secConductorA * 10) / 10,
    AFC: Math.round(AFC),
    steps,
  };
  return withTrace(result, {
    articles_used: ["450.3(B)", "210.19(A)(1)", "240.6(A)"],
    tables_used: ["Table 450.3(B)", "Table 240.6(A)"],
    fields_used: ["CONTINUOUS_LOAD_MULTIPLIER", "STD_OCPD_SIZES"],
  });
}