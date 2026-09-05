/**
 * Pure calculation logic for Marina Shore Power Load (NEC 555).
 *
 * Demand factors are read from the centralized NEC Tables implementation
 * (necTables.js — Table 555.12), which is the single source of truth.
 * Voltage drop, EGC sizing, conductor ampacity, transformer sizing,
 * motor/HVAC/lighting load calculations, and phase balancing all reuse
 * existing production calculation engines and centralized NEC data.
 */

import { withTrace } from "@/lib/calculatorTrace";
import { getDemandFactorPct, findConductorSize } from "./demandTableLookup";
import { calcVoltageDrop } from "./voltageDropCalc";
import { calcEGCSizing } from "./groundingCalc";
import { calcTransformerSizing } from "./transformerSizingCalc";
import { calcHVACLoad } from "./hvacLoadCalc";
import { calcLightingLoad } from "./lightingLoadCalc";

// ─── Year-specific demand factor table references (Article 555 reorganized) ─
// 2017: Table 555.12 | 2020: Table 555.6 | 2023: Table 220.120 | 2026: pending
const DEMAND_TABLE_REF = {
  "2017": "Table 555.12",
  "2020": "Table 555.6",
  "2023": "Table 220.120",
  "2026": "Table 220.120 (pending verification)",
};

const RECEPTACLE_ARTICLE_REF = {
  "2017": "555.19(A)",
  "2020": "555.33(A)",
  "2023": "555.33(A)",
  "2026": "555.33(A) (pending verification)",
};

// ─── Standard shore power receptacle presets (2017: 555.19(A); 2020+: 555.33(A)) ──────────
const RECEPTACLE_PRESETS = {
  "30A":  { amps: 30,  voltage: 120, poles: 1 },
  "50A":  { amps: 50,  voltage: 240, poles: 2 },
  "60A":  { amps: 60,  voltage: 240, poles: 2 },
  "100A": { amps: 100, voltage: 240, poles: 2 },
};

// ─── Standard transformer kVA sizes ─────────────────────────────────
const STD_KVA_SIZES = [15, 25, 37.5, 50, 75, 100, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 3750, 5000];

// ─── Load type categories ──────────────────────────────────────────
const MOTOR_LOAD_TYPES = ["boat_lift", "pump_out", "fire_pump"];
const HVAC_LOAD_TYPES = ["hvac"];
const LIGHTING_LOAD_TYPES = ["lighting"];

export const LOAD_TYPE_LABELS = {
  office: "Office", fuel_dock: "Fuel Dock", boat_lift: "Boat Lift",
  lighting: "Lighting", restaurant: "Restaurant", pump_out: "Pump Out",
  ice_machines: "Ice Machines", hvac: "HVAC", maintenance: "Maintenance",
  retail: "Retail", fire_pump: "Fire Pump", other: "Other User Load",
};

export const RECEPTACLE_RATINGS = ["30A", "50A", "60A", "100A", "custom"];

/**
 * Resolve receptacle electrical properties from an entry.
 */
function resolveReceptacle(rec) {
  let amps, voltage, poles;
  if (rec.rating === "custom") {
    amps = parseFloat(rec.customAmps) || 0;
    voltage = parseFloat(rec.customVoltage) || 120;
    poles = parseInt(rec.customPoles) || 1;
  } else {
    const p = RECEPTACLE_PRESETS[rec.rating] || RECEPTACLE_PRESETS["30A"];
    amps = p.amps;
    voltage = p.voltage;
    poles = p.poles;
  }
  const qty = Math.max(0, parseInt(rec.quantity, 10) || 0);
  return { amps, voltage, poles, unitVA: amps * voltage, quantity: qty };
}

/** Table 555.12 / year-owned MARINA_DEMAND lookup. */
function marinaDemandPct(nec, count) {
  if (count <= 0) return 0;
  const table = nec.MARINA_DEMAND;
  if (table && table.length) {
    const row = table.find((r) => count <= r.count);
    return row ? row.factor : table[table.length - 1].factor;
  }
  return getDemandFactorPct("555_12_marina_demand", count);
}

