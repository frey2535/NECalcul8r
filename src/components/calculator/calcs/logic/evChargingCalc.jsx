/**
 * Pure calculation logic for EV Charging (NEC 625).
 * Shared by the live calculator UI and the /admin/coverage year-switch parity test.
 */

import { withTrace } from "@/lib/calculatorTrace";

/**
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 * @returns {object} calculation outputs + trace
 */
export function calcEVCharging(v, nec) {
  const voltage = parseFloat(v.voltage) || 240;
  const evseA = parseFloat(v.evseA) || 32;
  const numUnits = parseFloat(v.numUnits) || 1;

  const conductorA_each = evseA * nec.EV_CONTINUOUS_MULTIPLIER;
  const ocpdCalc = evseA * nec.EV_CONTINUOUS_MULTIPLIER;
  const ocpd_each = nec.STD_OCPD_SIZES.find(s => s >= ocpdCalc) || 150;
  const kW_each = (voltage * evseA) / 1000;

  const simultaneousPct = v.demandManaged === "yes" ? (parseFloat(v.simultaneousLoad) || 100) / 100 : 1.0;
  const totalA = v.demandManaged === "yes"
    ? evseA * numUnits * simultaneousPct * nec.EV_CONTINUOUS_MULTIPLIER
    : conductorA_each * numUnits;
  const totalKW = (voltage * totalA) / 1000;

  const steps = [
    { label: "Conductor Ampacity per Unit (625.42)", formula: "A = EVSE rating × 125%", expression: `${evseA} × ${nec.EV_CONTINUOUS_MULTIPLIER}`, result: Math.round(conductorA_each * 10) / 10, unit: "A", note: "125% of EVSE rating (continuous load)" },
    { label: "OCPD per Unit", formula: "OCPD = next standard ≥ conductor amps", expression: `next standard ≥ ${Math.round(ocpdCalc * 10) / 10} A`, result: ocpd_each, unit: "A" },
    { label: "Power per Unit", formula: "kW = V × A ÷ 1000", expression: `${voltage} × ${evseA} ÷ 1000`, result: Math.round(kW_each * 10) / 10, unit: "kW" },
    { label: "Total Feeder Ampacity", formula: "A = EVSE × units × simultaneity × 125%", expression: v.demandManaged === "yes" ? `${evseA} × ${numUnits} × ${(simultaneousPct * 100).toFixed(0)}% × ${nec.EV_CONTINUOUS_MULTIPLIER}` : `${Math.round(conductorA_each * 10) / 10} × ${numUnits}`, result: Math.round(totalA * 10) / 10, unit: "A", note: v.demandManaged === "yes" ? "Demand-managed" : "Full simultaneous load" },
    { label: "Total Power", formula: "kW = V × total A ÷ 1000", expression: `${voltage} × ${Math.round(totalA * 10) / 10} ÷ 1000`, result: Math.round(totalKW * 10) / 10, unit: "kW" },
  ];
  const result = {
    conductorA_each: Math.round(conductorA_each * 10) / 10,
    ocpd_each_A: ocpd_each,
    kW_each: Math.round(kW_each * 10) / 10,
    feederAmps: Math.round(totalA * 10) / 10,
    totalKW: Math.round(totalKW * 10) / 10,
    min_load_VA: nec.EV_MINIMUM_LOAD_VA || 0,
    GFCI_required: !!nec.EV_GFCI_REQUIRED,
    SPD_required: !!nec.DWELLING_SPD_REQUIRED,
    outdoor_disconnect: !!nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED,
    steps,
  };
  return withTrace(result, {
    articles_used: [
      "625.42",
      ...(nec.EV_GFCI_REQUIRED ? ["625.54"] : []),
      ...(nec.DWELLING_SPD_REQUIRED ? ["230.67"] : []),
      ...(nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED ? ["230.85"] : []),
    ],
    tables_used: ["Table 240.6(A)"],
    fields_used: ["EV_CONTINUOUS_MULTIPLIER", "EV_GFCI_REQUIRED", "EV_MINIMUM_LOAD_VA", "STD_OCPD_SIZES", "DWELLING_SPD_REQUIRED", "DWELLING_OUTDOOR_DISCONNECT_REQUIRED"],
  });
}