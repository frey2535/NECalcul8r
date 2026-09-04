/**
 * Wraps a calculator result object with trace metadata.
 * 
 * Usage:
 *   const result = dwellingStandardCalc(inputs, nec);
 *   return withTrace(result, {
 *     nec_year: "2023",
 *     data_files_used: ["data/nec/shared.js", "data/nec/2023.js"],
 *     articles_used: ["220.12", "220.42", "220.82", "240.6(A)"],
 *     tables_used: ["Table 220.42", "Table 220.82", "Table 240.6(A)"],
 *     fields_used: ["DWELLING_LIGHTING_VA_PER_SQFT", "SMALL_APPLIANCE_VA", "DWELLING_DEMAND_TABLE", "STD_OCPD_SIZES"],
 *   });
 */
export function withTrace(resultObject, trace) {
  return {
    ...resultObject,
    trace,
  };
}

/**
 * NEC data field registry — maps field names to their source, value, and description.
 * Used by the CalculationTrace panel for clickable field drill-down.
 * Values reflect shared.js defaults; year-specific overrides may differ.
 */
export const FIELD_META = {
  // ── Dwelling ──────────────────────────────────────────────────────
  DWELLING_LIGHTING_VA_PER_SQFT:        { value: "3 VA/sq ft",      source: "Table 220.12",      description: "General lighting unit load for dwelling units.", usedBy: ["Dwelling Standard", "Dwelling Optional", "Multifamily Load"] },
  SMALL_APPLIANCE_VA:                   { value: "1500 VA",          source: "220.52(A)",          description: "Minimum VA per small appliance branch circuit.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  LAUNDRY_VA:                           { value: "1500 VA",          source: "220.52(B)",          description: "Minimum VA for laundry branch circuit.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  DWELLING_DEMAND_TABLE:                { value: "Tiered demand",    source: "Table 220.42",       description: "100% first 3 kVA, 35% next 117 kVA, 25% remainder.", usedBy: ["Dwelling Standard"] },
  DWELLING_MIN_SERVICE_AMPS:            { value: "100 A",            source: "230.79(C)",          description: "Minimum service disconnect rating for a 1-family dwelling.", usedBy: ["Dwelling Standard", "Dwelling Optional", "Service Sizing"] },
  DWELLING_SPD_REQUIRED:                { value: "See year",         source: "230.67",             description: "Surge-protective device requirement (varies by NEC year).", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  DWELLING_OUTDOOR_DISCONNECT_REQUIRED: { value: "See year",         source: "230.85",             description: "Outdoor emergency disconnect requirement.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  GFCI_SCOPE_DWELLING:                  { value: "See year",         source: "210.8(A)",           description: "Required GFCI locations in dwelling units.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  GFCI_SCOPE_OTHER_THAN_DWELLING:       { value: "See year",         source: "210.8(B)",           description: "Required GFCI locations in other-than-dwelling units. 2020: expanded to 125V–250V single-phase ≤50A + three-phase ≤100A, 12 locations. Source: Captain Code 2020 change guide (secondary).", usedBy: ["Commercial Load", "Receptacle Load"] },
  GFCI_210_8B_RULE:                     { value: "Structured rule",   source: "210.8(B)",           description: "Machine-readable 210.8(B) rule (phase limits, locations, exception). Documented rule — no active calculator evaluation. 2017: 125V/15-20A, no 3-phase, 10 locations. 2020: 125-250V/≤50A + 3-phase ≤100A, 12 locations, locking-receptacle exception.", usedBy: ["Trace/coverage documentation only — no active calculator"] },
  DISHWASHER_GFCI_REQUIRED:             { value: "See year",         source: "210.8(D) / 422.5",   description: "Dishwasher GFCI requirement flag (varies by NEC year). 2017: true — pending verification against authorized NFPA 70-2017. 2020: true (expanded to all occupancies) — pending verification against authorized NFPA 70-2020. Display/reference only — not used in any numeric formula.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  SUMP_PUMP_GFCI_REQUIRED:              { value: "See year",         source: "210.8(D) / 422.5",   description: "Sump pump GFCI requirement flag (varies by NEC year). 2017: false — pending verification against authorized NFPA 70-2017. 2020: true (newly added to 422.5 list) — pending verification against authorized NFPA 70-2020. Display/reference only — not used in any numeric formula.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  GFCI_SPECIFIC_APPLIANCES:             { value: "See year",         source: "210.8(D) / 422.5",   description: "Display string describing which appliances require GFCI per 422.5. 2017: pending verification against authorized NFPA 70-2017. 2020: all listed appliances including dishwashers and sump pumps — pending verification against authorized NFPA 70-2020. Display/reference only.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  GFCI_EQUIPMENT_SERVICING_RECEPTACLE:  { value: "See year",         source: "210.8(E)",           description: "GFCI for equipment-servicing receptacles installed per 210.63 (HVAC/refrigeration). 2017: null — applicability pending verification against authorized NFPA 70-2017 (no verified conclusion implied; note does not render). 2020: requires GFCI for 210.63 receptacles — pending verification against authorized NFPA 70-2020. 2023/2026: copied from 2020, NOT independently verified. Display/reference only — not used in any numeric formula.", usedBy: ["HVAC Load"] },
  GFCI_OUTDOOR_DWELLING_50A:            { value: "See year",         source: "210.8(F)",           description: "GFCI for outdoor dwelling outlets on single-phase circuits ≤150V to ground, ≤50A. 2017: null — section did not exist in 2017 (new in 2020; note does not render). 2020: GFCI required with lighting-outlet exception — pending verification against authorized NFPA 70-2020. 2023/2026: copied from 2020, NOT independently verified. Display/reference only — not used in any numeric formula.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  ISLAND_PENINSULA_RULE:                { value: "See year",         source: "210.52(C)",          description: "Receptacle placement for kitchen islands/peninsulas.", usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  OPTIONAL_DEMAND_FACTOR:               { value: "40%",              source: "220.82(B)",          description: "Demand factor applied to general loads >10 kVA in the dwelling optional method.", usedBy: ["Dwelling Optional"] },
  OPTIONAL_HVAC:                        { value: "Year-owned 220.82(C) factors", source: "220.82(C)", description: "Largest of (C)(1)–(C)(6): AC 100%, heat-pump compressor 100%, supplemental 65%, space heat 65% (<4 units) or 40% (4+ units), thermal storage 100%. 2017 verified; later years inherit pending independent codebook check.", usedBy: ["Dwelling Optional"] },
  RANGE_DEMAND_ARTICLE:                 { value: "See year",         source: "Table 220.55 / Table 220.60", description: "Year-specific household cooking appliance demand table reference.", usedBy: ["Dwelling Standard", "Multifamily Standard"] },

  // ── OCPD & Service ────────────────────────────────────────────────
  STD_OCPD_SIZES:                       { value: "15–6000 A",        source: "240.6(A)",           description: "Standard ampere ratings for fuses and inverse time circuit breakers.", usedBy: ["Dwelling Standard", "Dwelling Optional", "Service Sizing", "Motor Branch Circuit", "Marina Shore Power", "RV Park Load"] },
  CONTINUOUS_LOAD_MULTIPLIER:           { value: "1.25 (125%)",      source: "210.19(A)(1)",       description: "Overcurrent device must be rated at 125% of continuous load.", usedBy: ["Service Sizing", "Continuous Load", "Transformer Sizing", "Marina Shore Power"] },

  // ── Conductors & Ampacity ─────────────────────────────────────────
  COPPER_AMPACITY:                      { value: "Table values",     source: "Table 310.15(B)(16)", description: "Allowable ampacity for copper conductors in conduit, 60/75/90°C.", usedBy: ["Conductor Ampacity", "Marina Shore Power", "RV Park Load"] },
  ALUMINUM_AMPACITY:                    { value: "Table values",     source: "Table 310.15(B)(16)", description: "Allowable ampacity for aluminum conductors in conduit.", usedBy: ["Conductor Ampacity", "Marina Shore Power", "RV Park Load"] },
  DWELLING_SERVICE_CONDUCTOR_TABLE:     { value: "100A-400A",        source: "Table 310.12",        description: "Single-phase dwelling service and feeder conductor sizes.", usedBy: ["Conductor Ampacity"] },
  RESISTIVITY:                          { value: "Cu=12.9, Al=21.2",  source: "Ch.9 Table 8",       description: "DC resistance constants (K) for voltage drop calculations by conductor material.", usedBy: ["Voltage Drop", "Marina Shore Power", "RV Park Load"] },
  CONDUCTOR_CM:                         { value: "4,110–1,000,000 CM", source: "Ch.9 Table 8",      description: "Circular mil areas for conductors used in voltage drop calculations.", usedBy: ["Voltage Drop", "Marina Shore Power", "RV Park Load"] },
  OCCUPANCY_UNIT_LOADS:                 { value: "0.25–3.5 VA/ft²",  source: "Table 220.12",      description: "General lighting unit loads by occupancy type.", usedBy: ["Lighting Load", "Commercial Load", "Marina Shore Power"] },
  TEMP_FACTORS:                         { value: "Correction factors", source: "310.15(B)(2)",     description: "Temperature correction factors applied when ambient >30°C.", usedBy: ["Conductor Ampacity"] },
  BUNDLE_FACTORS:                       { value: "0.80–0.35",        source: "310.15(C)(1)",       description: "Bundling derating for >3 current-carrying conductors.", usedBy: ["Conductor Ampacity"] },

  // ── Motors ────────────────────────────────────────────────────────
  MOTOR_FLC_3PHASE:                     { value: "Table values",     source: "Table 430.250",      description: "Full-load currents for 3-phase AC motors.", usedBy: ["Motor Branch Circuit", "Motor Feeder", "Marina Shore Power"] },
  MOTOR_FLC_1PHASE:                     { value: "Table values",     source: "Table 430.248",      description: "Full-load currents for single-phase AC motors.", usedBy: ["Motor Branch Circuit", "Motor Feeder", "Marina Shore Power"] },
  MOTOR_OCPD_MULTIPLIERS:               { value: "150–1100%",        source: "Table 430.52",       description: "Default OCPD multipliers as % of motor FLC by protective device type (most common motor types).", usedBy: ["Motor Branch Circuit", "Motor Feeder"] },
  MOTOR_OCPD_TABLE_430_52:              { value: "7 motor types × 4 device types", source: "Table 430.52", description: "Full Table 430.52 — user selects motor type (Single-Phase, AC Polyphase, Squirrel Cage, Design B Energy Efficient, Synchronous, Wound Rotor, DC) to determine correct OCPD multiplier. Design B Energy Efficient allows 1100% for instantaneous trip breakers.", usedBy: ["Motor Branch Circuit"] },
  MOTOR_BRANCH_CIRCUIT_MULTIPLIER:      { value: "1.25 (125%)",      source: "430.22(A)",          description: "Branch circuit conductor must carry 125% of motor FLC.", usedBy: ["Motor Branch Circuit"] },
  MOTOR_FEEDER_MULTIPLIER:              { value: "1.25 (125%)",      source: "430.24",             description: "Feeder sized at 125% of largest motor FLC + sum of others.", usedBy: ["Motor Feeder"] },

  // ── Transformers ──────────────────────────────────────────────────
  TRANSFORMER_OCPD:                     { value: "125–300%",         source: "Table 450.3(B)",     description: "Maximum OCPD ratings for transformer primary/secondary protection.", usedBy: ["Transformer Sizing", "Marina Shore Power"] },
  TRANSFORMER_CONTINUOUS_MULTIPLIER:    { value: "1.25 (125%)",      source: "450.3 / 210.19",     description: "Continuous load multiplier applied to transformer secondary conductors.", usedBy: ["Transformer Sizing"] },

  // ── Grounding ─────────────────────────────────────────────────────
  GEC_TABLE:                            { value: "Table values",     source: "Table 250.66",       description: "Grounding electrode conductor sizing based on service conductor size.", usedBy: ["GEC Sizing"] },
  EGC_TABLE:                            { value: "Table values",     source: "Table 250.122",      description: "Equipment grounding conductor sizing based on OCPD rating.", usedBy: ["EGC Sizing", "Marina Shore Power", "RV Park Load"] },
  BJ_TABLE_COPPER:                      { value: "Table values",     source: "Table 250.102(C)(1)", description: "Supply-side bonding jumper sizing — copper conductors.", usedBy: ["Main Bonding Jumper", "System Bonding Jumper"] },
  BJ_TABLE_ALUMINUM:                    { value: "Table values",     source: "Table 250.102(C)(1)", description: "Supply-side bonding jumper sizing — aluminum conductors.", usedBy: ["Main Bonding Jumper", "System Bonding Jumper"] },

  // ── Conduit fill ──────────────────────────────────────────────────
  WIRE_AREAS:                           { value: "In²/conductor",    source: "Ch.9 Table 5",       description: "Cross-sectional areas of THHN/THW conductors used in fill calculations.", usedBy: ["Conduit Fill"] },
  CONDUIT_AREAS:                        { value: "In² by size/type", source: "Ch.9 Table 4",       description: "Internal cross-sectional areas of conduit types and sizes.", usedBy: ["Conduit Fill"] },
  FILL_LIMITS:                          { value: "53% / 31% / 40%",  source: "Ch.9 Table 1",       description: "Maximum conduit fill: 53% (1 wire), 31% (2 wires), 40% (3+ wires).", usedBy: ["Conduit Fill"] },
  CONDUCTOR_VOLUME:                     { value: "2.0–5.0 in³",      source: "Table 314.16(B)",    description: "Box fill volume allowances per conductor by wire size.", usedBy: ["Box Fill"] },

  // ── EV ────────────────────────────────────────────────────────────
  EV_CONTINUOUS_MULTIPLIER:             { value: "1.25 (125%)",      source: "625.42",             description: "EV supply equipment is continuous load; circuit rated at 125% of EVSE rating.", usedBy: ["EV Charging"] },
  EV_GFCI_REQUIRED:                     { value: "See year",         source: "625.54",             description: "GFCI protection requirement for EVSE (varies by NEC year).", usedBy: ["EV Charging"] },
  EV_MINIMUM_LOAD_VA:                   { value: "See year",         source: "220.57",             description: "Minimum EV load VA for dwelling load calculations.", usedBy: ["EV Charging"] },

  // ── Solar PV ──────────────────────────────────────────────────────
  SOLAR_BUSBAR_120PCT:                  { value: "1.20 (120%)",      source: "705.12(B)(3)(a)",    description: "Busbar rating must be ≥ 120% of sum of OCPD ratings for line-side tap.", usedBy: ["Solar PV"] },
  SOLAR_BACKFEED_MULTIPLIER:            { value: "1.25 (125%)",      source: "690.8(B)(1)",        description: "PV output circuit conductor rated at 125% of Isc.", usedBy: ["Solar PV"] },
};

/**
 * NEC article/table registry — maps reference strings to title, description, and which calculators use them.
 */
export const ARTICLE_META = {
  "220.12":        { title: "General Lighting Loads",              usedBy: ["Dwelling Standard", "Dwelling Optional", "Commercial Load", "Multifamily Load"] },
  "220.42":        { title: "General Lighting Demand Factors",     usedBy: ["Dwelling Standard"] },
  "220.52(A)":     { title: "Small Appliance Branch Circuits",     usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  "220.52(B)":     { title: "Laundry Branch Circuit",              usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  "220.54":        { title: "Clothes Dryers — Demand Factors",     usedBy: ["Dwelling Standard"] },
  "220.55":        { title: "Electric Ranges — Demand Factors",    usedBy: ["Dwelling Standard"] },
  "220.60":        { title: "Household Cooking Appliances — Demand Factors", usedBy: ["Dwelling Standard", "Multifamily Standard"] },
  "220.82":        { title: "Dwelling Unit — Standard Method",     usedBy: ["Dwelling Standard"] },
  "220.83":        { title: "Dwelling Unit — Optional Method",     usedBy: ["Dwelling Optional"] },
  "220.83(A)":     { title: "Optional Method — General Loads",     usedBy: ["Dwelling Optional"] },
  "220.84":        { title: "Multifamily Dwelling Demand Factors", usedBy: ["Multifamily Load"] },
  "230.42":        { title: "Minimum Size and Rating — Service",   usedBy: ["Dwelling Standard", "Dwelling Optional", "Service Sizing"] },
  "230.67":        { title: "Surge Protection — Dwellings",        usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  "230.79(C)":     { title: "Minimum Service Rating — 1-Family",   usedBy: ["Dwelling Standard", "Dwelling Optional", "Service Sizing"] },
  "230.85":        { title: "Outdoor Emergency Disconnect",        usedBy: ["Dwelling Standard", "Dwelling Optional"] },
  "240.6(A)":      { title: "Standard Ampere Ratings",             usedBy: ["Dwelling Standard", "Dwelling Optional", "Service Sizing", "Motor Branch Circuit"] },
  "310.15":        { title: "Conductor Ampacity — General",        usedBy: ["Conductor Ampacity"] },
  "310.15(B)(16)": { title: "Ampacity Table — Conductors in Conduit", usedBy: ["Conductor Ampacity"] },
  "310.15(B)(2)":  { title: "Temperature Correction Factors",      usedBy: ["Conductor Ampacity"] },
  "310.15(C)(1)":  { title: "Bundling Derating Factors",           usedBy: ["Conductor Ampacity"] },
  "310.12":        { title: "Single-Phase Dwelling Services and Feeders", usedBy: ["Conductor Ampacity"] },
  "110.14(C)":     { title: "Terminal Temperature Limitations",    usedBy: ["Conductor Ampacity"] },
  "430.22(A)":     { title: "Branch Circuit Conductor — Motor",    usedBy: ["Motor Branch Circuit"] },
  "430.24":        { title: "Motor Feeder Conductor Sizing",       usedBy: ["Motor Feeder"] },
  "430.247":       { title: "Full-Load Currents — Direct-Current Motors", usedBy: ["Motor Branch Circuit"] },
  "430.52":        { title: "Motor Branch Circuit OCPD Rating",    usedBy: ["Motor Branch Circuit"] },
  "430.62":        { title: "Motor Feeder OCPD Rating",            usedBy: ["Motor Feeder"] },
  "625.42":        { title: "EVSE as Continuous Load",             usedBy: ["EV Charging"] },
  "625.54":        { title: "GFCI Protection for EVSE",            usedBy: ["EV Charging"] },
  "250.66":        { title: "Grounding Electrode Conductor Sizing", usedBy: ["GEC Sizing"] },
  "250.122":       { title: "Equipment Grounding Conductor Sizing", usedBy: ["EGC Sizing"] },
  "250.102(C)(1)": { title: "Supply-Side Bonding Jumper Sizing",   usedBy: ["Main Bonding Jumper", "System Bonding Jumper"] },
  "314.16":        { title: "Box Fill Calculations",               usedBy: ["Box Fill"] },
  "450.3":         { title: "Overcurrent Protection — Transformers", usedBy: ["Transformer Sizing"] },
  "690.8(B)(1)":   { title: "PV Output Circuit Conductor Rating",  usedBy: ["Solar PV"] },
  "705.12(B)(3)(a)": { title: "Busbar Rating — Interactive Systems", usedBy: ["Solar PV"] },
  "Table 220.12":  { title: "Lighting Load Demand Factors by Occupancy", usedBy: ["Dwelling Standard", "Dwelling Optional", "Commercial Load"] },
  "Table 220.42":  { title: "Lighting Load Demand Factors — Dwelling", usedBy: ["Dwelling Standard"] },
  "Table 220.55":  { title: "Demand Factors for Household Ranges", usedBy: ["Dwelling Standard"] },
  "Table 220.60":  { title: "Demand Factors for Household Cooking Appliances", usedBy: ["Dwelling Standard", "Multifamily Standard"] },
  "Table 240.6(A)": { title: "Standard Fuse and Breaker Ratings",  usedBy: ["Dwelling Standard", "Dwelling Optional", "Service Sizing"] },
  "Table 310.15(B)(16)": { title: "Allowable Conductor Ampacities", usedBy: ["Conductor Ampacity"] },
  "Table 310.12":  { title: "Single-Phase Dwelling Services and Feeders", usedBy: ["Conductor Ampacity"] },
  "Table 430.247": { title: "Full-Load Currents — Direct-Current Motors", usedBy: ["Motor Branch Circuit"] },
  "Table 430.52":  { title: "Motor Branch Circuit OCPD Max Ratings", usedBy: ["Motor Branch Circuit"] },
  "Table 250.66":  { title: "GEC Sizing by Service Conductor",     usedBy: ["GEC Sizing"] },
  "Table 250.122": { title: "EGC Sizing by OCPD Rating",           usedBy: ["EGC Sizing"] },
  "Table 250.102(C)(1)": { title: "Supply-Side Bonding Jumper Sizing", usedBy: ["Main Bonding Jumper"] },
  "551.73(A)":     { title: "RV Park Site Demand Factors", usedBy: ["RV Park Load"] },
  "551.71":        { title: "RV Park Site Receptacle Ratings", usedBy: ["RV Park Load"] },
  "Table 551.73(A)": { title: "Demand Factors for RV Park Sites", usedBy: ["RV Park Load"] },
  "555.12":        { title: "Marina Shore Power Demand Factors (2017; →555.6 in 2020; →220.120 in 2023)", usedBy: ["Marina Shore Power"] },
  "555.11":        { title: "Marina Shore Power Receptacle Ratings (section renumbered across editions — verify)", usedBy: ["Marina Shore Power"] },
  "Table 555.12":   { title: "Demand Factors for Shore Power Receptacles (2017; →Table 555.6 in 2020; →Table 220.120 in 2023)", usedBy: ["Marina Shore Power"] },
  "555.6":         { title: "Marina Shore Power Demand Factors (2020 renumbering of Table 555.12)", usedBy: ["Marina Shore Power"] },
  "Table 555.6":   { title: "Demand Factors for Shore Power Receptacles (2020)", usedBy: ["Marina Shore Power"] },
  "220.120":       { title: "Receptacle Loads — Marinas/Boatyards (2023 NEC, Article 220)", usedBy: ["Marina Shore Power"] },
  "Table 220.120": { title: "Demand Factors for Shore Power Receptacles (2023 NEC, moved from Article 555)", usedBy: ["Marina Shore Power"] },
  "210.19":        { title: "Voltage Drop — Informational Note (NOT mandatory)", usedBy: ["Voltage Drop", "Marina Shore Power", "RV Park Load"] },
  "215.2":         { title: "Feeder Voltage Drop — Informational Note (NOT mandatory)", usedBy: ["Voltage Drop", "Marina Shore Power", "RV Park Load"] },
};

/**
 * Helper to build trace objects for common NEC data dependencies.
 */
export const TRACE_REFS = {
  dwelling: {
    articles: ["220.12", "220.42", "220.82", "220.84", "240.6(A)", "230.42"],
    tables: ["Table 220.12", "Table 220.42", "Table 220.82", "Table 240.6(A)"],
  },
  ampacity: {
    articles: ["310.15(B)(16)", "310.15(B)(2)", "310.15(C)(1)", "110.14(C)"],
    tables: ["Table 310.15(B)(16)", "Table 310.15(B)(2)", "Table 310.15(C)(1)"],
  },
  grounding: {
    articles: ["250.66", "250.122", "250.102(C)(1)"],
    tables: ["Table 250.66", "Table 250.122", "Table 250.102(C)(1)"],
  },
  conduit: {
    articles: ["Ch.9 Table 1", "Ch.9 Table 4", "Ch.9 Table 5"],
    tables: ["Table 1 (Percentage fill)", "Table 4 (Conduit areas)", "Table 5 (Wire areas)"],
  },
};