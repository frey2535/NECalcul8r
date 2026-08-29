/**
 * Pure calculation logic for Supplemental Grounding Electrode (NEC 250.53(A)(2)).
 * Uses Dwight formula for ground rod resistance.
 */

/**
 * @param {object} v - inputs: soilType (index), customRho, rodLength (ft), rodDiameter (in)
 * @param {object} nec - necData (unused — pure physics, but kept for interface consistency)
 */
export function calcSupplementalGrounding(v, nec) {
  const SOIL_TYPES = [
    { rho: 10000 }, { rho: 25000 }, { rho: 50000 },
    { rho: 100000 }, { rho: 300000 }, { rho: 1000000 }, { rho: "custom" },
  ];

  const soilRow = SOIL_TYPES[parseInt(v.soilType)] || SOIL_TYPES[3];
  const rho = soilRow.rho === "custom" ? parseFloat(v.customRho) || 100000 : soilRow.rho;

  const L_cm = parseFloat(v.rodLength) * 30.48;
  const d_cm = parseFloat(v.rodDiameter) * 2.54;

  let resistance = 0;
  if (L_cm > 0 && d_cm > 0) {
    resistance = (rho / (2 * Math.PI * L_cm)) * (Math.log(4 * L_cm / d_cm) - 1);
  }

  const compliant = resistance <= 25;
  const twoRodResistance = resistance / 1.6;
  const twoRodCompliant = twoRodResistance <= 25;

  const steps = [
    { label: "Soil Resistivity", formula: "ρ = soil type value (Ω·cm)", expression: `ρ = ${rho.toLocaleString()} Ω·cm`, result: rho.toLocaleString(), unit: "Ω·cm" },
    { label: "Ground Rod Resistance (Dwight Formula)", formula: "R = (ρ ÷ 2πL) × [ln(4L ÷ d) − 1]", expression: `R = ρ ÷ (2π × ${(L_cm / 100).toFixed(1)} cm) × [ln(4 × ${L_cm} ÷ ${d_cm}) − 1]`, result: Math.round(resistance * 10) / 10, unit: "Ω", note: `Rod: ${v.rodLength} ft × ${v.rodDiameter} in` },
    { label: "Compliance (250.53(A)(2))", formula: "R ≤ 25 Ω", expression: `${Math.round(resistance * 10) / 10} Ω ≤ 25 Ω`, result: compliant ? "✓ PASS" : "✗ FAIL", note: compliant ? "Single rod sufficient" : "Supplemental electrode required" },
    { label: "Two-Rod Resistance", formula: "R₂ = R ÷ 1.6", expression: `${Math.round(resistance * 10) / 10} ÷ 1.6`, result: Math.round(twoRodResistance * 10) / 10, unit: "Ω", note: twoRodCompliant ? "✓ PASS" : "✗ FAIL" },
  ];
  return {
    rho,
    resistance: Math.round(resistance * 10) / 10,
    compliant,
    needsSupplemental: !compliant,
    twoRodResistance: Math.round(twoRodResistance * 10) / 10,
    twoRodCompliant,
    steps,
  };
}