/**
 * Pure calculation logic for Short Circuit Current (NEC 110.9 / 110.10).
 */

const AIC_RATINGS = [10000, 14000, 18000, 22000, 25000, 35000, 42000, 65000, 85000, 100000, 200000];

/**
 * @param {object} v - inputs: kva, primaryV, secondaryV, phases, impedance, cableLength, cableSize, cableMaterial
 * @param {object} nec - necData from getNecData(year)
 */
export function calcShortCircuit(v, nec) {
  const kva = parseFloat(v.kva) || 150;
  const secV = parseFloat(v.secondaryV) || 208;
  const Z = parseFloat(v.impedance) || 5.75;
  const factor = v.phases === "three" ? 1.732 : 1;
  const L = parseFloat(v.cableLength) || 50;

  // AFC at transformer secondary (infinite primary)
  const transAFC = (kva * 1000) / (secV * factor * (Z / 100));

  // Cable impedance
  const K = v.cableMaterial === "copper" ? nec.RESISTIVITY.copper : nec.RESISTIVITY.aluminum;
  const CM = nec.CONDUCTOR_CM[v.cableSize] || 211600;
  const cableZ_ohm = (K * L * 2) / CM;
  const xfmrZ_ohm = (secV * secV) / (kva * 1000) * (Z / 100);
  const totalZ = xfmrZ_ohm + cableZ_ohm;

  const AFC_atPanel = secV / (factor * totalZ);
  const requiredAIC = AIC_RATINGS.find(r => r >= AFC_atPanel) || AIC_RATINGS[AIC_RATINGS.length - 1];

  const steps = [
    { label: "Transformer AFC (infinite primary)", formula: "AFC = (kVA × 1000) ÷ (V × √3 × Z%)", expression: `(${kva} × 1000) ÷ (${secV} × ${factor} × ${Z / 100})`, result: Math.round(transAFC), unit: "A" },
    { label: "Transformer Impedance", formula: "Z = V² ÷ (kVA × 1000) × Z%", expression: `${secV}² ÷ ${kva * 1000} × ${Z / 100}`, result: Math.round(xfmrZ_ohm * 10000) / 10000, unit: "Ω" },
    { label: "Cable Impedance", formula: "Z = (K × L × 2) ÷ CM", expression: `(${K} × ${L} × 2) ÷ ${CM.toLocaleString()}`, result: Math.round(cableZ_ohm * 10000) / 10000, unit: "Ω", note: `${v.cableMaterial} #${v.cableSize} AWG, ${L} ft` },
    { label: "Total Impedance", formula: "Z_total = Z_transformer + Z_cable", expression: `${Math.round(xfmrZ_ohm * 10000) / 10000} + ${Math.round(cableZ_ohm * 10000) / 10000}`, result: Math.round(totalZ * 10000) / 10000, unit: "Ω" },
    { label: "AFC at Panel", formula: "AFC = V ÷ (√3 × Z_total)", expression: `${secV} ÷ (${factor} × ${Math.round(totalZ * 10000) / 10000})`, result: Math.round(AFC_atPanel), unit: "A" },
    { label: "Required AIC Rating", formula: "AIC = next standard ≥ AFC", expression: `next standard ≥ ${Math.round(AFC_atPanel)} A`, result: requiredAIC, unit: "A" },
  ];
  return {
    transAFC: Math.round(transAFC),
    xfmrZ_ohm: Math.round(xfmrZ_ohm * 10000) / 10000,
    cableZ_ohm: Math.round(cableZ_ohm * 10000) / 10000,
    totalZ: Math.round(totalZ * 10000) / 10000,
    AFC_atPanel: Math.round(AFC_atPanel),
    requiredAIC,
    steps,
  };
}