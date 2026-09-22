import { describe, expect, it } from "vitest";
import { solveOhmsLaw, calcSeriesCircuit, calcParallelCircuit, calcAcPower } from "./electricalFundamentalsCalc";

describe("electrical fundamentals", () => {
  it("solves current from voltage and resistance", () => {
    const r = solveOhmsLaw({ solveFor: "I", formula: "V_R", a: 120, b: 12 });
    expect(r.I).toBe(10);
    expect(r.P).toBe(1200);
  });

  it("solves all 12 Ohm/power relationships consistently", () => {
    const cases = [
      ["V","I_R",10,12,120], ["V","P_I",1200,10,120], ["V","P_R",1200,12,120],
      ["I","V_R",120,12,10], ["I","P_V",1200,120,10], ["I","P_R",1200,12,10],
      ["R","V_I",120,10,12], ["R","V_P",120,1200,12], ["R","P_I",1200,10,12],
      ["P","V_I",120,10,1200], ["P","I_R",10,12,1200], ["P","V_R",120,12,1200],
    ];
    for (const [solveFor, formula, a, b, expected] of cases) {
      const r = solveOhmsLaw({ solveFor, formula, a, b });
      expect(r[solveFor]).toBeCloseTo(expected, 8);
    }
  });

  it("solves and verifies a series circuit", () => {
    const r = calcSeriesCircuit({ voltage: 120, resistors: [10,20,30] });
    expect(r.totalR).toBe(60);
    expect(r.current).toBe(2);
    expect(r.voltageCheck).toBeCloseTo(120, 8);
    expect(r.totalP).toBe(240);
  });

  it("solves and verifies a parallel circuit", () => {
    const r = calcParallelCircuit({ voltage: 120, resistors: [10,20,30] });
    expect(r.totalR).toBeCloseTo(5.45454545, 6);
    expect(r.totalI).toBeCloseTo(22, 8);
    expect(r.totalP).toBeCloseTo(2640, 8);
  });

  it("solves single-phase AC power", () => {
    const r = calcAcPower({ system: "single", voltage: 120, current: 10, powerFactor: 0.8 });
    expect(r.VA).toBeCloseTo(1200, 8);
    expect(r.W).toBeCloseTo(960, 8);
    expect(r.VAR).toBeCloseTo(720, 8);
  });

  it("solves balanced three-phase AC power", () => {
    const r = calcAcPower({ system: "three", voltage: 480, current: 10, powerFactor: 0.8 });
    expect(r.VA).toBeCloseTo(Math.sqrt(3) * 4800, 8);
    expect(r.W).toBeCloseTo(Math.sqrt(3) * 4800 * 0.8, 8);
  });
});
