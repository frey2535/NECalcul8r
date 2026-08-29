/**
 * NEC 2026 — ⚠️ PENDING PUBLICATION
 *
 * These values are speculative/preliminary based on proposed changes
 * and industry expectations. THEY ARE NOT FINAL.
 *
 * Do NOT use these values for actual code compliance.
 * Label all outputs with "pending verification".
 */

export const NEC_YEAR = "2026";

// ─── Table 220.12 — Occupancy Unit Loads (2026) ───────────────────────
// 2026: ⚠️ PENDING VERIFICATION. Values below are COPIED FROM 2020 as
// placeholders. NOT verified against 2026 NEC. Every NEC edition owns its
// own data file — no hidden inheritance from 2020.
export const OCCUPANCY_UNIT_LOADS = {
  dwelling: 3.0,        // unchanged — confirmed (now 220.14(J))
  hotel_motel: 1.70,    // ⚠️ PENDING — copied from 2020, NOT verified for 2026
  hospital: 1.6,        // ⚠️ PENDING — copied from 2020, NOT verified for 2026
  office: 3.5,          // pending verification — kept at 2017 value
  store: 3.0,           // pending verification — kept at 2017 value
  school: 3.0,          // pending verification — kept at 2017 value
  restaurant: 2.0,      // pending verification — kept at 2017 value
  church: 1.0,          // pending verification — kept at 2017 value
  garage: 0.3,         // ⚠️ PENDING — copied from 2020, NOT verified for 2026
  industrial: 2.0,      // pending verification — kept at 2017 value
  warehouse: 0.25,     // pending verification — kept at 2017 value
  armory: 1.7,          // ⚠️ PENDING — copied from 2020, NOT verified for 2026
};

// ─── GFCI Requirements (NEC 210.8) — same as 2023 ──────────────────
export const EV_GFCI_REQUIRED = true;
// ─── Dwelling Unit Requirements ─────────────────────────────────────
export const DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true;  // 230.85
export const DWELLING_SPD_REQUIRED = true;                  // 230.67

// ─── Island / Peninsula Receptacles (NEC 210.52(C)) ─────────────────
// 2026: ⚠️ PENDING — assumed same as 2023 until verified
export const ISLAND_PENINSULA_RULE = "⚠️ PENDING 2026 VERIFICATION — assumed same as 2023. All islands/peninsulas require receptacle(s). NEC 210.52(C).";

// ─── GFCI Requirements (NEC 210.8) ──────────────────────────────────
// 2026: ⚠️ PENDING — assumed same as 2023 until verified
export const GFCI_SCOPE_DWELLING = "⚠️ PENDING 2026 VERIFICATION — assumed same as 2023. 125V–250V receptacles in bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchen, laundry.";

// ─── 210.8(B) Other-Than-Dwelling GFCI — 2026 EXPLICIT DEFINITION ──────
// 2026: ⚠️ PENDING VERIFICATION. Values below are COPIED FROM 2020 as
// placeholders. They are NOT verified against the 2026 NEC and must not
// be represented as confirmed 2026 code. Every NEC edition owns its own
// data file — no hidden inheritance from 2020. When the 2026 NEC is
// published, verify and update these values in place.
export const GFCI_SCOPE_OTHER_THAN_DWELLING =
  "⚠️ PENDING 2026 VERIFICATION — values copied from 2020, NOT verified. " +
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
  "NEC 210.8(B) — 2026 placeholder (copied from 2020; pending official NFPA 70-2026 verification).";

