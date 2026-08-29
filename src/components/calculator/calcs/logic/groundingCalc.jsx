/**
 * Pure calculation logic for EGC Sizing (NEC 250.122) and GEC Sizing (NEC 250.66).
 */

// AWG size ordering from smallest to largest — used for comparing conductor sizes
const AWG_ORDER = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600", "700", "750", "1000"];

/**
 * EGC Sizing — NEC Table 250.122
 * @param {object} v - inputs: ocpd (string), material, voltageDropUpsizeRatio (optional number)
 * @param {object} nec - necData from getNecData(year)
 */
export function calcEGCSizing(v, nec) {
  const ocpdVal = parseInt(v.ocpd) || 100;
  const row = nec.EGC_TABLE.find(r => r.ocpd >= ocpdVal) || nec.EGC_TABLE[nec.EGC_TABLE.length - 1];
  const awg = v.material === "copper" ? row?.copper : row?.aluminum;

  // 250.122(A): If ungrounded conductors are increased in size for any reason
  // (including voltage drop), the EGC must be increased proportionally.
  const upsizeRatio = parseFloat(v.voltageDropUpsizeRatio) || 1;
  let adjustedAwg = awg;
  let upsizeNote = null;
  if (upsizeRatio > 1) {
    const cmTable = nec.CONDUCTOR_CM || {};
    const baseCM = cmTable[awg] || 0;
    if (baseCM > 0) {
      const requiredCM = baseCM * upsizeRatio;
      // Find the smallest conductor with CM >= requiredCM
      const cmEntries = Object.entries(cmTable).sort((a, b) => a[1] - b[1]);
      const upsized = cmEntries.find(([, cm]) => cm >= requiredCM);
      adjustedAwg = upsized ? upsized[0] : awg;
      upsizeNote = `Ungrounded conductors upsized by ${((upsizeRatio - 1) * 100).toFixed(0)}% → EGC increased from #${awg} to #${adjustedAwg} AWG (${nec.EGC_UPSIZE_ARTICLE || "250.122(B)"})`;
    }
  }

  const steps = [
    { label: "OCPD Rating", formula: "OCPD = input rating", expression: `OCPD = ${ocpdVal} A`, result: ocpdVal, unit: "A" },
    { label: "EGC Size (Table 250.122)", formula: "EGC = Table 250.122 lookup by OCPD & material", expression: `Table 250.122 → ${ocpdVal} A → ${v.material === "copper" ? "Cu" : "Al"} #${awg} AWG`, result: `#${awg} AWG`, note: `Matched row: ${row?.ocpd} A` },
  ];
  if (upsizeRatio > 1 && adjustedAwg !== awg) {
    steps.push({ label: `Voltage Drop Adjustment (${nec.EGC_UPSIZE_ARTICLE || "250.122(B)"})`, formula: "EGC_adjusted = EGC_base × upsize ratio", expression: `#${awg} AWG × ${upsizeRatio}`, result: `#${adjustedAwg} AWG`, note: upsizeNote });
  }

  return {
    ocpdVal,
    matchedOCPD: row?.ocpd,
    awg,
    adjustedAwg,
    material: v.material,
    voltageDropUpsizeRatio: upsizeRatio,
    upsizeNote,
    egcUpsizeArticle: nec.EGC_UPSIZE_ARTICLE || "250.122(B)",
    steps,
  };
}

/**
 * GEC Sizing — NEC Table 250.66
 * @param {object} v - inputs: serviceSize (index string), material, electrodeType (optional)
 * @param {object} nec - necData from getNecData(year)
 */
export function calcGECSizing(v, nec) {
  const idx = parseInt(v.serviceSize) || 0;
  const row = nec.GEC_TABLE[idx];
  let gecSize = v.material === "copper" ? row?.copper : row?.aluminum;

  // 250.66(C): For made electrodes (ground rods, pipes, plates), the GEC
  // need not be larger than #6 Cu or #4 Al
  const electrodeType = v.electrodeType || "service_conductor";
  let electrodeNote = null;
  if (electrodeType === "made_electrode") {
    const maxSize = v.material === "copper" ? "6" : "4";
    const maxIdx = AWG_ORDER.indexOf(maxSize);
    const tableIdx = AWG_ORDER.indexOf(String(gecSize));
    if (tableIdx > maxIdx) {
      gecSize = maxSize;
      electrodeNote = `Made electrode (rod/pipe/plate) — GEC capped at #${maxSize} AWG per 250.66(C)`;
    } else {
      electrodeNote = `Made electrode — table value #${gecSize} AWG is already within the 250.66(C) cap (#${maxSize} AWG)`;
    }
  }

  const steps = [
    { label: "Service Conductor Size", formula: "Service = selected conductor size", expression: `Service: ${row?.service || "—"}`, result: row?.service || "—" },
    { label: "GEC Size (Table 250.66)", formula: "GEC = Table 250.66 lookup by service conductor & material", expression: `Table 250.66 → ${row?.service || "—"} → ${v.material === "copper" ? "Cu" : "Al"} #${gecSize}`, result: `#${gecSize} AWG` },
  ];
  if (electrodeType === "made_electrode") {
    steps.push({ label: "Made Electrode Cap (250.66(C))", formula: "GEC_made = min(GEC_table, #6 Cu / #4 Al)", expression: `min(#${row?.copper || "—"} Cu, #6 Cu)`, result: `#${gecSize} AWG`, note: electrodeNote });
  }

  return {
    serviceLabel: row?.service || "—",
    gecSize,
    material: v.material,
    electrodeType,
    electrodeNote,
    steps,
  };
}