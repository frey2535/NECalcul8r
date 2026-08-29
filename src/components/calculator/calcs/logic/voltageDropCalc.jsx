/**
 * Pure calculation logic for Voltage Drop (NEC Ch.9 Table 8 / 210.19).
 */

const STANDARD_AWGS = ["14","12","10","8","6","4","3","2","1","1/0","2/0","3/0","4/0","250","300","350","400","500","600","700","750","1000"];

/**
 * Compute AC input current for an AC-to-DC power supply load.
 * Returns null when not applicable or when inputs are invalid.
 *
 *   DC Output Watts = Vdc × Idc
 *   AC Input Watts  = DC Output Watts ÷ Efficiency
 *   AC Input Amps   = AC Input Watts ÷ (Vac × PowerFactor)
 *   Iac = (Vdc × Idc) ÷ (Vac × Efficiency × PowerFactor)
 */
function computeAcInputCurrent(v) {
  const Vac = parseFloat(v.acSupplyVoltage) || 0;
  const Vdc = parseFloat(v.dcOutputVoltage) || 0;
  const Idc = parseFloat(v.dcOutputCurrent) || 0;
  let efficiency = parseFloat(v.efficiency) || 90;
  // normalize efficiency to decimal (handle both 90 and 0.9)
  if (efficiency > 1) efficiency = efficiency / 100;
  const powerFactor = parseFloat(v.powerFactor) || 1.0;

  if (Vac <= 0 || Vdc <= 0 || Idc <= 0 || efficiency <= 0 || powerFactor <= 0) return null;

  const dcOutputWatts = Vdc * Idc;
  const acInputWatts = dcOutputWatts / efficiency;
  const acInputAmps = acInputWatts / (Vac * powerFactor);

  return {
    dcOutputWatts: Math.round(dcOutputWatts * 100) / 100,
    acInputWatts: Math.round(acInputWatts * 100) / 100,
    acInputAmps: Math.round(acInputAmps * 1000) / 1000,
    efficiencyDecimal: efficiency,
    powerFactor,
  };
}

/**
 * @param {object} v - inputs: voltage, current, length, material, phases, selectedAWG,
 *                     loadType ("standard" | "acdc"), acSupplyVoltage, dcOutputVoltage,
 *                     dcOutputCurrent, efficiency, powerFactor
 * @param {object} nec - necData from getNecData(year)
 */
