/**
 * NEC 2020 override layer.
 * Baseline: data/nec/2017.js — only changed fields are declared here.
 * Source: Eaton 2020 NEC Code Changes brochure + Mike Holt 2020 NEC Code Change
 * Summary + ElectricalLicenseRenewal.com side-by-side 2017/2020 code text
 * + IAEI/Leviton "Captain Code 2020 NEC Code Changes" guide (reprints actual
 * NFPA 70-2020 text + IAEI expert analysis — used for 210.8(B) verification).
 * (secondary/change-digest sources — NOT a full NFPA 70-2020 codebook cross-check).
 *
 * Verification status:
 *   - Every constant below is still "ai_reviewed_pending_human_approval" — see
 *     CHANGE_METADATA for per-entry status. Nothing here is FULL_CODEBOOK_VERIFIED.
 *   - Do NOT flip VERIFIED to true until every CHANGE_METADATA entry has
 *     verification_status "verified" AND the calculators listed under
 *     affected_calculators have passed: 2017 immutability tests, 2020 change
 *     tests, step-by-step math validation, Calculation Trace validation, and
 *     Testing Agent validation.
 *
 * CORRECTIONS APPLIED (per audit request):
 *   - 240.67/240.87: NEITHER is new in 2020. 240.87 (breakers) existed since the
 *     2014 NEC; 240.67 (fuses) was added in the 2017 NEC. The 1200A threshold is
 *     unchanged 2017→2020. What actually changed in 2020 is documentation and
 *     the wording of 240.87(B) — see ARC_ENERGY_REDUCTION_NOTE below.
 *   - 680.21(C)/(D): GFCI for pool pump motors is NOT new in 2020 — 2017's
 *     680.21(C) already required it for single-phase 120–240V motors. The 2020
 *     change is a SCOPE EXPANSION of (C) to cover all pool pump motors
 *     (single- or 3-phase, ≤150V to ground, ≤60A) plus a new Class A GFCI
 *     designation. The genuinely NEW-in-2020 item is 680.21(D) — replacement
 *     pool pump motors must get GFCI even if the original installation predated
 *     the requirement.
 *
 * Articles changed in 2020 (vs 2017) — see CHANGE_METADATA for full detail on each:
 *   210.8(A)      Dwelling GFCI — voltage range expanded, new locations added
 *   210.8(B)      Other-than-dwelling GFCI — coverage expanded
 *   210.8(D)      Specific appliances GFCI
 *   210.8(E)      GFCI for equipment-servicing receptacles (new)
 *   210.8(F)      GFCI for outdoor outlets ≤50A (new)
 *   210.52(C)(2)  Island/peninsula sq-footage rule replaces area-threshold rule
 *   210.52(G)     Garage/basement receptacle rule expanded to multifamily
 *   230.67        Dwelling SPD now required (Type 1 or Type 2)
 *   230.85        Emergency outdoor disconnect for 1- and 2-family dwellings
 *   240.67/240.87 Arc energy reduction — pre-existing rule; 2020 revised
 *                 documentation duty + prohibited "temporary" trip adjustment
 *   406.4(D)(4)   Receptacle replacement AFCI
 *   406.9(C)      Bathtub/shower damp/wet receptacle rule
 *   406.12        Tamper-resistant receptacle expansion
 *   422.5         Dishwashers and sump pumps added to appliance GFCI list
 *   625.54        EV supply equipment GFCI (new in 2020)
 *   680.21(C)     Pool pump motor GFCI — scope expanded to all phase configs (pre-existing rule, expanded)
 *   680.21(D)     Pool pump motor replacement GFCI (new in 2020)
 *
 * CORRECTION (2nd audit pass) — Table 220.12 IS implemented below with the
 * non-dwelling occupancy values that could be confirmed from multiple
 * secondary sources (Mike Holt / Eaton). Rows without a confirmed source are
 * intentionally left at their inherited 2017 value — see PENDING_IMPACT_LIST.
 *
 * CORRECTION — 220.14(K) (office/bank receptacle load = larger of 180VA/yoke
 * after demand OR 1 VA/sq ft) is NOT a 2020 rule — it already existed in the
 * 2017 NEC. It is NOT added here. It is a pre-existing coverage gap in BOTH
 * 2017 and 2020 (Receptacle Load calculator has no occupancy-aware branch at
 * all) — see PENDING_IMPACT_LIST. Do not add this only to 2020.js.
 *
 * PENDING — NOT modeled here, still under review (see PENDING_IMPACT_LIST
 * export at the bottom of this file for full detail). Do not assume this file
 * is exhaustive; these remain open:
 *   Table 220.12  Several occupancy rows (office, store, school, restaurant,
 *                 church, industrial, warehouse) have no confirmed 2020 source
 *                 value yet — left at inherited 2017 value, NOT verified equal.
 *   Article 310   310.12 restructuring (single-phase dwelling service/feeder
 *                 83% rule + Table 310.12, ex-310.15(B)(7)); Article 311
 *                 medium-voltage relocation. Preliminary read: value-neutral
 *                 renumbering, but service_sizing calculator outputs have not
 *                 been tested against it yet — classification is PENDING, not
 *                 "display only".
 *   250.122(B)    Wording revised ("for any reason" + new qualified-person
 *                 exception) — app's EGC calculator doesn't implement the
 *                 increased-size/upsizing logic at all yet, so no production
 *                 formula is affected today, but the rule itself needs full
 *                 side-by-side documentation before any implementation.
 *   690 / 705     Full field-by-field audit of Solar PV calculator pending —
 *                 do not assume 120%/125% multipliers or rapid-shutdown logic
 *                 are unchanged merely because current 2017 output matches.
 */

import {
  RANGE_DEMAND as _RANGE_DEMAND,
  DRYER_DEMAND as _DRYER_DEMAND,
  DWELLING_DEMAND_TABLE as _DWELLING_DEMAND_TABLE,
  EGC_TABLE as _EGC_TABLE,
  RECEPTACLE_DEMAND_TIERS as _RECEPTACLE_DEMAND_TIERS,
  WELDER_DUTY_CYCLE_TABLE as _WELDER_DUTY_CYCLE_TABLE,
} from "./shared";

export const NEC_YEAR = "2020";

// Table 250.122 changed in 2020 for aluminum/copper-clad aluminum EGCs at
// 5000A and 6000A: 1200 kcmil is no longer sufficient; use 1250 kcmil.
export const EGC_TABLE = _EGC_TABLE.map((row) =>
  row.ocpd === 5000 || row.ocpd === 6000
    ? { ...row, aluminum: "1250" }
    : row
);

export const RANGE_DEMAND_ARTICLE = "Table 220.60";

// ─── Service Minimums ────────────────────────────────────────────────
export const DWELLING_MIN_SERVICE_AMPS = 100;  // 230.42(B) — unchanged 2017–2026

// ─────────────────────────────────────────────────────────────────────────────
// 210.8(A) — Dwelling Unit GFCI
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// Changes from 2017:
//   • Voltage expanded from 125V only → 125V through 250V, single-phase circuits
//     rated 150V or less to ground (covers 240V/250V 2-pole receptacles)
//   • "Unfinished portions of basements" → all basements (finished or not)
//   • Indoor damp/wet dwelling locations added
//   • Laundry areas added
// ─────────────────────────────────────────────────────────────────────────────
export const GFCI_SCOPE_DWELLING =
  "125V–250V receptacles on single-phase circuits rated 150V or less to ground (15A/20A) in: " +
  "bathrooms, garages, outdoors, crawl spaces, basements (finished and unfinished), " +
  "kitchen countertops, laundry areas, indoor damp/wet locations, boathouses. " +
  "NEC 210.8(A) — 2020 override (voltage range & locations expanded from 2017).";

