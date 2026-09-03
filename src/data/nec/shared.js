/**
 * Shared NEC data — values constant across 2017–2026.
 * Year-specific overrides live in 2017.js / 2020.js / 2023.js / 2026.js
 */

// ─── Conductor Ampacity: NEC Table 310.15(B)(16) Copper ──────────
export const COPPER_AMPACITY = {
  "14": { t60: 15, t75: 20, t90: 25 },
  "12": { t60: 20, t75: 25, t90: 30 },
  "10": { t60: 30, t75: 35, t90: 40 },
  "8":  { t60: 40, t75: 50, t90: 55 },
  "6":  { t60: 55, t75: 65, t90: 75 },
  "4":  { t60: 70, t75: 85, t90: 95 },
  "3":  { t60: 85, t75: 100, t90: 110 },
  "2":  { t60: 95, t75: 115, t90: 130 },
  "1":  { t60: 110, t75: 130, t90: 150 },
  "1/0":{ t60: 125, t75: 150, t90: 170 },
  "2/0":{ t60: 145, t75: 175, t90: 195 },
  "3/0":{ t60: 165, t75: 200, t90: 225 },
  "4/0":{ t60: 195, t75: 230, t90: 260 },
  "250":{ t60: 215, t75: 255, t90: 290 },
  "300":{ t60: 240, t75: 285, t90: 320 },
  "350":{ t60: 260, t75: 310, t90: 350 },
  "400":{ t60: 280, t75: 335, t90: 380 },
  "500":{ t60: 320, t75: 380, t90: 430 },
  "600":{ t60: 350, t75: 420, t90: 475 },
  "700":{ t60: 385, t75: 460, t90: 520 },
  "750":{ t60: 400, t75: 475, t90: 535 },
  "800":{ t60: 410, t75: 490, t90: 555 },
  "900":{ t60: 435, t75: 520, t90: 585 },
  "1000":{ t60: 455, t75: 545, t90: 615 },
};

// ─── Conductor Ampacity: NEC Table 310.15(B)(16) Aluminum ────────
export const ALUMINUM_AMPACITY = {
  "12": { t60: 15, t75: 20, t90: 25 },
  "10": { t60: 25, t75: 30, t90: 35 },
  "8":  { t60: 30, t75: 40, t90: 45 },
  "6":  { t60: 40, t75: 50, t90: 55 },
  "4":  { t60: 55, t75: 65, t90: 75 },
  "3":  { t60: 65, t75: 75, t90: 85 },
  "2":  { t60: 75, t75: 90, t90: 100 },
  "1":  { t60: 85, t75: 100, t90: 115 },
  "1/0":{ t60: 100, t75: 120, t90: 135 },
  "2/0":{ t60: 115, t75: 135, t90: 150 },
  "3/0":{ t60: 130, t75: 155, t90: 175 },
  "4/0":{ t60: 150, t75: 180, t90: 205 },
  "250":{ t60: 170, t75: 205, t90: 230 },
  "300":{ t60: 190, t75: 230, t90: 255 },
  "350":{ t60: 210, t75: 250, t90: 280 },
  "400":{ t60: 225, t75: 270, t90: 305 },
  "500":{ t60: 260, t75: 310, t90: 350 },
  "600":{ t60: 285, t75: 340, t90: 385 },
  "700":{ t60: 310, t75: 375, t90: 420 },
  "750":{ t60: 320, t75: 385, t90: 435 },
  "1000":{ t60: 375, t75: 445, t90: 500 },
};

// ─── Temperature Correction Factors: NEC 310.15(B)(2) ────────────
export const TEMP_FACTORS = {
  "60": { 0: 1.29, 11: 1.22, 16: 1.15, 21: 1.08, 26: 1.00, 31: 0.91, 36: 0.82, 41: 0.71, 46: 0.58, 51: 0.41 },
  "75": { 0: 1.20, 11: 1.15, 16: 1.11, 21: 1.05, 26: 1.00, 31: 0.94, 36: 0.88, 41: 0.82, 46: 0.75, 51: 0.67, 56: 0.58, 61: 0.47, 66: 0.33 },
  "90": { 0: 1.15, 11: 1.12, 16: 1.08, 21: 1.04, 26: 1.00, 31: 0.96, 36: 0.91, 41: 0.87, 46: 0.82, 51: 0.76, 56: 0.71, 61: 0.65, 66: 0.58, 71: 0.50, 76: 0.41, 81: 0.29 },
};

// ─── Bundling Derating: NEC 310.15(B)(3)(a) [2017] / 310.15(C)(1) [2020+] ──
// Keys = upper bound of each tier: 1–3=100%, 4–6=80%, 7–9=70%, 10–20=50%, 21–30=45%, 31–40=40%, 41+=35%
export const BUNDLE_FACTORS = {
  3: 1.00, 6: 0.80, 9: 0.70, 20: 0.50, 30: 0.45, 40: 0.40, 999: 0.35,
};

