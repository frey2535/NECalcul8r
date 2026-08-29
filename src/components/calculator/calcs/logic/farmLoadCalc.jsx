/**
 * Pure calculation logic for Farm Load (NEC 220.102 / 220.103).
 */

import { withTrace } from "@/lib/calculatorTrace";

function isYes(val) {
  return val === true || val === "true";
}

/** Table 220.102 ampere tiers at 240 V, applied to connected load. */
export function table102TieredVA(connectedVA, nec) {
  const v = nec.FARM_102_VOLTAGE ?? 240;
  const tiers = nec.FARM_102_TIERS ?? [
    { amps: 60, factor: 1.00 },
    { amps: 60, factor: 0.50 },
    { amps: Infinity, factor: 0.25 },
  ];
  let remainingA = connectedVA / v;
  let demandA = 0;
  for (const t of tiers) {
    const band = Math.min(remainingA, t.amps);
    demandA += band * t.factor;
    remainingA -= band;
    if (remainingA <= 0) break;
  }
  return demandA * v;
}

function farm102ForBuilding(b, nec, index) {
  const connectedVA = Math.max(0, parseFloat(b.va) || 0);
  const simultaneousVA = Math.max(0, parseFloat(b.simultaneousVA) || 0);
  const motorVA = Math.max(0, parseFloat(b.largestMotorVA) || 0);
  const motorDemandVA = motorVA * (nec.FARM_102_MOTOR_MULTIPLIER ?? 1.25);
  const tieredVA = table102TieredVA(connectedVA, nec);
  const farm102VA = Math.max(tieredVA, simultaneousVA, motorDemandVA);
  let governing = "table_220_102";
  if (farm102VA === simultaneousVA && simultaneousVA > 0 && simultaneousVA >= motorDemandVA && simultaneousVA >= tieredVA) {
    governing = "simultaneous";
  } else if (farm102VA === motorDemandVA && motorDemandVA > 0 && motorDemandVA >= tieredVA) {
    governing = "motor_125";
  }
  const groupRaw = (b.functionGroup || "").toString().trim();
  return {
    name: b.name || `Building ${index + 1}`,
    connectedVA: Math.round(connectedVA),
    simultaneousVA: Math.round(simultaneousVA),
    motorDemandVA: Math.round(motorDemandVA),
    tieredVA: Math.round(tieredVA),
    farm102VA: Math.round(farm102VA),
    governing,
    functionGroup: groupRaw,
    groupKey: groupRaw || `__unit_${index}`,
  };
}

/**
 * @param {object} v - dwellingVA, buildings[], voltage, phases, dwellingElectricHeat, grainDrying
 * @param {object} nec
 */
export function calcFarmLoad(v, nec) {
  const dwelling = Math.max(0, parseFloat(v.dwellingVA) || 0);
  const buildings = (v.buildings || []).map((b, i) => farm102ForBuilding(b, nec, i));

  const groups = new Map();
  for (const b of buildings) {
    if (!groups.has(b.groupKey)) {
      groups.set(b.groupKey, {
        name: b.functionGroup ? `Same function: ${b.functionGroup}` : b.name,
        farm102VA: 0,
        members: [],
        combined: false,
      });
    }
    const g = groups.get(b.groupKey);
    g.farm102VA += b.farm102VA;
    g.members.push(b.name);
    if (g.members.length > 1) {
      g.combined = true;
      g.name = `Same function: ${b.functionGroup}`;
    }
  }

  const factors = nec.FARM_BUILDING_DEMAND || [1.00, 0.75, 0.65, 0.50];
  const ranked = [...groups.values()]
    .sort((a, b) => b.farm102VA - a.farm102VA)
    .map((g, i) => {
      const factor = i < factors.length ? factors[i] : factors[factors.length - 1];
      return {
        name: g.name,
        farm102VA: Math.round(g.farm102VA),
        factor: factor * 100,
        demanded: Math.round(g.farm102VA * factor),
        combined: g.combined,
        members: g.members,
      };
    });

  const totalBuildingDemand = ranked.reduce((s, r) => s + r.demanded, 0);
  const totalServiceVA = dwelling + totalBuildingDemand;

  const phaseFactor = v.phases === "three" ? 1.732 : 1;
  const vol = parseFloat(v.voltage) || 240;
  const totalA = vol * phaseFactor ? totalServiceVA / (vol * phaseFactor) : 0;
  const minService = (nec.STD_OCPD_SIZES || []).find((s) => s >= totalA) || 2000;

  const partIVBlocked = isYes(v.dwellingElectricHeat) && isYes(v.grainDrying);

  const buildingDemands = buildings.map((b) => ({
    name: b.name,
    va: b.connectedVA,
    connectedVA: b.connectedVA,
    farm102VA: b.farm102VA,
    tieredVA: b.tieredVA,
    governing: b.governing,
    factor: ranked.find((r) => r.members.includes(b.name))?.factor ?? 100,
    demanded: b.farm102VA,
  }));

  const steps = [
    { label: "Each Building (Table 220.102)", formula: "Greater of simultaneous, 125% largest motor, or first 60 A @ 100% + next 60 A @ 50% + remainder @ 25% (at 240 V)", expression: buildings.map((b) => `${b.name}: ${b.farm102VA} VA`).join(", ") || "—", result: buildings.reduce((s, b) => s + b.farm102VA, 0), unit: "VA" },
    { label: "Total Farm Buildings (Table 220.103)", formula: "Largest 100%, second 75%, third 65%, remaining 50%", expression: ranked.map((r) => `${r.name}: ${r.demanded} VA (${r.factor}%)`).join(", ") || "—", result: Math.round(totalBuildingDemand), unit: "VA" },
    { label: "Dwelling (220.102(A) / 220.103 note)", formula: "Part III or IV dwelling demand added after Table 220.103", expression: `${Math.round(dwelling)} VA`, result: Math.round(dwelling), unit: "VA" },
    { label: "Total Service Load", formula: "VA = Table 220.103 total + dwelling", expression: `${Math.round(totalBuildingDemand)} + ${Math.round(dwelling)}`, result: Math.round(totalServiceVA), unit: "VA" },
    { label: "Service Amps", formula: "A = VA ÷ (V × √3)", expression: `${Math.round(totalServiceVA)} ÷ (${vol} ${v.phases === "three" ? "× 1.732" : ""})`, result: Math.round(totalA * 10) / 10, unit: "A" },
    { label: "Minimum Service Size", formula: "Size = next standard ≥ amps", expression: `next standard ≥ ${Math.round(totalA * 10) / 10} A`, result: minService, unit: "A" },
  ];

  const result = {
    dwelling: Math.round(dwelling),
    buildingDemands,
    farm102Buildings: buildings,
    farm103Loads: ranked,
    totalBuildingDemand: Math.round(totalBuildingDemand),
    totalServiceVA: Math.round(totalServiceVA),
    totalA: Math.round(totalA * 10) / 10,
    minService_A: minService,
    partIVBlocked,
    steps,
  };
  return withTrace(result, {
    articles_used: ["220.102(A)", "220.102(B)", "220.103", "240.6(A)"],
    tables_used: ["Table 220.102", "Table 220.103"],
    fields_used: ["FARM_102_TIERS", "FARM_102_VOLTAGE", "FARM_102_MOTOR_MULTIPLIER", "FARM_BUILDING_DEMAND", "STD_OCPD_SIZES"],
  });
}
