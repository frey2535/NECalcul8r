/**
 * Pure calculation logic for Data Center (NEC 708).
 */

/**
 * @param {object} v - inputs: itLoad_kW, pue, voltage, phases, redundancy, ups_efficiency
 * @param {object} nec - necData from getNecData(year)
 */
export function calcDataCenter(v, nec) {
  const itKW = parseFloat(v.itLoad_kW) || 100;
  const pue = parseFloat(v.pue) || 1.4;
  const voltage = parseFloat(v.voltage) || 480;
  const upsPct = parseFloat(v.ups_efficiency) / 100 || 0.94;
  const factor = v.phases === "three" ? 1.732 : 1;

  const totalFacilityKW = itKW * pue;
  const upsInputKW = itKW / upsPct;
  const coolingKW = totalFacilityKW - itKW;

  const pf = 0.9;
  const totalKVA = totalFacilityKW / pf;
  const serviceA = (totalKVA * 1000) / (voltage * factor);

  const redundancyMultiplier = nec.DATA_CENTER_REDUNDANCY[v.redundancy] || 1.25;
  const serviceA_redundant = serviceA * redundancyMultiplier;

  const breaker = nec.STD_OCPD_SIZES.find(s => s >= serviceA_redundant * nec.CONTINUOUS_LOAD_MULTIPLIER) || 2000;

  const steps = [
    { label: "Total Facility Load", formula: "kW = IT load × PUE", expression: `${itKW} × ${pue} (PUE)`, result: Math.round(totalFacilityKW * 10) / 10, unit: "kW" },
    { label: "UPS Input Load", formula: "kW = IT load ÷ UPS efficiency", expression: `${itKW} ÷ ${upsPct} (UPS eff.)`, result: Math.round(upsInputKW * 10) / 10, unit: "kW" },
    { label: "Cooling Load", formula: "kW = total facility − IT load", expression: `${Math.round(totalFacilityKW * 10) / 10} − ${itKW}`, result: Math.round(coolingKW * 10) / 10, unit: "kW" },
    { label: "Service Amps", formula: "A = kVA × 1000 ÷ (V × √3)", expression: `${Math.round(totalKVA * 10) / 10} kVA × 1000 ÷ (${voltage} × ${factor})`, result: Math.round(serviceA * 10) / 10, unit: "A", note: `PF = ${pf}` },
    { label: "Redundant Service Amps", formula: "A = service amps × redundancy multiplier", expression: `${Math.round(serviceA * 10) / 10} × ${redundancyMultiplier} (${v.redundancy})`, result: Math.round(serviceA_redundant * 10) / 10, unit: "A" },
    { label: "Main Breaker (240.6)", formula: "Breaker = next standard ≥ redundant amps × 125%", expression: `next standard ≥ ${Math.round(serviceA_redundant * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: breaker, unit: "A", note: "125% (continuous load)" },
  ];
  return {
    totalFacilityKW: Math.round(totalFacilityKW * 10) / 10,
    upsInputKW: Math.round(upsInputKW * 10) / 10,
    coolingKW: Math.round(coolingKW * 10) / 10,
    serviceA: Math.round(serviceA * 10) / 10,
    redundancyMultiplier,
    serviceA_redundant: Math.round(serviceA_redundant * 10) / 10,
    breaker,
    steps,
  };
}