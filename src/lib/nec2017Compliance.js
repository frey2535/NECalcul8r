/**
 * NEC 2017 Compliance Rules
 *
 * Defines exactly which articles/values are valid for 2017 verification,
 * and which are post-2017 additions that must NOT be applied to 2017.
 *
 * Rules:
 *  - Jurisdiction amendments are ignored (2017 base code only)
 *  - No 2020/2023/2026 logic may be applied when year is 2017
 *  - A 2017 record is only Verified if the app value exactly matches the 2017 NEC source
 */

/**
 * Articles that did NOT EXIST in 2017 NEC.
 * Any calculator referencing these while year=2017 is a cross-year contamination failure.
 */
export const POST_2017_ARTICLES = {
  "230.85": { addedIn: "2020", description: "Outdoor emergency disconnect for dwelling units" },
  "230.67":  { addedIn: "2020", description: "Surge-protective device (SPD) required for dwelling unit services" },
  "625.54":  { addedIn: "2020", description: "GFCI protection for EVSE (EV charging)" },
  "220.57":  { addedIn: "2023", description: "EV minimum load for dwelling load calculations" },
  "210.8(A)(10)": { addedIn: "2020", description: "GFCI for laundry areas" },
  "210.8(A)(11)": { addedIn: "2020", description: "GFCI for dishwashers" },
  "210.8(A)(12)": { addedIn: "2023", description: "GFCI for bathtubs and shower stalls" },
  "230.67(A)": { addedIn: "2020", description: "SPD installation requirements" },
};

/**
 * Values/rules that CHANGED between 2017 and later editions.
 * Used to warn that a 2017 verification must use the 2017-specific value, not a later one.
 */
export const YEAR_SENSITIVE_FIELDS = {
  EV_GFCI_REQUIRED:                   { nec2017: false,   changedIn: "2020", article: "625.54",     note: "GFCI for EVSE not required in 2017" },
  DWELLING_OUTDOOR_DISCONNECT_REQUIRED:{ nec2017: false,   changedIn: "2020", article: "230.85",     note: "Outdoor emergency disconnect not required in 2017" },
  DWELLING_SPD_REQUIRED:               { nec2017: false,   changedIn: "2023", article: "230.67",     note: "SPD not required in 2017" },
  EV_MINIMUM_LOAD_VA:                  { nec2017: 0,       changedIn: "2023", article: "220.57",     note: "No minimum EV load in 2017" },
  ISLAND_PENINSULA_RULE:               { nec2017: "≥12 sq ft with ≥12 in. width", changedIn: "2020", article: "210.52(C)", note: "2017 island rule differs from 2020+" },
  GFCI_SCOPE_DWELLING:                 { nec2017: "6 ft of sink only (kitchen)", changedIn: "2020", article: "210.8(A)", note: "2017 kitchen GFCI scope is narrower than 2020+" },
};

/**
 * Calculators that are especially sensitive to 2017 vs later differences.
 * These must be flagged for extra scrutiny when verifying for 2017.
 */
export const HIGH_RISK_2017_CALCULATORS = [
  "ev_charging",
  "dwelling_standard",
  "dwelling_optional",
  "service_sizing",
  "multifamily_load",
  "gfci",
  "spd",
];

/**
 * Articles that are valid in 2017 NEC.
 * Any 2017 verification must cite one of these (or a table/sub-section of one of these).
 */