// ─── Box Fill: NEC Table 314.16(B) ───────────────────────────────
export const CONDUCTOR_VOLUME = {
  "18": 1.50, "16": 1.75, "14": 2.00, "12": 2.25, "10": 2.50, "8": 3.00, "6": 5.00,
};

// ─── Conduit Fill: Wire Areas (Chapter 9 Table 5, Standard Conductors) ───
// Values match NEC Ch.9 Table 5 (non-compact) as shown in the Tables tab.
export const WIRE_AREAS = {
  // THHN/THWN — standard conductor areas from NEC Ch.9 Table 5
  "18 THHN": 0.0087, "16 THHN": 0.0109,
  "14 THHN": 0.0097, "12 THHN": 0.0133, "10 THHN": 0.0211,
  "8 THHN":  0.0366, "6 THHN":  0.0507, "4 THHN":  0.0824,
  "3 THHN":  0.0973, "2 THHN":  0.1158, "1 THHN":  0.1562,
  "1/0 THHN": 0.1855, "2/0 THHN": 0.2223, "3/0 THHN": 0.2679,
  "4/0 THHN": 0.3237, "250 THHN": 0.3970, "300 THHN": 0.4608,
  "350 THHN": 0.5242, "400 THHN": 0.5863, "500 THHN": 0.7073,
  "600 THHN": 0.8676, "700 THHN": 0.9887, "750 THHN": 1.0496,
  "800 THHN": 1.0974, "900 THHN": 1.2386, "1000 THHN": 1.3387,
  // THW/THWN — standard conductor areas from NEC Ch.9 Table 5
  "14 THW": 0.0230, "12 THW": 0.0278, "10 THW": 0.0356,
  "8 THW":  0.0531, "6 THW":  0.0814, "4 THW":  0.1087,
  "3 THW":  0.1263, "2 THW":  0.1473, "1 THW":  0.2027,
  "1/0 THW": 0.2367, "2/0 THW": 0.2781, "3/0 THW": 0.3317,
  "4/0 THW": 0.3970, "250 THW": 0.4938, "300 THW": 0.5755,
  "350 THW": 0.6590, "400 THW": 0.7331, "500 THW": 0.8825,
  "600 THW": 1.0532, "700 THW": 1.2040, "750 THW": 1.2837,
  "1000 THW": 1.6472,
  // RHH/RHW/USE — compact conductor areas from NEC Ch.9 Table 5A
  "8 RHH": 0.0531, "6 RHH": 0.0683, "4 RHH": 0.0881,
  "2 RHH": 0.1194, "1 RHH": 0.1698, "1/0 RHH": 0.1963,
  "2/0 RHH": 0.2290, "3/0 RHH": 0.2733, "4/0 RHH": 0.3217,
  "250 RHH": 0.4015, "300 RHH": 0.4596, "350 RHH": 0.5153,
  "400 RHH": 0.5741, "500 RHH": 0.6793, "600 RHH": 0.8413,
  "700 RHH": 0.9503, "750 RHH": 1.0118, "900 RHH": 1.2076,
  "1000 RHH": 1.2968,
  // XHHW — compact conductor areas from NEC Ch.9 Table 5A
  "8 XHHW": 0.0394, "6 XHHW": 0.0530, "4 XHHW": 0.0730,
  "2 XHHW": 0.1017, "1 XHHW": 0.1352, "1/0 XHHW": 0.1590,
  "2/0 XHHW": 0.1885, "3/0 XHHW": 0.2290, "4/0 XHHW": 0.2733,
  "250 XHHW": 0.3421, "300 XHHW": 0.4015, "350 XHHW": 0.4536,
  "400 XHHW": 0.5026, "500 XHHW": 0.6082, "600 XHHW": 0.7542,
  "700 XHHW": 0.8659, "750 XHHW": 0.9331, "900 XHHW": 1.0733,
  "1000 XHHW": 1.1882,
};

// ─── Conduit Fill: Conduit Areas (Chapter 9 Table 4) ─────────────
export const CONDUIT_AREAS = {
  "1/2":   { EMT: 0.304, IMC: 0.342, RMC: 0.304, "PVC 40": 0.285, "PVC 80": 0.217 },
  "3/4":   { EMT: 0.533, IMC: 0.586, RMC: 0.533, "PVC 40": 0.508, "PVC 80": 0.409 },
  "1":     { EMT: 0.864, IMC: 0.959, RMC: 0.864, "PVC 40": 0.832, "PVC 80": 0.688 },
  "1-1/4": { EMT: 1.496, IMC: 1.647, RMC: 1.496, "PVC 40": 1.453, "PVC 80": 1.237 },
  "1-1/2": { EMT: 2.036, IMC: 2.225, RMC: 2.036, "PVC 40": 1.986, "PVC 80": 1.711 },
  "2":     { EMT: 3.356, IMC: 3.630, RMC: 3.356, "PVC 40": 3.291, "PVC 80": 2.874 },
  "2-1/2": { EMT: 5.858, IMC: 5.135, RMC: 5.858, "PVC 40": 5.452, "PVC 80": 4.754 },
  "3":     { EMT: 8.846, IMC: 7.922, RMC: 8.846, "PVC 40": 8.688, "PVC 80": 7.783 },
  "3-1/2": { EMT:11.545, IMC:10.584, RMC:11.545, "PVC 40":11.258, "PVC 80":10.210 },
  "4":     { EMT:14.753, IMC:13.631, RMC:15.150, "PVC 40":14.850, "PVC 80":13.631 },
};

