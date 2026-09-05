/**
 * Developer Audit — Source-traceable calculator metadata.
 *
 * Verification sources (per article):
 *   "NEC 2017"         – verified against published NEC 2017 text
 *   "NEC 2020"         – verified against published NEC 2020 text
 *   "NEC 2023"         – verified against published NEC 2023 text
 *   "NEC 2026 draft"   – verified against 2026 draft/final source
 *   "developer assumption" – based on industry knowledge, not independently verified
 *   "pending manual review" – uncertain; needs human verification
 *
 * Rule: a calculator is NOT "verified" for a given year if ANY article
 * consumed by that calculator has source "developer assumption" or
 * "pending manual review". Pure-math calculators (no articles) are
 * verified by definition.
 */

import { calcDwellingStandard, calcDwellingOptional } from "@/components/calculator/calcs/logic/dwellingCalcs";
import { calcMultifamilyLoad } from "@/components/calculator/calcs/logic/multifamilyLoadCalc";
import { calcKitchenEquipment } from "@/components/calculator/calcs/logic/kitchenEquipmentCalc";
import { calcFarmLoad } from "@/components/calculator/calcs/logic/farmLoadCalc";
import { calcRVParkLoad } from "@/components/calculator/calcs/logic/rvParkLoadCalc";
import { calcReceptacleLoad } from "@/components/calculator/calcs/logic/receptacleCalc";
import { calcLightingLoad } from "@/components/calculator/calcs/logic/lightingLoadCalc";
import { calcMotorBranchCircuit } from "@/components/calculator/calcs/logic/motorBranchCircuitCalc";

// Source helpers
const DEV  = "developer assumption";
const PEND = "pending manual review";
const N17  = "NEC 2017";
const N20  = "NEC 2020";
const N23  = "NEC 2023";
const N26  = "NEC 2026 draft";

// Verification source labels (per user request — do NOT treat DEV as verified)
const VERIFIED_CENTRALIZED = "verified centralized production data";
const INHERITED_VERIFIED   = "inherited verified reference";
const PENDING_CODEBOOK     = "pending manual/codebook verification";
const UNVERIFIED           = "unverified";

// ─── Helpers used by the audit page ──────────────────────────────────────

/** Compute verification status per year from article sources. */
export function computeVerifiedPerYear(calc) {
  const years = ["2017", "2020", "2023", "2026"];
  if (!calc.articles || calc.articles.length === 0) {
    // Pure-math calculators — verified by definition across all years
    const r = {};
    for (const y of years) r[y] = { verified: true, reason: "No NEC articles consumed — pure math/engineering." };
    return r;
  }
  const r = {};
  for (const y of years) {
    const badSources = calc.articles.filter(a =>
      a.source === DEV || a.source === PEND ||
      a.source === PENDING_CODEBOOK || a.source === UNVERIFIED
    );
    // 2026 is always unverified unless every article is explicitly verified
    if (y === "2026") {
      const unverified2026 = calc.articles.filter(a =>
        a.source !== VERIFIED_CENTRALIZED && a.source !== INHERITED_VERIFIED
      );
      if (unverified2026.length > 0) {
        r[y] = {
          verified: false,
          reason: `2026 NEC rules are pending/unverified — ${unverified2026.length} article(s) not confirmed against NEC 2026.`,
          unverifiedArticles: unverified2026.map(a => a.ref),
        };
        continue;
      }
    }
    if (badSources.length > 0) {
      r[y] = {
        verified: false,
        reason: `${badSources.length} article(s) not independently verified against NEC ${y}.`,
        unverifiedArticles: badSources.map(a => a.ref),
      };
    } else {
      r[y] = { verified: true, reason: `All articles confirmed against NEC ${y}.` };
    }
  }
  return r;
}

/** Get year-sensitive calculators (those where outputs differ across years). */
export function getYearSensitiveCalculators() {
  return CALCULATORS.filter(c => c.yearSensitive);
}

/** Get calculators that use getNecData. */
export function getDynamicCalculators() {
  return CALCULATORS.filter(c => c.usesGetNecData);
}

/** Group calculators by category. */
export function getGroupedCalculators() {
  const groups = {};
  for (const c of CALCULATORS) {
    const cat = c.category || "Others";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  }
  return groups;
}

