/**
 * Pure calculation logic for Pool / Spa (NEC 680).
 */

/**
 * @param {object} v - inputs: pumpHP, pumpV, heaterKW, lightingW, installType
 * @param {object} nec - necData from getNecData(year)
 */
export function calcPoolSpa(v, nec) {
  const hp = parseFloat(v.pumpHP) || 1.5;
  const pumpV = parseFloat(v.pumpV) || 240;
  const hpKey = String(hp);
  const flcRow = nec.MOTOR_FLC_1PHASE?.[hpKey] || nec.MOTOR_FLC_1PHASE?.[hp];
  const voltCol = flcRow?.[pumpV] != null ? pumpV
    : flcRow?.[240] != null ? 240
    : pumpV >= 220 ? 230
    : pumpV <= 120 ? 115
    : pumpV;
  const flc = flcRow?.[voltCol] ?? flcRow?.[String(voltCol)] ?? nec.POOL_MOTOR_FLC[hp] ?? (hp * 14);

  const pumpConductorA = flc * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const ocpdCalc = flc * nec.MOTOR_OCPD_MULTIPLIERS["Inverse Time Breaker"];
  const pumpOCPD = nec.STD_OCPD_SIZES.find(s => s >= ocpdCalc) || 100;

  const heaterKW = parseFloat(v.heaterKW) || 0;
  const heaterA = heaterKW > 0 ? (heaterKW * 1000) / pumpV : 0;
  const lightingW = parseFloat(v.lightingW) || 0;
  const lightingA = lightingW / 120;

  const totalA = pumpConductorA + (heaterA * nec.CONTINUOUS_LOAD_MULTIPLIER) + lightingA;

  const clearances = v.installType === "pool" ? nec.POOL_CLEARANCES : nec.SPA_CLEARANCES;

  const steps = [
    { label: "Pump Motor FLC (Table 430.248)", formula: "FLC = Table 430.248 lookup by HP & voltage", expression: `${hp} HP @ ${pumpV}V`, result: Math.round(flc * 10) / 10, unit: "A" },
    { label: "Pump Conductor (430.22)", formula: "A = FLC × 125%", expression: `${Math.round(flc * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: Math.round(pumpConductorA * 10) / 10, unit: "A", note: "125% of FLC" },
    { label: "Pump OCPD (Table 430.52)", formula: "OCPD = FLC × 250% (inverse time breaker)", expression: `${Math.round(flc * 10) / 10} × ${nec.MOTOR_OCPD_MULTIPLIERS["Inverse Time Breaker"]}`, result: pumpOCPD, unit: "A" },
    { label: "Heater Load", formula: "A = kW × 1000 ÷ V", expression: heaterKW > 0 ? `${heaterKW} × 1000 ÷ ${pumpV}` : "0", result: Math.round(heaterA * 10) / 10, unit: "A" },
    { label: "Lighting Load", formula: "A = W ÷ 120", expression: `${lightingW} ÷ 120`, result: Math.round(lightingA * 10) / 10, unit: "A" },
    { label: "Total Amps", formula: "A = pump conductor + heater × 125% + lighting", expression: `${Math.round(pumpConductorA * 10) / 10} + ${Math.round(heaterA * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER} + ${Math.round(lightingA * 10) / 10}`, result: Math.round(totalA * 10) / 10, unit: "A" },
  ];
  return {
    flc: Math.round(flc * 10) / 10,
    pumpConductorA: Math.round(pumpConductorA * 10) / 10,
    pumpOCPD,
    heaterA: Math.round(heaterA * 10) / 10,
    lightingA: Math.round(lightingA * 10) / 10,
    totalA: Math.round(totalA * 10) / 10,
    clearances,
    pool_pump_gfci_required: !!nec.POOL_PUMP_GFCI_REQUIRED,
    pool_pump_gfci_all_phases: !!nec.POOL_PUMP_GFCI_ALL_PHASES,
    pool_pump_replacement_gfci_required: !!nec.POOL_PUMP_REPLACEMENT_GFCI_REQUIRED,
    steps,
  };
}