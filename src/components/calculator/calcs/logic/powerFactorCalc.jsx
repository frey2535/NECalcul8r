/**
 * Pure calculation logic for Power Factor Correction (NEC 460.8).
 */

/**
 * @param {object} v - inputs: kw, currentPF, targetPF, voltage, phases
 * @param {object} nec - necData from getNecData(year)
 */
export function calcPowerFactor(v, nec) {
  const kW = parseFloat(v.kw) || 100;
  const pfExisting = parseFloat(v.currentPF) || 0.75;
  const pfTarget = parseFloat(v.targetPF) || 0.95;
  const voltage = parseFloat(v.voltage) || 480;
  const factor = v.phases === "three" ? 1.732 : 1;

  const kVAR_existing = kW * Math.tan(Math.acos(pfExisting));
  const kVAR_target = kW * Math.tan(Math.acos(pfTarget));
  const kVAR_correction = kVAR_existing - kVAR_target;

  const kVA_existing = kW / pfExisting;
  const kVA_new = kW / pfTarget;

  const I_existing = (kVA_existing * 1000) / (voltage * factor);
  const I_new = (kVA_new * 1000) / (voltage * factor);
  const I_reduction = I_existing - I_new;

  const capA = (kVAR_correction * 1000) / (voltage * factor);
  const capacitorConductorMult = nec.CAPACITOR_CONDUCTOR_MULTIPLIER || 1.35;

  const steps = [
    { label: "Existing kVAR", formula: "kVAR = kW × tan(acos(PF))", expression: `${kW} × tan(acos(${pfExisting}))`, result: Math.round(kVAR_existing * 10) / 10, unit: "kVAR" },
    { label: "Target kVAR", formula: "kVAR = kW × tan(acos(PF_target))", expression: `${kW} × tan(acos(${pfTarget}))`, result: Math.round(kVAR_target * 10) / 10, unit: "kVAR" },
    { label: "Correction kVAR", formula: "kVAR_corr = kVAR_existing − kVAR_target", expression: `${Math.round(kVAR_existing * 10) / 10} − ${Math.round(kVAR_target * 10) / 10}`, result: Math.round(kVAR_correction * 10) / 10, unit: "kVAR", note: `Capacitor bank size needed` },
    { label: "Existing Current", formula: "I = kVA × 1000 ÷ (V × √3)", expression: `${Math.round(kVA_existing * 10) / 10} kVA × 1000 ÷ (${voltage} × ${factor})`, result: Math.round(I_existing * 10) / 10, unit: "A" },
    { label: "Corrected Current", formula: "I = kVA_new × 1000 ÷ (V × √3)", expression: `${Math.round(kVA_new * 10) / 10} kVA × 1000 ÷ (${voltage} × ${factor})`, result: Math.round(I_new * 10) / 10, unit: "A", note: `Reduction: ${Math.round(I_reduction * 10) / 10} A` },
    { label: "Capacitor Current", formula: "I_cap = kVAR × 1000 ÷ (V × √3)", expression: `${Math.round(kVAR_correction * 10) / 10} × 1000 ÷ (${voltage} × ${factor})`, result: Math.round(capA * 10) / 10, unit: "A", note: `Conductor: × ${capacitorConductorMult} = ${Math.round(capA * capacitorConductorMult * 10) / 10} A` },
  ];
  return {
    kVAR_existing: Math.round(kVAR_existing * 10) / 10,
    kVAR_target: Math.round(kVAR_target * 10) / 10,
    kVAR_correction: Math.round(kVAR_correction * 10) / 10,
    kVA_existing: Math.round(kVA_existing * 10) / 10,
    kVA_new: Math.round(kVA_new * 10) / 10,
    I_existing: Math.round(I_existing * 10) / 10,
    I_new: Math.round(I_new * 10) / 10,
    I_reduction: Math.round(I_reduction * 10) / 10,
    capA: Math.round(capA * 10) / 10,
    capacitorConductorMult,
    steps,
  };
}