// ─── Conduit Fill Limits: Chapter 9 Table 1 ──────────────────────
export const FILL_LIMITS = { 1: 0.53, 2: 0.31, 3: 0.40 };

// ─── Conductor CM Areas: Chapter 9 Table 8 ───────────────────────
export const CONDUCTOR_CM = {
  "14": 4110, "12": 6530, "10": 10380, "8": 16510, "6": 26240,
  "4": 41740, "3": 52620, "2": 66360, "1": 83690,
  "1/0": 105600, "2/0": 133100, "3/0": 167800, "4/0": 211600,
  "250": 250000, "300": 300000, "350": 350000, "400": 400000,
  "500": 500000, "600": 600000, "700": 700000, "750": 750000,
  "800": 800000, "900": 900000, "1000": 1000000, "1200": 1200000,
  "1250": 1250000,
};

// ─── Resistivity (Ω·cm per Ω·kFT for voltage drop calc) ─────────
export const RESISTIVITY = { copper: 12.9, aluminum: 21.2 };

// ─── Grounding Electrode Conductor: NEC Table 250.66 ─────────────
export const GEC_TABLE = [
  { service: "2 AWG or smaller",        copper: "8",         aluminum: "6",         maxCM: 66360 },
  { service: "1 or 1/0 AWG",            copper: "6",         aluminum: "4",         maxCM: 105600 },
  { service: "2/0 or 3/0 AWG",          copper: "4",         aluminum: "2",         maxCM: 167800 },
  { service: "Over 3/0 – 350 kcmil",    copper: "2",         aluminum: "1/0",       maxCM: 350000 },
  { service: "Over 350 – 600 kcmil",    copper: "1/0",       aluminum: "3/0",       maxCM: 600000 },
  { service: "Over 600 – 1100 kcmil",   copper: "2/0",       aluminum: "4/0",       maxCM: 1100000 },
  { service: "Over 1100 kcmil",         copper: "3/0",       aluminum: "250 kcmil", maxCM: Infinity },
];

// ─── EGC Sizing: NEC Table 250.122 ───────────────────────────────
export const EGC_TABLE = [
  { ocpd: 15,   copper: "14", aluminum: "12" },
  { ocpd: 20,   copper: "12", aluminum: "10" },
  { ocpd: 30,   copper: "10", aluminum: "8" },
  { ocpd: 40,   copper: "10", aluminum: "8" },
  { ocpd: 60,   copper: "10", aluminum: "8" },
  { ocpd: 100,  copper: "8",  aluminum: "6" },
  { ocpd: 200,  copper: "6",  aluminum: "4" },
  { ocpd: 300,  copper: "4",  aluminum: "2" },
  { ocpd: 400,  copper: "3",  aluminum: "1" },
  { ocpd: 500,  copper: "2",  aluminum: "1/0" },
  { ocpd: 600,  copper: "1",  aluminum: "2/0" },
  { ocpd: 800,  copper: "1/0", aluminum: "3/0" },
  { ocpd: 1000, copper: "2/0", aluminum: "4/0" },
  { ocpd: 1200, copper: "3/0", aluminum: "250" },
  { ocpd: 1600, copper: "4/0", aluminum: "350" },
  { ocpd: 2000, copper: "250", aluminum: "400" },
  { ocpd: 2500, copper: "350", aluminum: "600" },
  { ocpd: 3000, copper: "400", aluminum: "600" },
  { ocpd: 4000, copper: "500", aluminum: "750" },
  { ocpd: 5000, copper: "700", aluminum: "1200" },
  { ocpd: 6000, copper: "800", aluminum: "1200" },
];