function getMotorFLC(hp, voltage, phase, nec) {
  const hpStr = String(hp);
  const table = phase === "three" ? nec.MOTOR_FLC_3PHASE : nec.MOTOR_FLC_1PHASE;
  const row = table[hpStr];
  if (!row) return 0;
  const vKeys = Object.keys(row).map(Number).sort((a, b) => a - b);
  const matchV = vKeys.find(v => v >= voltage) || vKeys[vKeys.length - 1];
  return row[String(matchV)] || 0;
}

/**
 * Calculate VA for an additional marina load using existing production engines.
 */
function calcAdditionalLoadVA(load, nec) {
  const type = load.type;

  if (MOTOR_LOAD_TYPES.includes(type)) {
    const hp = parseFloat(load.hp) || 1;
    const voltage = parseFloat(load.motorVoltage) || 208;
    const phase = load.motorPhase || "three";
    const flc = getMotorFLC(hp, voltage, phase, nec);
    const factor = phase === "three" ? 1.732 : 1;
    const va = Math.round(flc * voltage * factor);
    return { va, detail: `${hp} HP ${phase === "three" ? "3Ø" : "1Ø"} motor, FLC = ${flc} A @ ${voltage} V → ${va} VA` };
  }

  if (HVAC_LOAD_TYPES.includes(type)) {
    const nameplateA = parseFloat(load.nameplateAmps) || 0;
    const voltage = parseFloat(load.hvacVoltage) || 208;
    const phase = load.hvacPhase || "three";
    const result = calcHVACLoad({
      nameplateAmps: nameplateA, compressorFLA: 0, fanFLA: 0,
      voltage, phases: phase, conductorType: "single",
    }, nec);
    return { va: result.loadVA, detail: `HVAC: ${nameplateA} A nameplate @ ${voltage} V ${phase === "three" ? "3Ø" : "1Ø"} → ${result.loadVA} VA` };
  }

  if (LIGHTING_LOAD_TYPES.includes(type)) {
    const sqft = parseFloat(load.sqft) || 0;
    const occupancy = load.occupancy || "commercial";
    const result = calcLightingLoad({
      occupancy, sqft, voltage: 120, phases: "single",
    }, nec);
    return { va: result.nec_VA, detail: `Lighting: ${sqft} ft² × ${result.occVA} VA/ft² (${occupancy}) → ${result.nec_VA} VA` };
  }

  const va = parseFloat(load.va) || 0;
  return { va, detail: `${va} VA` };
}

/**
 * Compute phase loading from receptacles.
 * Auto mode: distribute evenly. Manual mode: use assigned phases.
 */
function computeMarinaPhaseLoading(receptacles, phases, phaseMode) {
  const numPhases = phases === "three" ? 3 : 2;
  const phaseLabels = phases === "three" ? ["A", "B", "C"] : ["L1", "L2"];
  const phaseCurrents = new Array(numPhases).fill(0);
  const phaseReceptacleCounts = new Array(numPhases).fill(0);

  for (const rec of receptacles) {
    const { amps, poles, quantity } = resolveReceptacle(rec);
    if (quantity <= 0) continue;

    if (phaseMode === "manual" && rec.manualPhase) {
      const idx = phaseLabels.indexOf(rec.manualPhase);
      if (idx >= 0) {
        phaseCurrents[idx] += quantity * amps;
        phaseReceptacleCounts[idx] += quantity;
      } else {
        for (let p = 0; p < numPhases; p++) {
          phaseCurrents[p] += quantity * amps / numPhases;
          phaseReceptacleCounts[p] += quantity / numPhases;
        }
      }
    } else {
      if (poles >= 2) {
        for (let p = 0; p < numPhases; p++) {
          phaseCurrents[p] += quantity * amps;
          phaseReceptacleCounts[p] += quantity;
        }
      } else {
        for (let i = 0; i < quantity; i++) {
          const phaseIndex = i % numPhases;
          phaseCurrents[phaseIndex] += amps;
          phaseReceptacleCounts[phaseIndex] += 1;
        }
      }
    }
  }

  const maxI = Math.max(...phaseCurrents);
  const minI = Math.min(...phaseCurrents);
  const imbalance = maxI > 0 ? ((maxI - minI) / maxI) * 100 : 0;
  return { phaseCurrents, phaseReceptacleCounts, imbalance, phaseLabels };
}

