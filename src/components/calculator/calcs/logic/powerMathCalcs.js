/**
 * Pure math for Three-Phase Power, Single-Phase Power, and Multiwire Branch Circuits.
 */

export function calcThreePhasePower(v) {
  const Vll = parseFloat(v.voltage) || 480;
  const I = parseFloat(v.current) || 100;
  const PF = parseFloat(v.pf) || 0.85;
  const kVA_in = parseFloat(v.kva) || 150;
  const mode = v.mode || "vip";

  let kVA, kW, kVAR, amps;
  if (mode === "vip") {
    kVA = (Vll * I * 1.732) / 1000;
    kW = kVA * PF;
    kVAR = kVA * Math.sqrt(Math.max(0, 1 - PF * PF));
    amps = I;
  } else {
    kVA = kVA_in;
    kW = kVA * PF;
    kVAR = kVA * Math.sqrt(Math.max(0, 1 - PF * PF));
    amps = (kVA * 1000) / (Vll * 1.732);
  }

  return {
    kVA: Math.round(kVA * 100) / 100,
    kW: Math.round(kW * 100) / 100,
    kVAR: Math.round(kVAR * 100) / 100,
    amps: Math.round(amps * 10) / 10,
    Vln: Math.round((Vll / 1.732) * 10) / 10,
  };
}

export function calcSinglePhasePower(v) {
  const Vs = parseFloat(v.voltage) || 120;
  const I = parseFloat(v.current) || 20;
  const PF = parseFloat(v.pf) || 1.0;
  const W_in = parseFloat(v.watts) || 2400;
  const kVA_in = parseFloat(v.kva) || 3;
  const mode = v.mode || "vip";

  let VA, W, kVAR, amps;
  if (mode === "vip") {
    VA = Vs * I;
    W = VA * PF;
    kVAR = VA * Math.sqrt(Math.max(0, 1 - PF * PF));
    amps = I;
  } else if (mode === "wp") {
    W = W_in;
    VA = W / (PF || 1);
    kVAR = VA * Math.sqrt(Math.max(0, 1 - PF * PF));
    amps = VA / Vs;
  } else {
    VA = kVA_in * 1000;
    W = VA * PF;
    kVAR = VA * Math.sqrt(Math.max(0, 1 - PF * PF));
    amps = VA / Vs;
  }

  return {
    VA: Math.round(VA),
    W: Math.round(W),
    kVAR: Math.round(kVAR * 100) / 100,
    amps: Math.round(amps * 10) / 10,
  };
}

export function calcMultiwire(v) {
  const A = parseFloat(v.phaseA) || 0;
  const B = parseFloat(v.phaseB) || 0;
  const C = parseFloat(v.phaseC) || 0;
  const voltage = parseFloat(v.voltage) || 120;

  let neutralI = 0;
  if (v.circuitType === "single_phase_2w") {
    neutralI = A;
  } else if (v.circuitType === "single_phase_3w") {
    neutralI = Math.abs(A - B);
  } else if (v.circuitType === "three_phase_4w") {
    neutralI = Math.sqrt(A * A + B * B + C * C - A * B - B * C - C * A);
  } else if (v.circuitType === "balanced") {
    neutralI = 0;
  }

  const loads = v.circuitType === "three_phase_4w" ? [A, B, C] : [A, B];
  const maxLoad = Math.max(...loads);
  const minLoad = Math.min(...loads);
  const imbalance = maxLoad > 0 ? ((maxLoad - minLoad) / maxLoad) * 100 : 0;
  const needsHandle = v.circuitType === "single_phase_3w" || v.circuitType === "three_phase_4w";

  return {
    neutralI: Math.round(neutralI * 100) / 100,
    imbalance: Math.round(imbalance * 10) / 10,
    needsHandle,
    powerA: A * voltage,
    powerB: B * voltage,
    powerC: C * voltage,
  };
}
