/**
 * Pure calculation logic for bonding/grounding jumper calculators:
 * - GEC for SDS (NEC 250.30)
 * - Main Bonding Jumper (NEC 250.28(D))
 * - System Bonding Jumper (NEC 250.30(A)(1))
 * - Bonding Jumper (Parallel) (NEC 250.102(C))
 */

/**
 * GEC for Separately Derived System — NEC Table 250.66
 */
export function calcGECforSDS(v, nec) {
  const idx = parseInt(v.serviceSize) || 0;
  const row = nec.GEC_TABLE[idx];
  const gecSize = v.material === "copper" ? row?.copper : row?.aluminum;
  const steps = [
    { label: "Service Conductor Size", formula: "Service = selected conductor size", expression: `Service: ${row?.service || "—"}`, result: row?.service || "—" },
    { label: "GEC Size (Table 250.66)", formula: "GEC = Table 250.66 lookup by service conductor & material", expression: `Table 250.66 → ${row?.service || "—"} → ${v.material === "copper" ? "Cu" : "Al"} #${gecSize}`, result: `#${gecSize} AWG` },
  ];
  return {
    serviceLabel: row?.service || "—",
    gecSize,
    material: v.material,
    steps,
  };
}

/**
 * Main Bonding Jumper — NEC 250.28(D) / Table 250.102(C)(1)
 */
export function calcMainBondingJumper(v, nec) {
  const sets = Math.max(1, parseInt(v.parallelSets) || 1);
  const conductorCM = nec.CONDUCTOR_CM[v.conductorSize] || 0;
  const totalCM = conductorCM * sets;

  const table = v.mbjMaterial === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
  const row = table.find(r => totalCM <= r.cm);
  const mbjSize = row ? row.size : "12.5% of total conductor CM";

  const steps = [
    { label: "Total Circular Mil Area", formula: "CM = conductor CM × number of parallel sets", expression: `${conductorCM.toLocaleString()} × ${sets} set(s)`, result: totalCM.toLocaleString(), unit: "CM" },
    { label: "Bonding Jumper Size (Table 250.102(C)(1))", formula: "BJ = Table 250.102(C)(1) lookup by total CM & material", expression: `Table 250.102(C)(1) → ${totalCM.toLocaleString()} CM → ${v.mbjMaterial === "copper" ? "Cu" : "Al"} ${mbjSize}`, result: mbjSize, note: `12.5% method: ${Math.round(totalCM * 0.125).toLocaleString()} CM` },
  ];
  return {
    conductorCM,
    totalCM,
    calcCM: Math.round(totalCM * 0.125),
    mbjSize,
    steps,
  };
}

/**
 * System Bonding Jumper — NEC 250.30(A)(1) / Table 250.102(C)(1)
 */
export function calcSystemBondingJumper(v, nec) {
  const sets = Math.max(1, parseInt(v.parallelSets) || 1);
  const conductorCM = nec.CONDUCTOR_CM[v.conductorSize] || 0;
  const totalCM = conductorCM * sets;

  const table = v.sbjMaterial === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
  const row = table.find(r => totalCM <= r.cm);
  const sbjSize = row ? row.size : "12.5% of total conductor CM";

  const kva = parseFloat(v.kva) || 75;
  const voltage = parseFloat(v.voltage) || 208;
  const factor = v.phases === "three" ? 1.732 : 1;
  const secFLC = (kva * 1000) / (voltage * factor);

  const steps = [
    { label: "Total Circular Mil Area", formula: "CM = conductor CM × number of parallel sets", expression: `${conductorCM.toLocaleString()} × ${sets} set(s)`, result: totalCM.toLocaleString(), unit: "CM" },
    { label: "System Bonding Jumper Size (Table 250.102(C)(1))", formula: "SBJ = Table 250.102(C)(1) lookup by total CM & material", expression: `Table 250.102(C)(1) → ${totalCM.toLocaleString()} CM → ${v.sbjMaterial === "copper" ? "Cu" : "Al"} ${sbjSize}`, result: sbjSize },
    { label: "Secondary FLC", formula: "FLC = kVA × 1000 ÷ (V × √3)", expression: `${kva} kVA × 1000 ÷ (${voltage} × ${factor})`, result: Math.round(secFLC * 10) / 10, unit: "A" },
  ];
  return {
    conductorCM,
    totalCM,
    calcCM: Math.round(totalCM * 0.125),
    sbjSize,
    secFLC: Math.round(secFLC * 10) / 10,
    steps,
  };
}

/**
 * Bonding Jumper for Parallel Conductors — NEC 250.102(C)
 */
export function calcBondingJumperParallel(v, nec) {
  const sets = Math.max(1, parseInt(v.parallelSets) || 1);
  const cmPerConductor = nec.CONDUCTOR_CM[v.conductorSize] || 0;
  const totalCM = cmPerConductor * sets;

  const table = v.bjMaterial === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;

  const totalRow = table.find(r => totalCM <= r.cm);
  const totalBJSize = totalRow ? totalRow.size : "12.5% of total CM";

  const perRacewayRow = table.find(r => cmPerConductor <= r.cm);
  const perRacewayBJSize = perRacewayRow ? perRacewayRow.size : "12.5% of CM per raceway";

  const steps = [
    { label: "Total CM (all sets)", formula: "CM = conductor CM × number of parallel sets", expression: `${cmPerConductor.toLocaleString()} × ${sets} set(s)`, result: totalCM.toLocaleString(), unit: "CM" },
    { label: "Total Bonding Jumper (Table 250.102(C)(1))", formula: "BJ = Table 250.102(C)(1) lookup by total CM & material", expression: `Table → ${totalCM.toLocaleString()} CM → ${v.bjMaterial === "copper" ? "Cu" : "Al"} ${totalBJSize}`, result: totalBJSize },
    { label: "Per-Raceway Bonding Jumper", formula: "BJ = Table 250.102(C)(1) lookup by single conductor CM", expression: `Table → ${cmPerConductor.toLocaleString()} CM → ${v.bjMaterial === "copper" ? "Cu" : "Al"} ${perRacewayBJSize}`, result: perRacewayBJSize },
  ];
  return {
    cmPerConductor,
    totalCM,
    totalBJSize,
    perRacewayBJSize,
    steps,
  };
}