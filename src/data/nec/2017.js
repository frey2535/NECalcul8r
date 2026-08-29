/**
 * NEC 2017 specific values.
 * These override shared.js defaults when keys match.
 *
 * Key differences from later codes:
 * - No GFCI requirement for EV chargers (added 2020 625.54)
 * - No outdoor emergency disconnect for dwellings (added 2020 230.85)
 * - No SPD requirement for dwellings (added 2023 230.67)
 * - Kitchen GFCI: only within 6ft of sink, not all receptacles
 * - Dishwasher GFCI scope: pending verification against authorized NFPA 70-2017
 * - No minimum EV load (added 2023 625.42)
 */

export const NEC_YEAR = "2017";

// ─── GFCI Requirements (NEC 210.8) ──────────────────────────────────
// 2017: narrower scope — 125V, 15/20A in defined rooms; does NOT include
// all receptacles in garages/basements/outdoor unless previously required.
export const EV_GFCI_REQUIRED = false;              // 625.54 — not required in 2017
export const GFCI_SCOPE_DWELLING = "125V, 15/20A receptacles in bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchen countertops within 6 ft of sink, boathouses";  // 210.8(A)

// ─── 210.8(B) Other-Than-Dwelling GFCI — structured rule (2017) ──────
// Source: secondary source analysis; NOT verified against official
// NFPA 70-2017 text in this project. Values reflect the widely-cited
// 2017 NEC 210.8(B) text: "All 125-volt, 15- and 20-ampere receptacles."
//   - Single-phase 125V only (NOT 125V–250V — that expansion is 2020)
//   - 15A and 20A only (NOT ≤50A — that expansion is 2020)
//   - No three-phase coverage (added in 2020)
//   - 10 locations (laundry and bathtubs/showers added in 2020)
//   - No listed locking receptacle exception (added in 2020)
// 2017 display string for 210.8(B) — matches the structured rule above.
// Previously this field was undefined for 2017, causing the NoteBox item to
// not render. Now it renders with the narrower 2017 scope so the display
// matches the structured documentation data. No calculator currently
// evaluates 210.8(B) compliance — this is display/reference text only.
export const GFCI_SCOPE_OTHER_THAN_DWELLING =
  "Single-phase 125V, 15/20A receptacles on circuits ≤150V to ground. " +
  "No three-phase coverage. GFCI required in: bathrooms, kitchens, rooftops, " +
  "outdoors, sinks (within 6 ft), indoor wet locations, locker rooms with " +
  "showering facilities, garages/service bays, crawl spaces, unfinished basements. " +
  "NEC 210.8(B) — 2017 (narrower than 2020: no 250V, no ≤50A, no 3-phase, fewer locations). " +
  "Source: secondary source analysis — not verified against official NFPA 70-2017 text.";

export const GFCI_210_8B_RULE = {
  singlePhase: {
    minVolts: 125,
    maxVolts: 125,        // 2017: 125V only
    maxVoltsToGround: 150,
    maxAmps: 20,          // 2017: 15/20A only
    applies: true,
  },
  threePhase: {
    included: false,      // 2017: no three-phase coverage
    maxVoltsToGround: 150,
    maxAmps: 100,
  },
  locations: [
    { id: "bathroom", label: "Bathrooms" },
    { id: "kitchen", label: "Kitchens" },
    { id: "rooftop", label: "Rooftops" },
    { id: "outdoor", label: "Outdoors" },
    { id: "sink", label: "Sinks — within 6 ft of the bowl", maxDistanceFt: 6 },
    { id: "indoor_wet", label: "Indoor wet locations" },
    { id: "locker_room_shower", label: "Locker rooms with associated showering facilities" },
    { id: "garage_service_bay", label: "Garages, service bays, and similar areas" },
    { id: "crawl_space", label: "Crawl spaces — at or below grade level" },
    { id: "unfinished_basement", label: "Unfinished portions or areas of the basements" },
  ],
  exception: null,        // 2017: no listed locking receptacle exception
};

// ─── 210.8(D) & 422.5 — Specific Appliance GFCI — 2017 EXPLICIT DEFINITION ─
// 2017: Verified per user codebook review (ArticleVerification records marked
// "verified" for NEC 2017). Dishwasher GFCI required per 422.5; sump pump GFCI
// not required in 2017 (added in 2020). Every NEC edition owns its own data
// file — no hidden inheritance.
export const GFCI_SPECIFIC_APPLIANCES =
  "GFCI required for dishwashers per 422.5 (2017). Sump pump GFCI not required " +
  "in 2017 (added in 2020 NEC). NEC 210.8(D) / 422.5 — 2017.";

