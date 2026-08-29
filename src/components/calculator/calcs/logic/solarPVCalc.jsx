/**
 * Pure calculation logic for Solar PV (NEC 690 / 705).
 */

/**
 * @param {object} v - inputs: systemDC_kW, inverterAC_kW, inverterOutputA, inverterOutputV, phases, busbarA, mainBreakerA, backfeedCB
 * @param {object} nec - necData from getNecData(year)
 */
export function calcSolarPV(v, nec) {
  const inverterA = parseFloat(v.inverterOutputA) || 40;
  const busbarA = parseFloat(v.busbarA) || 225;
  const mainCB = parseFloat(v.mainBreakerA) || 200;
  const backfeedCB = parseFloat(v.backfeedCB) || 40;
  const dcKW = parseFloat(v.systemDC_kW) || 10;
  const acKW = parseFloat(v.inverterAC_kW) || 9.6;

  const rule120_limit = busbarA * nec.SOLAR_BUSBAR_120PCT;
  const rule120_used = mainCB + backfeedCB;
  const rule120_ok = rule120_used <= rule120_limit;

  const minBackfeedCB_calc = inverterA * nec.SOLAR_BACKFEED_MULTIPLIER;
  const minBackfeedCB = nec.STD_OCPD_SIZES.find(s => s >= minBackfeedCB_calc) || 150;
  const minConductorA = inverterA * nec.SOLAR_BACKFEED_MULTIPLIER;
  const efficiency = dcKW > 0 ? acKW / dcKW * 100 : 0;

  const steps = [
    { label: "Min Conductor Ampacity (690.8(B)(1))", formula: "A = inverter output × 125%", expression: `${inverterA} × ${nec.SOLAR_BACKFEED_MULTIPLIER}`, result: Math.round(minConductorA * 10) / 10, unit: "A", note: "125% of inverter output" },
    { label: "Min Backfeed CB (690.9)", formula: "CB = next standard ≥ inverter × 125%", expression: `next standard ≥ ${Math.round(minBackfeedCB_calc * 10) / 10} A`, result: minBackfeedCB, unit: "A" },
    { label: "120% Rule Limit (" + (nec.SOLAR_120_RULE_ARTICLE || "705.12") + ")", formula: "Limit = busbar rating × 120%", expression: `${busbarA} × ${nec.SOLAR_BUSBAR_120PCT}`, result: Math.round(rule120_limit), unit: "A", note: "Max combined breaker rating" },
    { label: "120% Rule Check", formula: "Check = main breaker + backfeed CB ≤ limit", expression: `${mainCB} (main) + ${backfeedCB} (backfeed) = ${rule120_used}`, result: rule120_ok ? "✓ PASS" : "✗ FAIL", note: `${rule120_used} ≤ ${Math.round(rule120_limit)} A` },
    { label: "System Efficiency", formula: "Eff = AC kW ÷ DC kW × 100", expression: `${acKW} ÷ ${dcKW} × 100`, result: Math.round(efficiency * 10) / 10, unit: "%" },
  ];
  return {
    minConductorA: Math.round(minConductorA * 10) / 10,
    minBackfeedCB_calc: Math.round(minBackfeedCB_calc * 10) / 10,
    minBackfeedCB,
    rule120_limit: Math.round(rule120_limit),
    rule120_used,
    rule120_ok,
    solar120Article: nec.SOLAR_120_RULE_ARTICLE || "705.12",
    efficiency: Math.round(efficiency * 10) / 10,
    steps,
  };
}