// ─────────────────────────────────────────────────────────────────────────────
// 210.8(B) — Other-Than-Dwelling GFCI
// 2020 override — verified against the IAEI/Leviton "Captain Code 2020 NEC
// Code Changes" guide (pp. 18–21), a secondary change guide. The guide
// reprints NEC text for educational analysis; this project has NOT verified
// the wording directly against the authorized NFPA 70-2020 source.
//
// 2020 NEC 210.8(B) text (as reprinted in the Captain Code guide):
//   "All single-phase 125-volt through 250-volt receptacles supplied by
//   single-phase branch circuits rated 150 volts or less to ground, 50 amperes
//   or less and all receptacles supplied by three-phase branch circuits rated
//   150 volts or less to ground, 100 amperes or less installed in the
//   following locations specified in 210.8(B)(1) through (B)(12) shall have
//   ground-fault circuit-interrupter protection for personnel."
//
// The 12 locations (2020 NEC 210.8(B)(1)–(B)(12)):
//   (1)  Bathrooms
//   (2)  Kitchens or areas with a sink and permanent provisions for either
//        food preparation or cooking
//   (3)  Rooftops
//   (4)  Outdoors
//   (5)  Sinks — receptacles within 1.8 m (6 ft) of the top inside edge of the
//        bowl of the sink
//   (6)  Indoor damp and wet locations
//   (7)  Locker rooms with associated showering facilities
//   (8)  Garages, accessory buildings, service bays, and similar areas other
//        than vehicle exhibition halls and showrooms
//   (9)  Crawl spaces — at or below grade level
//   (10) Unfinished portions or areas of the basements not intended as
//        habitable rooms
//   (11) Laundry areas
//   (12) Bathtubs and shower stalls — receptacles within 1.8 m (6 ft) of the
//        outside edge of the bathtub or shower stall
//
// Exception to (1)–(5), (8), and (10): Listed locking support and mounting
// receptacles utilized in combination with compatible attachment fittings
// installed for the purpose of serving a ceiling luminaire or ceiling fan
// shall not be required to be GFCI-protected. If a general-purpose convenience
// receptacle is integral to the ceiling luminaire or ceiling fan, GFCI
// protection shall be provided.
//
// Changes from 2017 (per Captain Code expert analysis):
//   • Single-phase receptacle voltage range widened from 125V only → 125V
//     through 250V (circuits still ≤150V to ground, ≤50A)
//   • Three-phase coverage unchanged from 2017 (≤150V to ground, ≤100A) —
//     already existed, NOT new in 2020
//   • (2) expanded: "kitchens" → "kitchens or areas with a sink and permanent
//     provisions for either food preparation or cooking" (covers ice cream
//     parlors, coffee shops, yogurt/smoothie stores, etc.)
//   • (6) expanded: indoor "wet" → indoor "damp and wet" locations
//   • (8) expanded: "garages, service bays" → "garages, accessory buildings,
//     service bays, and similar areas"
//   • (11) laundry areas — NEW in 2020
//   • (12) bathtubs/shower stalls (within 6 ft) — NEW in 2020
//   • Exception for listed locking support/mounting receptacles — NEW in 2020
//
// CORRECTION from previous version: "boathouses" was incorrectly listed —
// boathouses appear in 210.8(A) dwelling units, NOT 210.8(B) other-than-
// dwelling. Sinks (5) and locker rooms with showering facilities (7) were
// missing. Three-phase coverage and amperage limits were missing.
// ─────────────────────────────────────────────────────────────────────────────
export const GFCI_SCOPE_OTHER_THAN_DWELLING =
  "Single-phase 125V–250V receptacles on circuits rated ≤150V to ground, ≤50A; " +
  "three-phase receptacles on circuits rated ≤150V to ground, ≤100A. " +
  "GFCI required in: (1) bathrooms, (2) kitchens or areas with a sink and permanent " +
  "provisions for food preparation/cooking, (3) rooftops, (4) outdoors, (5) sinks " +
  "(receptacles within 6 ft of the bowl), (6) indoor damp and wet locations, " +
  "(7) locker rooms with associated showering facilities, (8) garages, accessory " +
  "buildings, service bays, and similar areas, (9) crawl spaces at or below grade, " +
  "(10) unfinished portions/areas of basements not intended as habitable rooms, " +
  "(11) laundry areas, (12) bathtubs/shower stalls (receptacles within 6 ft). " +
  "Exception to (1)–(5), (8), (10): listed locking support/mounting receptacles for " +
  "ceiling luminaires/fans exempted (unless integral convenience receptacle). " +
  "NEC 210.8(B) — 2020 override (voltage range and locations expanded from 2017). " +
  "Source: Captain Code 2020 change guide (secondary); pending official NFPA 70-2020 verification.";

