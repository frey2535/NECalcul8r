/**
 * Pure calculation logic for RV Park / Campsite Service Load (NEC 551.73).
 *
 * Demand factors are read from the centralized NEC Tables implementation
 * (necTables.js — Table 551.73(A)), which is the single source of truth.
 * Voltage drop and EGC sizing reuse existing production calculation engines.
 */

import { withTrace } from "@/lib/calculatorTrace";
import { getDemandFactorPct, findConductorSize, computePhaseLoading, formatConductorLabel } from "./demandTableLookup";
import { calcVoltageDrop } from "./voltageDropCalc";
import { calcEGCSizing } from "./groundingCalc";

// ─── RV park site receptacle ratings (NEC 551.71) ──────────────────
// VA = amps × nominal voltage. Standard NEMA receptacle configurations.
const SITE_VA = { "20A": 2400, "30A": 3600, "50A": 12000 };
const SITE_AMPS = { "20A": 20, "30A": 30, "50A": 50 };
const SITE_PHASE = { "20A": "120V", "30A": "120V", "50A": "240V" };

/**
 * @param {object} v - inputs: sites20A, sites30A, sites50A, voltage, phases,
 *                     additionalLoads (array of {name, va}), material, tempRating,
 *                     length, maxVD
 * @param {object} nec - necData from getNecData(year)
 */
function rvDemandPct(nec, sites) {
  if (sites <= 0) return 0;
  const table = nec.RV_PARK_DEMAND;
  if (table && table.length) {
    const row = table.find((r) => sites <= r.sites);
    return row ? row.factor : table[table.length - 1].factor;
  }
  return getDemandFactorPct("551_73_a_rv_park_demand", sites);
}