// ─── Motor FLC: NEC Table 430.250 (3-phase) ─────────────────────
export const MOTOR_FLC_3PHASE = {
  "0.5":   { "200": 2.5, "208": 2.4, "230": 2.2, "460": 1.1, "575": 0.9 },
  "0.75":  { "200": 3.7, "208": 3.5, "230": 3.2, "460": 1.6, "575": 1.3 },
  "1":     { "200": 4.8, "208": 4.6, "230": 4.2, "460": 2.1, "575": 1.7 },
  "1.5":   { "200": 6.9, "208": 6.6, "230": 6.0, "460": 3.0, "575": 2.4 },
  "2":     { "200": 7.8, "208": 7.5, "230": 6.8, "460": 3.4, "575": 2.7 },
  "3":     { "200": 11.0,"208": 10.6,"230": 9.6, "460": 4.8, "575": 3.9 },
  "5":     { "200": 17.5,"208": 16.7,"230": 15.2,"460": 7.6, "575": 6.1 },
  "7.5":   { "200": 25.3,"208": 24.2,"230": 22.0,"460": 11.0,"575": 9.0 },
  "10":    { "200": 32.2,"208": 30.8,"230": 28.0,"460": 14.0,"575": 11.0 },
  "15":    { "200": 48.3,"208": 46.2,"230": 42.0,"460": 21.0,"575": 17.0 },
  "20":    { "200": 62.1,"208": 59.4,"230": 54.0,"460": 27.0,"575": 22.0 },
  "25":    { "200": 78.2,"208": 74.8,"230": 68.0,"460": 34.0,"575": 27.0 },
  "30":    { "200": 92.0,"208": 88.0,"230": 80.0,"460": 40.0,"575": 32.0 },
  "40":    { "200": 120,"208": 114,"230": 104,"460": 52.0,"575": 41.0 },
  "50":    { "200": 150,"208": 143,"230": 130,"460": 65.0,"575": 52.0 },
  "60":    { "200": 177,"208": 169,"230": 154,"460": 77.0,"575": 62.0 },
  "75":    { "200": 221,"208": 211,"230": 192,"460": 96.0,"575": 77.0 },
  "100":   { "200": 285,"208": 273,"230": 248,"460": 124,"575": 99.0 },
  "125":   { "200": 359,"208": 343,"230": 312,"460": 156,"575": 125 },
  "150":   { "200": 414,"208": 396,"230": 360,"460": 180,"575": 144 },
  "200":   { "200": 552,"208": 528,"230": 480,"460": 240,"575": 192 },
  "250":   { "460": 302,"575": 242,"2300": 60 },
  "300":   { "460": 361,"575": 289,"2300": 72 },
  "350":   { "460": 414,"575": 336,"2300": 83 },
  "400":   { "460": 477,"575": 382,"2300": 95 },
  "450":   { "460": 515,"575": 412,"2300": 103 },
  "500":   { "460": 590,"575": 472,"2300": 118 },
};

// ─── Motor FLC: NEC Table 430.248 (single-phase) ─────────────────
export const MOTOR_FLC_1PHASE = {
  "0.166": { "115": 4.4, "200": 2.5, "208": 2.4, "230": 2.2 },
  "0.25":  { "115": 5.8, "200": 3.3, "208": 3.2, "230": 2.9 },
  "0.33":  { "115": 7.2, "200": 4.1, "208": 4.0, "230": 3.6 },
  "0.5":   { "115": 9.8, "200": 5.6, "208": 5.4, "230": 4.9 },
  "0.75":  { "115": 13.8,"200": 7.9, "208": 7.6, "230": 6.9 },
  "1":     { "115": 16,  "200": 9.2, "208": 8.8, "230": 8.0 },
  "1.5":   { "115": 20,  "200": 11.5,"208": 11.0,"230": 10.0 },
  "2":     { "115": 24,  "200": 13.8,"208": 13.2,"230": 12.0 },
  "3":     { "115": 34,  "200": 19.6,"208": 18.7,"230": 17.0 },
  "5":     { "115": 56,  "200": 32.2,"208": 30.8,"230": 28.0 },
  "7.5":   { "115": 80,  "200": 46.0,"208": 44.0,"230": 40.0 },
  "10":    { "115": 100, "200": 57.5,"208": 55.0,"230": 50.0 },
};

// ─── Motor OCPD Multipliers: NEC Table 430.52 ────────────────────
// Default values (most common motor types) — kept for backward compatibility with motorFeederCalc
export const MOTOR_OCPD_MULTIPLIERS = {
  "Inverse Time Breaker": 2.50,
  "Non-Time Delay Fuse": 3.00,
  "Dual Element Fuse": 1.75,
  "Instantaneous Trip Breaker": 8.00,
};

