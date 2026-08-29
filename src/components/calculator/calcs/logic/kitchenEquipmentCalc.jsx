/**
 * Pure calculation logic for Kitchen Equipment Demand (NEC 220.56).
 */

import { withTrace } from "@/lib/calculatorTrace";

/**
 * @param {object} v - inputs: equipment (array of {name, kw}), voltage, phases
 * @param {object} nec - necData from getNecData(year)
 */
export function calcKitchenEquipment(v, nec) {
  const equipment = (v.equipment || []).map((e) => ({
    name: e.name,
    kw: Math.max(0, parseFloat(e.kw) || 0),
  }));
  const count = equipment.filter((e) => e.kw > 0).length;
  const totalConnectedKW = equipment.reduce((s, e) => s + e.kw, 0);

  const table = nec.COMMERCIAL_KITCHEN_DEMAND;
  const demandRow = table.find((r) => count <= r.units) || table[table.length - 1];
  const demandFactor = count > 0 ? demandRow.factor : 0;
  const tableDemandKW = totalConnectedKW * (demandFactor / 100);

  // Table 220.56 note: calculated load shall not be less than the two largest loads.
  const sorted = [...equipment].map((e) => e.kw).sort((a, b) => b - a);
  const twoLargestKW = (sorted[0] || 0) + (sorted[1] || 0);
  const demandedKW = Math.max(tableDemandKW, twoLargestKW);
  const twoLargestFloorApplied = twoLargestKW > tableDemandKW && count >= 2;
  const demandedVA = demandedKW * 1000;

  const factor = v.phases === "three" ? 1.732 : 1;
  const vol = parseFloat(v.voltage) || 208;
  const loadA = demandedVA / (vol * factor);

  const conductorA = loadA * nec.CONTINUOUS_LOAD_MULTIPLIER;
  const ocpd = nec.STD_OCPD_SIZES.find((s) => s >= conductorA) || 400;

  const steps = [
    { label: "Connected Load", formula: "kW = Σ(equipment kW ratings)", expression: equipment.map((e) => `${e.kw} kW`).join(" + ") || "0", result: Math.round(totalConnectedKW * 10) / 10, unit: "kW", note: `${count} unit(s)` },
    { label: "Demand Factor (Table 220.56)", formula: "Factor = Table 220.56 lookup by unit count", expression: `${count} unit(s) → ${demandFactor}%`, result: `${demandFactor}%` },
    { label: "Table 220.56 Load", formula: "kW = connected × demand factor", expression: `${Math.round(totalConnectedKW * 10) / 10} × ${demandFactor}%`, result: Math.round(tableDemandKW * 10) / 10, unit: "kW" },
    { label: "Two-Largest Floor (Table 220.56 note)", formula: "Not less than the two largest equipment loads", expression: `${sorted[0] || 0} + ${sorted[1] || 0}`, result: Math.round(twoLargestKW * 10) / 10, unit: "kW", note: twoLargestFloorApplied ? "Floor governs" : "Table demand governs" },
    { label: "Demanded Load", formula: "kW = max(table demand, two largest)", expression: `max(${Math.round(tableDemandKW * 10) / 10}, ${Math.round(twoLargestKW * 10) / 10})`, result: Math.round(demandedKW * 10) / 10, unit: "kW" },
    { label: "Load Amps", formula: "A = VA ÷ (V × √3)", expression: `${Math.round(demandedVA)} ÷ (${vol} ${v.phases === "three" ? "× 1.732" : ""})`, result: Math.round(loadA * 10) / 10, unit: "A" },
    { label: "Conductor Ampacity (210.19)", formula: "A = load amps × 125%", expression: `${Math.round(loadA * 10) / 10} × ${nec.CONTINUOUS_LOAD_MULTIPLIER}`, result: Math.round(conductorA * 10) / 10, unit: "A", note: "125% (continuous)" },
    { label: "OCPD (240.6)", formula: "OCPD = next standard size ≥ conductor amps", expression: `next standard ≥ ${Math.round(conductorA * 10) / 10} A`, result: ocpd, unit: "A" },
  ];
  const result = {
    count,
    totalConnectedKW: Math.round(totalConnectedKW * 10) / 10,
    demandFactor,
    tableDemandKW: Math.round(tableDemandKW * 10) / 10,
    twoLargestKW: Math.round(twoLargestKW * 10) / 10,
    twoLargestFloorApplied,
    demandedKW: Math.round(demandedKW * 10) / 10,
    demandedVA: Math.round(demandedVA),
    loadA: Math.round(loadA * 10) / 10,
    conductorA: Math.round(conductorA * 10) / 10,
    ocpd,
    steps,
  };
  return withTrace(result, {
    articles_used: ["220.56", "210.19", "240.6(A)"],
    tables_used: ["Table 220.56"],
    fields_used: ["COMMERCIAL_KITCHEN_DEMAND", "CONTINUOUS_LOAD_MULTIPLIER", "STD_OCPD_SIZES"],
  });
}