/**
 * @param {object} v - inputs
 * @param {object} nec - necData from getNecData(year)
 * @param {string} necYear - NEC year string ("2017"|"2020"|"2023"|"2026")
 */
export function calcMarinaShorePower(v, nec, necYear) {
  const year = necYear || nec?.year || "2023";
  const demandTableRef = nec?.MARINA_DEMAND_TABLE || DEMAND_TABLE_REF[year] || DEMAND_TABLE_REF["2023"];
  const receptacleArticleRef = RECEPTACLE_ARTICLE_REF[year] || RECEPTACLE_ARTICLE_REF["2023"];
  const receptacles = (v.receptacles || []).filter(r => (parseInt(r.quantity) || 0) > 0);
  const additionalLoads = v.additionalLoads || [];
  const voltage = parseFloat(v.voltage) || 208;
  const phases = v.phases || "three";
  const material = v.material || "copper";
  const tempRating = v.tempRating || "75";
  const length = parseFloat(v.length) || 0;
  const maxVD = parseFloat(v.maxVD) || 3;
  const transformerEnabled = v.transformerEnabled === true || v.transformerEnabled === "true";
  const primaryV = parseFloat(v.primaryV) || 480;
  const secondaryV = parseFloat(v.secondaryV) || 208;
  const impedance = parseFloat(v.impedance) || 5.75;
  const phaseMode = v.phaseMode || "auto";

  const phaseFactor = phases === "three" ? 1.732 : 1;
  const phaseLabels = phases === "three" ? ["A", "B", "C"] : ["L1", "L2"];

  // ── Step 1: Connected VA for every receptacle ──
  const recDetails = receptacles.map(rec => {
    const r = resolveReceptacle(rec);
    return { ...r, rec, totalVA: r.unitVA * r.quantity };
  });

  // ── Steps 2-4: Group by slip, feeder, panel, dock ──
  const slipGroups = {}, feederGroups = {}, panelGroups = {}, dockGroups = {};
  for (const d of recDetails) {
    const slip = d.rec.slip || "Unassigned";
    const feeder = d.rec.feeder || "Feeder 1";
    const panel = d.rec.panel || "Panel A";
    const dock = d.rec.dock || "Unassigned";
    if (!slipGroups[slip]) slipGroups[slip] = { slip, totalVA: 0, count: 0 };
    slipGroups[slip].totalVA += d.totalVA;
    slipGroups[slip].count++;
    if (!feederGroups[feeder]) feederGroups[feeder] = { feeder, totalVA: 0, count: 0 };
    feederGroups[feeder].totalVA += d.totalVA;
    feederGroups[feeder].count += d.quantity;
    if (!panelGroups[panel]) panelGroups[panel] = { panel, totalVA: 0, count: 0 };
    panelGroups[panel].totalVA += d.totalVA;
    panelGroups[panel].count += d.quantity;
    if (!dockGroups[dock]) dockGroups[dock] = { dock, totalVA: 0, count: 0, receptacleCount: 0 };
    dockGroups[dock].totalVA += d.totalVA;
    dockGroups[dock].count++;
    dockGroups[dock].receptacleCount += d.quantity;
  }

  // ── Step 5: Connected marina load ──
  const totalConnectedReceptacles = recDetails.reduce((s, d) => s + d.totalVA, 0);
  const totalReceptacleCount = recDetails.reduce((s, d) => s + d.quantity, 0);
  const phaseLoading = computeMarinaPhaseLoading(receptacles, phases, phaseMode);
  const phaseCurrents = phaseLoading.phaseCurrents;
  const phaseReceptacleCounts = phaseLoading.phaseReceptacleCounts;
  const imbalance = phaseLoading.imbalance;
  const demandReceptacleCount = Math.ceil(Math.max(0, ...phaseReceptacleCounts));

  // ── Step 6: Demand factor from year-owned MARINA_DEMAND (2017 Table 555.12 / 2020 Table 555.6) ──
  const demandFactorPct = marinaDemandPct(nec, demandReceptacleCount);
  const demandFactor = demandFactorPct / 100;

  // ── Step 7: Apply demand factor ──
  const demandLoadShore = Math.round(totalConnectedReceptacles * demandFactor);

  // ── Step 8: Calculate additional marina loads ──
  const loadDetails = additionalLoads.map(load => {
    const { va, detail } = calcAdditionalLoadVA(load, nec);
    return { ...load, label: LOAD_TYPE_LABELS[load.type] || load.type, va, detail };
  });
  const totalAdditional = loadDetails.reduce((s, l) => s + l.va, 0);

  // ── Step 9: Total service VA ──
  const totalServiceVA = demandLoadShore + totalAdditional;

  // ── Step 10: Convert VA to current ──
  const totalA = totalServiceVA / (voltage * phaseFactor);

  // ── Step 11: Minimum standard service ──
  const serviceSizes = nec.STD_OCPD_SIZES.filter(s => s >= 100);
  const minService = serviceSizes.find(s => s >= totalA) || serviceSizes[serviceSizes.length - 1];

  // ── Step 12: Transformer size (if enabled) ──
  let transformerResult = null;
  if (transformerEnabled && totalServiceVA > 0) {
    const xfmrCalc = calcTransformerSizing({
      loadVA: totalServiceVA, primaryV, secondaryV, phases, impedance,
    }, nec);
    const requiredKVA = totalServiceVA / 1000;
    const transformerKVA = STD_KVA_SIZES.find(k => k >= requiredKVA) || STD_KVA_SIZES[STD_KVA_SIZES.length - 1];
    transformerResult = {
      kVA: transformerKVA,
      requiredKVA: Math.round(requiredKVA * 10) / 10,
      primaryFLC: xfmrCalc.primaryFLC,
      secondaryFLC: xfmrCalc.secondaryFLC,
      primaryOCPD: xfmrCalc.primaryOCPD,
      secondaryOCPD: xfmrCalc.secondaryOCPD,
      AFC: xfmrCalc.AFC,
    };
  }

  // ── Steps 13-14: Feeder / conductor size ──
  const ampacityTable = material === "copper" ? nec.COPPER_AMPACITY : nec.ALUMINUM_AMPACITY;
  const conductor = findConductorSize(ampacityTable, tempRating, totalA);

  // ── Step 15: EGC ──
  const egc = calcEGCSizing({ ocpd: String(minService), material }, nec);

  // ── Steps 16-17: Voltage drop and end voltage ──
  const vdResult = length > 0
    ? calcVoltageDrop({ voltage, current: totalA, length, material, phases, selectedAWG: conductor.awg }, nec)
    : null;

  // ── Build step-by-step trace ──
  const steps = [];

  for (const d of recDetails) {
    const label = d.rec.rating === "custom"
      ? `Connected — Custom ${d.amps}A/${d.voltage}V`
      : `Connected — ${d.rec.rating} Receptacles`;
    steps.push({
      label: `${label} × ${d.quantity}`,
      formula: `VA = ${d.amps} A × ${d.voltage} V × ${d.quantity}`,
      expression: `${d.amps} × ${d.voltage} × ${d.quantity}`,
      result: d.totalVA, unit: "VA",
    });
  }

  steps.push({
    label: "Total Connected Shore Power Load",
    formula: "VA = Σ (all receptacle VA)",
    expression: recDetails.map(d => d.totalVA).join(" + ") || "0",
    result: totalConnectedReceptacles, unit: "VA",
  });
  steps.push({
    label: "Total Shore Power Receptacle Count",
    formula: "N_total = Σ receptacle quantities",
    expression: recDetails.map(d => d.quantity).join(" + ") || "0",
    result: totalReceptacleCount, unit: "receptacles",
  });
  steps.push({
    label: "Demand Receptacle Count",
    formula: "N_demand = maximum receptacles connected to any one line after balancing",
    expression: phaseLabels.map((p, i) => `${p}: ${Math.ceil(phaseReceptacleCounts[i] || 0)}`).join(", "),
    result: demandReceptacleCount, unit: "receptacles",
    note: "Used for the marina demand-factor lookup.",
  });
  // Per-dock breakdown (multi-dock mode)
  const dockEntries = Object.values(dockGroups).filter(d => d.dock !== "Unassigned");
  for (const d of dockEntries) {
    const dockDemandPct = marinaDemandPct(nec, d.receptacleCount);
    steps.push({
      label: `Dock "${d.dock}" — Connected Load`,
      formula: "VA = Σ receptacles on this dock",
      expression: `${d.dock}: ${d.receptacleCount} receptacles → ${d.totalVA} VA`,
      result: d.totalVA, unit: "VA",
      note: `Per-dock demand factor (${demandTableRef}, ${d.receptacleCount} receptacles): ${dockDemandPct}% → ${Math.round(d.totalVA * dockDemandPct / 100)} VA demand for dock feeder sizing.`,
    });
  }
  steps.push({
    label: `Demand Factor (${demandTableRef})`,
    formula: `DF = ${demandTableRef} lookup by receptacle count`,
    expression: `${demandTableRef} → ${demandReceptacleCount} receptacles on the maximum line → ${demandFactorPct}%`,
    result: demandFactorPct, unit: "%",
    note: `NEC ${year}: ${demandTableRef}. Row selected by maximum receptacles on any line after phase balancing.`,
  });
  steps.push({
    label: "Shore Power Demand Load",
    formula: "VA = total connected × DF",
    expression: `${totalConnectedReceptacles} × ${demandFactor}`,
    result: demandLoadShore, unit: "VA",
  });

  for (const l of loadDetails) {
    steps.push({
      label: `Additional Load — ${l.label}`,
      formula: l.detail, expression: l.detail,
      result: l.va, unit: "VA",
    });
  }
  steps.push({
    label: "Total Additional Marina Loads",
    formula: "VA = Σ additional loads",
    expression: loadDetails.map(l => l.va).join(" + ") || "0",
    result: Math.round(totalAdditional), unit: "VA",
  });
  steps.push({
    label: "Total Service Load",
    formula: "VA = shore power demand + additional loads",
    expression: `${demandLoadShore} + ${Math.round(totalAdditional)}`,
    result: Math.round(totalServiceVA), unit: "VA",
  });
  steps.push({
    label: "Service Current",
    formula: `I = VA ÷ (V ${phases === "three" ? "× √3" : ""})`,
    expression: `${Math.round(totalServiceVA)} ÷ (${voltage}${phases === "three" ? " × 1.732" : ""})`,
    result: Math.round(totalA * 10) / 10, unit: "A",
  });
  steps.push({
    label: "Minimum Standard Service",
    formula: "Size = next standard ≥ amps",
    expression: `next standard ≥ ${Math.round(totalA * 10) / 10} A`,
    result: minService, unit: "A",
  });

  if (transformerResult) {
    steps.push({
      label: "Transformer kVA Required", formula: "kVA = total VA ÷ 1000",
      expression: `${Math.round(totalServiceVA)} ÷ 1000`,
      result: transformerResult.requiredKVA, unit: "kVA",
    });
    steps.push({
      label: "Transformer Size (next standard)", formula: "Size = next standard kVA ≥ required",
      expression: `next standard ≥ ${transformerResult.requiredKVA} kVA`,
      result: transformerResult.kVA, unit: "kVA",
    });
    steps.push({
      label: "Transformer Primary FLC",
      formula: `FLC = kVA × 1000 ÷ (V ${phases === "three" ? "× √3" : ""})`,
      expression: `${transformerResult.kVA} × 1000 ÷ (${primaryV}${phases === "three" ? " × 1.732" : ""})`,
      result: transformerResult.primaryFLC, unit: "A",
    });
    steps.push({
      label: "Transformer Secondary FLC",
      formula: `FLC = kVA × 1000 ÷ (V ${phases === "three" ? "× √3" : ""})`,
      expression: `${transformerResult.kVA} × 1000 ÷ (${secondaryV}${phases === "three" ? " × 1.732" : ""})`,
      result: transformerResult.secondaryFLC, unit: "A",
    });
    steps.push({
      label: "Primary OCPD (Table 450.3(B))", formula: "OCPD = FLC × 125%, next standard",
      expression: `${transformerResult.primaryFLC} × 1.25`,
      result: transformerResult.primaryOCPD, unit: "A",
    });
    steps.push({
      label: "Secondary OCPD (Table 450.3(B))", formula: "OCPD = FLC × 125%, next standard",
      expression: `${transformerResult.secondaryFLC} × 1.25`,
      result: transformerResult.secondaryOCPD, unit: "A",
    });
  }

  const ampacityCite = nec.AMPACITY_TABLE || "Table 310.15(B)(16)";
  steps.push({
    label: `Feeder Conductor Size (${ampacityCite}, ${tempRating}°C)`,
    formula: "AWG = smallest conductor with ampacity ≥ amps",
    expression: `${material === "copper" ? "Copper" : "Aluminum"} @ ${tempRating}°C ≥ ${Math.round(totalA * 10) / 10} A`,
    result: `#${conductor.awg} AWG`, note: `Ampacity: ${conductor.ampacity} A`,
  });
  steps.push({
    label: "EGC Size (Table 250.122)",
    formula: "EGC = Table 250.122 lookup by OCPD & material",
    expression: `Table 250.122 → ${minService} A → ${material === "copper" ? "Cu" : "Al"} #${egc.awg} AWG`,
    result: `#${egc.awg} AWG`,
  });

  if (vdResult) {
    steps.push({
      label: "Voltage Drop",
      formula: `VD = (${phases === "single" ? "2" : "1.732"} × K × I × L) / CM`,
      expression: `VD = (${phases === "single" ? "2" : "1.732"} × ${vdResult.K} × ${Math.round(totalA * 10) / 10} × ${length}) / ${(nec.CONDUCTOR_CM[conductor.awg] || 0).toLocaleString()}`,
      result: vdResult.VD, unit: "V",
      note: "NEC Informational Note — 3%/5% are recommended limits, NOT mandatory requirements (210.19(A) Info Note, 215.2(A) Info Note).",
    });
    steps.push({
      label: "Voltage Drop % (Informational Note)", formula: "VD% = (VD / V) × 100",
      expression: `(${vdResult.VD} / ${voltage}) × 100`,
      result: vdResult.VD_pct, unit: "%",
      note: `${vdResult.VD_pct <= maxVD ? "Within" : "Exceeds"} ${maxVD}% recommended limit (NEC Informational Note — not mandatory).`,
    });
    steps.push({
      label: "End-of-Line Voltage", formula: "V_end = V − VD",
      expression: `${voltage} − ${vdResult.VD}`,
      result: vdResult.endV, unit: "V",
    });
  }

  steps.push({
    label: `Phase Loading (${phaseMode === "manual" ? "manual" : "automatic"}) — units: Amps (A)`,
    formula: phaseMode === "manual"
      ? "I_phase = Σ (receptacle amps × qty) for user-assigned phase"
      : "I_phase = Σ (receptacle amps) distributed: 2-pole → all phases; 1-pole → round-robin A→B→C",
    expression: phaseLabels.map((p, i) => `${p}: ${Math.round(phaseCurrents[i])} A`).join(", "),
    result: phaseCurrents.map(c => Math.round(c)).join("/"), unit: "A",
    note: "Phase loading is computed on CONNECTED load (before demand factor). 120V/1-pole loads cycle A→B→C→A… 120/240V & 125/250V/2-pole loads add full amps to ALL phases. Demand factor is applied to total connected VA BEFORE phase balancing — phase currents reflect connected load, not demand load.",
  });
  steps.push({
    label: "Phase Imbalance", formula: "Imbalance = (I_max − I_min) / I_max × 100",
    expression: `(${Math.round(Math.max(...phaseCurrents))} − ${Math.round(Math.min(...phaseCurrents))}) / ${Math.round(Math.max(...phaseCurrents))} × 100`,
    result: Math.round(imbalance * 10) / 10, unit: "%",
    note: "Imbalance formula: (max phase current − min phase current) / max phase current × 100. Target: ≤10% for balanced 3Ø systems.",
  });

  // ── Build result object ──
  const result = {
    receptacleSummary: recDetails.map(d => ({
      rating: d.rec.rating === "custom" ? `Custom ${d.amps}A` : d.rec.rating,
      amps: d.amps, voltage: d.voltage, poles: d.poles,
      quantity: d.quantity, unitVA: d.unitVA, totalVA: d.totalVA,
      slip: d.rec.slip || "Unassigned",
      feeder: d.rec.feeder || "Feeder 1",
      panel: d.rec.panel || "Panel A",
    })),
    slipSummary: Object.values(slipGroups).map(s => ({ slip: s.slip, totalVA: s.totalVA, receptacleCount: s.count })),
    feederSummary: Object.values(feederGroups).map(f => ({ feeder: f.feeder, totalVA: f.totalVA, receptacleCount: f.count })),
    panelSummary: Object.values(panelGroups).map(p => ({ panel: p.panel, totalVA: p.totalVA, receptacleCount: p.count })),
    dockSummary: Object.values(dockGroups)
      .filter(d => d.dock !== "Unassigned")
      .map(d => {
        const dockDemandPct = marinaDemandPct(nec, d.receptacleCount);
        return { dock: d.dock, totalVA: d.totalVA, receptacleCount: d.receptacleCount, demandFactorPct: dockDemandPct, demandLoadVA: Math.round(d.totalVA * dockDemandPct / 100) };
      }),
    totalConnectedReceptacles,
    totalReceptacleCount,
    demandReceptacleCount,
    phaseReceptacleCounts: phaseReceptacleCounts.map(c => Math.ceil(c)),
    demandFactorPct,
    demandTableRef,
    receptacleArticleRef,
    demandLoadShore,
    additionalLoads: loadDetails,
    totalAdditional: Math.round(totalAdditional),
    totalServiceVA: Math.round(totalServiceVA),
    totalA: Math.round(totalA * 10) / 10,
    minService,
    transformer: transformerResult,
    conductorAWG: conductor.awg,
    conductorAmpacity: conductor.ampacity,
    egcAWG: egc.awg,
    vdV: vdResult?.VD ?? null,
    vdPct: vdResult?.VD_pct ?? null,
    endV: vdResult?.endV ?? null,
    vdOk: vdResult ? vdResult.VD_pct <= maxVD : true,
    maxVD,
    phaseCurrents: phaseCurrents.map(c => Math.round(c)),
    phaseImbalance: Math.round(imbalance * 10) / 10,
    phaseMode,
    steps,
  };

  // ── Build trace — year-specific references actually used ──
  const articles = [demandTableRef.replace("Table ", ""), receptacleArticleRef.replace(" (pending verification)", ""), "240.6(A)", "250.122", (nec.AMPACITY_TABLE || "Table 310.15(B)(16)").replace("Table ", ""), "210.19", "215.2"];
  const tables = [demandTableRef, "Table 240.6(A)", "Table 250.122", nec.AMPACITY_TABLE || "Table 310.15(B)(16)"];
  const fields = ["STD_OCPD_SIZES", "COPPER_AMPACITY", "ALUMINUM_AMPACITY", "EGC_TABLE", "RESISTIVITY", "CONDUCTOR_CM"];

  if (transformerEnabled) {
    articles.push("450.3(B)", "210.19(A)(1)");
    tables.push("Table 450.3(B)");
    fields.push("CONTINUOUS_LOAD_MULTIPLIER", "TRANSFORMER_OCPD");
  }
  if (additionalLoads.some(l => MOTOR_LOAD_TYPES.includes(l.type))) {
    articles.push("430.22(A)", "430.52", "Table 430.250", "Table 430.248");
    tables.push("Table 430.52", "Table 430.250", "Table 430.248");
    fields.push("MOTOR_FLC_3PHASE", "MOTOR_FLC_1PHASE");
  }
  if (additionalLoads.some(l => HVAC_LOAD_TYPES.includes(l.type))) {
    articles.push("440.6", "440.22");
    tables.push("Table 440.22");
  }
  if (additionalLoads.some(l => LIGHTING_LOAD_TYPES.includes(l.type))) {
    articles.push("220.12", "220.42");
    tables.push("Table 220.12", "Table 220.42");
    fields.push("OCCUPANCY_UNIT_LOADS");
  }

  return withTrace(result, { articles_used: articles, tables_used: tables, fields_used: fields });
}