// ─── Motor OCPD Multipliers by Motor Type: NEC Table 430.52 (full table) ─
export const MOTOR_OCPD_TABLE_430_52 = {
  "Single-Phase":                                      { "Non-Time Delay Fuse": 3.00, "Dual Element Fuse": 1.75, "Instantaneous Trip Breaker": 8.00,  "Inverse Time Breaker": 2.50 },
  "AC Polyphase (Other than Wound-Rotor)":              { "Non-Time Delay Fuse": 3.00, "Dual Element Fuse": 1.75, "Instantaneous Trip Breaker": 8.00,  "Inverse Time Breaker": 2.50 },
  "Squirrel Cage (Other than Design B Energy Efficient)":{ "Non-Time Delay Fuse": 3.00, "Dual Element Fuse": 1.75, "Instantaneous Trip Breaker": 8.00,  "Inverse Time Breaker": 2.50 },
  "Design B Energy Efficient":                          { "Non-Time Delay Fuse": 3.00, "Dual Element Fuse": 1.75, "Instantaneous Trip Breaker": 11.00, "Inverse Time Breaker": 2.50 },
  "Synchronous":                                         { "Non-Time Delay Fuse": 3.00, "Dual Element Fuse": 1.75, "Instantaneous Trip Breaker": 8.00,  "Inverse Time Breaker": 2.50 },
  "Wound Rotor":                                         { "Non-Time Delay Fuse": 1.50, "Dual Element Fuse": 1.50, "Instantaneous Trip Breaker": 8.00,  "Inverse Time Breaker": 1.50 },
  "Direct Current (Constant Voltage)":                  { "Non-Time Delay Fuse": 1.50, "Dual Element Fuse": 1.50, "Instantaneous Trip Breaker": 2.50,  "Inverse Time Breaker": 1.50 },
};

// ─── Standard OCPD sizes: NEC 240.6(A) ──────────────────────────
export const STD_OCPD_SIZES = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];

// ─── Transformer OCPD: NEC Table 450.3(B) ───────────────────────
// Values as percentages of transformer-rated current (1.25 = 125%)
export const TRANSFORMER_OCPD = {
  primaryOnly: {
    primary9AOrMore: 1.25,
    primaryLess9A: 1.67,
    primaryLess2A: 3.00,
    secondary: 0, // Not required
  },
  primaryAndSecondary: {
    primary9AOrMore: 2.50,
    primaryLess9A: 2.50,
    primaryLess2A: 2.50,
    secondary9AOrMore: 1.25,
    secondaryLess9A: 1.67,
  },
};

// ─── Dwelling Unit Lighting: NEC Table 220.12 ────────────────────
export const DWELLING_LIGHTING_VA_PER_SQFT = 3;

// ─── Small Appliance / Laundry: NEC 220.52/220.53 ────────────────
export const SMALL_APPLIANCE_VA = 1500;
export const LAUNDRY_VA = 1500;
export const SMALL_APPLIANCE_MIN_CIRCUITS = 2; // 220.52(A) / 210.11(C)(1)
export const LAUNDRY_MIN_CIRCUITS = 1;         // 220.52(B) / 210.11(C)(2)

// ─── Dwelling Standard Method: NEC 220.82 ────────────────────────
// Cumulative demand bands: each band applies to the next `band` VA of the total
export const DWELLING_DEMAND_TABLE = [
  { band: 3000,   factor: 1.00 },   // First 3,000 VA at 100%
  { band: 117000, factor: 0.35 },   // Next 117,000 VA at 35%
  { band: Infinity, factor: 0.25 }, // Remainder at 25%
];

// ─── Optional Method: NEC 220.82 ─────────────────────────────────
// 220.82(A) = applicability (one-/two-family, 100 A min, 3-wire).
// 220.82(B) = general loads: first 10 kVA at 100%, remainder at 40%.
export const OPTIONAL_DEMAND_FACTOR = 0.40; // 40% for loads beyond first 10kVA
export const OPTIONAL_APPLICABILITY_ARTICLE = "220.82(A)";
export const OPTIONAL_GENERAL_LOAD_ARTICLE = "220.82(B)";

// 220.82(C) HVAC selections — largest of (C)(1)–(C)(6).
// Shared default matches 2017 (independently reviewed in 2017.js). 2020/2023/2026
// inherit these numbers pending an independent codebook check; secondary sources
// show the same 65% / 40% / 65% supplemental / 100% thermal-storage structure.
export const OPTIONAL_HVAC = {
  acFactor: 1.00,                 // (C)(1)
  heatPumpOnlyFactor: 1.00,       // (C)(2)
  supplementalHeatFactor: 0.65,   // (C)(3)
  spaceHeatLt4Factor: 0.65,       // (C)(4) fewer than 4 separately controlled units
  spaceHeatGe4Factor: 0.40,       // (C)(5) four or more separately controlled units
  thermalStorageFactor: 1.00,     // (C)(6) thermal storage / continuous full-nameplate
  spaceHeatUnitThreshold: 4,
};

