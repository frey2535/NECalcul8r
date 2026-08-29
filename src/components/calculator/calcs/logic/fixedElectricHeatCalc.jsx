/**
 * Pure calculation logic for Fixed Electric Heat (NEC 220.51).
 */

/**
 * @param {object} v - inputs: heatersCount, wattsPerHeater, voltage, phases
 * @param {object} nec - necData from getNecData(year)
 */
export function calcFixedElectricHeat(v, nec) {
  const count = parseInt(v.heatersCount) || 1;
  const watts = parseFloat(v.wattsPerHeater) || 0;
  const totalW = count * watts;
  const vol = parseFloat(v.voltage) || 240;
  const factor = v.phases === "three" ? 1.732 : 1;

  const totalA = totalW / (vol * factor);
  const conductorA = totalA * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const ocpd = nec.STD_OCPD_SIZES.find(s => s >= conductorA) || 200;

  const perCircuitA = watts / vol;
  const perCircuitConductor = perCircuitA * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const perCircuitOCPD = nec.STD_OCPD_SIZES.find(s => s >= perCircuitConductor) || 200;

  const steps = [
    { label: "Total Heat Load (220.51)", formula: "W = count × watts per heater", expression: `${count} × ${watts} W`, result: totalW, unit: "W" },
    { label: "Total Amps", formula: "A = W ÷ (V × √3)", expression: `${totalW} ÷ (${vol} ${v.phases === "three" ? "× 1.732" : ""})`, result: Math.round(totalA * 10) / 10, unit: "A" },
    { label: "Conductor Ampacity (210.19)", formula: "A = total amps × 125%", expression: `${Math.round(totalA * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: Math.round(conductorA * 10) / 10, unit: "A", note: "125% (continuous load)" },
    { label: "OCPD (240.6)", formula: "OCPD = next standard ≥ conductor amps", expression: `next standard ≥ ${Math.round(conductorA * 10) / 10} A`, result: ocpd, unit: "A" },
    { label: "Per-Circuit (if split)", formula: "A = watts ÷ V × 125%", expression: `${watts} ÷ ${vol} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: Math.round(perCircuitConductor * 10) / 10, unit: "A", note: `→ ${perCircuitOCPD} A OCPD` },
  ];
  return {
    totalW,
    totalA: Math.round(totalA * 10) / 10,
    conductorA: Math.round(conductorA * 10) / 10,
    ocpd,
    perCircuitA: Math.round(perCircuitA * 10) / 10,
    perCircuitConductor: Math.round(perCircuitConductor * 10) / 10,
    perCircuitOCPD,
    steps,
  };
}