export function getCalculator(id) { return CALCULATORS.find(c => c.id === id); }

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATOR REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export const CALCULATORS = [

  // ═══ LOAD CALCULATIONS ══════════════════════════════════════════════════
  {
    id: "dwelling_standard", name: "Dwelling Standard (220.40)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "220.12", desc: "Dwelling lighting — 3 VA/sq ft; exclude unused cellar, unfinished attic, open porches", changed: false, source: N17 },
      { ref: "220.14(J)", desc: "Dwelling lighting/receptacle load — bathroom circuits not extra 1500 VA", changed: false, source: N17 },
      { ref: "220.40", desc: "Standard method — sum of computed loads", changed: false, source: N17 },
      { ref: "220.52", desc: "Small appliance circuits — 1,500 VA each (min 2)", changed: false, source: N17 },
      { ref: "220.52(B)", desc: "Laundry circuit — 1,500 VA (min 1)", changed: false, source: N17 },
      { ref: "Table 220.42", desc: "Lighting demand — 100%/35%/25% dwelling tiers", changed: false, source: N17 },
      { ref: "Table 220.55", desc: "Cooking equipment demand — Columns A/B/C + Note 1", changed: false, source: N17 },
      { ref: "220.54", desc: "Household dryer — 5,000 W or nameplate, larger", changed: false, source: N17 },
      { ref: "220.53", desc: "75% for 4+ fastened appliances other than range/dryer/HVAC", changed: false, source: N17 },
      { ref: "220.60", desc: "Noncoincident loads — larger of heating vs cooling", changed: false, source: N17 },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "230.42(B)", desc: "Minimum dwelling service — 100A", changed: false, source: DEV, note: "100A minimum since 1959 per industry consensus. Needs codebook confirmation." },
      { ref: "230.85", desc: "Outdoor emergency disconnect (2020+)", changed: true, source: PEND, note: "2017: not required. 2020+: required for 1- and 2-family dwellings. Displayed in NoteBox." },
      { ref: "230.67", desc: "SPD required for dwelling services (2023+)", changed: true, source: PEND, note: "2017/2020: not required. 2023+: Type 1 or 2 SPD required. Displayed in NoteBox." },
      { ref: "210.8(A)", desc: "GFCI scope — dwelling receptacles", changed: true, source: PEND, note: "2017: narrower 125V/15-20A scope. 2020: expanded to 250V, more areas, laundry, all kitchen. Displayed in NoteBox." },
      { ref: "210.52(C)(2)", desc: "Island/peninsula sq-ft receptacle rule", changed: true, source: PEND, note: "2017: required if ≥12 sq ft. 2020: sq-ft tiered rule (first 9 sq ft, +1 per 18 sq ft). Displayed in NoteBox." },
      { ref: "210.52(G)", desc: "Garage/basement/accessory receptacle — multifamily expansion", changed: true, source: PEND, note: "2020: expanded to include multifamily dwellings. Displayed in NoteBox." },
      { ref: "210.8(D)", desc: "Specific appliance GFCI (dishwasher/sump pump)", changed: true, source: PEND, note: "2020: dishwasher GFCI expanded beyond dwelling-only; sump pumps added to 422.5 list. Displayed in NoteBox." },
      { ref: "210.8(F)", desc: "GFCI for outdoor dwelling outlets ≤50A", changed: true, source: PEND, note: "2020: new section — GFCI required for outdoor dwelling outlets ≤150V/≤50A. Displayed in NoteBox." },
      { ref: "422.5", desc: "Appliance GFCI list (dishwashers, sump pumps)", changed: true, source: PEND, note: "2020: dishwashers and sump pumps added. Displayed in NoteBox." },
    ],
    sourceNotes: "2017 standard method: Table 220.12/220.42/220.54/220.55, 220.52 mins, 220.14(J), 220.53, 220.60. Neutral 220.61 and D1(b) 430.24 are other calculators. Installation notes year-gated.",
    testInputs: { sqft: 2000, smallAppliance: 2, laundry: 1, range: 12000, dryer: 5000, dishwasher: 0, disposer: 0, waterHeater: 0, hvac: 0, other: 0, voltage: 240 },
    calculate: (i, nec) => {
      const r = calcDwellingStandard(i, nec);
      return { genLighting: r.genLighting_VA, lightingDemand: r.lightingDemand_VA, rangeDemand: r.rangeDemand_VA, dryerDemand: r.dryerDemand_VA, totalVA: r.totalVA };
    },
  },
  {
    id: "dwelling_optional", name: "Dwelling Optional (220.82)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "220.12", desc: "Dwelling lighting — 3 VA/sq ft", changed: false, source: DEV },
      { ref: "220.52", desc: "Small appliance / laundry VA", changed: false, source: DEV },
      { ref: "220.82(A)", desc: "Optional method applicability — 100 A min, 3-wire dwelling", changed: false, source: N17, note: "2017: one- and two-family (and dwelling portion of farm as used). Displayed in NoteBox." },
      { ref: "220.82(B)", desc: "General loads — 100% first 10 kVA + 40% remainder, nameplate appliances", changed: false, source: N17, note: "40% remainder factor. Range/dryer at nameplate, not Table 220.55/220.54." },
      { ref: "220.82(C)", desc: "HVAC — largest of (C)(1)–(C)(6): 100% AC, 100% HP, 65% supplemental, 65%/40% space heat, 100% thermal storage", changed: false, source: N17 },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "230.85", desc: "Outdoor emergency disconnect (2020+)", changed: true, source: PEND, note: "2017: not required. 2020+: required for 1- and 2-family dwellings. Displayed in NoteBox." },
      { ref: "230.67", desc: "SPD required for dwelling services (2023+)", changed: true, source: PEND, note: "2017/2020: not required. 2023+: required. Displayed in NoteBox." },
      { ref: "210.8(A)", desc: "GFCI scope — dwelling receptacles", changed: true, source: PEND, note: "2017: narrower scope. 2020: expanded. Displayed in NoteBox." },
      { ref: "210.52(C)(2)", desc: "Island/peninsula sq-ft receptacle rule", changed: true, source: PEND, note: "2017: ≥12 sq ft threshold. 2020: sq-ft tiered rule. Displayed in NoteBox." },
      { ref: "210.52(G)", desc: "Garage/basement/accessory receptacle — multifamily expansion", changed: true, source: PEND, note: "2020: expanded to multifamily dwellings. Displayed in NoteBox." },
      { ref: "210.8(D)", desc: "Specific appliance GFCI (dishwasher/sump pump)", changed: true, source: PEND, note: "2020: expanded dishwasher scope; sump pumps added. Displayed in NoteBox." },
      { ref: "210.8(F)", desc: "GFCI for outdoor dwelling outlets ≤50A", changed: true, source: PEND, note: "2020: new section. Displayed in NoteBox." },
      { ref: "422.5", desc: "Appliance GFCI list (dishwashers, sump pumps)", changed: true, source: PEND, note: "2020: dishwashers and sump pumps added. Displayed in NoteBox." },
    ],
    sourceNotes: "2017 220.82(B)/(C) factors owned in 2017.js (OPTIONAL_HVAC). Later years inherit shared.js numbers pending independent codebook check. Installation notes (230.85, 230.67, 210.8) are display-only and year-gated.",
    testInputs: { sqft: 2000, airCond: 5000, heatStrip: 0, heatPump: 0, heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0, otherLoads: 8000 },
    calculate: (i, nec) => {
      const r = calcDwellingOptional(i, nec);
      return { genLighting: r.generalLighting_VA, generalTotal: r.generalTotal_VA, generalDemand: r.generalDemand_VA, totalVA: r.totalVA };
    },
  },
  {
    id: "commercial_load", name: "Commercial Load (220.12 / 220.42 / 220.44)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 220.12", desc: "Unit loads by occupancy (VA/sq ft)", changed: false, source: DEV, note: "Office 3.5, store 3.0, school 3.0, etc. Needs per-occupancy verification." },
      { ref: "Table 220.42", desc: "Lighting demand factors", changed: false, source: DEV },
      { ref: "220.14(I) / 220.44", desc: "Receptacle demand — 180 VA, 100%/50% tiers", changed: false, source: DEV },
      { ref: "210.8(B)", desc: "Other-than-dwelling GFCI scope", changed: true, source: PEND, note: "2020: expanded 125V-250V coverage; kitchens/food-prep, damp/wet, accessory buildings, laundry, bathtub/shower. Displayed in NoteBox." },
    ],
    sourceNotes: "Three interconnected tables. Industry consensus: no numeric changes 2017–2026. Each occupancy type's unit load and demand factor needs independent verification. 210.8(B) GFCI scope changed in 2020 per Eaton PDF — displayed in NoteBox.",
    testInputs: { sqft: 5000, occupancy: "office", receptacles: 30 },
    calculate: (i, nec) => {
      const ul = nec.OCCUPANCY_UNIT_LOADS[i.occupancy] || 3.5;
      const lv = i.sqft * ul;
      const cfg = nec.LIGHTING_DEMAND[i.occupancy] || { tiers: [{ band: Infinity, factor: 1.00 }] };
      let ld = 0, lr = lv;
      for (const t of cfg.tiers) { const b = Math.min(lr, t.band); ld += b * t.factor; lr -= b; if (lr <= 0) break; }
      const rt = i.receptacles * 180; let rd = 0, rr = rt;
      for (const t of nec.RECEPTACLE_DEMAND_TIERS) { const b = Math.min(rr, t.band); rd += b * t.factor; rr -= b; if (rr <= 0) break; }
      return { lightingVA: Math.round(lv), lightingDemand: Math.round(ld), recTotal: Math.round(rt), recDemand: Math.round(rd) };
    },
  },
  {
    id: "multifamily_standard", name: "Multifamily (220.40 Standard)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 220.12", desc: "Dwelling lighting — 3 VA/sq ft per unit", changed: false, source: DEV },
      { ref: "Table 220.42", desc: "Lighting demand — 100%/35%/25% tiers", changed: false, source: DEV },
      { ref: "220.52(A)", desc: "Small appliance — 1500 VA/circuit (min 2 per unit)", changed: false, source: DEV },
      { ref: "220.52(B)", desc: "Laundry — 1500 VA/circuit (min 1 per unit)", changed: false, source: DEV },
      { ref: "Table 220.55", desc: "Range demand — Column C for multiple ranges", changed: false, source: DEV },
      { ref: "Table 220.54", desc: "Dryer demand — by number of dryers", changed: false, source: DEV },
      { ref: "220.40", desc: "Standard method structure", changed: false, source: DEV },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "Standard method for multifamily dwellings per NEC 220.40. General lighting, small appliance, and laundry summed across all units and demand-factored per Table 220.42. Ranges per Table 220.55 Column C. Dryers per Table 220.54. Heating at 100%.",
    testInputs: { numUnits: 20, sqftPerUnit: 1000, rangeKW: 12, dryerKW: 5, heatingVA: 170000, voltage: 240, phases: "single" },
    calculate: (i, nec) => {
      const lv = i.numUnits * i.sqftPerUnit * nec.DWELLING_LIGHTING_VA_PER_SQFT;
      const sa = i.numUnits * 2 * nec.SMALL_APPLIANCE_VA;
      const la = i.numUnits * nec.LAUNDRY_VA;
      const tg = lv + sa + la;
      let gd = 0, r = tg;
      for (const t of nec.DWELLING_DEMAND_TABLE) { const b = Math.min(r, t.band); gd += b * t.factor; r -= b; if (r <= 0) break; }
      const row = nec.RANGE_DEMAND.find(rr => i.numUnits <= rr.count);
      const rd = row ? row.max_12kW * 1000 : 0;
      const drow = nec.DRYER_DEMAND.find(rr => i.numUnits <= rr.count);
      const factor = typeof nec.getDryerDemandFactor === "function"
        ? nec.getDryerDemandFactor(i.numUnits)
        : (drow ? drow.factor : 0.25);
      const dd = (i.numUnits * Math.max(5000, i.dryerKW * 1000)) * factor;
      const net = gd + rd + dd + i.heatingVA;
      return { lightingVA: Math.round(lv), generalDemand: Math.round(gd), rangeDemand: Math.round(rd), dryerDemand: Math.round(dd), netLoadVA: Math.round(net) };
    },
  },
  {
    id: "multifamily_load", name: "Multifamily (220.84 Optional)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "220.84(A)", desc: "3+ units, one feeder per unit, electric cooking", changed: false, source: N17 },
      { ref: "220.84(B)", desc: "House loads per Part III, added after Table 220.84", changed: false, source: N17 },
      { ref: "220.84(C)", desc: "Connected unit load: 3 VA/ft², SA/laundry, nameplate, larger of A/C or heat", changed: false, source: N17 },
      { ref: "Table 220.84", desc: "Demand factors 45%→23% by unit count; 51–55 at 25%, 56–61 at 24%, 62+ at 23%", changed: false, source: N17 },
      { ref: "210.52(F) Exception", desc: "Common laundry may omit in-unit laundry circuit", changed: false, source: N17 },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "2017 Table 220.84 bands gated including 51–55 at 25%, 56–61 at 24%, and 62-and-over at 23%. House loads are user-entered Part III results. 220.84 Exception (no-cooking comparison) and 220.61 / D5(b) phase balancing are other paths.",
    testInputs: { numUnits: 12, sqftPerUnit: 900, rangeKW: 12, dryerKW: 5, acKW: 3.5, waterHeaterKW: 4.5, houseLighting: 3000, houseHVAC: 5000, voltage: 208, phases: "three" },
    calculate: (i, nec) => {
      const r = calcMultifamilyLoad(i, nec);
      return { perUnitVA: r.perUnitVA, totalConnected: r.totalConnectedVA, demandFactor: r.demandFactor, demandedVA: r.demandedVA };
    },
  },
  {
    id: "farm_load", name: "Farm Load (220.102 / 220.103)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "220.102(A)", desc: "Dwelling per Part III or IV; Part IV blocked if electric heat + grain drying", changed: false, source: N17 },
      { ref: "Table 220.102", desc: "Per building: 60 A 100%, next 60 A 50%, remainder 25% at 240 V; not less than simultaneous or 125% motor", changed: false, source: N17 },
      { ref: "Table 220.103", desc: "Rank 220.102 results 100%/75%/65%/50%; add dwelling", changed: false, source: N17 },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "2017 Part V gated: Table 220.102 ampere tiers then Table 220.103 ranking. Same-function loads combine after 220.102. Dwelling added after 220.103.",
    testInputs: { dwellingVA: 23000, buildings: [{ name: "Dairy Barn", va: 35000 }, { name: "Grain Storage", va: 15000 }, { name: "Equipment Shed", va: 8000 }] },
    calculate: (i, nec) => {
      const r = calcFarmLoad(i, nec);
      return { farmDemand: r.totalBuildingDemand, totalVA: r.totalServiceVA };
    },
  },

  // ═══ EQUIPMENT / APPLIANCE ═══════════════════════════════════════════════
  {
    id: "kitchen_equipment_demand", name: "Kitchen Equipment (220.56)",
    category: "Equipment / Appliance", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "Table 220.56", desc: "Commercial kitchen demand; 2017: 6 or more at 65%; not less than two largest", changed: false, source: N17 },
      { ref: "210.19(A)(1)", desc: "Continuous load — 125% conductor", changed: false, source: DEV },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "2017 Table 220.56: 6-and-over is a flat 65% (later editions step down further). Two-largest floor applied. HVAC/vent not in this table.",
    testInputs: { equipment: [{ kw: 12 }, { kw: 15 }, { kw: 10 }, { kw: 8 }, { kw: 10 }], voltage: 208, phases: "three" },
    calculate: (i, nec) => {
      const r = calcKitchenEquipment(i, nec);
      return { demandFactor: r.demandFactor, demandedKW: r.demandedKW, conductorA: r.conductorA };
    },
  },
  {
    id: "receptacle_load", name: "Receptacle Load (220.14 / 220.44)",
    category: "Equipment / Appliance", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "220.14(I)", desc: "Receptacle load — 180 VA each", changed: false, source: DEV, note: "180 VA per yoke. Needs verification across editions." },
      { ref: "220.44", desc: "Receptacle demand — 100%/50% tiers", changed: false, source: DEV },
      { ref: "210.52(C)(2)", desc: "Island/peninsula sq-ft receptacle rule", changed: true, source: PEND, note: "2017: required if ≥12 sq ft. 2020: sq-ft tiered rule. Displayed in NoteBox." },
      { ref: "210.52(G)", desc: "Garage/basement/accessory receptacle — multifamily expansion", changed: true, source: PEND, note: "2020: expanded to multifamily dwellings. Displayed in NoteBox." },
      { ref: "210.8(A)", desc: "GFCI scope — dwelling receptacles", changed: true, source: PEND, note: "2017: narrower scope. 2020: expanded to 250V and more areas. Displayed in NoteBox." },
      { ref: "210.8(B)", desc: "GFCI scope — other-than-dwelling receptacles", changed: true, source: PEND, note: "2020: expanded coverage. Displayed in NoteBox." },
    ],
    sourceNotes: "180 VA per receptacle and demand tiers stable. Installation articles (210.52(C)(2)/(G), 210.8(A)/(B)) display year-specific notes per Eaton 2020 NEC Code Changes PDF. Source status: change-reviewed, pending full codebook verification.",
    testInputs: { count: 50, vaPerReceptacle: 180, voltage: 120, applyDemand: true },
    calculate: (i, nec) => {
      const r = calcReceptacleLoad(i, nec);
      return { totalVA: r.totalConnected_VA, demandVA: r.demandAdjusted_VA, reduction: r.totalConnected_VA - r.demandAdjusted_VA };
    },
  },
  {
    id: "lighting_load", name: "Lighting Load (220.12 / 220.42)",
    category: "Equipment / Appliance", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "Table 220.12", desc: "Unit loads by occupancy type", changed: false, source: DEV },
      { ref: "Table 220.42", desc: "Lighting demand factors", changed: false, source: DEV },
    ],
    sourceNotes: "Same tables as Commercial Load. See that entry.",
    testInputs: { sqft: 3000, occupancy: "dwelling", voltage: 120, phases: "single" },
    calculate: (i, nec) => {
      const r = calcLightingLoad(i, nec);
      return { lightingVA: r.nec_VA, lightingDemand: r.demand };
    },
  },

  // ═══ MOTOR / HVAC ════════════════════════════════════════════════════════
  {
    id: "motor_full_load", name: "Motor Branch Circuit (430)",
    category: "Motor / HVAC", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 430.248", desc: "Single-phase motor FLC", changed: false, source: DEV, note: "NEMA MG 1 based. Each HP/voltage entry needs verification." },
      { ref: "Table 430.250", desc: "Three-phase motor FLC", changed: false, source: DEV },
      { ref: "430.22", desc: "Conductor — 125% × FLC", changed: false, source: DEV },
      { ref: "Table 430.52", desc: "OCPD max multipliers", changed: false, source: DEV, note: "IT=250%, NTDF=300%, DE=175%, INST=800%. Needs per-type verification." },
      { ref: "Table 310.15(B)(16)", desc: "Copper/aluminum ampacities", changed: false, source: DEV },
    ],
    sourceNotes: "Motor FLC tables are physics/NEMA-based and reportedly stable. Each HP/voltage entry in both tables needs independent verification. OCPD multipliers (Table 430.52) need per-type check.",
    testInputs: { hp: "10", voltage: "460", phases: "three", ocpdType: "itcb", termRating: 75, sfAbove115: "yes" },
    calculate: (i, nec) => {
      const r = calcMotorBranchCircuit(i, nec);
      return { flc: r.flc, conductorMinA: r.conductorMinA, ocpdCalc: r.ocpdCalc };
    },
  },
  {
    id: "motor_feeder", name: "Motor Feeder (430.24 / 430.62)",
    category: "Motor / HVAC", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "430.24", desc: "Feeder conductor — largest × 125% + sum of rest", changed: false, source: DEV },
      { ref: "430.62", desc: "Feeder OCPD methodology", changed: false, source: DEV },
      { ref: "Table 430.250", desc: "Three-phase motor FLC", changed: false, source: DEV },
    ],
    sourceNotes: "Feeder sizing methodology reportedly unchanged. Needs verification of 430.24/430.62 text and the referenced FLC tables.",
    testInputs: { motors: [{ hp: "10", flc: 14 }, { hp: "5", flc: 7.6 }, { hp: "3", flc: 4.8 }] },
    calculate: (i, nec) => {
      const flcs = i.motors.map(m => m.flc).sort((a, b) => b - a);
      return { feederConductorA: +(flcs[0] * nec.CONTINUOUS_LOAD_MULTIPLIER + flcs.slice(1).reduce((s, v) => s + v, 0)).toFixed(1) };
    },
  },
  {
    id: "hvac_load", name: "HVAC Load (440)",
    category: "Motor / HVAC", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "440.32", desc: "Single compressor — conductor 125% × RLA", changed: false, source: DEV },
      { ref: "440.33", desc: "Multiple motors — largest × 125% + sum", changed: false, source: DEV },
      { ref: "440.22", desc: "OCPD max — 175% of RLA", changed: false, source: DEV, note: "175% cap for hermetic compressors. Needs verification." },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "210.8(E)", desc: "GFCI for equipment-servicing receptacles", changed: true, source: PEND, note: "2020: new section — GFCI required for 210.63 equipment-servicing receptacles. Displayed in NoteBox." },
    ],
    sourceNotes: "Article 440 for hermetic motor-compressors. Methodology reportedly stable. Each percentage (125%, 175%) needs codebook verification. 210.8(E) added in 2020 per Eaton PDF — displayed in NoteBox.",
    testInputs: { nameplateA: 30, compFLA: 20, fanFLA: 5 },
    calculate: (i, nec) => {
      return { conductorA_single: +(i.nameplateA * nec.CONTINUOUS_LOAD_MULTIPLIER).toFixed(1), conductorA_multi: +(i.compFLA * nec.CONTINUOUS_LOAD_MULTIPLIER + i.fanFLA).toFixed(1) };
    },
  },
  {
    id: "fixed_electric_heat", name: "Fixed Electric Heat (220.51)",
    category: "Motor / HVAC", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "220.51", desc: "Fixed electric space heat — 100% of nameplate", changed: false, source: DEV, note: "No demand factor permitted. Needs verification." },
      { ref: "210.19(A)(1)", desc: "Continuous load — 125% conductor", changed: false, source: DEV },
    ],
    sourceNotes: "220.51 mandates 100% (no demand). 125% continuous rule applies. Both need codebook verification.",
    testInputs: { heaters: 3, wattsPerHeater: 2000, voltage: 240 },
    calculate: (i, nec) => {
      const tw = i.heaters * i.wattsPerHeater, ta = tw / i.voltage;
      return { totalW: tw, totalA: +ta.toFixed(1), conductorA: +(ta * nec.CONTINUOUS_LOAD_MULTIPLIER).toFixed(1) };
    },
  },
  {
    id: "continuous_load", name: "Continuous Load (210.19 / 210.20)",
    category: "Motor / HVAC", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "210.19(A)(1)", desc: "Branch conductor — 125% continuous + 100% noncontinuous", changed: false, source: DEV, note: "Foundational rule. Needs per-edition text verification." },
      { ref: "210.20(A)", desc: "OCPD — same 125%/100% rule", changed: false, source: DEV },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "The 125% continuous load rule is perhaps the most fundamental NEC concept. Needs independent verification of exact text in each edition.",
    testInputs: { continuousA: 16, noncontinuousA: 4 },
    calculate: (i, nec) => { return { minOCPD: +(i.continuousA * nec.CONTINUOUS_LOAD_MULTIPLIER + i.noncontinuousA).toFixed(1) }; },
  },
  {
    id: "welding_receptacle", name: "Welder Load (630.11 / 630.12)",
    category: "Motor / HVAC", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "630.11", desc: "Arc welder conductor — rated primary × √(DC%/100)", changed: false, source: DEV, note: "Duty cycle formula and multiplier table need verification." },
      { ref: "630.12", desc: "Welder OCPD — 200% of rated primary", changed: false, source: DEV },
    ],
    sourceNotes: "Welder sizing uses thermal averaging (√ of duty cycle) and a 200% OCPD allowance. Both articles need verification against each code edition.",
    testInputs: { nameplateAmps: 60, dutyCycle: 60 },
    calculate: (i, nec) => {
      const dc = Math.sqrt(i.dutyCycle / 100);
      return { conductorA: +(i.nameplateAmps * dc).toFixed(1), maxOCPD: +(i.nameplateAmps * nec.WELDER_OCPD_MULTIPLIER).toFixed(1) };
    },
  },

  // ═══ SPECIAL SYSTEMS ═════════════════════════════════════════════════════
  {
    id: "ev_charging", name: "EV Charging (625)",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "625.42", desc: "EVSE continuous load — 125% of rating", changed: false, source: DEV, note: "125% multiplier reportedly stable. 2023 added minimum 7,200VA." },
      { ref: "625.42(A)", desc: "EVSE minimum load VA", changed: true, source: DEV, note: "2017:none, 2020:none, 2023:7,200VA. NEEDS VERIFICATION against NEC 2023 text." },
      { ref: "625.54", desc: "GFCI protection for EVSE", changed: true, source: DEV, note: "2017:not req. 2020:required. NEEDS VERIFICATION against NEC 2020 text." },
      { ref: "230.67", desc: "SPD required for dwellings", changed: true, source: DEV, note: "2017:no, 2020:no, 2023:yes. NEEDS VERIFICATION against NEC 2023 text." },
      { ref: "230.85", desc: "Outdoor emergency disconnect", changed: true, source: DEV, note: "2017:no, 2020:yes. NEEDS VERIFICATION against NEC 2020 text." },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "The ONLY year-sensitive calculator. Uses three date-gated requirements: GFCI (2020+), minimum load VA (2023+), SPD/disconnect (2020+/2023+). ALL of these critical thresholds need verification against the actual codebook text. The 2026 values are speculative.",
    testInputs: { evseA: 32, voltage: 240, numUnits: 1 },
    calculate: (i, nec) => {
      const ca = i.evseA * nec.EV_CONTINUOUS_MULTIPLIER;
      const oc = nec.STD_OCPD_SIZES.find(s => s >= ca) || 150;
      const mlv = nec.EV_MINIMUM_LOAD_VA, alv = Math.max(i.evseA * i.voltage, mlv);
      return { conductorA: +ca.toFixed(1), ocpd: oc, kW: +(i.voltage * i.evseA / 1000).toFixed(1), gfciRequired: nec.EV_GFCI_REQUIRED, minLoadVA: mlv, appliedLoadVA: Math.round(alv) };
    },
  },
  {
    id: "solar_pv", name: "Solar PV (690 / 705)",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "690.8(B)(1)", desc: "Backfeed breaker — 125% of inverter output", changed: false, source: DEV, note: "Renumbered from 690.8(A)(3) in 2020. 125% value needs verification in both numbering schemes." },
      { ref: "705.12(B)(2)", desc: "120% busbar rule", changed: false, source: DEV, note: "Renumbered from 705.12(D)(2) in 2017. 120% value needs verification." },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "Article renumbering (690.8 and 705.12) confirmed across editions but numerical values (125%, 120%) need independent verification in each edition's text.",
    testInputs: { inverterOutputA: 40, mainBreakerA: 200, busbarA: 225 },
    calculate: (i, nec) => {
      const cb = i.inverterOutputA * nec.SOLAR_BACKFEED_MULTIPLIER;
      const lim = i.busbarA * nec.SOLAR_BUSBAR_120PCT, used = i.mainBreakerA + i.inverterOutputA;
      return { minBackfeedCB: +cb.toFixed(1), rule120_limit: +lim.toFixed(0), rule120_used: used, rule120_ok: used <= lim };
    },
  },
  {
    id: "pool_spa", name: "Pool / Spa (680)",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 430.248", desc: "Single-phase motor FLC", changed: false, source: DEV },
      { ref: "210.19(A)(1)", desc: "Continuous load — 125% conductor", changed: false, source: DEV },
      { ref: "680.21", desc: "Pool motor branch circuits", changed: false, source: DEV },
      { ref: "680.21(C)", desc: "Pool pump motor GFCI", changed: true, source: PEND, note: "2020: GFCI required for pool pump motors. Displayed in NoteBox." },
      { ref: "680.21(D)", desc: "Pool pump replacement GFCI", changed: true, source: PEND, note: "2020: replacement pool pump motors must comply with GFCI rules. Displayed in NoteBox." },
    ],
    sourceNotes: "Pool pump sizing uses same motor FLC table (430.248) as general motors. Article 680 installation requirements displayed as notes, not computed outputs. 680.21(C)/(D) GFCI rules added in 2020 per Eaton PDF.",
    testInputs: { pumpHP: 1.5, heaterKW: 5.5, lightW: 500, voltage: 240 },
    calculate: (i, nec) => {
      const flc = nec.POOL_MOTOR_FLC[i.pumpHP] || 20;
      return { pumpFLC: flc, conductorA: +(flc * nec.CONTINUOUS_LOAD_MULTIPLIER).toFixed(1), heatA: +(i.heaterKW * 1000 / i.voltage).toFixed(1), lightA: +(i.lightW / i.voltage).toFixed(1) };
    },
  },
  {
    id: "data_center", name: "Data Center",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "210.19(A)(1)", desc: "Continuous load — 125%", changed: false, source: DEV },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "—", desc: "PUE defaults (1.4) / UPS efficiency (94%)", changed: false, source: DEV, note: "Industry practice values, not NEC-specified. No codebook needed." },
    ],
    sourceNotes: "Only NEC values are the 125% continuous rule and OCPD sizes. PUE/UPS efficiency are industry defaults.",
    testInputs: { itLoad_kW: 100, pue: 1.4, voltage: 480 },
    calculate: (i, nec) => {
      const tk = i.itLoad_kW * i.pue, tkva = tk / 0.9;
      const sa = (tkva * 1000) / (i.voltage * 1.732);
      return { totalFacilityKW: +tk.toFixed(1), serviceA: +sa.toFixed(1), breaker: nec.STD_OCPD_SIZES.find(s => s >= sa * nec.CONTINUOUS_LOAD_MULTIPLIER) || 2000 };
    },
  },
  {
    id: "generator_sizing", name: "Generator Sizing",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "210.19(A)(1)", desc: "Continuous load — 125% factor", changed: false, source: DEV },
    ],
    sourceNotes: "Only applies the 125% continuous load multiplier. Generator kW selection is industry/manufacturer standard, not NEC-specified.",
    testInputs: { totalKVA: 75 },
    calculate: (i, nec) => { return { adjustedKVA: +(i.totalKVA * nec.CONTINUOUS_LOAD_MULTIPLIER).toFixed(1) }; },
  },
  {
    id: "transformer_sizing", name: "Transformer Sizing (450)",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 450.3(B)", desc: "OCPD multipliers by supervision level", changed: false, source: DEV, note: "250% primary-only, 125% unsupervised. Each configuration needs verification." },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
    ],
    sourceNotes: "Table 450.3(B) OCPD limits for transformers. 2020 reorganized Article 450 but reportedly kept numeric values. Needs per-configuration verification.",
    testInputs: { loadKVA: 75, primaryV: 480, secondaryV: 208, phases: "three" },
    calculate: (i, nec) => {
      const pa = (i.loadKVA * 1000) / (i.primaryV * 1.732);
      return { primaryFLC: +pa.toFixed(1), maxOCPD: +(pa * nec.TRANSFORMER_OCPD.primaryOnly.primary9AOrMore).toFixed(1) };
    },
  },
  {
    id: "service_sizing", name: "Service Sizing (230.42)",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "230.42(A)", desc: "Service conductor — 125% continuous + 100% noncontinuous", changed: false, source: DEV },
      { ref: "230.42(B)", desc: "Minimum dwelling service — 100A", changed: false, source: DEV, note: "100A minimum since 1959 per consensus. Needs verification." },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "230.67", desc: "Dwelling SPD requirement", changed: true, source: PEND, note: "2020: new requirement — Type 1 or 2 SPD required for dwelling unit services. Displayed in result row + NoteBox." },
      { ref: "230.85", desc: "Outdoor emergency disconnect", changed: true, source: PEND, note: "2020: new requirement for 1- and 2-family dwellings. Displayed in result row + NoteBox." },
    ],
    sourceNotes: "230.42 mirrors the 125% rule for service conductors. 100A minimum for dwellings needs verification in each edition. 230.67/230.85 added in 2020 per Eaton PDF — displayed dynamically.",
    testInputs: { totalVA: 40000, voltage: 240, continuousPct: 80 },
    calculate: (i, nec) => {
      const ta = i.totalVA / i.voltage, ca = ta * (i.continuousPct / 100), nca = ta * ((100 - i.continuousPct) / 100);
      const adj = ca * nec.CONTINUOUS_LOAD_MULTIPLIER + nca;
      return { totalAmps: +ta.toFixed(1), adjustedAmps: +adj.toFixed(1), minService: Math.max(nec.STD_OCPD_SIZES.find(s => s >= adj) || 400, nec.DWELLING_MIN_SERVICE_AMPS || 100) };
    },
  },
  {
    id: "demand_factor", name: "Demand Factor",
    category: "Power / Misc", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "220.42", desc: "Lighting demand factors", changed: false, source: DEV },
      { ref: "220.44", desc: "Receptacle demand factors", changed: false, source: DEV },
      { ref: "220.53", desc: "Fixed appliance demand — 75% for 4+", changed: false, source: DEV },
      { ref: "220.61", desc: "Neutral demand — 70% beyond 200kVA", changed: false, source: DEV },
    ],
    sourceNotes: "Aggregates demand factors from multiple tables. Each source table needs independent verification.",
    testInputs: { loadVA: 50000, category: "lighting_dwelling" },
    calculate: (i, nec) => {
      let d = 0, r = i.loadVA;
      for (const t of nec.DWELLING_DEMAND_TABLE) { const b = Math.min(r, t.band); d += b * t.factor; r -= b; if (r <= 0) break; }
      return { demandVA: Math.round(d) };
    },
  },

  // ═══ WIRE / CONDUIT / SIZING ════════════════════════════════════════════
  {
    id: "voltage_drop", name: "Voltage Drop (Ch.9 Tables, Informational Notes)",
    category: "Wire / Conduit / Sizing", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Ch.9 Table 8", desc: "Conductor circular mil areas", changed: false, source: DEV, note: "AWG standard dimensions. Physics-based. Needs per-AWG verification." },
      { ref: "— (Physics)", desc: "Resistivity K=12.9 (Cu) / 21.2 (Al)", changed: false, source: DEV, note: "Material constants. Based on standard resistivity values." },
    ],
    sourceNotes: "Voltage drop uses Ch.9 Table 8 (physical wire dimensions — inherently stable) and material resistivity constants. The 3%/5% limits are Informational Notes, not mandatory requirements.",
    testInputs: { current: 20, length: 100, voltage: 120, material: "copper", phases: "single" },
    calculate: (i, nec) => {
      const K = nec.RESISTIVITY[i.material], f = i.phases === "single" ? 2 : 1.732;
      return { K, CM_needed_3pct: +(K * i.current * i.length * f / (i.voltage * 0.03)).toFixed(0) };
    },
  },
  {
    id: "conductor_ampacity", name: "Conductor Ampacity (310.15)",
    category: "Wire / Conduit / Sizing", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 310.15(B)(16)", desc: "Ampacities at 60°/75°/90°C", changed: false, source: DEV, note: "Each AWG/insulation value needs per-year verification. 2020 reorganized to Table 310.16 — values reportedly same." },
      { ref: "Table 310.15(B)(2)(a)", desc: "Temperature correction factors", changed: false, source: DEV },
      { ref: "Table 310.15(C)(1)", desc: "Bundling adjustment factors", changed: false, source: DEV },
    ],
    sourceNotes: "Ampacity tables are thermal-physics based (Neher-McGrath). 2020 reorganization renumbered but reportedly preserved values. Each AWG size at each insulation rating needs independent verification in both numbering schemes.",
    testInputs: { size: "12", material: "copper", insulation: "75", ambient: 30, conductors: 3 },
    calculate: (i, nec) => {
      const table = i.material === "copper" ? nec.COPPER_AMPACITY : nec.ALUMINUM_AMPACITY;
      const ba = table[i.size]?.["t" + i.insulation] || 0;
      const tf = nec.TEMP_FACTORS[i.insulation]?.[i.ambient] || 1;
      const bf = (Object.entries(nec.BUNDLE_FACTORS).find(([k]) => i.conductors <= parseInt(k))?.[1]) || 1;
      return { baseA: ba, tempFactor: +tf.toFixed(3), bundleFactor: +bf.toFixed(2), deratedA: +(ba * tf * bf).toFixed(1) };
    },
  },
  {
    id: "box_fill", name: "Box Fill (314.16)",
    category: "Wire / Conduit / Sizing", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 314.16(B)", desc: "Volume allowance per conductor (in³)", changed: false, source: DEV, note: "14=2.00, 12=2.25, 10=2.50, 8=3.00, 6=5.00. Each AWG needs verification." },
    ],
    sourceNotes: "Table 314.16(B) assigns volume per conductor. Based on physical wire dimensions (Ch.9 Table 8 + insulation). Inherently stable but each entry needs verification.",
    testInputs: { conductors: { "14": 6, "12": 4 }, devices: 2, groundCount: 1, clamps: 1 },
    calculate: (i, nec) => {
      let t = 0;
      const sizes = Object.keys(i.conductors).map(s => nec.CONDUCTOR_VOLUME[s] || 0);
      const largestVol = sizes.length > 0 ? Math.max(...sizes) : 0;
      for (const [s, c] of Object.entries(i.conductors)) t += c * (nec.CONDUCTOR_VOLUME[s] || 0);
      t += largestVol * i.groundCount + largestVol * i.clamps + largestVol * 2 * i.devices;
      return { totalFill: +t.toFixed(2) };
    },
  },
  {
    id: "conduit_fill", name: "Conduit Fill (Ch.9 Tables 1/4/5)",
    category: "Wire / Conduit / Sizing", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Ch.9 Table 1", desc: "Fill limits — 53%/31%/40%", changed: false, source: DEV, note: "Pulling geometry based. Each percentage needs verification." },
      { ref: "Ch.9 Table 4", desc: "Conduit internal areas", changed: false, source: DEV, note: "ANSI/UL conduit dimensions. Each size/type needs verification." },
      { ref: "Ch.9 Table 5", desc: "Wire cross-section areas", changed: false, source: DEV, note: "UL 83/UL 44 insulation thickness. Each AWG/type needs verification." },
    ],
    sourceNotes: "All Chapter 9 tables are physics/geometry based (conduit dimensions per ANSI C80, wire diameters per UL standards). Inherently stable but each entry needs independent verification.",
    testInputs: { wireType: "12 THHN", count: 3, conduitType: "EMT" },
    calculate: (i, nec) => {
      const wa = nec.WIRE_AREAS[i.wireType] || 0, ta = i.count * wa;
      const lim = i.count === 1 ? 0.53 : i.count === 2 ? 0.31 : 0.40;
      const sz = Object.keys(nec.CONDUIT_AREAS);
      let mn = null;
      for (const s of sz) { if ((nec.CONDUIT_AREAS[s][i.conduitType] || 0) * lim >= ta) { mn = s; break; } }
      return { totalArea: +ta.toFixed(4), fillLimit: lim, minConduit: mn };
    },
  },

  // ═══ GROUNDING / BONDING ══════════════════════════════════════════════════
  {
    id: "egc_sizing", name: "EGC Sizing (250.122)",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 250.122", desc: "EGC size by OCPD rating", changed: false, source: DEV, note: "I²t thermal withstand based. Each OCPD band needs verification." },
    ],
    sourceNotes: "Equipment grounding conductor sizing based on thermal withstand. Each OCPD band (15A–6000A) for both copper and aluminum needs independent verification.",
    testInputs: { ocpd: 200, material: "copper" },
    calculate: (i, nec) => { const row = nec.EGC_TABLE.find(r => i.ocpd <= r.ocpd); return { size: row ? row[i.material] : "N/A" }; },
  },
  {
    id: "grounding_electrode", name: "GEC Sizing (250.66)",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 250.66", desc: "GEC size by service conductor", changed: false, source: DEV, note: "Each service size band needs verification." },
      { ref: "Ch.9 Table 8", desc: "Conductor CM areas", changed: false, source: DEV },
    ],
    sourceNotes: "Grounding electrode conductor sizing via Table 250.66 and Ch.9 Table 8. Each service conductor band needs verification.",
    testInputs: { serviceConductor: "4/0", material: "copper" },
    calculate: (i, nec) => {
      const cm = nec.CONDUCTOR_CM[i.serviceConductor] || 0;
      const row = nec.GEC_TABLE.find(r => cm <= r.maxCM);
      return { cm, size: row ? row[i.material] : "N/A" };
    },
  },
  {
    id: "main_bonding_jumper", name: "Main Bonding Jumper (250.102(C)(1))",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 250.102(C)(1)", desc: "Bonding jumper by service CM area", changed: false, source: DEV, note: "Each CM band + 12.5% rule for >750kcmil needs verification." },
      { ref: "Ch.9 Table 8", desc: "Conductor CM areas", changed: false, source: DEV },
    ],
    sourceNotes: "Bonding jumper sizing table with 12.5% rule for large conductors. Each band and the 12.5% rule need verification.",
    testInputs: { size: "4/0", material: "copper", parallelSets: 1 },
    calculate: (i, nec) => {
      const cm = (nec.CONDUCTOR_CM[i.size] || 0) * i.parallelSets;
      const table = i.material === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
      return { totalCM: cm, size: table.find(r => cm <= r.cm)?.size || "N/A" };
    },
  },
  {
    id: "system_bonding_jumper", name: "System Bonding Jumper",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 250.102(C)(1)", desc: "Same table as MBJ", changed: false, source: DEV },
    ],
    sourceNotes: "Uses same Table 250.102(C)(1) as Main Bonding Jumper. See that entry.",
    testInputs: { size: "3/0", material: "copper" },
    calculate: (i, nec) => {
      const cm = nec.CONDUCTOR_CM[i.size] || 0;
      const table = i.material === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
      return { cm, size: table.find(r => cm <= r.cm)?.size || "N/A" };
    },
  },
  {
    id: "gec_for_sds", name: "GEC for SDS (250.30)",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "250.30(A)(5)", desc: "References Table 250.66 for SDS", changed: false, source: DEV },
      { ref: "Table 250.66", desc: "GEC sizing", changed: false, source: DEV },
    ],
    sourceNotes: "250.30 delegates to Table 250.66 for separately derived system grounding. See GEC Sizing entry.",
    testInputs: { secondaryConductor: "3/0", material: "copper" },
    calculate: (i, nec) => {
      const cm = nec.CONDUCTOR_CM[i.secondaryConductor] || 0;
      const row = nec.GEC_TABLE.find(r => cm <= r.maxCM);
      return { cm, size: row ? row[i.material] : "N/A" };
    },
  },
  {
    id: "bonding_jumper_parallel", name: "Bonding Jumper — Parallel",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 250.102(C)(1)", desc: "Total CM = per-conductor CM × parallel sets", changed: false, source: DEV },
    ],
    sourceNotes: "Parallel set methodology: sum CM areas, then enter Table 250.102(C)(1). See MBJ entry.",
    testInputs: { size: "250", material: "copper", parallelSets: 3 },
    calculate: (i, nec) => {
      const cm = (nec.CONDUCTOR_CM[i.size] || 250000) * i.parallelSets;
      const table = i.material === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
      return { totalCM: cm, size: table.find(r => cm <= r.cm)?.size || "N/A" };
    },
  },
  {
    id: "supplemental_grounding_electrode", name: "Supplemental Grounding Electrode",
    category: "Grounding / Bonding", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "250.53(A)(2)", desc: "Supplemental electrode if >25Ω", changed: false, source: DEV },
      { ref: "Table 250.66", desc: "GEC sizing", changed: false, source: DEV },
    ],
    sourceNotes: "Supplemental electrode requirement and sizing delegation to Table 250.66. See GEC Sizing entry.",
    testInputs: { serviceConductor: "2/0", material: "copper" },
    calculate: (i, nec) => {
      const cm = nec.CONDUCTOR_CM[i.serviceConductor] || 0;
      const row = nec.GEC_TABLE.find(r => cm <= r.maxCM);
      return { cm, size: row ? row[i.material] : "N/A" };
    },
  },
  {
    id: "overcurrent_protection", name: "Overcurrent Protection (240)",
    category: "Wire / Conduit / Sizing", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "240.4", desc: "Next standard size up (≤800A)", changed: false, source: DEV },
      { ref: "240.4(D)", desc: "Small conductor limits: 14=15A, 12=20A, 10=30A", changed: false, source: DEV, note: "Each size limit needs verification." },
      { ref: "210.20(A)", desc: "Continuous load OCPD — 125%", changed: false, source: DEV },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "240.67", desc: "Arc energy reduction — fuses ≥1200A", changed: true, source: PEND, note: "2020: new requirement for fuses rated 1200A+. Displayed in NoteBox / result section." },
      { ref: "240.87", desc: "Arc energy reduction — circuit breakers ≥1200A", changed: true, source: PEND, note: "2020: new requirement for circuit breakers rated 1200A+. Displayed in NoteBox / result section." },
    ],
    sourceNotes: "Core OCPD rules: next-size-up allowance, small conductor limits, 125% continuous rule. Each needs independent verification. 240.67/240.87 arc energy reduction added in 2020 per Eaton PDF.",
    testInputs: { conductorA: 65, continuousPct: 100 },
    calculate: (i, nec) => { return { ocpd: nec.STD_OCPD_SIZES.find(s => s >= i.conductorA) || 100 }; },
  },

  // ═══ SPECIAL OCCUPANCY LOADS ═════════════════════════════════════════════
  {
    id: "rv_park_load", name: "RV Park Load (551.73)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: true,
    articles: [
      { ref: "551.73(A)", desc: "Site VA by highest-rated receptacle; Table 551.73(A) demand by site count", changed: false, source: N17 },
      { ref: "Table 551.73(A)", desc: "1 site 100% through 36 plus 41%", changed: false, source: N17 },
      { ref: "551.71", desc: "RV park site receptacle ratings (20A/30A/50A)", changed: false, source: DEV },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: DEV },
      { ref: "250.122", desc: "EGC sizing by OCPD", changed: false, source: DEV },
      { ref: "Table 310.15(B)(16)", desc: "Conductor ampacities", changed: false, source: DEV },
    ],
    sourceNotes: "2017 Table 551.73(A) gated in year data. Amenities added after demand. Conductor/EGC/VD reuse other engines.",
    testInputs: { sites20A: 10, sites30A: 20, sites50A: 5, voltage: "240", phases: "single", additionalLoads: [{ name: "Office", va: 5000 }, { name: "Bathhouse", va: 2000 }, { name: "Laundry", va: 3000 }], material: "copper", tempRating: "75", length: 0, maxVD: "3" },
    calculate: (i, nec) => {
      const r = calcRVParkLoad(i, nec);
      return { totalConnectedVA: r.totalConnectedRV, demandFactorPct: r.demandFactorPct, totalServiceVA: r.totalServiceVA, totalA: r.totalA, minService: r.minService };
    },
  },
  {
    id: "marina_shore_power", name: "Marina Shore Power (555.12)",
    category: "Load Calculations", usesGetNecData: true, yearSensitive: false,
    articles: [
      { ref: "Table 555.12", desc: "Marina shore power demand factors (2017); renumbered Table 555.6 in 2020; moved to Table 220.120 in 2023", changed: true, source: PENDING_CODEBOOK, yearRefs: { "2017": "Table 555.12", "2020": "Table 555.6", "2023": "Table 220.120", "2026": "Table 220.120 (pending)" }, note: "Demand factors by number of shore power receptacles. Read from centralized necTables.js. VALUES unchanged across editions but section number reorganized: 2017=Table 555.12, 2020=Table 555.6, 2023=Table 220.120 (moved to Article 220). 2026 status: unverified. Needs per-year codebook verification of both values AND section numbers." },
      { ref: "555.11", desc: "Marina shore power receptacle ratings — 30A minimum, pin-and-sleeve for 60A+ (2017); renumbered in 2020/2023", changed: true, source: PENDING_CODEBOOK, yearRefs: { "2017": "555.11", "2020": "555.11 (renumbered — verify)", "2023": "555.11 (renumbered — verify)", "2026": "pending" }, note: "Receptacle ratings: 20A/30A/50A/60A/100A/custom. Section number may have changed in 2020 reorganization. Needs per-year codebook verification." },
      { ref: "240.6(A)", desc: "Standard OCPD sizes", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by all production calculators." },
      { ref: "250.122", desc: "EGC sizing by OCPD", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by EGC Sizing calculator." },
      { ref: "Table 310.15(B)(16)", desc: "Conductor ampacities", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by Conductor Ampacity calculator." },
      { ref: "450.3(B)", desc: "Transformer OCPD sizing (optional transformer mode)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by Transformer Sizing calculator." },
      { ref: "430.22(A)", desc: "Motor branch circuit conductor sizing (motor loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from shared.js — same data used by Motor Branch Circuit calculator." },
      { ref: "Table 430.250", desc: "3-phase motor FLC (motor loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by Motor calculators." },
      { ref: "Table 430.248", desc: "1-phase motor FLC (motor loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by Motor calculators." },
      { ref: "440.6", desc: "HVAC conductor ampacity (HVAC loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from shared.js — same data used by HVAC Load calculator." },
      { ref: "440.22", desc: "HVAC OCPD sizing (HVAC loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by HVAC Load calculator." },
      { ref: "220.12", desc: "Lighting load unit loads by occupancy (lighting loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by Lighting/Commercial calculators." },
      { ref: "220.42", desc: "Lighting demand factors (lighting loads)", changed: false, source: INHERITED_VERIFIED, note: "Inherited from centralized necTables.js — same data used by Lighting calculators." },
      { ref: "210.19", desc: "Voltage drop — Informational Note recommendation (NOT mandatory)", changed: false, source: PENDING_CODEBOOK, note: "NEC Informational Note (formerly Fine Print Note) — 3% branch circuit VD is a RECOMMENDATION, not a mandatory requirement. Needs codebook verification of exact text in each edition." },
      { ref: "215.2", desc: "Feeder voltage drop — Informational Note recommendation (NOT mandatory)", changed: false, source: PENDING_CODEBOOK, note: "NEC Informational Note — 3% feeder VD is a RECOMMENDATION, not a mandatory requirement. Combined branch+feeder 5% is also informational. Needs codebook verification." },
    ],
    sourceNotes: "Marina shore power demand factors from centralized necTables.js (single source of truth). Article 555 was REORGANIZED across editions: 2017=Table 555.12, 2020=Table 555.6 (renumbered), 2023=Table 220.120 (moved to Article 220, section 555.6 now references 220.120). Demand factor VALUES are unchanged across editions but section numbers differ. 2026 status: UNVERIFIED — year-switch test does NOT make 2026 rules verified. Voltage drop 3%/5% limits are NEC Informational Notes (recommendations), NOT mandatory requirements. Reuses voltage drop, EGC, conductor ampacity, transformer sizing, motor/HVAC/lighting calc engines, and phase balancing. Additional loads calculated using existing production calculators. Table 555.12 row selection is based on total receptacle COUNT (NEC-defined treatment), not input rows — multiple receptacles at one slip count as multiple receptacles per Table 555.12 Notes 1 & 2.",
    testInputs: {
      receptacles: [
        { id: "r1", rating: "30A", quantity: 10, slip: "Slips 1-10", feeder: "Feeder 1", panel: "Panel A" },
        { id: "r2", rating: "50A", quantity: 5, slip: "Slips 11-15", feeder: "Feeder 1", panel: "Panel A" },
        { id: "r3", rating: "100A", quantity: 2, slip: "Slips 16-17", feeder: "Feeder 2", panel: "Panel B" },
      ],
      additionalLoads: [
        { id: "l1", type: "office", va: 5000 },
        { id: "l2", type: "lighting", va: 2000 },
        { id: "l3", type: "pump_out", va: 2000 },
      ],
      voltage: "208", phases: "three", material: "copper", tempRating: "75", length: 150, maxVD: "3",
      transformerEnabled: false, phaseMode: "auto",
    },
    calculate: (i, nec) => {
      const PRESETS = { "20A":{a:20,v:120}, "30A":{a:30,v:120}, "50A":{a:50,v:240}, "60A":{a:60,v:240}, "100A":{a:100,v:240} };
      const recs = (i.receptacles||[]).filter(r => (parseInt(r.quantity)||0) > 0);
      let tc = 0, nr = 0;
      for (const r of recs) {
        let a, v;
        if (r.rating === "custom") { a = parseFloat(r.customAmps)||0; v = parseFloat(r.customVoltage)||120; }
        else { const p = PRESETS[r.rating]||PRESETS["30A"]; a = p.a; v = p.v; }
        tc += a * v * (parseInt(r.quantity)||0); nr += parseInt(r.quantity)||0;
      }
      const add = (i.additionalLoads||[]).reduce((s,l)=>s+(parseFloat(l.va)||0),0);
      // demand factor from Table 555.12
      const df = nr<=4?1.0: nr<=8?0.9: nr<=14?0.8: nr<=30?0.7: nr<=40?0.6: nr<=50?0.5: nr<=70?0.4: 0.3;
      const dl = Math.round(tc * df);
      const tsv = dl + add;
      const V = parseFloat(i.voltage)||208, f = i.phases==="three"?1.732:1;
      const I = tsv/(V*f);
      return { totalConnectedVA: tc, totalServiceVA: tsv, totalA: +I.toFixed(1), minService: nec.STD_OCPD_SIZES.filter(s=>s>=100).find(s=>s>=I)||1200 };
    },
  },

  // ═══ PURE MATH / NO NEC ══════════════════════════════════════════════════
  { id: "power_factor", name: "Power Factor Correction", category: "Power Calculations", usesGetNecData: true, yearSensitive: false, articles: [{ ref: "460.8", desc: "Capacitor conductor — 135% of rated current", changed: false, source: DEV }], sourceNotes: "One NEC reference: 460.8 capacitor conductor sizing. Pure trig otherwise." },
  { id: "three_phase_power", name: "Three-Phase Power", category: "Power Calculations", usesGetNecData: false, yearSensitive: false, articles: [], sourceNotes: "Pure electrical formulas. No NEC data consumed." },
  { id: "single_phase_power", name: "Single-Phase Power", category: "Power Calculations", usesGetNecData: false, yearSensitive: false, articles: [], sourceNotes: "Pure electrical formulas. No NEC data consumed." },
  { id: "short_circuit", name: "Short Circuit Current", category: "Others", usesGetNecData: false, yearSensitive: false, articles: [], sourceNotes: "Pure engineering math. No NEC data consumed." },
  { id: "multiwire_branch", name: "Multiwire Branch Circuits", category: "Others", usesGetNecData: false, yearSensitive: false, articles: [], sourceNotes: "Circuit analysis. No NEC data consumed." },

  // ═══ PULL BOX SIZING ═══════════════════════════════════════════════════
  {
    id: "pull_box_sizing", name: "Pull Box Sizing (314.28)",
    category: "Boxes & Raceways", usesGetNecData: false, yearSensitive: false,
    articles: [
      { ref: "314.28", desc: "Pull and junction box sizing — scope (conductors 4 AWG and larger)", changed: false, source: PEND, note: "2020 NEC primary source. Applies to conductors 4 AWG and larger, NOT based on box volume. Pending verification against authorized NFPA 70-2020." },
      { ref: "314.28(A)", desc: "General — minimum size requirements per pull type", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
      { ref: "314.28(A)(1)", desc: "Straight pulls — 8× largest raceway", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
      { ref: "314.28(A)(2)", desc: "Angle/U pulls — 6× largest in row + sum of additional in same row; same-row spacing = 6× largest in row", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
      { ref: "314.28(B)", desc: "Splices — 314.16 fill applicability depends on conductor size and installation", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020. NOT automatically required for every splice." },
    ],
    sourceNotes: "VERIFIED WITH LIMITATIONS. All 9 previously identified defects corrected and verified per user review: (1) applicability based on conductor size 4 AWG+, (2) 314.28(C) universal 4×4×2 minimum removed, (3) spacing uses 6× largest raceway, (4) equal-sized raceways included in 'additional' sum, (5) single raceway requires path mapping, (6) conductor-path mapping added, (7) row identification added, (8) splice 314.16 applicability conditional, (9) spacing only between connected entries. All 20 regression tests pass with independent expected values (TEST-A through TEST-G). NEC article sources pending verification against authorized 2020 NFPA 70 text.",
    testInputs: { conductorSize: "4", raceways: [{ id: "r1", size: "3", wall: "left", row: "1" }, { id: "r2", size: "3", wall: "right", row: "1" }], paths: [{ id: "p1", entryA: "r1", entryB: "r2", type: "auto" }] },
    calculate: (i, nec) => {
      const SIZES = { "1/2":0.5, "3/4":0.75, "1":1, "1-1/4":1.25, "1-1/2":1.5, "2":2, "2-1/2":2.5, "3":3, "3-1/2":3.5, "4":4, "5":5, "6":6 };
      const RANK = { "14":1,"12":2,"10":3,"8":4,"6":5,"4":6,"3":7,"2":8,"1":9,"1/0":10,"2/0":11,"3/0":12,"4/0":13 };
      const applicable = (RANK[i.conductorSize]||0) >= 6;
      const rs = (i.raceways||[]).map(r => ({ ...r, inches: SIZES[r.size]||0, row: r.row||"1" })).filter(r => r.inches > 0);
      if (rs.length === 0) return { minX: 0, minY: 0, applicable };
      const byWallRow = {};
      rs.forEach(r => { if (!byWallRow[r.wall]) byWallRow[r.wall]={}; if (!byWallRow[r.wall][r.row]) byWallRow[r.wall][r.row]=[]; byWallRow[r.wall][r.row].push(r); });
      const OPP = { top:"bottom", bottom:"top", left:"right", right:"left" };
      let minX = 0, minY = 0;
      for (const p of (i.paths||[])) {
        const a = rs.find(r => r.id === p.entryA), b = rs.find(r => r.id === p.entryB);
        if (!a) continue;
        let type = p.type;
        if (type === "auto") { if (!b) type = "splice"; else if (a.wall === b.wall) type = "u"; else if (OPP[a.wall] === b.wall) type = "straight"; else type = "angle"; }
        if (type === "straight") {
          const lg = Math.max(a.inches, b.inches), req = 8*lg, horiz = a.wall==="left"||a.wall==="right";
          if (horiz) minX = Math.max(minX, req); else minY = Math.max(minY, req);
        } else {
          for (const e of (b ? [a,b] : [a])) {
            const row = byWallRow[e.wall]?.[e.row] || [e];
            const sorted = row.map(r=>r.inches).sort((x,y)=>y-x);
            const req = 6*sorted[0] + sorted.slice(1).reduce((s,v)=>s+v,0);
            if (e.wall==="left"||e.wall==="right") minX = Math.max(minX, req); else minY = Math.max(minY, req);
          }
        }
      }
      return { minX: Math.round(minX*100)/100, minY: Math.round(minY*100)/100, applicable };
    },
  },

  // ═══ NEUTRAL LOAD ═══════════════════════════════════════════════════
  {
    id: "neutral_load", name: "Neutral Load (220.61)",
    category: "Load Calculations", usesGetNecData: false, yearSensitive: false,
    articles: [
      { ref: "220.61", desc: "Feeder or service neutral load — scope", changed: false, source: PEND, note: "2020 NEC primary source. Pending verification against authorized NFPA 70-2020." },
      { ref: "220.61(A)", desc: "Basic calculation — maximum unbalanced load", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
      { ref: "220.61(B)(1)", desc: "Permitted reduction — cooking/dryer at 70%", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
      { ref: "220.61(B)(2)", desc: "Permitted reduction — excess over 200A at 70%", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
      { ref: "220.61(C)", desc: "Prohibited reductions — nonlinear loads on 3φ 4W wye", changed: false, source: PEND, note: "Pending verification against authorized NFPA 70-2020." },
    ],
    sourceNotes: "DEFECT CORRECTED — ADDITIONAL DEFECT FOUND. v3 redesign: (1) Arithmetic sum of fundamental + harmonic REMOVED. Final neutral amperes now combined via root-sum-square (RSS) for harmonic-only inputs, or taken directly for total-RMS inputs. (2) Neutral study input distinguishes FOUR value types: A. Total neutral RMS current (includes fundamental), B. Harmonic-only neutral RMS current, C. Individual harmonic spectrum (UNSUPPORTED), D. Measured total neutral RMS current. (3) Four concepts distinguished: NEC-calculated maximum unbalanced fundamental load (220.61(A)), NEC-permitted neutral demand reduction (220.61(B)), externally determined harmonic neutral current (NOT a 220.61 formula), final conductor design current (RMS combination). (4) Range/dryer trace shows: appliance demand, permitted %, neutral portion, system type, connection, assigned legs, incorporation method (scalar vs. phase-total), resulting maximum unbalanced neutral load. (5) 220.61(A) NOT described as 'vector-sum formula' — supplies maximum unbalanced load calculation. 220.61(C) NOT described as harmonic-sizing formula — prohibits reduction. (6) Tests NL-H replaced with NL-H1 (harmonic-only RSS) and NL-H2 (total RMS direct). NL-H2 replaced with NL-H2a (harmonic-only + excess RSS) and NL-H2b (total RMS + excess). Range/dryer tests NL-RD1 through NL-RD8 added. NEC article sources pending verification against authorized 2020 NFPA 70 text.",
    testInputs: { systemType: "1φ-3W 120/240V", loads: [{ id: "l1", type: "linear_ln", va: 10000, phase: "L1" }, { id: "l2", type: "linear_ln", va: 5000, phase: "L2" }], neutralStudy: { valueType: "", source: "", totalRmsA: "", harmonicOnlyRmsA: "" } },
    calculate: (i, nec) => {
      const SYS = {
        "1φ-3W 120/240V": { v: 120, is3ph: false, phases: ["L1", "L2"] },
        "3φ-4W 208Y/120V": { v: 120, is3ph: true, phases: ["L1", "L2", "L3"] },
        "3φ-4W 480Y/277V": { v: 277, is3ph: true, phases: ["L1", "L2", "L3"] },
      };
      const sys = SYS[i.systemType] || SYS["1φ-3W 120/240V"];
      const V = sys.v, SQRT3_2 = Math.sqrt(3) / 2;
      const loads = (i.loads || []).filter(l => l.va > 0);
      const redLin = { L1: 0, L2: 0, L3: 0 };
      const nonredLin = { L1: 0, L2: 0, L3: 0 };
      let rdScalar = 0;
      for (const l of loads) {
        const t = l.type || "linear_ln", p = l.phase || "L1", va = Math.max(0, parseFloat(l.va) || 0);
        if (va <= 0) continue;
        const legs = p.split("-").filter(x => x.startsWith("L"));
        if (t === "linear_ln" || t === "other_reducible") {
          if (legs.length === 1 && (legs[0] === "L1" || legs[0] === "L2" || legs[0] === "L3")) redLin[legs[0]] += va;
        } else if (t === "nonreducible") {
          if (legs.length === 1 && (legs[0] === "L1" || legs[0] === "L2" || legs[0] === "L3")) nonredLin[legs[0]] += va;
        } else if (t === "range_dryer") {
          const neutral = va * 0.70 * (Math.max(1, parseInt(l.count) || 1));
          if (legs.length === 1 && (legs[0] === "L1" || legs[0] === "L2" || legs[0] === "L3")) redLin[legs[0]] += neutral;
          else rdScalar += neutral;
        }
      }
      const vecNet = (ph) => {
        const l1 = ph.L1 || 0, l2 = ph.L2 || 0, l3 = ph.L3 || 0;
        if (sys.is3ph) {
          const i1 = l1 / V, i2 = l2 / V, i3 = l3 / V;
          const real = i1 - 0.5 * i2 - 0.5 * i3, imag = SQRT3_2 * (i3 - i2);
          return Math.sqrt(real * real + imag * imag) * V;
        }
        return Math.abs(l1 - l2);
      };
      const redLinNet = vecNet(redLin) + rdScalar;
      const nonredLinNet = vecNet(nonredLin);
      const redAmps = redLinNet / V;
      let reducedVA = redLinNet;
      if (redAmps > 200) { reducedVA = (200 + (redAmps - 200) * 0.70) * V; }
      const necFundA = (reducedVA + nonredLinNet) / V;
      const ns = i.neutralStudy || {};
      const vt = ns.valueType || "";
      let finalA;
      if (vt === "total_rms" || vt === "measured_total_rms") {
        finalA = Math.max(0, parseFloat(ns.totalRmsA) || 0);
      } else if (vt === "harmonic_only_rms") {
        const h = Math.max(0, parseFloat(ns.harmonicOnlyRmsA) || 0);
        finalA = Math.sqrt(necFundA * necFundA + h * h);
      } else {
        finalA = necFundA;
      }
      return { finalNeutral_VA: Math.round(finalA * V), finalNeutral_A: Math.round(finalA * 100) / 100 };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// NEC CHANGE LOG — 2017 → 2020
// Each entry documents a verified or pending code-cycle change,
// which calculator(s) it affects, and its current source/review status.
// ═══════════════════════════════════════════════════════════════════════════

export const NEC_CHANGE_LOG = [
  {
    id: "cl_230_85",
    article: "230.85",
    title: "Outdoor Emergency Disconnect — 1- and 2-Family Dwellings",
    cycle: "2017→2020",
    affectedCalcs: ["dwelling_standard", "dwelling_optional", "ev_charging"],
    value2017: "Not required",
    value2020: "Required — readily accessible outdoor disconnect for one- and two-family dwellings",
    verificationStatus: "pending_manual_review",
    sourceStatus: PEND,
    notes: "Displayed dynamically in NoteBox of affected calculators. No numeric output change.",
  },
  {
    id: "cl_230_67",
    article: "230.67",
    title: "Surge Protective Device (SPD) — Dwelling Unit Services",
    cycle: "2020→2023",
    affectedCalcs: ["dwelling_standard", "dwelling_optional", "ev_charging"],
    value2017: "Not required",
    value2020: "Not required",
    value2023: "Required — Type 1 or Type 2 SPD for dwelling unit services",
    verificationStatus: "pending_manual_review",
    sourceStatus: PEND,
    notes: "First appeared in 2023. Displayed dynamically in NoteBox. No numeric output change.",
  },
  {
    id: "cl_210_8a",
    article: "210.8(A)",
    title: "GFCI Protection Scope — Dwelling Receptacles",
    cycle: "2017→2020",
    affectedCalcs: ["dwelling_standard", "dwelling_optional", "receptacle_load"],
    value2017: "125V, 15/20A receptacles in bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchen within 6 ft of sink, boathouses",
    value2020: "EXPANDED: 125V–250V, 15/20/30A receptacles; ALL kitchen receptacles (not just near sink); laundry areas added; broader basement coverage",
    verificationStatus: "pending_manual_review",
    sourceStatus: PEND,
    notes: "Scope description stored per year in GFCI_SCOPE_DWELLING. Displayed in NoteBox. No numeric output change.",
  },
  {
    id: "cl_625_54",
    article: "625.54",
    title: "GFCI Protection — EVSE (EV Charging)",
    cycle: "2017→2020",
    affectedCalcs: ["ev_charging"],
    value2017: "Not required for EVSE installations",
    value2020: "Required — GFCI protection for Level 1 and Level 2 EVSE outlet and hardwired installations",
    verificationStatus: "pending_manual_review",
    sourceStatus: PEND,
    notes: "Boolean field EV_GFCI_REQUIRED in year files. Displayed in EVCharging result section and NoteBox.",
  },
  {
    id: "cl_210_52c",
    article: "210.52(C)",
    title: "Island and Peninsula Receptacle Requirement",
    cycle: "2017→2020",
    affectedCalcs: ["dwelling_standard", "dwelling_optional", "receptacle_load"],
    value2017: "At least 1 receptacle required for islands/peninsulas ≥12 sq ft countertop area and ≥12 in. wide. May be supplied from countertop, wall, or base cabinet.",
    value2020: "CHANGED: Required for ALL islands/peninsulas regardless of area. Below-counter and pop-up-style receptacles now permitted (previously disallowed). Removable supply cord exception added.",
    verificationStatus: "pending_manual_review",
    sourceStatus: PEND,
    notes: "Description stored per year in ISLAND_PENINSULA_RULE. Displayed in NoteBox of dwelling and receptacle calculators.",
  },
];