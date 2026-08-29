/**
 * Pure calculation logic for HVAC Load (NEC 440).
 */

/**
 * @param {object} v - inputs: nameplateAmps, voltage, phases, compressorFLA, fanFLA, conductorType
 * @param {object} nec - necData from getNecData(year)
 */
export function calcHVACLoad(v, nec) {
  const nameplateA = parseFloat(v.nameplateAmps) || 0;
  const compFLA = parseFloat(v.compressorFLA) || 0;
  const fanFLA = parseFloat(v.fanFLA) || 0;
  const totalFLA = compFLA + fanFLA;

  const conductorA_single = nameplateA * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const conductorA_multi = compFLA * nec.CONTINUOUS_LOAD_MULTIPLIER + fanFLA;
  const conductorA = v.conductorType === "single" ? conductorA_single : conductorA_multi;

  const hvacOcpdMult = nec.HVAC_OCPD_MULTIPLIER || 1.75;
  const maxOCPD_calc = nameplateA * hvacOcpdMult;
  const maxOCPD = nec.STD_OCPD_SIZES.filter(s => s <= maxOCPD_calc).reverse()[0] || nec.STD_OCPD_SIZES[0];
  const minOCPD = nec.STD_OCPD_SIZES.find(s => s >= nameplateA) || nec.STD_OCPD_SIZES[nec.STD_OCPD_SIZES.length - 1];
  const selectedOCPD = Math.max(maxOCPD, minOCPD);

  const voltage = parseFloat(v.voltage) || 240;
  const factor = v.phases === "three" ? 1.732 : 1;
  const loadVA = nameplateA * voltage * factor;

  const steps = [
    { label: "Total FLA", formula: "FLA = compressor FLA + fan FLA", expression: v.conductorType === "single" ? `Nameplate: ${nameplateA} A` : `${compFLA} + ${fanFLA}`, result: Math.round(totalFLA * 10) / 10, unit: "A" },
    { label: "Conductor Ampacity (440.6)", formula: "A = FLA × 125%", expression: v.conductorType === "single" ? `${nameplateA} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}` : `${compFLA} × ${nec.CONTINUOUS_LOAD_MULTIPLIER} + ${fanFLA}`, result: Math.round(conductorA * 10) / 10, unit: "A" },
    { label: "Max OCPD (440.22)", formula: "OCPD = nameplate amps × 175%", expression: `${nameplateA} × ${hvacOcpdMult}`, result: Math.round(maxOCPD_calc * 10) / 10, unit: "A", note: `${Math.round(hvacOcpdMult * 100)}% of rated-load current` },
    { label: "Selected OCPD", formula: "OCPD = max(max OCPD, min OCPD)", expression: `max(${maxOCPD}, ${minOCPD})`, result: selectedOCPD, unit: "A" },
    { label: "Load VA", formula: "VA = A × V × √3", expression: `${nameplateA} × ${voltage} ${v.phases === "three" ? "× 1.732" : ""}`, result: Math.round(loadVA), unit: "VA" },
  ];
  return {
    totalFLA: Math.round(totalFLA * 10) / 10,
    conductorA: Math.round(conductorA * 10) / 10,
    maxOCPD_calc: Math.round(maxOCPD_calc * 10) / 10,
    selectedOCPD,
    loadVA: Math.round(loadVA),
    GFCI_servicing_note: nec.GFCI_EQUIPMENT_SERVICING_RECEPTACLE || null,
    steps,
  };
}