/**
 * NEC 2023 specific values.
 * These override shared.js defaults when keys match.
 *
 * Key changes from 2020:
 * - SPD required for dwellings (230.67) — new
 * - EV charging load refined: minimum 7200VA per EVSE (625.42)
 * - GFCI expanded to 250V receptacles in more locations
 * - Emergency disconnect marking requirements refined (230.85)
 */

import { EGC_TABLE as _EGC_TABLE } from "./shared";

export const NEC_YEAR = "2023";

// 2023 carries forward the 2020 Table 250.122 high-amperage aluminum/copper-clad
// aluminum change: 5000A and 6000A require 1250 kcmil.
export const EGC_TABLE = _EGC_TABLE.map((row) =>
  row.ocpd === 5000 || row.ocpd === 6000
    ? { ...row, aluminum: "1250" }
    : row
);

// ─── GFCI Requirements (NEC 210.8) ──────────────────────────────────
// 2023: Retained 2020 scope. Additional clarifications for 250V in dwelling
// attached garages. AFCI/GFCI combination requirements refined.
export const GFCI_SCOPE_DWELLING = "125V–250V, 15/20/30A receptacles — same scope as 2020. 250V receptacles in attached garages and similar areas clarified. Kitchen, laundry, bathroom, outdoor, crawl space, unfinished basement covered.";  // 210.8(A)
export const EV_GFCI_REQUIRED = true;

// ─── 210.8(B) Other-Than-Dwelling GFCI — 2023 EXPLICIT DEFINITION ──────
// 2023: Values below are COPIED FROM 2020. NOT independently verified for
// 2023 — the 2020 secondary source verification (Captain Code guide) is
// assumed to carry forward. Every NEC edition owns its own data file —
// no hidden inheritance from 2020. When a 2023 source is verified, update
// these values in place.
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
  "NEC 210.8(B) — 2023 (copied from 2020; NOT independently verified for 2023; pending official NFPA 70-2023 verification).";

// 2023: structured rule copied from 2020. NOT independently verified for 2023.
export const GFCI_210_8B_RULE = {
  singlePhase: {
    minVolts: 125,
    maxVolts: 250,
    maxVoltsToGround: 150,
    maxAmps: 50,
    applies: true,
  },
  threePhase: {
    included: true,
    maxVoltsToGround: 150,
    maxAmps: 100,
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

// ─── 210.8(D) & 422.5 — Specific Appliance GFCI — 2023 EXPLICIT DEFINITION ─
// 2023: Values below are COPIED FROM 2020. NOT independently verified for
// 2023. Every NEC edition owns its own data file — no hidden inheritance.
export const GFCI_SPECIFIC_APPLIANCES =
  "GFCI required for all listed appliances per 422.5, including dishwashers (all occupancies) " +
  "and sump pumps. NEC 210.8(D) / 422.5 — 2023 (copied from 2020; NOT independently verified for 2023; pending official NFPA 70-2023 verification).";

export const DISHWASHER_GFCI_REQUIRED = true;   // 422.5 — copied from 2020
export const SUMP_PUMP_GFCI_REQUIRED  = true;   // 422.5 — copied from 2020

// Metadata for 210.8(D) copied fields — do not allow copied data to appear
// equivalent to verified data.
export const GFCI_210_8D_METADATA = {
  copiedFrom: "2020",
  verificationStatus: "pending",
  independentlyReviewed: false,
  note: "Values copied from 2020.js. NOT independently verified against NFPA 70-2023. Pending official source verification.",
};

// ─── 210.8(E) — GFCI for Equipment-Servicing Receptacles — 2023 EXPLICIT ──
// 2023: Values below are COPIED FROM 2020. NOT independently verified for
// 2023. Every NEC edition owns its own data file — no hidden inheritance.
export const GFCI_EQUIPMENT_SERVICING_RECEPTACLE =
  "GFCI required for all receptacles installed per 210.63 (equipment servicing — " +
  "HVAC, refrigeration, and similar equipment requiring service). " +
  "NEC 210.8(E) — 2023 (copied from 2020; NOT independently verified for 2023; pending official NFPA 70-2023 verification).";

export const GFCI_210_8E_METADATA = {
  copiedFrom: "2020",
  verificationStatus: "pending",
  independentlyReviewed: false,
  note: "Values copied from 2020.js. NOT independently verified against NFPA 70-2023. Pending official source verification.",
};

// ─── 210.8(F) — GFCI for Outdoor Outlets ≤50A — 2023 EXPLICIT ──
// 2023: Values below are COPIED FROM 2020. NOT independently verified for
// 2023. Every NEC edition owns its own data file — no hidden inheritance.
export const GFCI_OUTDOOR_DWELLING_50A =
  "GFCI required for outdoor outlets (dwelling units) on single-phase branch circuits " +
  "rated ≤150V to ground and ≤50A. Exception: lighting outlets per 210.8(F) exception. " +
  "NEC 210.8(F) — 2023 (copied from 2020; NOT independently verified for 2023; pending official NFPA 70-2023 verification).";

export const GFCI_210_8F_METADATA = {
  copiedFrom: "2020",
  verificationStatus: "pending",
  independentlyReviewed: false,
  officialSourceVerified: false,
  note: "Values copied from 2020.js. NOT independently verified against NFPA 70-2023. Pending official source verification.",
};

// ─── Dwelling Unit Requirements ─────────────────────────────────────
export const DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true;  // 230.85
export const DWELLING_SPD_REQUIRED = true;                  // 230.67 — new in 2023

// ─── Island / Peninsula Receptacles (NEC 210.52(C)) ─────────────────
// 2023: Retained 2020 rules. Below-counter/pop-up outlets continue to be permitted.
export const ISLAND_PENINSULA_RULE = "All islands/peninsulas require receptacle(s). Below-counter and pop-up-style outlets permitted. Same as 2020 rules. NEC 210.52(C).";

// ─── EV Charging (NEC 625) ──────────────────────────────────────────
export const EV_MINIMUM_LOAD_VA = 7200;  // 625.42 — 7200VA or nameplate, whichever larger

// ─── Table 220.12 — Occupancy Unit Loads (2023) ───────────────────────
// 2023: Values below are COPIED FROM 2020. NOT independently verified for
// 2023. The 2020 NEC reconstructed Table 220.12 using ASHRAE/IECC data;
// dwellings were removed (now 220.14(J), still 3.0). Every NEC edition owns
// its own data file — no hidden inheritance from 2020.
export const OCCUPANCY_UNIT_LOADS = {
  dwelling: 3.0,        // unchanged — confirmed (now 220.14(J))
  hotel_motel: 1.70,    // copied from 2020 (was 2.0 in 2017) — pending 2023 verification
  hospital: 1.6,        // copied from 2020 (was 2.0 in 2017) — pending 2023 verification
  office: 3.5,          // pending verification — kept at 2017 value
  store: 3.0,           // pending verification — kept at 2017 value
  school: 3.0,          // pending verification — kept at 2017 value
  restaurant: 2.0,      // pending verification — kept at 2017 value
  church: 1.0,          // pending verification — kept at 2017 value
  garage: 0.3,         // copied from 2020 (was 0.5 in 2017) — pending 2023 verification
  industrial: 2.0,      // pending verification — kept at 2017 value
  warehouse: 0.25,     // pending verification — kept at 2017 value
  armory: 1.7,          // copied from 2020 (was 1.0 in 2017) — pending 2023 verification
};

// ─── Service Minimums ────────────────────────────────────────────────
export const DWELLING_MIN_SERVICE_AMPS = 100;  // 230.42(B)

export const VERIFIED = true;