// ─────────────────────────────────────────────────────────────────────────────
// 210.8(B) — STRUCTURED RULE DATA (2020)
// Machine-readable documentation form of the rule above. This is structured
// documentation/audit/trace data — NOT consumed by any active calculator.
// No calculator currently evaluates 210.8(B) compliance. Source: Verified
// against the Captain Code 2020 change guide (secondary source); pending
// verification against the authorized NFPA 70-2020 source.
// ─────────────────────────────────────────────────────────────────────────────
export const GFCI_210_8B_RULE = {
  singlePhase: {
    minVolts: 125,
    maxVolts: 250,        // 2020: 125V–250V (was 125V only in 2017)
    maxVoltsToGround: 150,
    maxAmps: 50,          // 2020: ≤50A (was 15/20A only in 2017)
    applies: true,
  },
  threePhase: {
    included: true,       // 2020: three-phase covered (was NOT covered in 2017)
    maxVoltsToGround: 150,
    maxAmps: 100,         // 2020: ≤100A
  },
  locations: [
    { id: "bathroom", label: "Bathrooms" },
    { id: "kitchen_or_food_prep", label: "Kitchens or areas with a sink and permanent provisions for food preparation/cooking" },
    { id: "rooftop", label: "Rooftops" },
    { id: "outdoor", label: "Outdoors" },
    { id: "sink", label: "Sinks — receptacles within 6 ft of the bowl", maxDistanceFt: 6 },
    { id: "indoor_damp_wet", label: "Indoor damp and wet locations" },
    { id: "locker_room_shower", label: "Locker rooms with associated showering facilities" },
    { id: "garage_accessory", label: "Garages, accessory buildings, service bays, and similar areas" },
    { id: "crawl_space", label: "Crawl spaces — at or below grade level" },
    { id: "unfinished_basement", label: "Unfinished portions or areas of basements not intended as habitable rooms" },
    { id: "laundry", label: "Laundry areas" },
    { id: "bathtub_shower", label: "Bathtubs and shower stalls — receptacles within 6 ft", maxDistanceFt: 6 },
  ],
  exception: {
    appliesTo: ["bathroom", "kitchen_or_food_prep", "rooftop", "outdoor", "sink", "garage_accessory", "unfinished_basement"],
    description: "Listed locking support and mounting receptacles for ceiling luminaires/fans exempted (unless integral convenience receptacle)",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 210.8(D) & 422.5 — Specific Appliance GFCI
// 2020 override — change-reviewed from Captain Code 2020 NEC Code Changes
// guide + Eaton 2020 NEC Code Changes brochure (secondary sources).
//
// Changes from 2017 (per Captain Code 2020 guide — 2017 baseline pending
// verification against authorized NFPA 70-2017):
//   • Dishwasher GFCI expanded to ALL listed appliances per 422.5
//   • Sump pumps added to 422.5 appliance GFCI list
//   • Dishwashers added to 422.5 appliance GFCI list
//
// Source: Cross-referenced against the Captain Code 2020 change guide + Eaton
// 2020 NEC Code Changes brochure (secondary sources); pending verification
// against authorized NFPA 70-2020.
// ─────────────────────────────────────────────────────────────────────────────
export const GFCI_SPECIFIC_APPLIANCES =
  "GFCI required for all listed appliances per 422.5, including dishwashers (all occupancies) " +
  "and sump pumps. NEC 210.8(D) / 422.5 — 2020 override. " +
  "Source: Captain Code 2020 change guide + Eaton 2020 NEC Code Changes brochure (secondary); pending official NFPA 70-2020 verification. " +
  "2017 baseline: pending verification against authorized NFPA 70-2017.";

export const DISHWASHER_GFCI_REQUIRED = true;   // 422.5 — 2017 scope pending verification against authorized NFPA 70-2017
export const SUMP_PUMP_GFCI_REQUIRED  = true;   // 422.5 — new in 2020

// ─────────────────────────────────────────────────────────────────────────────
// 210.8(E) — GFCI for Equipment-Servicing Receptacles
// 2020 override — cross-referenced against the Captain Code 2020 NEC Code
// Changes guide + Eaton 2020 NEC Code Changes brochure (secondary sources);
// pending verification against authorized NFPA 70-2020.
//
// 2020 section — 2017 applicability pending verification against authorized
// NFPA 70-2017 (no verified conclusion about 2017 requirements is implied):
//   • GFCI required for all receptacles installed to comply with 210.63
//     (heating, A/C, refrigeration equipment — service/maintenance receptacles)
//   • 210.63 requires a 125V, single-phase, 15A or 20A receptacle within 25 ft
//     of HVAC/refrigeration equipment for servicing; 210.8(E) makes those GFCI
//   • Applies to all occupancies (210.63 is not dwelling-limited)
//   • No exceptions specific to 210.8(E) identified in the Captain Code guide
// ─────────────────────────────────────────────────────────────────────────────
export const GFCI_EQUIPMENT_SERVICING_RECEPTACLE =
  "GFCI required for all receptacles installed per 210.63 (equipment servicing — " +
  "HVAC, refrigeration, and similar equipment requiring service). 210.63 requires " +
  "a 125V single-phase 15/20A receptacle within 25 ft of equipment; 210.8(E) makes " +
  "those GFCI-protected. Applies to all occupancies. " +
  "NEC 210.8(E) — 2020 section. " +
  "2017 applicability pending verification against authorized NFPA 70-2017. " +
  "Source: Captain Code 2020 change guide + Eaton 2020 NEC Code Changes brochure (secondary); pending official NFPA 70-2020 verification.";

// ─────────────────────────────────────────────────────────────────────────────
// 210.8(F) — GFCI for Outdoor Outlets (>15A / ≤50A)
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// New section in 2020:
//   • GFCI required for outdoor dwelling outlets supplied by single-phase branch
//     circuits rated 150V to ground or less, 50A or less
//   • Exception: certain lighting outlets are exempt
// ─────────────────────────────────────────────────────────────────────────────
export const GFCI_OUTDOOR_DWELLING_50A =
  "GFCI required for outdoor outlets (dwelling units) on single-phase branch circuits " +
  "rated ≤150V to ground and ≤50A. Exception: lighting outlets per 210.8(F) exception. " +
  "NEC 210.8(F) — 2020 new section. " +
  "Source: Eaton 2020 NEC Code Changes brochure (secondary); pending official NFPA 70-2020 verification.";

// ─────────────────────────────────────────────────────────────────────────────
// 210.52(C)(2) — Island / Peninsula Countertop Receptacles
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// Changes from 2017:
//   • 2017 rule: ≥12 sq ft countertop → at least 1 receptacle
//   • 2020 rule: square-footage-based tiered count:
//       - First 9 sq ft or fraction thereof → at least 1 receptacle
//       - Each additional 18 sq ft or fraction → 1 additional receptacle
//       - Peninsular countertop: one receptacle must be within 2 ft of outer end
//   • Pop-up/below-counter outlets permitted per Exception
//
// NOTE: ISLAND_FIRST_BLOCK_SQFT / ISLAND_ADDITIONAL_SQFT are exported for future
// use but are NOT currently consumed by calcReceptacleLoad() — today this is
// display/reference text only (island_peninsula_rule in the results object),
// not wired into a numeric receptacle-count formula.
// ─────────────────────────────────────────────────────────────────────────────
export const ISLAND_PENINSULA_RULE =
  "Countertop/work-surface receptacle count (2020 sq-ft rule): " +
  "≥1 receptacle for first 9 sq ft or fraction thereof; " +
  "+1 receptacle per additional 18 sq ft or fraction thereof. " +
  "Peninsular countertop: one receptacle must be within 2 ft of outer end. " +
  "Below-counter and pop-up outlets permitted per Exception. " +
  "NEC 210.52(C)(2) — 2020 override (replaces 2017 ≥12 sq ft threshold rule).";

// Helper constants for calculator logic
export const ISLAND_FIRST_BLOCK_SQFT    = 9;   // sq ft triggering first required receptacle
export const ISLAND_ADDITIONAL_SQFT     = 18;  // sq ft per additional required receptacle
export const PENINSULA_OUTER_END_MAX_FT = 2;   // peninsular receptacle must be within 2 ft of outer end

// ─────────────────────────────────────────────────────────────────────────────
// 210.52(G) — Garage / Basement / Accessory Building Receptacles
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// Changes from 2017:
//   • Rule expanded to include multifamily dwellings (not just 1- and 2-family)
// ─────────────────────────────────────────────────────────────────────────────
export const GARAGE_BASEMENT_RECEPTACLE_SCOPE =
  "At least one receptacle required in attached garage, basement, and detached accessory building " +
  "for all dwelling types including multifamily. " +
  "NEC 210.52(G) — 2020 override (expanded to multifamily from 2017).";

// ─────────────────────────────────────────────────────────────────────────────
// 230.67 — Dwelling Unit Surge Protective Device (SPD)
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// New in 2020 (was not required in 2017):
//   • All services supplying dwelling units must have SPD
//   • SPD must be Type 1 or Type 2
//   • Must be integral to service equipment or immediately adjacent
//   • Also applies when service equipment is replaced
// ─────────────────────────────────────────────────────────────────────────────
export const DWELLING_SPD_REQUIRED = true;   // 230.67 — new requirement in 2020
export const DWELLING_SPD_TYPE =
  "Type 1 or Type 2 SPD required. Must be integral to service equipment or " +
  "immediately adjacent. Required at new installations and service equipment replacements. " +
  "NEC 230.67 — 2020 override (not required in 2017).";

// ─────────────────────────────────────────────────────────────────────────────
// 230.85 — Emergency Outdoor Disconnect (1- and 2-Family Dwellings)
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// New in 2020 (not in 2017):
//   • One- and two-family dwellings must have an outdoor emergency disconnect
//     accessible to emergency responders
// ─────────────────────────────────────────────────────────────────────────────
export const DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true;   // 230.85 — new in 2020
export const DWELLING_OUTDOOR_DISCONNECT_NOTE =
  "Outdoor emergency disconnect required for 1- and 2-family dwellings. " +
  "Must be accessible to emergency responders. " +
  "NEC 230.85 — 2020 new requirement (not in 2017).";

// ─────────────────────────────────────────────────────────────────────────────
// 240.67 & 240.87 — Arc Energy Reduction (1200A+ OCPD)
// 2020 override — change-reviewed from Mike Holt / ElectricalLicenseRenewal
// side-by-side 2017→2020 text.
//
// CORRECTED: neither 240.67 (fuses, added in the 2017 NEC) nor 240.87
// (breakers, in the NEC since 2014) is new in 2020, and the 1200A threshold
// itself is UNCHANGED 2017→2020. What changed for 2020:
//   • 240.87(A): documentation must now ALSO show that the chosen method is set
//     to operate below the available arcing current (2017 only required
//     documenting circuit breaker location).
//   • 240.87(B): "less than the available arcing current" was moved from being
//     tied only to methods (5) and (6) into the parent text, so it now applies
//     to all 7 permitted methods.
//   • 240.87(B)(5): explicit new prohibition on TEMPORARILY adjusting the
//     instantaneous trip setting to fake compliance during servicing, then
//     restoring it afterward — the final, as-left setting governs compliance.
//   • 240.67 (fuses) was not found to have an equivalent 2020 text change in
//     the sources reviewed; treated as inherited/unchanged pending confirmation.
// This remains a checklist/reference item — the app has no arc-flash/arcing
// current calculation, so none of this changes a numeric output today.
// ─────────────────────────────────────────────────────────────────────────────
export const ARC_ENERGY_REDUCTION_THRESHOLD_AMPS = 1200;  // unchanged 2017→2020
export const ARC_ENERGY_REDUCTION_NOTE =
  "Arc energy reduction required for fuses ≥1200A (240.67, added 2017 NEC) and circuit " +
  "breakers ≥1200A (240.87, in NEC since 2014) — threshold itself unchanged in 2020. " +
  "2020 revisions to 240.87: documentation must show the chosen method operates below the " +
  "available arcing current; that requirement now applies to all 7 permitted methods " +
  "(previously only tied to methods 5 & 6); and temporarily adjusting the instantaneous " +
  "trip setting to achieve compliance during servicing is explicitly prohibited. " +
  "NEC 240.67 / 240.87 — 2020 override (documentation & method wording only, not new rules).";

// ─────────────────────────────────────────────────────────────────────────────
// 406.4(D)(4) — Receptacle Replacement / AFCI
// 406.9(C)    — Bathtub/Shower Damp/Wet Receptacle
// 406.12      — Tamper-Resistant Receptacle Expansion
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
// ─────────────────────────────────────────────────────────────────────────────
export const RECEPTACLE_REPLACEMENT_AFCI_NOTE =
  "Replacement receptacles in AFCI-required locations must be AFCI-protected. " +
  "NEC 406.4(D)(4) — 2020 override.";

export const BATHTUB_SHOWER_RECEPTACLE_NOTE =
  "Receptacles must not be installed within or directly over bathtubs or shower stalls. " +
  "NEC 406.9(C) — 2020 override.";

export const TAMPER_RESISTANT_SCOPE =
  "Tamper-resistant receptacles required in additional locations including hotels, " +
  "motels, and child-care facilities. NEC 406.12 — 2020 expanded scope.";

// ─────────────────────────────────────────────────────────────────────────────
// 625.54 — EV Supply Equipment GFCI
// 2020 override — change-reviewed from Eaton 2020 NEC Code Changes PDF.
//
// New in 2020 (not required in 2017):
// ─────────────────────────────────────────────────────────────────────────────
export const EV_GFCI_REQUIRED = true;   // 625.54 — new in 2020
export const EV_MINIMUM_LOAD_VA = 0;    // Inherited from 2017 — no change in 2020

// ─────────────────────────────────────────────────────────────────────────────
// 680.21(C)/(D) — Pool Pump Motor GFCI and Replacement
// 2020 override — change-reviewed from ElectricalLicenseRenewal.com side-by-side
// 2017→2020 code text + Mike Holt forum discussion.
//
// CORRECTED: GFCI for pool pump motors is NOT new in 2020 — 2017's 680.21(C)
// already required it, but only for single-phase 120–240V branch circuits.
//   • 2017 680.21(C): GFCI required for single-phase, 120V–240V pool pump motor
//     branch circuits only. 3-phase pool pump motors were NOT covered.
//   • 2020 680.21(C): SCOPE EXPANDED — GFCI (specifically Class A) now required
//     for ALL pool pump motors on branch circuits rated ≤150V to ground and
//     ≤60A, single- OR 3-phase. New exception for listed low-voltage motors fed
//     from compliant transformers/power supplies.
//   • 680.21(D) is genuinely NEW in 2020 — where a pool pump motor covered by
//     (C) is replaced for maintenance or repair, the replacement motor must be
//     GFCI-protected even if the original installation predated the GFCI
//     requirement.
// ─────────────────────────────────────────────────────────────────────────────
export const POOL_PUMP_GFCI_REQUIRED = true;   // 680.21(C) — required since 2017, scope expanded in 2020
export const POOL_PUMP_GFCI_ALL_PHASES = true; // 680.21(C) — 2020: covers 3-phase motors too (2017: single-phase only)
export const POOL_PUMP_REPLACEMENT_GFCI_REQUIRED = true;  // 680.21(D) — new in 2020
export const POOL_PUMP_GFCI_NOTE =
  "GFCI (Class A) required for pool pump motors on branch circuits ≤150V to ground, ≤60A, " +
  "single- OR 3-phase (680.21(C)) — 2020 expands 2017's single-phase-120-240V-only scope to " +
  "include 3-phase motors. Exception for listed low-voltage motors on compliant power supplies. " +
  "Replacement pool pump motors must also be GFCI-protected, even retroactively (680.21(D) — new in 2020). " +
  "NEC 680.21(C)/(D) — 2020 override.";

// ─────────────────────────────────────────────────────────────────────────────
// Table 220.12 — Lighting Load, Non-Dwelling Occupancies
// 2020 override — CENTRALIZED source of truth for both the Lighting Load /
// Commercial Load calculators (via nec.OCCUPANCY_UNIT_LOADS) AND the Tables
// tab (necTables.js "220_12_unit_loads" entry resolves through this same
// object for the selected NEC year — see src/pages/NECTables.jsx).
//
// This is a REAL numeric table change, not a renumbering. In the 2020 NEC,
// Table 220.12 was reconstructed using ASHRAE/IECC data; dwellings were
// removed from the table entirely and now live at 220.14(J) (still 3 VA/ft²,
// unchanged). Only the rows below are CONFIRMED from multiple independent
// secondary sources (Mike Holt 2020 NEC newsletter; Eaton "NEC 2020 – load
// calculations" blog). Every other occupancy key is left at its inherited
// 2017 value and is NOT verified equal for 2020 — see PENDING_IMPACT_LIST.
//
// CONFIRMED changes (2017 → 2020, VA/sq ft):
//   hotel_motel: 2.0  → 1.70  (relocated to new 220.14(M); guest rooms)
//   hospital:    2.0  → 1.6
//   garage:      0.5  → 0.3
//   armory:      1.0  → 1.7   (armories/auditoriums reclassified as
//                              gymnasium-type occupancies, value raised)
// CONFIRMED unchanged:
//   dwelling:    3.0  → 3.0   (moved to 220.14(J), value itself unchanged)
// PENDING verification (kept at 2017 value, NOT yet source-confirmed for
// 2020 — do not treat these as verified-unchanged):
//   office, store, school, restaurant, church, industrial, warehouse
// ─────────────────────────────────────────────────────────────────────────────
export const OCCUPANCY_UNIT_LOADS = {
  dwelling: 3.0,        // unchanged — confirmed (moved to 220.14(J))
  hotel_motel: 1.70,    // CHANGED from 2.0 — confirmed (Mike Holt 2020 NEC newsletter; now 220.14(M))
  hospital: 1.6,        // CHANGED from 2.0 — confirmed (Eaton NEC 2020 load calculations blog)
  office: 3.5,          // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  bank: 3.5,            // PENDING — 2017 matched office; 220.14(K) still names banks. Not in the confirmed 2020 Table 220.12 rows.
  store: 3.0,           // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  school: 3.0,          // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  restaurant: 2.0,      // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  church: 1.0,          // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  garage: 0.3,          // CHANGED from 0.5 — confirmed (Eaton NEC 2020 load calculations blog)
  industrial: 2.0,      // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  warehouse: 0.25,      // PENDING verification — kept at 2017 value, not yet source-confirmed for 2020
  armory: 1.7,          // CHANGED from 1.0 — confirmed (Eaton NEC 2020 load calculations blog)
};

// Year-owned so 2020 does not silently inherit these from shared.js.
export const OCCUPANCY_UNIT_LOAD_DEFAULT = 2.0; // PENDING — 2020 Table 220.12 note not independently confirmed
export const OFFICE_RECEPTACLE_MIN_VA_PER_SQFT = 1; // 220.14(K) existed in 2017; not a 2020-only rule
export const SHOW_WINDOW_VA_PER_FOOT = 200;
export const SIGN_OUTLET_MIN_VA = 1200;
export const RECEPTACLE_YOKE_VA = 180;
export const DWELLING_LIGHTING_VA_PER_SQFT = 3; // 220.14(J) — value unchanged
export const DWELLING_LIGHTING_ARTICLE = "220.14(J)";
export const HOTEL_LIGHTING_ARTICLE = "220.14(M)";
export const OCCUPANCY_UNIT_LOAD_TABLE = "Table 220.12";
export const SOLAR_120_RULE_ARTICLE = "705.12(B)(2)(3)(a)";

// Table 220.42 — 2020 owns a copy. Bands match 2017/shared; not independently
// confirmed against NFPA 70-2020. Do not treat as verified-unchanged.
export const LIGHTING_DEMAND = {
  dwelling:    { tiers: [{ band: 3000, factor: 1.00 }, { band: 117000, factor: 0.35 }, { band: Infinity, factor: 0.25 }] },
  hospital:    { tiers: [{ band: 50000, factor: 0.40 }, { band: Infinity, factor: 0.20 }] },
  hotel_motel: { tiers: [{ band: 20000, factor: 0.50 }, { band: 80000, factor: 0.40 }, { band: Infinity, factor: 0.30 }] },
  warehouse:   { tiers: [{ band: 12500, factor: 1.00 }, { band: Infinity, factor: 0.50 }] },
};

// Table 220.56 — 2020 owns a copy. 6+ is still 65% here (pending NFPA 70-2020
// confirmation; later editions step down). Not claimed verified-unchanged.
export const COMMERCIAL_KITCHEN_DEMAND = [
  { units: 1, factor: 100 }, { units: 2, factor: 100 },
  { units: 3, factor: 90 },  { units: 4, factor: 80 },
  { units: 5, factor: 70 },  { units: 999, factor: 65 },
];

export const HVAC_OCPD_MULTIPLIER = 1.75;
export const OPTIONAL_APPLICABILITY_ARTICLE = "220.82(A)";
export const OPTIONAL_GENERAL_LOAD_ARTICLE = "220.82(B)";

// Table 555.6 — 2020 owns a copy of the 2017 Table 555.12 bands. Identity is
// gated (555.12 → 555.6). Numeric factors are pending NFPA 70-2020 confirmation.
export const MARINA_DEMAND = [
  { count: 4, factor: 100 }, { count: 8, factor: 90 }, { count: 14, factor: 80 },
  { count: 30, factor: 70 }, { count: 40, factor: 60 }, { count: 50, factor: 50 },
  { count: 70, factor: 40 }, { count: 9999, factor: 30 },
];
export const MARINA_DEMAND_TABLE = "Table 555.6";

// Article 310 2020 citations. Ampacity *values* still come from shared.js
// (pending row-for-row codebook). 83% dwelling factor owned so 2020 does not
// silently inherit the shared constant.
export const AMPACITY_TABLE = "Table 310.16";
export const AMPACITY_TEMP_ARTICLE = "310.15(B)(1)";
export const AMPACITY_BUNDLE_ARTICLE = "310.15(C)(1)";
export const DWELLING_SERVICE_ARTICLE = "310.12";
export const DWELLING_SERVICE_CONDUCTOR_FACTOR = 0.83;

// Table 220.84 / 220.102 / 220.103 / 551.73(A) — 2020 owns copies of the
// 2017 bands so they are not silently inherited from shared.js. Numeric
// factors pending row-for-row NFPA 70-2020 confirmation.
export const MULTIFAMILY_DEMAND_TABLE = [
  { units: 5, factor: 45 }, { units: 7, factor: 44 }, { units: 10, factor: 43 },
  { units: 11, factor: 42 }, { units: 13, factor: 41 }, { units: 15, factor: 40 },
  { units: 17, factor: 39 }, { units: 20, factor: 38 }, { units: 21, factor: 37 },
  { units: 23, factor: 36 }, { units: 25, factor: 35 }, { units: 27, factor: 34 },
  { units: 30, factor: 33 }, { units: 31, factor: 32 }, { units: 33, factor: 31 },
  { units: 36, factor: 30 }, { units: 38, factor: 29 }, { units: 42, factor: 28 },
  { units: 45, factor: 27 }, { units: 50, factor: 26 }, { units: 55, factor: 25 },
  { units: 61, factor: 24 }, { units: 999, factor: 23 },
];
export const FARM_102_VOLTAGE = 240;
export const FARM_102_MOTOR_MULTIPLIER = 1.25;
export const FARM_102_TIERS = [
  { amps: 60, factor: 1.00 },
  { amps: 60, factor: 0.50 },
  { amps: Infinity, factor: 0.25 },
];
export const FARM_BUILDING_DEMAND = [1.00, 0.75, 0.65, 0.50];
export const RV_PARK_DEMAND = [
  { sites: 1, factor: 100 }, { sites: 2, factor: 90 }, { sites: 3, factor: 80 },
  { sites: 4, factor: 75 }, { sites: 5, factor: 65 }, { sites: 6, factor: 60 },
  { sites: 9, factor: 55 }, { sites: 12, factor: 50 }, { sites: 15, factor: 48 },
  { sites: 18, factor: 47 }, { sites: 21, factor: 45 }, { sites: 24, factor: 43 },
  { sites: 35, factor: 42 }, { sites: 9999, factor: 41 },
];
export const RV_SITE_VA = { "20A": 2400, "30A": 3600, "50A": 12000 };
export const RV_PARK_DEMAND_TABLE = "Table 551.73(A)";
export const OPTIONAL_HVAC = {
  acFactor: 1.00,
  heatPumpOnlyFactor: 1.00,
  supplementalHeatFactor: 0.65,
  spaceHeatLt4Factor: 0.65,
  spaceHeatGe4Factor: 0.40,
  thermalStorageFactor: 1.00,
  spaceHeatUnitThreshold: 4,
};

// Preserve Infinity bands (JSON.stringify turns Infinity into null and breaks 220.44 remainder).
const clone = (x) => {
  if (typeof structuredClone === "function") return structuredClone(x);
  return JSON.parse(
    JSON.stringify(x, (_, v) => (v === Infinity ? "__Infinity__" : v)),
    (_, v) => (v === "__Infinity__" ? Infinity : v),
  );
};

// 2020-owned copies of 2017/shared load tables so 2020 does not silently inherit.
// Numeric values pending NFPA 70-2020 confirmation.
export const RANGE_DEMAND = clone(_RANGE_DEMAND);
export const DRYER_DEMAND = clone(_DRYER_DEMAND);
export const DWELLING_DEMAND_TABLE = clone(_DWELLING_DEMAND_TABLE);
export const RECEPTACLE_DEMAND_TIERS = clone(_RECEPTACLE_DEMAND_TIERS);
export const WELDER_DUTY_CYCLE_TABLE = clone(_WELDER_DUTY_CYCLE_TABLE);
export const FIXED_APPLIANCE_DEMAND_FACTOR = 0.75;
export const NEUTRAL_DEMAND_TIER1_CAP = 200;
export const NEUTRAL_DEMAND_TIER1_FACTOR = 0.70;
export const CONTINUOUS_LOAD_MULTIPLIER = 1.25;
export const OPTIONAL_DEMAND_FACTOR = 0.40;
export const SMALL_APPLIANCE_VA = 1500;
export const LAUNDRY_VA = 1500;
export const SMALL_APPLIANCE_MIN_CIRCUITS = 2;
export const LAUNDRY_MIN_CIRCUITS = 1;
export const RANGE_NOTE1_MAJOR_FRACTION_KW = 0.5;
export const WELDER_OCPD_MULTIPLIER = 2.00;
export const SOLAR_BUSBAR_120PCT = 1.20;
export const SOLAR_BACKFEED_MULTIPLIER = 1.25;
export const EV_CONTINUOUS_MULTIPLIER = 1.25;
export const SMALL_CONDUCTOR_MAX_OCPD = { "14": 15, "12": 20, "10": 30 };
export const CAPACITOR_CONDUCTOR_MULTIPLIER = 1.35;

export const EGC_UPSIZE_ARTICLE = "250.122(B)";
export const EGC_UPSIZE_NOTE =
  "2020 250.122(B): increase the EGC proportionally when ungrounded conductors are increased in size for any reason other than as required in 310.15(B) or 310.15(C). Qualified-person exception is a field decision — not computed.";
export const DWELLING_GENERATOR_SHUTDOWN_ARTICLE = "445.18";
export const DWELLING_GENERATOR_SHUTDOWN_NOTE =
  "Non-cord-and-plug-connected generators at one- and two-family dwellings require an emergency shutdown in a readily accessible outdoor location (445.18). Not included in kVA sizing math.";
export const SPD_ARTICLE = "230.67";
export const OVERVOLTAGE_ARTICLE = "242";
export const OVERVOLTAGE_ARTICLE_NOTE =
  "Article 242 consolidates overvoltage (surge) protection equipment; the dwelling SPD mandate remains 230.67. Not a separate calculator path.";
export const SUPPLY_SIDE_DISCONNECT_ARTICLE = "250.25";
export const SUPPLY_SIDE_DISCONNECT_NOTE =
  "250.25 (2020): grounding and bonding of supply-side disconnecting means. This app does not size supply-side disconnect bonding separately from Table 250.66 / 250.102(C)(1).";

// ─────────────────────────────────────────────────────────────────────────────
// Inherited from 2017 — no change in 2020
// ─────────────────────────────────────────────────────────────────────────────
// DWELLING_MIN_SERVICE_AMPS = 100         (230.42(B)) — inherited from 2017 baseline
// DWELLING_LIGHTING_VA_PER_SQFT = 3       (Table 220.12) — inherited from 2017 baseline
// SMALL_APPLIANCE_VA = 1500               (220.52(A)) — inherited from 2017 baseline
// LAUNDRY_VA = 1500                       (220.52(B)) — inherited from 2017 baseline
// DWELLING_DEMAND_TABLE                   (Table 220.42) — inherited from 2017 baseline
// STD_OCPD_SIZES                          (240.6(A)) — inherited from 2017 baseline
// CONTINUOUS_LOAD_MULTIPLIER = 1.25       (210.19(A)(1)) — inherited from 2017 baseline
// COPPER_AMPACITY / ALUMINUM_AMPACITY     (Table 310.15(B)(16)) — inherited from 2017 baseline
// All motor, transformer, grounding, conduit fill tables — inherited from 2017 baseline
// EV_CONTINUOUS_MULTIPLIER = 1.25         (625.42) — inherited from 2017 baseline
// SOLAR_BUSBAR_120PCT / SOLAR_BACKFEED_MULTIPLIER — inherited from 2017 baseline (pending confirmation, see KNOWN GAPS above)

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE_METADATA — one entry per 2020 override above. This is the audit trail
// required before VERIFIED can be flipped to true. Every entry must reach
// verification_status "verified" (human-approved against actual NFPA 70-2020
// text) AND every calculator listed in affected_calculators must pass: 2017
// immutability tests, 2020 change tests, step-by-step math validation,
// Calculation Trace validation, and Testing Agent validation.
// ─────────────────────────────────────────────────────────────────────────────
export const CHANGE_METADATA = [
  {
    article: "210.8(A)",
    topic: "Dwelling Unit GFCI",
    rule_2017: "125V, 15/20A receptacles in bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchen countertops within 6 ft of sink, boathouses.",
    rule_2020: "125V–250V, single-phase ≤150V-to-ground circuits (15A/20A) in bathrooms, garages, outdoors, crawl spaces, ALL basements (finished & unfinished), kitchen countertops, laundry areas, indoor damp/wet locations, boathouses.",
    exact_difference: "Voltage range widened (125V → 125–250V); basements now fully covered (was unfinished-only); laundry areas and indoor damp/wet locations added.",
    affected_calculators: ["dwelling_standard", "dwelling_optional", "receptacle_load"],
    impact_type: "display/reference only",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — GFCI_SCOPE_DWELLING is a reference string, not a numeric branch",
    regression_2017_result: "GFCI_SCOPE_DWELLING returns the narrower 2017 scope string when NEC_YEAR=2017",
    expected_2020_result: "GFCI_SCOPE_DWELLING returns the expanded 2020 scope string when NEC_YEAR=2020",
  },
  {
    article: "210.8(B)",
    topic: "Other-Than-Dwelling GFCI",
    rule_2017: "Single-phase 125V, 15/20A receptacles only (no three-phase coverage, no 50A/100A limits). 10 locations: bathrooms, kitchens, rooftops, outdoors, sinks (within 6 ft), indoor wet locations, locker rooms with showering facilities, garages/service bays, crawl spaces, unfinished basements. No listed locking receptacle exception. Source: secondary source analysis — NOT verified against official NFPA 70-2017 text in this project.",
    rule_2020: "Single-phase 125V–250V receptacles on circuits ≤150V to ground, ≤50A; three-phase receptacles on circuits ≤150V to ground, ≤100A. 12 locations: (1) bathrooms, (2) kitchens or areas with sink + permanent food prep/cooking provisions, (3) rooftops, (4) outdoors, (5) sinks within 6 ft, (6) indoor damp AND wet locations, (7) locker rooms with showering facilities, (8) garages/accessory buildings/service bays, (9) crawl spaces at/below grade, (10) unfinished basement areas, (11) laundry areas, (12) bathtubs/shower stalls within 6 ft. Exception to (1)–(5),(8),(10): listed locking support/mounting receptacles for ceiling luminaires/fans exempted. Source: Captain Code 2020 change guide (secondary); pending official NFPA 70-2020 verification.",
    exact_difference: "Single-phase voltage range widened from 125V only to 125V–250V. Amperage limit raised from 15/20A to ≤50A. Three-phase coverage ADDED (was not in 2017). Location (2) expanded to include non-kitchen food-prep areas. Location (6) expanded from wet-only to damp AND wet. Location (8) expanded to include accessory buildings. New locations (11) laundry areas and (12) bathtubs/shower stalls (within 6 ft). New exception for listed locking support/mounting receptacles. NOTE: 'boathouses' was incorrectly listed in previous version — boathouses are in 210.8(A) dwelling units, NOT 210.8(B).",
    affected_calculators: ["commercial_load", "receptacle_load"],
    impact_type: "display/reference only (NoteBox text — no calculator evaluates 210.8(B) compliance)",
    verification_source: "IAEI/Leviton 'Captain Code 2020 NEC Code Changes' guide pp. 18–21 (reprints actual NFPA 70-2020 text + IAEI expert analysis; secondary source — pending official NFPA 70-2020 verification)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — GFCI_SCOPE_OTHER_THAN_DWELLING is a reference string, not a numeric branch",
    regression_2017_result: "GFCI_SCOPE_OTHER_THAN_DWELLING returns the narrower 2017 scope string when NEC_YEAR=2017 (2017 override now exists in 2017.js — 125V/15-20A, no 3-phase, 10 locations, no exception)",
    expected_2020_result: "GFCI_SCOPE_OTHER_THAN_DWELLING returns the corrected 2020 scope string with all 12 locations, three-phase coverage, amperage limits, and the locking-receptacle exception",
    implementationStatus: {
      documented: true,
      traced: true,
      displayed: true,
      yearAware: true,
      preserved2017: true,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      officialSourceVerificationPending: true,
      noCalculatorByDesign: true,
      status: "Implementation review complete — official NEC verification pending. Documented, traced, displayed, year-aware, 2017 preserved. No calculator evaluates this rule by design. Every NEC edition (2017/2020/2023/2026) owns its own 210.8(B) data explicitly — no hidden inheritance.",
    },
  },
  {
    article: "210.8(D) / 422.5",
    topic: "Specific Appliance GFCI (dishwashers, sump pumps)",
    rule_2017: "Pending verification against authorized NFPA 70-2017. 2017 dishwasher GFCI scope and sump pump status not yet confirmed against official NFPA 70-2017 text — values are placeholders from secondary source analysis.",
    rule_2020: "GFCI required for all listed appliances per 422.5 in ALL occupancies, explicitly including dishwashers and sump pumps. Source: Captain Code 2020 change guide + Eaton 2020 NEC Code Changes brochure (secondary sources); pending verification against authorized NFPA 70-2020.",
    exact_difference: "Pending verification of 2017 baseline against authorized NFPA 70-2017. 2020 change (per Captain Code guide): GFCI required for all listed appliances per 422.5 including dishwashers and sump pumps. The 2017 dishwasher scope and sump pump status have not been independently confirmed.",
    affected_calculators: ["dwelling_standard", "dwelling_optional"],
    impact_type: "display/reference only (boolean flags + display string — not used in any numeric formula)",
    verification_source: "Captain Code 2020 change guide + Eaton 2020 NEC Code Changes brochure (secondary sources); pending verification against authorized NFPA 70-2020",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "DISHWASHER_GFCI_REQUIRED should read true for all years (2017 value pending verification against authorized NFPA 70-2017). SUMP_PUMP_GFCI_REQUIRED should read false for 2017 (pending verification), true for 2020/2023/2026. GFCI_SPECIFIC_APPLIANCES should render in DwellingStandard/DwellingOptional NoteBox for all 4 years.",
    regression_2017_result: "DISHWASHER_GFCI_REQUIRED = true, SUMP_PUMP_GFCI_REQUIRED = false in 2017.js (2017 explicit definition now exists — pending verification against authorized NFPA 70-2017). Note renders with 2017-specific pending-verification string.",
    expected_2020_result: "DISHWASHER_GFCI_REQUIRED = true, SUMP_PUMP_GFCI_REQUIRED = true. Note renders with 2020-specific string (all listed appliances including dishwashers and sump pumps).",
    implementationStatus: {
      documented: true,
      traced: true,
      displayed: true,
      yearAware: true,
      preserved2017: true,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      officialSourceVerificationPending: true,
      noCalculatorByDesign: false,
      status: "Implementation review complete — official NEC verification pending. Documented, traced, displayed, year-aware, 2017 preserved. Boolean flags passed through to result object for display only — not used in any numeric formula. Every NEC edition (2017/2020/2023/2026) owns its own 210.8(D) data explicitly — no hidden inheritance.",
    },
  },
  {
    article: "210.8(E)",
    topic: "GFCI for Equipment-Servicing Receptacles",
    rule_2017: "2017 applicability pending verification against authorized NFPA 70-2017. 210.63 (equipment-servicing receptacle within 25 ft of HVAC/refrigeration) existed in 2017; whether GFCI was required for those receptacles has NOT been verified against the authorized NFPA 70-2017 source. No verified conclusion about 2017 requirements is implied.",
    rule_2020: "GFCI required for all receptacles installed per 210.63 (HVAC/refrigeration and similar equipment requiring service). Applies to all occupancies. No exceptions specific to 210.8(E) identified in the Captain Code guide.",
    exact_difference: "2020 requires GFCI for 210.63 receptacles via 210.8(E). 2017 applicability pending verification against authorized NFPA 70-2017 — no verified conclusion about 2017 requirements is implied.",
    affected_calculators: ["hvac_load"],
    impact_type: "display/reference only (NoteBox text — no numeric formula affected)",
    verification_source: "Captain Code 2020 NEC Code Changes guide + Eaton 2020 NEC Code Changes brochure (secondary sources); pending verification against authorized NFPA 70-2020",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "GFCI_EQUIPMENT_SERVICING_RECEPTACLE should be null for 2017 (note does not render), a nonempty string for 2020/2023/2026 (note renders in HVACLoad NoteBox). No numeric output changes.",
    regression_2017_result: "GFCI_EQUIPMENT_SERVICING_RECEPTACLE is null in 2017.js — NoteBox item does not render. 2017 behavior preserved. No 2017 note is displayed because applicability remains pending authorized-source verification. All HVAC numeric outputs identical across years.",
    expected_2020_result: "GFCI_EQUIPMENT_SERVICING_RECEPTACLE returns the 2020 note; note renders in HVACLoad NoteBox. All HVAC numeric outputs identical to 2017.",
    implementationStatus: {
      documented: true,
      traced: true,
      displayed: true,
      yearAware: true,
      preserved2017: true,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      officialSourceVerificationPending: true,
      noCalculatorByDesign: false,
      applicability2017Pending: true,
      status: "Implementation review complete — official NEC verification pending. Documented, traced, displayed (2020/2023/2026), year-aware, 2017 preserved. 2017 applicability pending authorized-source verification — no 2017 note displayed. Display/reference string only — not used in any numeric formula. Every NEC edition (2017/2020/2023/2026) owns its own 210.8(E) data explicitly — no hidden inheritance.",
    },
  },
  {
    article: "210.8(F)",
    topic: "GFCI for Outdoor Outlets ≤50A",
    rule_2017: "No equivalent section (outdoor GFCI limited to 125V/15-20A receptacles under 210.8(A)).",
    rule_2020: "New section — GFCI required for dwelling outdoor outlets on single-phase circuits ≤150V to ground and ≤50A, with a lighting-outlet exception.",
    exact_difference: "New requirement extending GFCI beyond 15/20A receptacles to outdoor outlets up to 50A.",
    affected_calculators: ["dwelling_standard", "dwelling_optional"],
    impact_type: "display/reference only",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "GFCI_OUTDOOR_DWELLING_50A should be null for 2017 (note does not render), a nonempty string for 2020/2023/2026 (note renders in DwellingStandard/DwellingOptional NoteBox). No numeric output changes.",
    regression_2017_result: "GFCI_OUTDOOR_DWELLING_50A is null in 2017.js — NoteBox item does not render. 2017 behavior preserved. All dwelling numeric outputs identical across years.",
    expected_2020_result: "GFCI_OUTDOOR_DWELLING_50A returns the 2020 note; note renders in DwellingStandard/DwellingOptional NoteBox. All dwelling numeric outputs identical to 2017.",
    implementationStatus: {
      documented: true,
      traced: true,
      displayed: true,
      yearAware: true,
      preserved2017: true,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      officialSourceVerificationPending: true,
      noCalculatorByDesign: false,
      status: "Implementation review complete — official NEC verification pending. Documented, traced, displayed (2020/2023/2026), year-aware, 2017 preserved. Display/reference string only — not used in any numeric formula. Every NEC edition (2017/2020/2023/2026) now owns its own 210.8(F) data explicitly — no hidden inheritance. 2017: GFCI_OUTDOOR_DWELLING_50A=null (section did not exist in 2017 — note does not render). 2020/2023/2026: nonempty string (note renders in DwellingStandard/DwellingOptional NoteBox).",
    },
  },
  {
    article: "210.52(C)(2)",
    topic: "Island / Peninsula Countertop Receptacle Count",
    rule_2017: "≥12 sq ft countertop area requires at least 1 receptacle (single area threshold).",
    rule_2020: "Tiered sq-ft rule: first 9 sq ft (or fraction) requires 1 receptacle; each additional 18 sq ft (or fraction) requires 1 more; peninsula receptacle must be within 2 ft of the outer end.",
    exact_difference: "2017 was a single pass/fail area threshold (12 sq ft). 2020 is a tiered count formula that can require more than one receptacle as area grows.",
    affected_calculators: ["receptacle_load"],
    impact_type: "display/reference only (constants exist for a future numeric formula but are not yet wired into calcReceptacleLoad)",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "Pending — once wired into calcReceptacleLoad, test 9 sq ft → 1 receptacle, 27 sq ft → 2 receptacles, 45 sq ft → 3 receptacles",
    regression_2017_result: "ISLAND_PENINSULA_RULE returns the 2017 ≥12 sq ft threshold string; no receptacle-count formula exists in either year today",
    expected_2020_result: "ISLAND_PENINSULA_RULE returns the 2020 tiered rule string; no receptacle-count formula exists yet in either year",
  },
  {
    article: "210.52(G)",
    topic: "Garage/Basement/Accessory Building Receptacle Scope",
    rule_2017: "Rule applied to 1- and 2-family dwellings only.",
    rule_2020: "Rule expanded to include multifamily dwellings.",
    exact_difference: "Scope widened from 1-/2-family to all dwelling types.",
    affected_calculators: ["dwelling_standard", "dwelling_optional", "multifamily_load"],
    impact_type: "display/reference only",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — reference string only",
    regression_2017_result: "n/a — no 2017 override exists",
    expected_2020_result: "GARAGE_BASEMENT_RECEPTACLE_SCOPE returns the multifamily-inclusive 2020 note",
  },
  {
    article: "230.67",
    topic: "Dwelling Unit Surge Protective Device (SPD)",
    rule_2017: "No SPD requirement for dwelling services.",
    rule_2020: "All dwelling-unit services require a Type 1 or Type 2 SPD, integral or immediately adjacent to service equipment, including on service replacements.",
    exact_difference: "New requirement, no 2017 counterpart.",
    affected_calculators: ["service_sizing", "dwelling_standard", "dwelling_optional"],
    impact_type: "compliance result (boolean requirement flag, not a numeric formula)",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "DWELLING_SPD_REQUIRED should read false for 2017, true for 2020/2023/2026",
    regression_2017_result: "DWELLING_SPD_REQUIRED = false in 2017.js",
    expected_2020_result: "DWELLING_SPD_REQUIRED = true",
  },
  {
    article: "230.85",
    topic: "Emergency Outdoor Disconnect (1- & 2-family dwellings)",
    rule_2017: "No outdoor emergency disconnect requirement.",
    rule_2020: "1- and 2-family dwellings require an outdoor emergency disconnect accessible to emergency responders.",
    exact_difference: "New requirement, no 2017 counterpart.",
    affected_calculators: ["service_sizing", "dwelling_standard", "dwelling_optional"],
    impact_type: "compliance result (boolean requirement flag, not a numeric formula)",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "DWELLING_OUTDOOR_DISCONNECT_REQUIRED should read false for 2017, true for 2020/2023/2026",
    regression_2017_result: "DWELLING_OUTDOOR_DISCONNECT_REQUIRED = false in 2017.js",
    expected_2020_result: "DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true",
  },
  {
    article: "240.67 / 240.87",
    topic: "Arc Energy Reduction (≥1200A fuses/breakers)",
    rule_2017: "240.67 (fuses, added 2017 NEC) and 240.87 (breakers, in NEC since 2014) both already required arc energy reduction for OCPD ≥1200A via one of 7 listed methods; 240.87(A) required documenting circuit breaker location only.",
    rule_2020: "Same ≥1200A threshold and same 7 methods. 240.87(A) documentation must ALSO show the chosen method operates below the available arcing current. 240.87(B) parent text now applies \"less than the available arcing current\" to ALL 7 methods (previously only methods 5 & 6). Method (5) explicitly bars temporarily adjusting the instantaneous trip setting to fake compliance during servicing.",
    exact_difference: "No threshold or applicability change. 2020 changes are documentation scope (now covers arcing-current compliance, not just location) and an explicit anti-gaming rule for instantaneous trip settings.",
    affected_calculators: ["overcurrent_protection", "service_sizing"],
    impact_type: "display/reference only — no arc-flash/arcing-current calculation exists in this app",
    verification_source: "Mike Holt / ElectricalLicenseRenewal.com side-by-side 2017→2020 code text (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — ARC_ENERGY_REDUCTION_THRESHOLD_AMPS must equal 1200 in both 2017 and 2020 (no regression difference expected)",
    regression_2017_result: "n/a — no 2017 override exists for this constant today; threshold is identical in both years so no numeric difference should ever appear",
    expected_2020_result: "ARC_ENERGY_REDUCTION_THRESHOLD_AMPS = 1200 (same as 2017); ARC_ENERGY_REDUCTION_NOTE reflects the corrected 2020 documentation/method wording above",
  },
  {
    article: "406.4(D)(4)",
    topic: "Receptacle Replacement AFCI",
    rule_2017: "No explicit AFCI requirement tied to receptacle replacement.",
    rule_2020: "Replacement receptacles in AFCI-required locations must be AFCI-protected.",
    exact_difference: "New requirement, no 2017 counterpart.",
    affected_calculators: ["receptacle_load", "dwelling_standard", "dwelling_optional"],
    impact_type: "display/reference only",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — reference string only",
    regression_2017_result: "n/a — no 2017 override exists",
    expected_2020_result: "RECEPTACLE_REPLACEMENT_AFCI_NOTE returns the 2020 note",
  },
  {
    article: "406.9(C)",
    topic: "Bathtub/Shower Damp/Wet Receptacle Placement",
    rule_2017: "Narrower restriction on receptacle placement near tubs/showers.",
    rule_2020: "Receptacles must not be installed within or directly over bathtubs or shower stalls.",
    exact_difference: "Clarified/expanded placement restriction.",
    affected_calculators: ["receptacle_load", "dwelling_standard", "dwelling_optional"],
    impact_type: "display/reference only",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — reference string only",
    regression_2017_result: "n/a — no 2017 override exists",
    expected_2020_result: "BATHTUB_SHOWER_RECEPTACLE_NOTE returns the 2020 note",
  },
  {
    article: "406.12",
    topic: "Tamper-Resistant Receptacle Scope",
    rule_2017: "Narrower tamper-resistant receptacle location list.",
    rule_2020: "Expanded to include hotels, motels, and child-care facilities.",
    exact_difference: "Scope expansion to additional occupancy types.",
    affected_calculators: ["receptacle_load", "commercial_load"],
    impact_type: "display/reference only",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "n/a — reference string only",
    regression_2017_result: "n/a — no 2017 override exists",
    expected_2020_result: "TAMPER_RESISTANT_SCOPE returns the expanded 2020 note",
  },
  {
    article: "625.54",
    topic: "EV Supply Equipment GFCI",
    rule_2017: "No GFCI requirement specific to EV supply equipment.",
    rule_2020: "GFCI required for EV supply equipment (EVSE).",
    exact_difference: "New requirement, no 2017 counterpart.",
    affected_calculators: ["ev_charging"],
    impact_type: "compliance result (boolean requirement flag, not a numeric formula)",
    verification_source: "Eaton 2020 NEC Code Changes brochure (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "EV_GFCI_REQUIRED should read false for 2017, true for 2020/2023/2026",
    regression_2017_result: "EV_GFCI_REQUIRED = false in 2017.js",
    expected_2020_result: "EV_GFCI_REQUIRED = true",
  },
  {
    article: "680.21(C)",
    topic: "Pool Pump Motor GFCI — Scope",
    rule_2017: "GFCI required only for pool pump motors on single-phase, 120V–240V branch circuits.",
    rule_2020: "GFCI (Class A) required for ALL pool pump motors on branch circuits ≤150V to ground and ≤60A, single- OR 3-phase, with a new exception for listed low-voltage motors on compliant power supplies.",
    exact_difference: "NOT a new requirement — GFCI for pool pump motors already existed in 2017. 2020 expands the covered population from single-phase-only to single- and 3-phase, raises the ampere ceiling to 60A, and specifies Class A GFCI plus a low-voltage exception.",
    affected_calculators: ["pool_spa"],
    impact_type: "compliance result (boolean/coverage flag, not a numeric formula)",
    verification_source: "ElectricalLicenseRenewal.com side-by-side 2017→2020 code text; Mike Holt forum discussion (secondary sources)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "For a 3-phase pool pump motor: 2017 result = GFCI not required by 680.21(C); 2020 result = GFCI required by 680.21(C)",
    regression_2017_result: "POOL_PUMP_GFCI_REQUIRED = true only for single-phase 120–240V motors in 2017 (no 2017 override exists yet to enforce the phase restriction — flagged as a gap)",
    expected_2020_result: "POOL_PUMP_GFCI_REQUIRED = true and POOL_PUMP_GFCI_ALL_PHASES = true (covers single- and 3-phase)",
  },
  {
    article: "680.21(D)",
    topic: "Pool Pump Motor Replacement GFCI",
    rule_2017: "No equivalent section — replacing a pool pump motor did not trigger a GFCI retrofit requirement.",
    rule_2020: "New section — where a motor covered by 680.21(C) is replaced for maintenance or repair, the replacement motor must be GFCI-protected, even if the original installation predated the GFCI requirement.",
    exact_difference: "New requirement, no 2017 counterpart.",
    affected_calculators: ["pool_spa"],
    impact_type: "compliance result (boolean requirement flag, not a numeric formula)",
    verification_source: "ElectricalLicenseRenewal.com side-by-side 2017→2020 code text (secondary source)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "POOL_PUMP_REPLACEMENT_GFCI_REQUIRED should read false/undefined for 2017, true for 2020/2023/2026",
    regression_2017_result: "n/a — no 2017 override exists (correctly absent, since the rule didn't exist)",
    expected_2020_result: "POOL_PUMP_REPLACEMENT_GFCI_REQUIRED = true",
  },
  {
    article: "Table 220.12",
    topic: "Lighting Load — Non-Dwelling Occupancies",
    rule_2017: "Occupancy VA/sq ft: dwelling 3.0, hotel_motel 2.0, hospital 2.0, office 3.5, store 3.0, school 3.0, restaurant 2.0, church 1.0, garage 0.5, industrial 2.0, warehouse 0.25, armory 1.0.",
    rule_2020: "Table fully reconstructed on ASHRAE/IECC data; dwellings removed from the table (now 220.14(J), still 3.0). Confirmed changed rows: hotel_motel 1.70 (now 220.14(M)), hospital 1.6, garage 0.3, armory 1.7 (reclassified as gymnasium-type). All other rows (office, store, school, restaurant, church, industrial, warehouse) are PENDING — kept at 2017 value, not yet source-confirmed for 2020.",
    exact_difference: "Real numeric table change (not renumbering). 4 of 12 rows confirmed changed via independent secondary sources; dwelling confirmed unchanged; 7 rows pending dedicated verification before being treated as confirmed-unchanged.",
    affected_calculators: ["lighting_load", "commercial_load"],
    impact_type: "numerical formula (table value feeds directly into VA = sqft × unit load)",
    verification_source: "Mike Holt 2020 NEC newsletter (\"Load Calculations - Part 1, based on the 2020 NEC\"); Eaton \"NEC 2020 – load calculations\" blog (secondary sources, not full codebook cross-check)",
    verification_status: "ai_reviewed_pending_human_approval",
    known_answer_test: "See Table220_12Parity component (inlined in src/pages/NECCoverageReport.jsx) — runs calcLightingLoad for every occupancy row at 1,000 sq ft across 2017 and 2020 and asserts: (a) 2017 output for every row matches the pre-existing shared.js value exactly (immutability), (b) 2020 output for hotel_motel/hospital/garage/armory differs from 2017 by the confirmed delta, (c) 2020 output for dwelling/office/store/school/restaurant/church/industrial/warehouse is identical to 2017 (pending rows deliberately unchanged).",
    regression_2017_result: "OCCUPANCY_UNIT_LOADS values unchanged in 2017.js/shared.js — 2017 lighting/commercial load outputs for all 12 occupancies are byte-identical to before this change",
    expected_2020_result: "hotel_motel/hospital/garage/armory outputs shift to reflect new VA/sq ft; all other occupancies (including dwelling) produce identical output to 2017",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PENDING_IMPACT_LIST — open research items NOT yet implemented anywhere in
// this file. This list is explicitly NOT exhaustive — continue auditing every
// NEC article/table actually consumed by the calculators (see shared.js /
// NECCoverageReport.jsx for the full inventory) before adding more entries.
// ─────────────────────────────────────────────────────────────────────────────
export const PENDING_IMPACT_LIST = [
  {
    article: "Table 220.12",
    item: "Non-dwelling occupancy rows not yet source-confirmed for 2020: office, store, school, restaurant, church, industrial, warehouse.",
    status: "pending_verification",
    next_step: "Locate the official NFPA 70-2020 Table 220.12 text (or a second independent secondary source) for each remaining row before changing OCCUPANCY_UNIT_LOADS further.",
  },
  {
    article: "220.14(K)",
    item: "Office/bank receptacle load = larger of (180 VA/yoke after demand) or (1 VA/sq ft). Confirmed to already exist in the 2017 NEC — NOT a 2020-only rule. Currently unimplemented in BOTH 2017 and 2020 — Receptacle Load calculator has no occupancy-aware branch.",
    status: "existing_coverage_gap_both_years",
    next_step: "Report as a 2017+2020 coverage gap (not a year-diff item). Requires separate approval before implementing — do not add to 2020.js only.",
  },
  {
    article: "310.12 (was 310.15(B)(7) in 2017)",
    item: "Single-phase dwelling service/feeder 83% ampacity rule + Table 310.12 (formerly Annex D, brought back in 2020). Article 311 split out medium-voltage content.",
    status: "citation_gated_values_pending",
    next_step: "2020 cites 310.12 and uses owned 83% factor (same 175 A / 0.83 = 210.8 A on 2/0 Cu). Table 310.12 listed sizes and medium-voltage Article 311 are not computed. Confirm 83% vs Table 310.12 path against NFPA 70-2020 before claiming dwelling conductor size outputs codebook-verified.",
  },
  {
    article: "250.122(B)",
    item: "Wording changed to 'for any reason other than as required in 310.15(B) or 310.15(C)' + new exception permitting a qualified person to size the EGC. 2017 wording was 'increased in size from the minimum size that has sufficient ampacity for the intended installation.'",
    status: "citation_gated_formula_pending",
    next_step: "2020 cites 250.122(B) on the proportional-upsize path already in the EGC calculator. Qualified-person exception and 310.15(B)/(C) carve-out are notes only — formula still uses the voltage-drop upsize ratio input. Confirm wording against NFPA 70-2020 before treating exceptions as computed.",
  },
  {
    article: "690 / 705",
    item: "Full field-by-field audit of Solar PV calculator (SOLAR_BUSBAR_120PCT, SOLAR_BACKFEED_MULTIPLIER, rapid-shutdown logic, interconnection rules) — not yet performed. NOTE: the 690.12 80V/30-second rapid-shutdown limit is NOT new in 2020 — it already existed in the 2017 rapid-shutdown framework. Do not implement it as a new 2020 numeric override; the actual 2020 changes are to array-boundary treatment, initiation-device requirements/location, and permitted hazard-control methods, not the voltage/time threshold itself.",
    status: "pending_verification",
    next_step: "Classify every formula/multiplier/table/limit/reference in solarPVCalc.jsx as verified unchanged / numerically changed / applicability changed / reference renumbered / pending — do not assume unchanged because current output matches 2017. Article 705 was also restructured (interconnection, disconnects) and needs its own field-by-field pass.",
  },
  {
    article: "310.12 renumbering",
    item: "Principal low-voltage ampacity table renumbered from Table 310.15(B)(16) (2017) to Table 310.16 (2020). Medium-voltage conductor content moved to new Article 311.",
    status: "citation_gated_values_pending",
    next_step: "2020 calc/UI/trace cite Table 310.16; #6 Cu 40°C/6 CCC math gated identical to 2017. Ampacity cell values still come from shared.js — confirm row-for-row against NFPA 70-2020 before claiming the table numbers themselves verified.",
  },
  {
    article: "250.25",
    item: "New 2020 grounding/bonding requirements for supply-side disconnecting means (equipment ahead of the service disconnect).",
    status: "note_gated_not_computed",
    next_step: "Service Sizing notes 250.25. Bonding jumpers and GEC still use Table 250.102(C)(1) / 250.66. No separate supply-side-disconnect sizing path.",
  },
  {
    article: "Article 242",
    item: "New Article 242 in the 2020 NEC consolidates overvoltage (surge) protection requirements, which may affect how 230.67 SPD requirements are referenced/organized. Not currently modeled as its own reference in this app.",
    status: "note_gated_not_computed",
    next_step: "Service Sizing still cites 230.67 for the dwelling SPD mandate and notes Article 242 as the 2020 overvoltage-equipment organization. No separate 242 calculator path.",
  },
  {
    article: "445 (Generators)",
    item: "2020 NEC added emergency prime-mover shutdown requirements for non-cord-and-plug-connected generators at one- and two-family dwellings.",
    status: "note_gated_not_computed",
    next_step: "2020 Generator Sizing shows 445.18 dwelling emergency-shutdown note. kVA math is pending-same as 2017. Do not change generator sizing formulas without a confirmed source.",
  },
  {
    article: "551.71 / 551.73 (RV Park)",
    item: "2020 cycle involved GFCI-coordination ambiguity between 210.8 and 551.71 for 30A/50A RV-site receptacles. Demand table identity remains Table 551.73(A).",
    status: "demand_table_owned_gfci_pending",
    next_step: "2020 owns RV_PARK_DEMAND / RV_SITE_VA; 36+ still 41% as a pending copy. Do not treat 551.71 vs 210.8 GFCI, weather-resistant, or TIA guidance as verified — those notes are not computed.",
  },
  {
    article: "Article 555 (Marina Shore Power)",
    item: "Article 555 was reorganized in the 2020 cycle (section numbering, demand-factor table identity/notes, receptacle grouping, phase balancing, GFPE/GFCI, disconnects).",
    status: "citation_gated_values_pending",
    next_step: "2020 owns MARINA_DEMAND and cites Table 555.6; 71+ still 30% as a pending copy of 2017. Verify table notes, GFPE/GFCI, disconnects, and 555.11 numbering against NFPA 70-2020 before calling factors codebook-confirmed.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Verification metadata
// ─────────────────────────────────────────────────────────────────────────────
export const VERIFIED = false;  // NOT full-codebook verified against NFPA 70-2020
export const VERIFICATION_NOTE =
  "Every entry above is documented in CHANGE_METADATA with 2017 rule, 2020 rule, exact " +
  "difference, affected calculators, impact type, source, and a known-answer test. All " +
  "entries are currently ai_reviewed_pending_human_approval — none are human-verified " +
  "against the official NFPA 70-2020 text yet. Do NOT set VERIFIED = true until every " +
  "CHANGE_METADATA entry reaches verification_status \"verified\" AND every calculator in " +
  "each entry's affected_calculators has passed 2017 immutability tests, 2020 change tests, " +
  "step-by-step math validation, Calculation Trace validation, and Testing Agent validation. " +
  "See PENDING_IMPACT_LIST for open research items not yet implemented — this file is NOT " +
  "represented as an exhaustive account of every 2017→2020 change affecting these calculators.";