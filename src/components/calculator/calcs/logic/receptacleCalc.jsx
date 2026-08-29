/**
 * Pure calculation logic for Receptacle Load (NEC 220.14 / 220.44).
 * Shared by the live calculator UI and the /admin/coverage year-switch parity test.
 */

/**
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 * @returns {object} calculation outputs
 */
export function calcReceptacleLoad(v, nec) {
  const count = Math.max(0, parseFloat(v.count) || 0);
  const vaEach = parseFloat(v.vaPerReceptacle) || nec.RECEPTACLE_YOKE_VA || 180;
  const voltage = parseFloat(v.voltage) || 120;
  const factor = v.phases === "three" ? 1.732 : 1;
  const applyDemand = v.applyDemand === "true" || v.applyDemand === true;

  const totalVA = count * vaEach;

  let demandVA = totalVA;
  if (applyDemand) {
    demandVA = 0;
    let remaining = totalVA;
    for (const tier of nec.RECEPTACLE_DEMAND_TIERS) {
      const band = Math.min(Math.max(0, remaining), tier.band);
      demandVA += band * tier.factor;
      remaining = Math.max(0, remaining - band);
      if (remaining <= 0) break;
    }
  }

  const totalAmps = totalVA / (voltage * factor);
  const demandAmps = demandVA / (voltage * factor);
  const circuitCapacity = 20 * voltage * 0.80;
  const circuitsNeeded = Math.ceil(demandVA / circuitCapacity);

  const steps = [
    { label: "Connected Load", formula: "VA = count × VA per receptacle", expression: `${count} × ${vaEach} VA`, result: Math.round(totalVA), unit: "VA" },
    { label: "Demand-Adjusted Load (220.44)", formula: "Demand = first 10,000 @ 100% + remainder @ 50%", expression: applyDemand ? `First 10,000 @ 100% + remainder @ 50%` : `${Math.round(totalVA)} @ 100%`, result: Math.round(demandVA), unit: "VA", note: applyDemand ? "Demand factor applied" : "No demand factor" },
    { label: "Total Amps", formula: "A = VA ÷ (V × √3)", expression: `${Math.round(demandVA)} ÷ (${voltage} ${v.phases === "three" ? "× 1.732" : ""})`, result: Math.round(demandAmps * 10) / 10, unit: "A" },
    { label: "Circuits Needed", formula: "Circuits = ceil(demand VA ÷ 20A circuit capacity)", expression: `ceil(${Math.round(demandVA)} ÷ ${Math.round(circuitCapacity)} VA per 20A circuit)`, result: circuitsNeeded, note: "20A circuit at 80% capacity" },
  ];
  return {
    totalConnected_VA: Math.round(totalVA),
    demandAdjusted_VA: Math.round(demandVA),
    totalAmps: Math.round(totalAmps * 10) / 10,
    demandAmps: Math.round(demandAmps * 10) / 10,
    circuits_required: circuitsNeeded,
    GFCI_scope: nec.GFCI_SCOPE_DWELLING || null,
    island_peninsula_rule: nec.ISLAND_PENINSULA_RULE || null,
    GFCI_scope_other: nec.GFCI_SCOPE_OTHER_THAN_DWELLING || null,
    garage_basement_scope: nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE || null,
    steps,
  };
}