// ─── Range Demand: NEC Table 220.55 ─────────────────────────────
// pct = Column A (< 3½ kW), colB = Column B (3½–8¾ kW), max_12kW = Column C (> 8¾–12 kW)
// colCFormula applies for 26+ appliances in place of a fixed max_12kW value.
export const RANGE_DEMAND = [
  { count: 1,  pct: 80, colB: 80, max_12kW: 8 },
  { count: 2,  pct: 75, colB: 65, max_12kW: 11 },
  { count: 3,  pct: 70, colB: 55, max_12kW: 14 },
  { count: 4,  pct: 66, colB: 50, max_12kW: 17 },
  { count: 5,  pct: 62, colB: 45, max_12kW: 20 },
  { count: 6,  pct: 59, colB: 43, max_12kW: 21 },
  { count: 7,  pct: 56, colB: 40, max_12kW: 22 },
  { count: 8,  pct: 53, colB: 36, max_12kW: 23 },
  { count: 9,  pct: 51, colB: 35, max_12kW: 24 },
  { count: 10, pct: 49, colB: 34, max_12kW: 25 },
  { count: 11, pct: 47, colB: 32, max_12kW: 26 },
  { count: 12, pct: 45, colB: 32, max_12kW: 27 },
  { count: 13, pct: 43, colB: 32, max_12kW: 28 },
  { count: 14, pct: 41, colB: 32, max_12kW: 29 },
  { count: 15, pct: 40, colB: 32, max_12kW: 30 },
  { count: 16, pct: 39, colB: 28, max_12kW: 31 },
  { count: 17, pct: 38, colB: 28, max_12kW: 32 },
  { count: 18, pct: 37, colB: 28, max_12kW: 33 },
  { count: 19, pct: 36, colB: 28, max_12kW: 34 },
  { count: 20, pct: 35, colB: 28, max_12kW: 35 },
  { count: 21, pct: 34, colB: 26, max_12kW: 36 },
  { count: 22, pct: 33, colB: 26, max_12kW: 37 },
  { count: 23, pct: 32, colB: 26, max_12kW: 38 },
  { count: 24, pct: 31, colB: 26, max_12kW: 39 },
  { count: 25, pct: 30, colB: 26, max_12kW: 40 },
  { count: 30, pct: 30, colB: 24, max_12kW: null, colCFormula: "15 + 1 * count" },
  { count: 40, pct: 30, colB: 22, max_12kW: null, colCFormula: "25 + 0.75 * count" },
  { count: 50, pct: 30, colB: 20, max_12kW: null, colCFormula: "25 + 0.75 * count" },
  { count: 60, pct: 30, colB: 18, max_12kW: null, colCFormula: "25 + 0.75 * count" },
  { count: 999, pct: 30, colB: 16, max_12kW: null, colCFormula: "25 + 0.75 * count" },
];

// ─── Dryer Demand: NEC Table 220.54 ──────────────────────────────
// 1–4 = 100%; 5 = 85%; 6 = 75%; 7 = 65%; 8 = 60%; 9 = 55%; 10 = 50%;
// 11 = 47%; 12–23 = 47% − 1% per dryer over 11;
// 24–42 = 35% − 0.5% per dryer over 23; 43+ = 25%.
export function getDryerDemandFactor(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return 0;
  if (n <= 4) return 1;
  if (n === 5) return 0.85;
  if (n === 6) return 0.75;
  if (n === 7) return 0.65;
  if (n === 8) return 0.60;
  if (n === 9) return 0.55;
  if (n === 10) return 0.50;
  if (n === 11) return 0.47;
  if (n <= 23) return (47 - (n - 11)) / 100;
  if (n <= 42) return (35 - 0.5 * (n - 23)) / 100;
  return 0.25;
}

export const DRYER_DEMAND = [
  ...Array.from({ length: 42 }, (_, i) => ({
    count: i + 1,
    factor: getDryerDemandFactor(i + 1),
  })),
  { count: 999, factor: 0.25 },
];

// ─── Commercial Cooking Demand: NEC Table 220.56 ─────────────────
// "6 and over" = 65% — single tier for all counts ≥ 6
export const COMMERCIAL_KITCHEN_DEMAND = [
  { units: 1, factor: 100 }, { units: 2, factor: 100 },
  { units: 3, factor: 90 },  { units: 4, factor: 80 },
  { units: 5, factor: 70 },  { units: 999, factor: 65 },
];

// ─── Lighting Demand: NEC Table 220.42 ───────────────────────────
// Cumulative bands: each band describes how many VA at the given factor
export const LIGHTING_DEMAND = {
  dwelling:    { tiers: [{ band: 3000, factor: 1.00 }, { band: 117000, factor: 0.35 }, { band: Infinity, factor: 0.25 }] },
  hospital:    { tiers: [{ band: 50000, factor: 0.40 }, { band: Infinity, factor: 0.20 }] },
  hotel_motel: { tiers: [{ band: 20000, factor: 0.50 }, { band: 80000, factor: 0.40 }, { band: Infinity, factor: 0.30 }] },
  warehouse:   { tiers: [{ band: 12500, factor: 1.00 }, { band: Infinity, factor: 0.50 }] },
};

// ─── Receptacle Demand: NEC 220.44 ───────────────────────────────
export const RECEPTACLE_DEMAND_TIERS = [
  { band: 10000, factor: 1.00 }, { band: Infinity, factor: 0.50 },
];

// ─── Fixed Appliance Demand: NEC 220.53 ──────────────────────────
export const FIXED_APPLIANCE_DEMAND_FACTOR = 0.75; // 4+ appliances