export const DISHWASHER_GFCI_REQUIRED = true;   // 422.5 — verified per user codebook review
export const SUMP_PUMP_GFCI_REQUIRED  = false;  // 422.5 — not required in 2017 (added in 2020)

// ─── 210.8(E) — GFCI for Equipment-Servicing Receptacles — 2017 EXPLICIT ──
// 2017: 210.8(E) did not exist in the 2017 NEC (added in 2020). Set to null so
// the HVACLoad NoteBox item does not render for 2017. Every NEC edition owns
// its own data file — no hidden inheritance.
export const GFCI_EQUIPMENT_SERVICING_RECEPTACLE = null;

export const GFCI_210_8E_METADATA = {
  copiedFrom: null,
  applicabilityStatus: "not_applicable_2017",
  verificationStatus: "verified",
  independentlyReviewed: true,
  officialSourceVerified: true,
  note:
    "210.8(E) did not exist in the 2017 NEC — new section added in 2020.",
};

// ─── 210.8(F) — GFCI for Outdoor Outlets ≤50A — 2017 EXPLICIT ──
// 2017: This section did not exist in the 2017 NEC. Outdoor dwelling GFCI
// was limited to 125V/15-20A receptacles under 210.8(A). Set to null (NOT
// false) so the NoteBox item does not render for 2017. Every NEC edition
// owns its own data file — no hidden inheritance.
export const GFCI_OUTDOOR_DWELLING_50A = null;

export const GFCI_210_8F_METADATA = {
  copiedFrom: null,
  sectionExists: false,
  verificationStatus: "pending",
  independentlyReviewed: false,
  officialSourceVerified: false,
  note:
    "210.8(F) did not exist in the 2017 NEC — new section added in 2020. " +
    "2017 outdoor dwelling GFCI was limited to 125V/15-20A under 210.8(A). " +
    "Pending verification against authorized NFPA 70-2017.",
};

// ─── Dwelling Unit Requirements ─────────────────────────────────────
export const DWELLING_OUTDOOR_DISCONNECT_REQUIRED = false;  // 230.85 — added in 2020
export const DWELLING_SPD_REQUIRED = false;                  // 230.67 — added in 2023

// ─── Island / Peninsula Receptacles (NEC 210.52(C)) ─────────────────
// 2017: at least one receptacle required for islands/peninsulas ≥ 12 sq ft
// (countertop area) if ≥ 12 in. wide. Supply via countertop, wall, or base.
export const ISLAND_PENINSULA_RULE = "≥12 sq ft countertop area: at least 1 receptacle required. May be supplied from countertop, wall, or base cabinet. NEC 210.52(C)(2)/(C)(3).";

// ─── EV Charging (NEC 625) ──────────────────────────────────────────
export const EV_MINIMUM_LOAD_VA = 0;  // No minimum per-EVSE load in 2017

// ─── Pool pump GFCI (NEC 680.21(C) 2017) ──────────────────────────
// 2017: GFCI required for single-phase 120–240V pool pump motors on
// 15/20A circuits (receptacle or direct). Three-phase expansion is 2020.
export const POOL_PUMP_GFCI_REQUIRED = true;
export const POOL_PUMP_GFCI_ALL_PHASES = false;
export const POOL_PUMP_GFCI_NOTE =
  "680.21(C): GFCI required for single-phase 120–240V pool pump motors supplied by 15/20A branch circuits (receptacle or direct connection). Three-phase motors were added in 2020.";

// 2017 120% busbar rule lived under 705.12(D)(2), not 705.12(B).
export const SOLAR_120_RULE_ARTICLE = "705.12(D)(2)(3)(b)";

// ─── Lighting Demand: NEC Table 220.42 (2017) ───────────────────
// 2017 NEC Table 220.42 — includes Hospitals and different hotel/motel
// demand factors than later editions.
export const LIGHTING_DEMAND = {
  dwelling:    { tiers: [{ band: 3000, factor: 1.00 }, { band: 117000, factor: 0.35 }, { band: Infinity, factor: 0.25 }] },
  hospital:    { tiers: [{ band: 50000, factor: 0.40 }, { band: Infinity, factor: 0.20 }] },
  hotel_motel: { tiers: [{ band: 20000, factor: 0.50 }, { band: 80000, factor: 0.40 }, { band: Infinity, factor: 0.30 }] },
  warehouse:   { tiers: [{ band: 12500, factor: 1.00 }, { band: Infinity, factor: 0.50 }] },
};