export function calcVoltageDrop(v, nec) {
  const K = nec.RESISTIVITY[v.material];

  // AC-to-DC mode: derive AC input current; fall back to direct amps if invalid
  const acdc = v.loadType === "acdc" ? computeAcInputCurrent(v) : null;
  const effectiveCurrent = acdc ? acdc.acInputAmps : (parseFloat(v.current) || 0);
  const I = effectiveCurrent;

  const L = parseFloat(v.length) || 0;
  // In ACDC mode, the source voltage for VD% is the AC supply voltage
  const Vs = acdc ? (parseFloat(v.acSupplyVoltage) || 120) : (parseFloat(v.voltage) || 120);
  const factor = v.phases === "single" ? 2 : 1.732;

  const VD_3pct_allowedV = Vs * 0.03;
  const VD_5pct_allowedV = Vs * 0.05;

  const wires = Object.entries(nec.CONDUCTOR_CM)
    .filter(([awg]) => STANDARD_AWGS.includes(awg))
    .map(([awg, cm]) => ({ awg, cm }))
    .sort((a, b) => a.cm - b.cm); // ascending by CM so .find() returns smallest sufficient wire

  const CM_needed_3pct = (K * I * L * factor) / VD_3pct_allowedV;
  const CM_needed_5pct = (K * I * L * factor) / VD_5pct_allowedV;

  const minWire3 = wires.find(w => w.cm >= CM_needed_3pct) || wires[wires.length - 1];
  const minWire5 = wires.find(w => w.cm >= CM_needed_5pct) || wires[wires.length - 1];

  const selectedAWG = v.selectedAWG || "12";
  const selWire = wires.find(w => w.awg === selectedAWG) || wires[1];
  const VD = selWire ? (K * I * L * factor) / selWire.cm : 0;
  const VD_pct = Vs > 0 ? (VD / Vs) * 100 : 0;
  const endV = Vs - VD;

  // Build dynamic step-by-step calculation steps with actual values plugged in
  const factorLabel = v.phases === "single" ? "2" : "1.732";
  const materialName = v.material === "copper" ? "Copper" : "Aluminum";
  const steps = [];

  if (acdc) {
    steps.push({
      label: "AC Input Current (DC Power Supply)",
      formula: "Iac = (Vdc × Idc) ÷ (Vac × Efficiency × PF)",
      expression: `Iac = (${acdc.dcOutputWatts} W) ÷ (${Vs} V × ${acdc.powerFactor} PF) = ${acdc.acInputWatts} W ÷ ${Vs} V`,
      result: acdc.acInputAmps,
      unit: "A",
      note: `DC output: ${v.dcOutputVoltage}V × ${v.dcOutputCurrent}A = ${acdc.dcOutputWatts} W, efficiency ${acdc.efficiencyDecimal * 100}%`,
    });
  }

  if (selWire) {
    steps.push({
      label: `Voltage Drop (${v.phases === "single" ? "Single-Phase" : "Three-Phase"})`,
      formula: `VD = (${factorLabel} × K × I × L) / CM`,
      expression: `VD = (${factorLabel} × ${K} × ${I} × ${L}) / ${selWire.cm.toLocaleString()}`,
      result: (Math.round(VD * 100) / 100).toFixed(2),
      unit: "V",
      note: `${materialName} K=${K}, #${selectedAWG} AWG = ${selWire.cm.toLocaleString()} CM`,
    });
    steps.push({
      label: "Voltage Drop Percentage",
      formula: "VD% = (VD / Vs) × 100",
      expression: `VD% = (${(Math.round(VD * 100) / 100).toFixed(2)} / ${Vs}) × 100`,
      result: (Math.round(VD_pct * 100) / 100).toFixed(2),
      unit: "%",
    });
    steps.push({
      label: "End-of-Line Voltage",
      formula: "V_end = Vs − VD",
      expression: `V_end = ${Vs} − ${(Math.round(VD * 100) / 100).toFixed(2)}`,
      result: (Math.round(endV * 10) / 10).toFixed(1),
      unit: "V",
    });
  }

  steps.push({
    label: "Minimum CM for 3% Limit",
    formula: `CM_min = (${factorLabel} × K × I × L) / (Vs × 0.03)`,
    expression: `CM_min = (${factorLabel} × ${K} × ${I} × ${L}) / (${Vs} × 0.03)`,
    result: Math.round(CM_needed_3pct).toLocaleString(),
    unit: "CM",
    note: `→ #${minWire3?.awg} AWG (${(nec.CONDUCTOR_CM[minWire3?.awg] || 0).toLocaleString()} CM)`,
  });
  steps.push({
    label: "Minimum CM for 5% Limit",
    formula: `CM_min = (${factorLabel} × K × I × L) / (Vs × 0.05)`,
    expression: `CM_min = (${factorLabel} × ${K} × ${I} × ${L}) / (${Vs} × 0.05)`,
    result: Math.round(CM_needed_5pct).toLocaleString(),
    unit: "CM",
    note: `→ #${minWire5?.awg} AWG (${(nec.CONDUCTOR_CM[minWire5?.awg] || 0).toLocaleString()} CM)`,
  });

  return {
    K,
    effectiveCurrent: Math.round(I * 1000) / 1000,
    acdc, // null when standard mode
    VD: Math.round(VD * 100) / 100,
    VD_pct: Math.round(VD_pct * 100) / 100,
    endV: Math.round(endV * 10) / 10,
    ok3: VD_pct <= 3,
    ok5: VD_pct <= 5,
    minWire3_awg: minWire3?.awg,
    minWire5_awg: minWire5?.awg,
    CM_needed_3pct: Math.round(CM_needed_3pct),
    steps,
  };
}