export const VALID_2017_ARTICLES = new Set([
  "110.14(C)", "110.26",
  "210.8", "210.8(A)", "210.11", "210.19", "210.19(A)(1)", "210.52", "210.52(C)",
  "220.12", "220.14", "220.42", "220.43", "220.44", "220.50", "220.51",
  "220.52", "220.52(A)", "220.52(B)", "220.53", "220.54", "220.55", "220.56",
  "220.60", "220.61", "220.82", "220.83", "220.83(A)", "220.84", "220.100", "220.102",
  "230.42", "230.66", "230.70", "230.71", "230.79", "230.79(C)",
  "240.4", "240.4(D)", "240.6", "240.6(A)",
  "250.66", "250.102", "250.102(C)", "250.102(C)(1)", "250.104", "250.122",
  "310.15", "310.15(B)", "310.15(B)(2)", "310.15(B)(16)", "310.15(C)(1)",
  "314.16", "314.16(B)",
  "408.36",
  "430.22", "430.22(A)", "430.24", "430.52", "430.62", "430.247", "430.248", "430.250",
  "440.22", "440.32",
  "450.3", "450.3(B)",
  "460.8",
  "625.14", "625.17", "625.19", "625.42", // Note: 625.54 (GFCI for EVSE) was NOT in 2017
  "630.11", "630.12",
  "555.12", "555.19", "555.19(A)",
  "680.8", "680.22", "680.26", "680.43",
  "690.8", "690.8(B)(1)",
  "695.6",
  "700.5",
  "705.12", "705.12(B)(3)(a)",
  "Table 220.12", "Table 220.42", "Table 220.54", "Table 220.55", "Table 220.56",
  "Table 220.84", "Table 220.102",
  "Table 240.6(A)", "Table 250.66", "Table 250.122", "Table 250.102(C)(1)",
  "Table 310.15(B)(16)", "Table 310.15(B)(2)", "Table 310.15(C)(1)",
  "Table 314.16(B)", "Table 430.52", "Table 430.247", "Table 430.248", "Table 430.250",
  "Table 450.3(B)",
  "Ch.9 Table 1", "Ch.9 Table 4", "Ch.9 Table 5", "Ch.9 Table 8",
]);

/**
 * Given an article_ref and nec_year, check if the article is a post-2017 addition.
 * Returns { isViolation: bool, addedIn, description }
 */
export function check2017ArticleCompliance(articleRef) {
  const violation = POST_2017_ARTICLES[articleRef];
  if (violation) {
    return { isViolation: true, addedIn: violation.addedIn, description: violation.description };
  }
  return { isViolation: false };
}

/**
 * Returns the expected 2017 value/behavior for a known year-sensitive field.
 */
export function get2017ExpectedValue(fieldName) {
  return YEAR_SENSITIVE_FIELDS[fieldName] || null;
}

/**
 * Build the AI prompt for 2017 verification.
 * Strict: only 2017 NEC, no amendments, no newer logic.
 */
export function build2017AIPrompt({ articleRef, ruleName, valueUsed, sourceExcerpt, calculatorId }) {
  const isHighRisk = HIGH_RISK_2017_CALCULATORS.includes(calculatorId);
  const postCheck = check2017ArticleCompliance(articleRef);

  return `You are a strict NEC 2017 codebook verification assistant. Your only job is to compare what the app uses against the NFPA 70-2017 (National Electrical Code, 2017 Edition) text provided below.

RULES YOU MUST FOLLOW:
1. Only evaluate against the 2017 NEC. Do NOT apply 2020, 2023, or 2026 changes.
2. Ignore all jurisdiction amendments.
3. A "match" means the app value EXACTLY matches the 2017 NEC source — no rounding, no interpretation.
4. If the article was ADDED in a later edition (not in 2017 NEC), that is an automatic MISMATCH.
5. Do NOT mark as verified — your job is only to compare.
${isHighRisk ? "6. ⚠️ EXTRA SCRUTINY REQUIRED: This calculator involves areas (EV charging, GFCI, SPD, emergency disconnect, service sizing, dwelling load) that changed significantly in 2020 and 2023. Be especially rigorous." : ""}
${postCheck.isViolation ? `\n⛔ CRITICAL FLAG: Article "${articleRef}" was ADDED in NEC ${postCheck.addedIn} (${postCheck.description}). This article did NOT EXIST in the 2017 NEC. This is an automatic mismatch if the app applies this rule for 2017.\n` : ""}

ITEM BEING VERIFIED:
- Calculator: ${calculatorId}
- NEC Article/Table: ${articleRef}
- Rule Name: ${ruleName || "Not specified"}
- App Value/Rule: ${valueUsed || "Not specified"}

SOURCE EXCERPT (from NEC 2017 codebook):
---
${sourceExcerpt || "(No source excerpt provided — return uncertain)"}
---

Respond with a JSON object:
{
  "result": "match" | "mismatch" | "uncertain",
  "confidence": <0-100>,
  "explanation": "<clear explanation of why it matches or doesn't, citing specific text>",
  "suggested_correction": "<what the correct 2017 value should be, or null if match>",
  "fields_affected": ["<field names in app that would need changing>"],
  "cross_year_contamination": <true|false — true if this article/value belongs to a post-2017 edition>
}`;
}