// ─── Neutral Demand: NEC 220.61 ──────────────────────────────────
// 220.61(B)(1) cooking/dryer reduction is 70% of the unbalanced load.
// 220.61(B)(2) is 100% of the first 200 A, 70% of the remainder — ampere-based.
// Do not treat 200,000 VA as a stand-in for 200 A.
export const NEUTRAL_DEMAND_TIER1_CAP = 200; // amperes, 220.61(B)(2)
export const NEUTRAL_DEMAND_TIER1_FACTOR = 0.70;

// ─── Continuous Load Multiplier: NEC 210.19 ──────────────────────
export const CONTINUOUS_LOAD_MULTIPLIER = 1.25;
export const HVAC_OCPD_MULTIPLIER = 1.75; // 440.22(A)

// ─── Dwelling Service Conductor Factor: NEC 310.15(B)(7) [2017] / 310.12 [2020] ─
// Single-phase dwelling service/feeder conductors may have ampacity not less
// than 83% of the service or feeder disconnect rating.
export const DWELLING_SERVICE_CONDUCTOR_FACTOR = 0.83;

// NEC Table 310.12 — Single-Phase Dwelling Services and Feeders.
// Applies to 100A through 400A dwelling services/feeders when no adjustment or
// correction factors are required.
export const DWELLING_SERVICE_CONDUCTOR_TABLE = [
  { rating: 100, copper: "4", aluminum: "2" },
  { rating: 110, copper: "3", aluminum: "1" },
  { rating: 125, copper: "2", aluminum: "1/0" },
  { rating: 150, copper: "1", aluminum: "2/0" },
  { rating: 175, copper: "1/0", aluminum: "3/0" },
  { rating: 200, copper: "2/0", aluminum: "4/0" },
  { rating: 225, copper: "3/0", aluminum: "250" },
  { rating: 250, copper: "4/0", aluminum: "300" },
  { rating: 300, copper: "250", aluminum: "350" },
  { rating: 350, copper: "350", aluminum: "500" },
  { rating: 400, copper: "400", aluminum: "600" },
];

// ─── Welder Duty Cycle: NEC 630.11 ───────────────────────────────
export const WELDER_DUTY_CYCLE_TABLE = [
  { dc: 100, mult: 1.00 }, { dc: 90, mult: 0.95 }, { dc: 80, mult: 0.89 },
  { dc: 70, mult: 0.84 }, { dc: 60, mult: 0.78 }, { dc: 50, mult: 0.71 },
  { dc: 40, mult: 0.63 }, { dc: 30, mult: 0.55 }, { dc: 20, mult: 0.45 },
];
export const WELDER_OCPD_MULTIPLIER = 2.00; // 200%

// ─── Solar PV 120% Rule: NEC 705.12 ──────────────────────────────
export const SOLAR_BUSBAR_120PCT = 1.20;
export const SOLAR_BACKFEED_MULTIPLIER = 1.25;
// 2020+ numbering. 2017.js overrides to 705.12(D)(2)(3)(b).
export const SOLAR_120_RULE_ARTICLE = "705.12(B)(2)(3)(a)";

// ─── Data Center Typical Values ──────────────────────────────────
export const DATA_CENTER_DEFAULT_PUE = 1.4;
export const DATA_CENTER_DEFAULT_UPS_EFFICIENCY = 94;

// ─── Farm Load: NEC Table 220.102 (per building) and Table 220.103 (total) ─
export const FARM_102_VOLTAGE = 240;
export const FARM_102_MOTOR_MULTIPLIER = 1.25;
export const FARM_102_TIERS = [
  { amps: 60, factor: 1.00 },
  { amps: 60, factor: 0.50 },
  { amps: Infinity, factor: 0.25 },
];
export const FARM_BUILDING_DEMAND = [1.00, 0.75, 0.65, 0.50]; // Table 220.103 rank

// ─── Multifamily Demand: NEC Table 220.84 ────────────────────────
// Lookup is find(r => units <= r.units). 51–61 → 27%; 62+ → 26%.
// 2017 owns an identical explicit copy in 2017.js. Other years pending codebook.
export const MULTIFAMILY_DEMAND_TABLE = [
  { units: 3, factor: 45 }, { units: 4, factor: 44 }, { units: 5, factor: 43 },
  { units: 6, factor: 42 }, { units: 7, factor: 41 }, { units: 8, factor: 40 },
  { units: 9, factor: 39 }, { units: 10, factor: 38 }, { units: 11, factor: 37 },
  { units: 12, factor: 36 }, { units: 13, factor: 35 }, { units: 14, factor: 34 },
  { units: 15, factor: 33 }, { units: 20, factor: 32 }, { units: 25, factor: 31 },
  { units: 30, factor: 30 }, { units: 40, factor: 29 }, { units: 50, factor: 28 },
  { units: 61, factor: 27 }, { units: 999, factor: 26 },
];

