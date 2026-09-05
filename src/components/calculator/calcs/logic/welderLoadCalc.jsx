/**
 * Pure calculation logic for Welder Load (NEC 630.11 / 630.12).
 */

/**
 * @param {object} v - inputs: nameplateAmps, dutyCycle, voltage, phases
 * @param {object} nec - necData from getNecData(year)
 */
export function calcWelderLoad(v, nec) {
  const I = parseFloat(v.nameplateAmps) || 60;
  const DC = parseFloat(v.dutyCycle) || 60;
  const voltage = parseFloat(v.voltage) || 240;
  const factor = v.phases === "three" ? 1.732 : 1;

  const table = nec.WELDER_DUTY_CYCLE_TABLE || [];
  const exact = table.find((r) => r.dc === DC);
  const dcFactor = exact
    ? exact.mult
    : (table.filter((r) => r.dc >= DC).sort((a, b) => a.dc - b.dc)[0]?.mult
      ?? table[0]?.mult
      ?? Math.sqrt(Math.max(0, DC) / 100));
  const conductorA = I * dcFactor;

  const maxOCPD_calc = I * nec.WELDER_OCPD_MULTIPLIER;
  const maxOCPD = nec.STD_OCPD_SIZES.filter(s => s <= maxOCPD_calc).reverse()[0] || nec.STD_OCPD_SIZES[0];
  const nameplatekVA = (I * voltage * factor) / 1000;
  const demandkVA = (conductorA * voltage * factor) / 1000;

  const steps = [
    { label: "Duty Cycle Multiplier (Table 630.11(A))", formula: "Multiplier = listed table factor for duty cycle", expression: `${DC}% duty cycle → ${Math.round(dcFactor * 1000) / 1000}`, result: Math.round(dcFactor * 1000) / 1000, note: exact ? "Exact listed duty-cycle row" : "Conservative next higher listed duty-cycle row" },
    { label: "Conductor Ampacity (630.11)", formula: "A = nameplate × duty cycle multiplier", expression: `${I} × ${Math.round(dcFactor * 1000) / 1000}`, result: Math.round(conductorA * 10) / 10, unit: "A" },
    { label: "Max OCPD (630.12)", formula: "OCPD = nameplate × 200%", expression: `${I} × ${nec.WELDER_OCPD_MULTIPLIER}`, result: Math.round(maxOCPD_calc), unit: "A", note: `→ next standard ≤ ${Math.round(maxOCPD_calc)}: ${maxOCPD} A` },
    { label: "Nameplate kVA", formula: "kVA = I × V × √3 ÷ 1000", expression: `${I} × ${voltage} ${v.phases === "three" ? "× 1.732" : ""} ÷ 1000`, result: Math.round(nameplatekVA * 10) / 10, unit: "kVA" },
    { label: "Demand kVA", formula: "kVA = conductor A × V × √3 ÷ 1000", expression: `${Math.round(conductorA * 10) / 10} × ${voltage} ${v.phases === "three" ? "× 1.732" : ""} ÷ 1000`, result: Math.round(demandkVA * 10) / 10, unit: "kVA" },
  ];
  return {
    dcFactor: Math.round(dcFactor * 1000) / 1000,
    conductorA: Math.round(conductorA * 10) / 10,
    maxOCPD_calc: Math.round(maxOCPD_calc),
    maxOCPD,
    nameplatekVA: Math.round(nameplatekVA * 10) / 10,
    demandkVA: Math.round(demandkVA * 10) / 10,
    steps,
  };
}