// Table 220.12 — 2017 occupancies (VA/ft²). Unlisted occupancies use 2 VA/ft².
export const OCCUPANCY_UNIT_LOADS = {
  dwelling: 3.0,
  hotel_motel: 2.0,
  hospital: 2.0,
  office: 3.5,
  bank: 3.5,
  store: 3.0,
  school: 3.0,
  restaurant: 2.0,
  church: 1.0,
  garage: 0.5,
  industrial: 2.0,
  warehouse: 0.25,
  armory: 1.0,
  barber: 3.0,
  club: 2.0,
  courtroom: 2.0,
  lodge: 1.5,
};
export const OCCUPANCY_UNIT_LOAD_DEFAULT = 2.0; // Table 220.12 note — occupancies not listed
export const OFFICE_RECEPTACLE_MIN_VA_PER_SQFT = 1; // 220.14(K) office buildings (and banks)
export const SHOW_WINDOW_VA_PER_FOOT = 200; // 220.14(G) 2017 numbering often 220.14(F)/(G)
export const SIGN_OUTLET_MIN_VA = 1200; // 220.14(F) / 600.5 — commercial calc uses 220.14(E) in UI; 2017 220.14 signs
export const RECEPTACLE_YOKE_VA = 180; // 220.14(I)
export const DWELLING_LIGHTING_ARTICLE = "Table 220.12";
export const HOTEL_LIGHTING_ARTICLE = "Table 220.12";
export const OCCUPANCY_UNIT_LOAD_TABLE = "Table 220.12";

// ─── Commercial Kitchen Demand: NEC Table 220.56 (2017) ─────────
// 2017 NEC Table 220.56 — "6 and over" is a flat 65% (later editions
// step down further: 7=60%, 8=55%, 9=50%, 10+=50%).
export const COMMERCIAL_KITCHEN_DEMAND = [
  { units: 1, factor: 100 }, { units: 2, factor: 100 },
  { units: 3, factor: 90 },  { units: 4, factor: 80 },
  { units: 5, factor: 70 },  { units: 999, factor: 65 },
];

// ─── Service Minimums ────────────────────────────────────────────────
export const DWELLING_MIN_SERVICE_AMPS = 100;  // 230.42(B)
export const HVAC_OCPD_MULTIPLIER = 1.75; // 440.22(A) — 175%, next size down
export const ARC_ENERGY_REDUCTION_THRESHOLD_AMPS = 1200; // 240.87 (2017)

// ─── 220.82 Optional Method HVAC — 2017 EXPLICIT ─────────────────────
// 220.82(A) applicability; 220.82(B) general load (first 10 kVA @ 100%, remainder
// @ 40%); 220.82(C) largest of six HVAC selections:
//   (C)(1) AC 100%
//   (C)(2) heat-pump compressor without supplemental 100%
//   (C)(3) compressor 100% + supplemental 65%; omit compressor from this
//          selection if it cannot run with the supplemental heat
//   (C)(4) electric space heating, fewer than 4 separately controlled units → 65%
//   (C)(5) four or more separately controlled units → 40%
//   (C)(6) electric thermal storage / other heating expected continuous at
//          full nameplate → 100%; that system is not also calculated under
//          another (C) selection
// Annex D D2(a) 2017: 9 kW heat in 5 rooms at 40% = 3600 VA because 5 units
// meets (C)(5), not because <4 units use 40%. Annex D’s printed “(C)(6)” on
// that 40% line does not match 2017 220.82(C) item numbers.
export const OPTIONAL_APPLICABILITY_ARTICLE = "220.82(A)";
export const OPTIONAL_GENERAL_LOAD_ARTICLE = "220.82(B)";
export const OPTIONAL_HVAC = {
  acFactor: 1.00,
  heatPumpOnlyFactor: 1.00,
  supplementalHeatFactor: 0.65,
  spaceHeatLt4Factor: 0.65,
  spaceHeatGe4Factor: 0.40,
  thermalStorageFactor: 1.00,
  spaceHeatUnitThreshold: 4,
};

// ─── 220.40 Standard Method — 2017 EXPLICIT ──────────────────────
// Table 220.12 dwelling lighting 3 VA/ft², Table 220.42 dwelling tiers,
// Table 220.55 (shared RANGE_DEMAND), Table 220.54 single-dryer min 5000 W,
// 220.52 mins, 220.53 75% when 4+ fastened appliances (not range/dryer/HVAC),
// 220.14(J) bathroom circuits not extra 1500 VA.
export const SMALL_APPLIANCE_MIN_CIRCUITS = 2;
export const LAUNDRY_MIN_CIRCUITS = 1;
export const RANGE_NOTE1_MAJOR_FRACTION_KW = 0.5; // Table 220.55 Note 1