// ─── Bonding Jumper Table 250.102(C)(1) ──────────────────────────
// Same banding as Table 250.66 for copper ungrounded conductors, except
// over 1100 kcmil copper / 1750 kcmil aluminum uses 12.5% of area (not 3/0 max).
// Lookup is `find(r => totalCM <= r.cm)` against copper-equivalent circular mils.
export const BJ_TABLE_COPPER = [
  { label: "2 AWG or smaller", cm: 66360, size: "8 AWG" },
  { label: "1 or 1/0 AWG", cm: 105600, size: "6 AWG" },
  { label: "2/0 or 3/0 AWG", cm: 167800, size: "4 AWG" },
  { label: "Over 3/0 through 350 kcmil", cm: 350000, size: "2 AWG" },
  { label: "Over 350 through 600 kcmil", cm: 600000, size: "1/0 AWG" },
  { label: "Over 600 through 1100 kcmil", cm: 1100000, size: "2/0 AWG" },
  { label: "Over 1100 kcmil", cm: Infinity, size: "12.5% of conductor area" },
];

export const BJ_TABLE_ALUMINUM = [
  { label: "2 AWG or smaller", cm: 66360, size: "6 AWG" },
  { label: "1 or 1/0 AWG", cm: 105600, size: "4 AWG" },
  { label: "2/0 or 3/0 AWG", cm: 167800, size: "2 AWG" },
  { label: "Over 3/0 through 350 kcmil", cm: 350000, size: "1/0 AWG" },
  { label: "Over 350 through 600 kcmil", cm: 600000, size: "3/0 AWG" },
  { label: "Over 600 through 1100 kcmil", cm: 1100000, size: "4/0 AWG" },
  { label: "Over 1100 kcmil", cm: Infinity, size: "12.5% of conductor area" },
];

// ─── EV Charging: NEC 625 ────────────────────────────────────────
// 2023: Major changes — GFCI required for all L1/L2, load calc refined
export const EV_CONTINUOUS_MULTIPLIER = 1.25;

// ─── Small Conductor Max OCPD: NEC 240.4(D) ──────────────────────
export const SMALL_CONDUCTOR_MAX_OCPD = { "14": 15, "12": 20, "10": 30 };

// ─── Conduit Fill Labels ─────────────────────────────────────────
export const FILL_LIMIT_LABELS = {
  1: { pct: 53, desc: "1 conductor" },
  2: { pct: 31, desc: "2 conductors" },
  3: { pct: 40, desc: "3+ conductors" },
};

// ─── Capacitor Conductor Multiplier: NEC 460.8 ───────────────────
export const CAPACITOR_CONDUCTOR_MULTIPLIER = 1.35; // 135%

// ─── Pool/Spa Clearances: NEC Article 680 ────────────────────
export const POOL_CLEARANCES = [
  { item: "Overhead conductors ≥ 10 ft from water edge", article: "680.8" },
  { item: "Receptacles ≥ 10 ft from inside wall of pool", article: "680.22(A)" },
  { item: "Lighting fixtures ≤ 5 ft from water must be GFCI", article: "680.22(B)" },
  { item: "All 15/20A receptacles within 20 ft must be GFCI", article: "680.22(A)" },
  { item: "Equipotential bonding grid required", article: "680.26" },
];
export const SPA_CLEARANCES = [
  { item: "GFCI protection required for all receptacles", article: "680.43" },
  { item: "Bonding required for all metal parts", article: "680.43(D)" },
  { item: "Receptacles ≥ 5 ft from spa", article: "680.43(A)" },
  { item: "Lighting: listed for wet locations", article: "680.43(B)" },
];

// ─── Data Center Redundancy Multipliers (industry standard) ───
export const DATA_CENTER_REDUNDANCY = { "N": 1.0, "N+1": 1.25, "2N": 2.0, "2N+1": 2.25 };

// ─── Pool Motor FLC: NEC Table 430.248 (single-phase for pools) ─
export const POOL_MOTOR_FLC = { 0.5: 9.8, 0.75: 13.8, 1: 16, 1.5: 20, 2: 24, 3: 34, 5: 56 };

// ─── Occupancy Unit Loads: NEC Table 220.12 ──────────────────────
export const OCCUPANCY_UNIT_LOADS = {
  dwelling:  3.0, hotel_motel: 2.0, hospital: 2.0, office: 3.5,
  store: 3.0, school: 3.0, restaurant: 2.0, church: 1.0,
  garage: 0.5, industrial: 2.0, warehouse: 0.25, armory: 1.0,
};
export const OCCUPANCY_UNIT_LOAD_DEFAULT = 2.0;
export const OFFICE_RECEPTACLE_MIN_VA_PER_SQFT = 1;
export const SHOW_WINDOW_VA_PER_FOOT = 200;
export const SIGN_OUTLET_MIN_VA = 1200;
export const RECEPTACLE_YOKE_VA = 180;