export function calcRVParkLoad(v, nec) {
  const sites20A = Math.max(0, parseInt(v.sites20A, 10) || 0);
  const sites30A = Math.max(0, parseInt(v.sites30A, 10) || 0);
  const sites50A = Math.max(0, parseInt(v.sites50A, 10) || 0);
  const voltage = parseFloat(v.voltage) || 240;
  const phases = v.phases || "single";
  const additionalLoads = (v.additionalLoads || []).map((l) => ({
    name: l.name || "Load",
    va: Math.max(0, parseFloat(l.va) || 0),
  }));
  const material = v.material || "copper";
  const tempRating = v.tempRating || "75";
  const length = Math.max(0, parseFloat(v.length) || 0);
  const maxVD = parseFloat(v.maxVD) || 3;

  const demandTableRef = nec.RV_PARK_DEMAND_TABLE || "Table 551.73(A)";
  const ampacityCite = nec.AMPACITY_TABLE || "Table 310.15(B)(16)";

  const siteVA = nec.RV_SITE_VA || SITE_VA;
  const connected20A = sites20A * (siteVA["20A"] ?? SITE_VA["20A"]);
  const connected30A = sites30A * (siteVA["30A"] ?? SITE_VA["30A"]);
  const connected50A = sites50A * (siteVA["50A"] ?? SITE_VA["50A"]);
  const totalConnectedRV = connected20A + connected30A + connected50A;

  const totalSites = sites20A + sites30A + sites50A;
  const demandFactorPct = rvDemandPct(nec, totalSites);
  const demandFactor = demandFactorPct / 100;
  const demandLoadRV = Math.round(totalConnectedRV * demandFactor);

  // Step 6: Additional park loads
  const totalAdditional = additionalLoads.reduce((s, l) => s + l.va, 0);

  // Step 7: Total service load
  const totalServiceVA = demandLoadRV + totalAdditional;

  // Step 8: Current
  const phaseFactor = phases === "three" ? 1.732 : 1;
  const totalA = totalServiceVA / (voltage * phaseFactor);

  // Step 9: Minimum standard service
  const serviceSizes = nec.STD_OCPD_SIZES.filter(s => s >= 100);
  const minService = serviceSizes.find(s => s >= totalA) || serviceSizes[serviceSizes.length - 1];

  // Step 10-11: Conductor size — sized to service disconnect rating per NEC 230.42(A)
  // "The ampacity of the service-entrance conductors shall not be less than the rating of the service disconnect."
  const ampacityTable = material === "copper" ? nec.COPPER_AMPACITY : nec.ALUMINUM_AMPACITY;
  const conductor = findConductorSize(ampacityTable, tempRating, minService);

  // Step 12: EGC
  const egc = calcEGCSizing({ ocpd: String(minService), material }, nec);

  // Step 13: Voltage drop
  const vdResult = length > 0
    ? calcVoltageDrop({ voltage, current: totalA, length, material, phases, selectedAWG: conductor.awg }, nec)
    : null;

  // Phase loading — connected (for imbalance reference)
  const siteItems = [
    { count: sites20A, amps: SITE_AMPS["20A"], phaseType: SITE_PHASE["20A"] },
    { count: sites30A, amps: SITE_AMPS["30A"], phaseType: SITE_PHASE["30A"] },
    { count: sites50A, amps: SITE_AMPS["50A"], phaseType: SITE_PHASE["50A"] },
  ];
  const { phaseCurrents: connectedPhaseCurrents, imbalance: connectedImbalance } = computePhaseLoading(siteItems, phases);

  // Demand-adjusted phase loading: apply demand factor to RV portion, add additional loads
  const additionalAmpsPerPhase = totalAdditional / (voltage * phaseFactor);
  const demandPhaseCurrents = connectedPhaseCurrents.map(c => c * demandFactor + additionalAmpsPerPhase);
  const dMaxI = Math.max(...demandPhaseCurrents);
  const dMinI = Math.min(...demandPhaseCurrents);
  const demandImbalance = dMaxI > 0 ? ((dMaxI - dMinI) / dMaxI) * 100 : 0;

  // Steps
  const steps = [
    { label: "Connected Load — 20A Sites", formula: "VA = count × 20A × 120V", expression: `${sites20A} × 20 × 120`, result: connected20A, unit: "VA" },
    { label: "Connected Load — 30A Sites", formula: "VA = count × 30A × 120V", expression: `${sites30A} × 30 × 120`, result: connected30A, unit: "VA" },
    { label: "Connected Load — 50A Sites", formula: "VA = count × 50A × 240V", expression: `${sites50A} × 50 × 240`, result: connected50A, unit: "VA" },
    { label: "Total Connected RV Load", formula: "VA = Σ connected load", expression: `${connected20A} + ${connected30A} + ${connected50A}`, result: totalConnectedRV, unit: "VA" },
    { label: "Total Campsite Count", formula: "N = Σ site counts", expression: `${sites20A} + ${sites30A} + ${sites50A}`, result: totalSites, unit: "sites" },
    { label: `Demand Factor (${demandTableRef})`, formula: `DF = ${demandTableRef} lookup by site count`, expression: `${demandTableRef} → ${totalSites} sites → ${demandFactorPct}%`, result: demandFactorPct, unit: "%" },
    { label: "RV Demand Load", formula: "VA = total connected × DF", expression: `${totalConnectedRV} × ${demandFactor}`, result: demandLoadRV, unit: "VA" },
    { label: "Additional Park Loads", formula: "VA = Σ additional loads", expression: additionalLoads.map(l => `${l.name}: ${l.va}`).join(" + ") || "0", result: Math.round(totalAdditional), unit: "VA" },
    { label: "Total Service Load", formula: "VA = RV demand + additional loads", expression: `${demandLoadRV} + ${Math.round(totalAdditional)}`, result: Math.round(totalServiceVA), unit: "VA" },
    { label: "Service Current", formula: `I = VA ÷ (V ${phases === "three" ? "× √3" : ""})`, expression: `${Math.round(totalServiceVA)} ÷ (${voltage}${phases === "three" ? " × 1.732" : ""})`, result: Math.round(totalA * 10) / 10, unit: "A" },
    { label: "Minimum Standard Service", formula: "Size = next standard ≥ amps", expression: `next standard ≥ ${Math.round(totalA * 10) / 10} A`, result: minService, unit: "A" },
    { label: `Conductor Size (${ampacityCite}, ${tempRating}°C)`, formula: "AWG = smallest conductor with ampacity ≥ service disconnect rating (NEC 230.42(A))", expression: `${material === "copper" ? "Copper" : "Aluminum"} @ ${tempRating}°C ≥ ${minService} A (service disconnect)`, result: formatConductorLabel(conductor.awg), note: `Ampacity: ${conductor.ampacity} A · sized to ${minService} A OCPD per 230.42(A)` },
    { label: "EGC Size (Table 250.122)", formula: "EGC = Table 250.122 lookup by OCPD & material", expression: `Table 250.122 → ${minService} A → ${material === "copper" ? "Cu" : "Al"} ${formatConductorLabel(egc.awg)}`, result: formatConductorLabel(egc.awg) },
  ];

  if (vdResult) {
    steps.push(
      { label: "Voltage Drop", formula: `VD = (${phases === "single" ? "2" : "1.732"} × K × I × L) / CM`, expression: `VD = (${phases === "single" ? "2" : "1.732"} × ${vdResult.K} × ${Math.round(totalA * 10) / 10} × ${length}) / ${(nec.CONDUCTOR_CM[conductor.awg] || 0).toLocaleString()}`, result: vdResult.VD, unit: "V" },
      { label: "Voltage Drop %", formula: "VD% = (VD / V) × 100", expression: `(${vdResult.VD} / ${voltage}) × 100`, result: vdResult.VD_pct, unit: "%", note: vdResult.VD_pct <= maxVD ? `Within ${maxVD}% limit` : `Exceeds ${maxVD}% limit` },
      { label: "End-of-Line Voltage", formula: "V_end = V − VD", expression: `${voltage} − ${vdResult.VD}`, result: vdResult.endV, unit: "V" },
    );
  }

  const phaseLabels = phases === "three" ? ["A", "B", "C"] : ["L1", "L2"];
  steps.push({
    label: "Phase Loading (demand-adjusted)",
    formula: "I per phase = (connected RV amps × DF) + additional amps",
    expression: phaseLabels.map((p, i) => `${p}: ${Math.round(demandPhaseCurrents[i])} A`).join(", "),
    result: demandPhaseCurrents.map(c => Math.round(c)).join("/"),
    unit: "A",
    note: `DF=${demandFactorPct}%, additional=${Math.round(additionalAmpsPerPhase)} A/phase`,
  });
  steps.push({
    label: "Phase Imbalance (demand-adjusted)",
    formula: "Imbalance = (max − min) / max × 100",
    expression: `(${Math.round(dMaxI)} − ${Math.round(dMinI)}) / ${Math.round(dMaxI)} × 100`,
    result: Math.round(demandImbalance * 10) / 10,
    unit: "%",
  });

  const result = {
    connected20A, connected30A, connected50A,
    totalConnectedRV,
    totalSites,
    demandFactorPct,
    demandTableRef,
    demandLoadRV,
    additionalLoads: additionalLoads.map(l => ({ ...l, va: Math.round(l.va) })),
    totalAdditional: Math.round(totalAdditional),
    totalServiceVA: Math.round(totalServiceVA),
    totalA: Math.round(totalA * 10) / 10,
    minService,
    conductorAWG: conductor.awg,
    conductorLabel: formatConductorLabel(conductor.awg),
    conductorAmpacity: conductor.ampacity,
    egcAWG: egc.awg,
    egcLabel: formatConductorLabel(egc.awg),
    vdV: vdResult?.VD ?? null,
    vdPct: vdResult?.VD_pct ?? null,
    endV: vdResult?.endV ?? null,
    vdOk: vdResult ? vdResult.VD_pct <= maxVD : true,
    maxVD,
    phaseCurrents: demandPhaseCurrents.map(c => Math.round(c)),
    phaseImbalance: Math.round(demandImbalance * 10) / 10,
    steps,
  };

  return withTrace(result, {
    articles_used: [demandTableRef.replace(/^Table /, ""), "551.71", "240.6(A)", "250.122", ampacityCite.replace(/^Table /, ""), "230.42", "210.19", "215.2"],
    tables_used: [demandTableRef, "Table 240.6(A)", "Table 250.122", ampacityCite],
    fields_used: ["STD_OCPD_SIZES", "COPPER_AMPACITY", "ALUMINUM_AMPACITY", "EGC_TABLE", "RESISTIVITY", "CONDUCTOR_CM", "RV_PARK_DEMAND", "RV_SITE_VA"],
  });
}