// ─── Table 220.84 Multifamily Optional — 2017 EXPLICIT ───────────
// Lookup is find(r => units <= r.units). 51–61 is 27%; 62 and over is 26%.
// Prior encoding used units: 62 at 27%, which wrongly gave 62 units 27%.
export const MULTIFAMILY_DEMAND_TABLE = [
  { units: 3, factor: 45 }, { units: 4, factor: 44 }, { units: 5, factor: 43 },
  { units: 6, factor: 42 }, { units: 7, factor: 41 }, { units: 8, factor: 40 },
  { units: 9, factor: 39 }, { units: 10, factor: 38 }, { units: 11, factor: 37 },
  { units: 12, factor: 36 }, { units: 13, factor: 35 }, { units: 14, factor: 34 },
  { units: 15, factor: 33 }, { units: 20, factor: 32 }, { units: 25, factor: 31 },
  { units: 30, factor: 30 }, { units: 40, factor: 29 }, { units: 50, factor: 28 },
  { units: 61, factor: 27 }, { units: 999, factor: 26 },
];

// ─── Farm Part V — 2017 EXPLICIT ────────────────────────────────
// Table 220.102: ampere load at 240 V — first 60 A 100%, next 60 A 50%, remainder 25%;
// not less than loads expected to operate simultaneously, or 125% of the largest motor.
// Table 220.103: rank those 220.102 results 100%/75%/65%/50%, then add dwelling (note).
export const FARM_102_VOLTAGE = 240;
export const FARM_102_MOTOR_MULTIPLIER = 1.25;
export const FARM_102_TIERS = [
  { amps: 60, factor: 1.00 },
  { amps: 60, factor: 0.50 },
  { amps: Infinity, factor: 0.25 },
];
export const FARM_BUILDING_DEMAND = [1.00, 0.75, 0.65, 0.50]; // Table 220.103

// ─── Table 551.73(A) RV Park — 2017 EXPLICIT ─────────────────────
export const RV_PARK_DEMAND = [
  { sites: 1, factor: 100 }, { sites: 2, factor: 90 }, { sites: 3, factor: 80 },
  { sites: 4, factor: 75 }, { sites: 5, factor: 65 }, { sites: 6, factor: 60 },
  { sites: 9, factor: 55 }, { sites: 12, factor: 50 }, { sites: 15, factor: 48 },
  { sites: 18, factor: 47 }, { sites: 21, factor: 45 }, { sites: 24, factor: 43 },
  { sites: 35, factor: 42 }, { sites: 9999, factor: 41 },
];
export const RV_SITE_VA = { "20A": 2400, "30A": 3600, "50A": 12000 };
export const RV_PARK_DEMAND_TABLE = "Table 551.73(A)";

// ─── Table 555.12 Marina Shore Power — 2017 EXPLICIT ─────────────
export const MARINA_DEMAND = [
  { count: 4, factor: 100 }, { count: 8, factor: 90 }, { count: 14, factor: 80 },
  { count: 30, factor: 70 }, { count: 40, factor: 60 }, { count: 50, factor: 50 },
  { count: 70, factor: 40 }, { count: 9999, factor: 30 },
];
export const MARINA_DEMAND_TABLE = "Table 555.12";

export const AMPACITY_TABLE = "Table 310.15(B)(16)";
export const AMPACITY_TEMP_ARTICLE = "310.15(B)(2)(a)";
export const AMPACITY_BUNDLE_ARTICLE = "310.15(B)(3)(a)";
export const DWELLING_SERVICE_ARTICLE = "310.15(B)(7)";
export const DWELLING_SERVICE_CONDUCTOR_FACTOR = 0.83;
export const EGC_UPSIZE_ARTICLE = "250.122(B)";
export const EGC_UPSIZE_NOTE = null;
export const DWELLING_GENERATOR_SHUTDOWN_ARTICLE = null;
export const DWELLING_GENERATOR_SHUTDOWN_NOTE = null;
export const SPD_ARTICLE = null;
export const OVERVOLTAGE_ARTICLE = null;
export const OVERVOLTAGE_ARTICLE_NOTE = null;
export const SUPPLY_SIDE_DISCONNECT_ARTICLE = null;
export const SUPPLY_SIDE_DISCONNECT_NOTE = null;

export const VERIFIED = true;