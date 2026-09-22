/**
 * Electrical Fundamentals — pure electrical-theory calculations.
 * These formulas are not NEC formulas. NEC references are displayed only
 * as application guidance in the UI.
 */

const SQRT3 = Math.sqrt(3);

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positive(value) {
  return Math.max(0, n(value));
}

export function solveOhmsLaw({ solveFor = "I", a = 120, b = 12, formula = "V_R" } = {}) {
  const x = positive(a);
  const y = positive(b);
  let V = 0, I = 0, R = 0, P = 0;
  let formulaText = "";
  let substitution = "";

  switch (solveFor) {
    case "V":
      if (formula === "I_R") {
        I = x; R = y; V = I * R; P = V * I;
        formulaText = "E (or V) = I × R";
        substitution = `E = ${I} × ${R}`;
      } else if (formula === "P_I") {
        P = x; I = y; V = I ? P / I : 0; R = I ? V / I : 0;
        formulaText = "E (or V) = P ÷ I";
        substitution = `E = ${P} ÷ ${I}`;
      } else {
        P = x; R = y; V = Math.sqrt(P * R); I = R ? V / R : 0;
        formulaText = "E (or V) = √(P × R)";
        substitution = `E = √(${P} × ${R})`;
      }
      break;
    case "R":
      if (formula === "V_I") {
        V = x; I = y; R = I ? V / I : 0; P = V * I;
        formulaText = "R = E ÷ I";
        substitution = `R = ${V} ÷ ${I}`;
      } else if (formula === "V_P") {
        V = x; P = y; R = P ? (V * V) / P : 0; I = V ? P / V : 0;
        formulaText = "R = E² ÷ P";
        substitution = `R = ${V}² ÷ ${P}`;
      } else {
        P = x; I = y; R = I ? P / (I * I) : 0; V = I * R;
        formulaText = "R = P ÷ I²";
        substitution = `R = ${P} ÷ ${I}²`;
      }
      break;
    case "P":
      if (formula === "V_I") {
        V = x; I = y; P = V * I; R = I ? V / I : 0;
        formulaText = "P = E × I";
        substitution = `P = ${V} × ${I}`;
      } else if (formula === "I_R") {
        I = x; R = y; P = I * I * R; V = I * R;
        formulaText = "P = I² × R";
        substitution = `P = ${I}² × ${R}`;
      } else {
        V = x; R = y; P = R ? (V * V) / R : 0; I = R ? V / R : 0;
        formulaText = "P = E² ÷ R";
        substitution = `P = ${V}² ÷ ${R}`;
      }
      break;
    case "I":
    default:
      if (formula === "V_R") {
        V = x; R = y; I = R ? V / R : 0; P = V * I;
        formulaText = "I = E ÷ R";
        substitution = `I = ${V} ÷ ${R}`;
      } else if (formula === "P_V") {
        P = x; V = y; I = V ? P / V : 0; R = I ? V / I : 0;
        formulaText = "I = P ÷ E";
        substitution = `I = ${P} ÷ ${V}`;
      } else {
        P = x; R = y; I = R ? Math.sqrt(P / R) : 0; V = I * R;
        formulaText = "I = √(P ÷ R)";
        substitution = `I = √(${P} ÷ ${R})`;
      }
      break;
  }

  return { V, I, R, P, formulaText, substitution };
}

export function calcSeriesCircuit({ voltage = 120, resistors = [] } = {}) {
  const V = positive(voltage);
  const values = resistors.map(positive).filter(r => r > 0);
  const totalR = values.reduce((sum, r) => sum + r, 0);
  const current = totalR ? V / totalR : 0;
  const branches = values.map((R, index) => ({
    index: index + 1,
    R,
    I: current,
    V: current * R,
    P: current * current * R,
  }));
  const totalP = V * current;
  const voltageCheck = branches.reduce((sum, row) => sum + row.V, 0);
  return { voltage: V, totalR, current, totalP, voltageCheck, branches };
}

export function calcParallelCircuit({ voltage = 120, resistors = [] } = {}) {
  const V = positive(voltage);
  const values = resistors.map(positive).filter(r => r > 0);
  const reciprocal = values.reduce((sum, r) => sum + (1 / r), 0);
  const totalR = reciprocal ? 1 / reciprocal : 0;
  const branches = values.map((R, index) => ({
    index: index + 1,
    R,
    V,
    I: R ? V / R : 0,
    P: R ? (V * V) / R : 0,
  }));
  const totalI = branches.reduce((sum, row) => sum + row.I, 0);
  const totalP = V * totalI;
  return { voltage: V, totalR, totalI, totalP, currentCheck: totalI, branches };
}

export function calcAcPower({ system = "single", voltage = 120, current = 10, powerFactor = 0.8 } = {}) {
  const V = positive(voltage);
  const I = positive(current);
  const PF = Math.min(1, Math.max(0, n(powerFactor)));
  const VA = system === "three" ? SQRT3 * V * I : V * I;
  const W = VA * PF;
  const VAR = Math.sqrt(Math.max(0, VA * VA - W * W));
  const angleDeg = PF >= 0 && PF <= 1 ? Math.acos(PF) * 180 / Math.PI : 0;
  return { V, I, PF, VA, W, VAR, angleDeg, system };
}