// 2026: ⚠️ PENDING — structured rule copied from 2020 as placeholder.
// NOT verified against 2026 NEC. Update in place when 2026 is published.
export const GFCI_210_8B_RULE = {
  singlePhase: {
    minVolts: 125,
    maxVolts: 250,        // placeholder — copied from 2020
    maxVoltsToGround: 150,
    maxAmps: 50,          // placeholder — copied from 2020
    applies: true,
  },
  threePhase: {
    included: true,       // placeholder — copied from 2020
    maxVoltsToGround: 150,
    maxAmps: 100,         // placeholder — copied from 2020
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

// ─── 210.8(D) & 422.5 — Specific Appliance GFCI — 2026 EXPLICIT DEFINITION ─
// 2026: ⚠️ PENDING VERIFICATION. Values below are COPIED FROM 2020 as
// placeholders. NOT verified against 2026 NEC. Every NEC edition owns its
// own data file — no hidden inheritance.
export const GFCI_SPECIFIC_APPLIANCES =
  "⚠️ PENDING 2026 VERIFICATION — values copied from 2020, NOT verified. " +
  "GFCI required for all listed appliances per 422.5, including dishwashers (all occupancies) " +
  "and sump pumps. NEC 210.8(D) / 422.5 — 2026 placeholder (copied from 2020; pending official NFPA 70-2026 verification).";

export const DISHWASHER_GFCI_REQUIRED = true;   // 422.5 — placeholder, copied from 2020
export const SUMP_PUMP_GFCI_REQUIRED  = true;   // 422.5 — placeholder, copied from 2020

// Metadata for 210.8(D) copied fields — do not allow copied data to appear
// equivalent to verified data.
export const GFCI_210_8D_METADATA = {
  copiedFrom: "2020",
  verificationStatus: "pending",
  independentlyReviewed: false,
  note: "Values copied from 2020.js as placeholders. NOT verified against NFPA 70-2026. Pending official source verification.",
};

// ─── 210.8(E) — GFCI for Equipment-Servicing Receptacles — 2026 EXPLICIT ──
// 2026: ⚠️ PENDING VERIFICATION. Values below are COPIED FROM 2020 as
// placeholders. NOT verified against 2026 NEC. Every NEC edition owns its
// own data file — no hidden inheritance.
export const GFCI_EQUIPMENT_SERVICING_RECEPTACLE =
  "⚠️ PENDING 2026 VERIFICATION — values copied from 2020, NOT verified. " +
  "GFCI required for all receptacles installed per 210.63 (equipment servicing — " +
  "HVAC, refrigeration, and similar equipment requiring service). " +
  "NEC 210.8(E) — 2026 placeholder (copied from 2020; pending official NFPA 70-2026 verification).";

export const GFCI_210_8E_METADATA = {
  copiedFrom: "2020",
  verificationStatus: "pending",
  independentlyReviewed: false,
  note: "Values copied from 2020.js as placeholders. NOT verified against NFPA 70-2026. Pending official source verification.",
};

// ─── 210.8(F) — GFCI for Outdoor Outlets ≤50A — 2026 EXPLICIT ──
// 2026: ⚠️ PENDING VERIFICATION. Values below are COPIED FROM 2020 as
// placeholders. NOT verified against 2026 NEC. Every NEC edition owns its
// own data file — no hidden inheritance.
export const GFCI_OUTDOOR_DWELLING_50A =
  "⚠️ PENDING 2026 VERIFICATION — values copied from 2020, NOT verified. " +
  "GFCI required for outdoor outlets (dwelling units) on single-phase branch circuits " +
  "rated ≤150V to ground and ≤50A. Exception: lighting outlets per 210.8(F) exception. " +
  "NEC 210.8(F) — 2026 placeholder (copied from 2020; pending official NFPA 70-2026 verification).";

export const GFCI_210_8F_METADATA = {
  copiedFrom: "2020",
  verificationStatus: "pending",
  independentlyReviewed: false,
  officialSourceVerified: false,
  note: "Values copied from 2020.js as placeholders. NOT verified against NFPA 70-2026. Pending official source verification.",
};

// ─── EV Charging (NEC 625) ──────────────────────────────────────────
export const EV_MINIMUM_LOAD_VA = 7200;  // ⚠️ PENDING — same as 2023, subject to change

// ─── Service Minimums ────────────────────────────────────────────────
export const DWELLING_MIN_SERVICE_AMPS = 100;  // 230.42(B)

export const VERIFIED = false;  // ← CRITICAL: 2026 is NOT verified