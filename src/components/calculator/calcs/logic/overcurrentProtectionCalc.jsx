/**
 * Pure calculation logic for Overcurrent Protection (NEC 240).
 */

/**
 * @param {object} v - inputs: conductorAmpacity, isContinuous, continuousLoad, noncontinuousLoad, awg, allowNextUp
 * @param {object} nec - necData from getNecData(year)
 */
export function calcOvercurrentProtection(v, nec) {
  const ampacity = parseFloat(v.conductorAmpacity) || 65;
  const contLoad = parseFloat(v.continuousLoad) || 0;
  const nonContLoad = parseFloat(v.noncontinuousLoad) || 0;
  const isContinuous = v.isContinuous === true || v.isContinuous === "true";
  const allowNextUp = v.allowNextUp === true || v.allowNextUp === "true";

  const requiredOCPD = contLoad * nec.CONTINUOUS_LOAD_MULTIPLIER + nonContLoad;

  const exactMatch = nec.STD_OCPD_SIZES.find(s => s === ampacity);
  const nextSizeUp = nec.STD_OCPD_SIZES.find(s => s > ampacity);
  const nextSizeDown = nec.STD_OCPD_SIZES.filter(s => s <= ampacity).reverse()[0];
  // 240.4(B): Next size up rule only applies to conductors with ampacity < 800A
  const canNextUp = allowNextUp && !exactMatch && ampacity < 800;
  let recommendedOCPD = canNextUp ? nextSizeUp : nextSizeDown;
  const nextUpBlocked = allowNextUp && !exactMatch && ampacity >= 800;

  const smallCondMax = nec.SMALL_CONDUCTOR_MAX_OCPD ? nec.SMALL_CONDUCTOR_MAX_OCPD[v.awg] : undefined;
  const cappedBy240_4D = smallCondMax != null && recommendedOCPD > smallCondMax;
  if (cappedBy240_4D) recommendedOCPD = smallCondMax;
  const continuousPass = !isContinuous || (recommendedOCPD >= requiredOCPD);

  const steps = [
    { label: "Required OCPD (210.20)", formula: "OCPD = continuous × 125% + non-continuous", expression: `${contLoad} × ${nec.CONTINUOUS_LOAD_MULTIPLIER} + ${nonContLoad}`, result: Math.round(requiredOCPD * 10) / 10, unit: "A", note: "125% continuous + 100% non-continuous" },
    { label: "Conductor Ampacity", formula: "Ampacity = input value", expression: `Ampacity = ${ampacity} A`, result: ampacity, unit: "A" },
    { label: "Recommended OCPD (240.6)", formula: "OCPD = next standard ≤ ampacity (or next size up if allowed)", expression: canNextUp ? `next size up from ${ampacity}` : `next size down from ${ampacity}`, result: recommendedOCPD, unit: "A", note: exactMatch ? `Exact match at ${ampacity} A` : (nextUpBlocked ? `Next size up blocked — ampacity ≥ 800A (240.4(B))` : (cappedBy240_4D ? `Capped at ${smallCondMax} A by 240.4(D)` : undefined)) },
    { label: "Small Conductor Limit (240.4(D))", formula: "Max OCPD = Table 240.4(D) lookup by AWG", expression: v.awg ? `#${v.awg} AWG max = ${smallCondMax || "—"} A` : "—", result: smallCondMax || "N/A", unit: smallCondMax ? "A" : undefined, note: cappedBy240_4D ? "Recommended OCPD capped to 240.4(D)" : undefined },
  ];
  return {
    exactMatch: exactMatch || null,
    nextSizeUp: nextSizeUp || null,
    nextSizeDown: nextSizeDown || null,
    recommendedOCPD,
    requiredOCPD: Math.round(requiredOCPD * 10) / 10,
    smallCondMax: smallCondMax || null,
    continuousPass,
    nextUpBlocked,
    arc_energy_reduction_threshold_A: nec.ARC_ENERGY_REDUCTION_THRESHOLD_AMPS || null,
    arc_energy_reduction_applies: ampacity >= (nec.ARC_ENERGY_REDUCTION_THRESHOLD_AMPS || Infinity),
    steps,
  };
}