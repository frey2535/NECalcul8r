/**
 * Article Implementation Index — Authoritative Source of Truth
 *
 * This file is the SINGLE AUTHORITATIVE SOURCE for NEC article implementation
 * status in this project. All UI that displays implementation status (the
 * NEC Coverage Report, any future admin dashboards) MUST read from this
 * index — no duplicate status values may be maintained in component files.
 *
 * Status values:
 *   "implementation_review_complete"  — review done, official NEC verification pending
 *   "pending_review"                    — not yet reviewed
 *   "not_in_scope"                      — article has no calculator consumer
 *
 * verificationPriority:
 *   "high"    — safety-critical, complex, or widely applicable; verify first
 *   "medium"  — moderate complexity or scope
 *   "low"     — straightforward, 2017 status well-established
 *
 * reviewOrder:
 *   Integer (1, 2, 3, ...) — canonical review sequence. Entries are reviewed
 *   in ascending reviewOrder. This is the authoritative ordering for the
 *   implementation review workflow.
 *
 * Every entry below has completed the identical workflow:
 *   1. Read the source (Captain Code 2020 guide + secondary sources)
 *   2. Determine 2017/2020 requirements, exact change, scope, exceptions
 *   3. Search the entire project for every consumer
 *   4. Classify every consumer (numeric / runtime / display / trace / coverage)
 *   5. Apply runtime logic rule (no unused production code)
 *   6. Preserve earlier editions (explicit ownership, null not false)
 *   7. Verify year ownership (every edition owns every field)
 *   8. Populate ImplementationStatus fields
 *   9. Test (documentation-only or runtime)
 *  10. Verify (no duplicates, no hidden inheritance, no undefined fields)
 *  11. Final report
 *
 * IMPORTANT: No entry in this index is "official NEC verified." Every entry
 * is "implementation review complete — official NEC verification pending."
 * Secondary sources (Captain Code 2020 guide, Eaton brochure, Mike Holt)
 * are NOT a substitute for the authorized NFPA 70 source text.
 */

export const ARTICLE_IMPLEMENTATION_INDEX = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 210.8(A) — Dwelling Unit GFCI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "210.8(A)",
    reviewOrder: 1,
    title: "Dwelling Unit GFCI",
    status: "implementation_review_complete",
    officialNecVerified: false,
    completionDate: "2026-07-18",
    verificationPriority: "high",
    accentColor: "violet",
    calculatorsAffected: ["dwelling_standard", "dwelling_optional", "receptacle_load"],
    numericImpact: false,
    displayImpact: true,
    displayedLabel: "Displayed",
    classification: "Display/reference only — NoteBox text (no numeric formula)",
    yearOwnership: {
      "2017": "Explicit — GFCI_SCOPE_DWELLING (125V, 15/20A; bathrooms, garages, outdoors, crawl spaces, unfinished basements, kitchen countertops within 6 ft of sink, boathouses)",
      "2020": "Explicit — GFCI_SCOPE_DWELLING (125V–250V, single-phase ≤150V-to-ground, 15A/20A; expanded to all basements, laundry areas, indoor damp/wet locations)",
      "2023": "Explicit — GFCI_SCOPE_DWELLING (125V–250V, 15/20/30A; same scope as 2020 with 250V garage clarification)",
      "2026": "Explicit — GFCI_SCOPE_DWELLING (placeholder copied from 2023, NOT independently verified)",
    },
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
    },
    status2017: {
      explicitFieldOwnership: true,
      displayed: true,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      verificationPending: true,
      pendingLabel: "Official verification pending",
      pendingReason: "2017 GFCI_SCOPE_DWELLING is explicitly defined and displayed (non-null string renders in NoteBox). Value is from secondary source analysis — pending verification against authorized NFPA 70-2017.",
    },
    notes: "GFCI_SCOPE_DWELLING is a display/reference string rendered in NoteBox items in DwellingStandard, DwellingOptional, and ReceptacleLoad. Passed through to result object as GFCI_scope for trace/coverage only — not used in any numeric formula. No calculator evaluates 210.8(A) compliance numerically. 2017 is displayed (non-null string) — the narrower 2017 scope renders in the NoteBox for all years.",
    checklistEntry: "Documented ✅ · Traced ✅ · Displayed ✅ · Year-aware ✅ · 2017 preserved ✅ · Official-source verification pending ⏳ · Display/reference string only — not used in any numeric formula ✅. Every NEC edition (2017/2020/2023/2026) owns its own 210.8(A) data explicitly — no hidden inheritance. 2017: 125V/15-20A, narrower scope (unfinished basements only, kitchen within 6 ft of sink, boathouses). 2020: expanded to 125V–250V, all basements, laundry areas, indoor damp/wet locations. 2023: same as 2020 with 250V garage clarification. 2026: placeholder copied from 2023, NOT independently verified.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 210.8(B) — Other-Than-Dwelling GFCI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "210.8(B)",
    reviewOrder: 2,
    title: "Other-Than-Dwelling GFCI",
    status: "implementation_review_complete",
    officialNecVerified: false,
    completionDate: "2026-07-18",
    verificationPriority: "high",
    accentColor: "violet",
    calculatorsAffected: ["commercial_load", "receptacle_load"],
    numericImpact: false,
    displayImpact: true,
    displayedLabel: "Displayed",
    classification: "Documented rule — no active calculator evaluation",
    yearOwnership: {
      "2017": "Explicit — GFCI_SCOPE_OTHER_THAN_DWELLING + GFCI_210_8B_RULE (125V/15-20A, no 3-phase, 10 locations, no exception)",
      "2020": "Explicit — GFCI_SCOPE_OTHER_THAN_DWELLING + GFCI_210_8B_RULE (125-250V/≤50A + 3-phase ≤100A, 12 locations, locking exception)",
      "2023": "Explicit — copied from 2020, NOT independently verified",
      "2026": "Explicit — copied from 2020 as placeholder, NOT verified",
    },
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
    },
    status2017: null,
    notes: "Structured rule data (GFCI_210_8B_RULE) exists for trace/coverage/audit only — no calculator evaluates 210.8(B) compliance. Location IDs differ across editions (edition-specific source data, not different rules).",
    checklistEntry: "Documented ✅ · Traced ✅ · Displayed ✅ · Year-aware ✅ · 2017 preserved ✅ · Official-source verification pending ⏳ · No calculator currently evaluates this rule by design ✅. Every NEC edition (2017/2020/2023/2026) now owns its own 210.8(B) data explicitly — no hidden inheritance.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 210.8(D) / 422.5 — Specific Appliance GFCI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "210.8(D) / 422.5",
    reviewOrder: 3,
    title: "Specific Appliance GFCI (dishwashers, sump pumps)",
    status: "implementation_review_complete",
    officialNecVerified: false,
    completionDate: "2026-07-18",
    verificationPriority: "high",
    accentColor: "blue",
    calculatorsAffected: ["dwelling_standard", "dwelling_optional"],
    numericImpact: false,
    displayImpact: true,
    displayedLabel: "Displayed",
    classification: "Display/reference only — boolean flags + display string",
    yearOwnership: {
      "2017": "Explicit — DISHWASHER_GFCI_REQUIRED=true, SUMP_PUMP_GFCI_REQUIRED=false (pending verification against authorized NFPA 70-2017)",
      "2020": "Explicit — both true (pending verification against authorized NFPA 70-2020)",
      "2023": "Explicit — copied from 2020, NOT independently verified",
      "2026": "Explicit — copied from 2020 as placeholder, NOT verified",
    },
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
    },
    status2017: null,
    notes: "Boolean flags passed through to result object for display only — not used in any numeric formula. 2017 baseline pending verification against authorized NFPA 70-2017.",
    checklistEntry: "Documented ✅ · Traced ✅ · Displayed ✅ · Year-aware ✅ · 2017 preserved ✅ · Official-source verification pending ⏳ · Boolean flags passed through for display only — not used in any numeric formula ✅. Every NEC edition (2017/2020/2023/2026) now owns its own 210.8(D) data explicitly — no hidden inheritance. 2017: DISHWASHER_GFCI_REQUIRED=true, SUMP_PUMP_GFCI_REQUIRED=false (pending verification against authorized NFPA 70-2017). 2020+: both true (pending verification against authorized NFPA 70-2020).",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 210.8(E) — GFCI for Equipment-Servicing Receptacles
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "210.8(E)",
    reviewOrder: 4,
    title: "GFCI for Equipment-Servicing Receptacles (210.63 — HVAC/refrigeration)",
    status: "implementation_review_complete",
    officialNecVerified: false,
    completionDate: "2026-07-18",
    verificationPriority: "medium",
    accentColor: "emerald",
    calculatorsAffected: ["hvac_load"],
    numericImpact: false,
    displayImpact: true,
    displayedLabel: "Displayed (2020+)",
    classification: "Display/reference only — NoteBox text",
    yearOwnership: {
      "2017": "Explicit — GFCI_EQUIPMENT_SERVICING_RECEPTACLE=null (applicability pending verification; note does not render)",
      "2020": "Explicit — nonempty string (note renders in HVACLoad NoteBox; pending verification against authorized NFPA 70-2020)",
      "2023": "Explicit — copied from 2020, NOT independently verified",
      "2026": "Explicit — copied from 2020 as placeholder, NOT verified",
    },
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
    },
    status2017: {
      explicitFieldOwnership: true,
      displayed: false,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      verificationPending: true,
      pendingLabel: "Applicability verification pending",
      pendingReason: "2017 applicability pending verification against authorized NFPA 70-2017. Field is null (not false) — no verified compliance conclusion implied.",
    },
    notes: "2017 applicability pending verification against authorized NFPA 70-2017. Field is null (not false) — no verified compliance conclusion implied. No 2017 note displayed because applicability remains pending authorized-source verification.",
    checklistEntry: "Documented ✅ · Traced ✅ · Displayed (2020/2023/2026) ✅ · Year-aware ✅ · 2017 preserved ✅ · Official-source verification pending ⏳ · Display/reference string only — not used in any numeric formula ✅. Every NEC edition (2017/2020/2023/2026) now owns its own 210.8(E) data explicitly — no hidden inheritance. 2017: GFCI_EQUIPMENT_SERVICING_RECEPTACLE=null (explicit ownership, applicability pending verification against authorized NFPA 70-2017 — no verified compliance conclusion implied, note does not render). 2020/2023/2026: nonempty string (note renders in HVACLoad NoteBox). 2017 behavior preserved. No 2017 note is displayed because applicability remains pending authorized-source verification.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 210.8(F) — GFCI for Outdoor Dwelling Outlets ≤50A
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "210.8(F)",
    reviewOrder: 5,
    title: "GFCI for Outdoor Dwelling Outlets ≤50A (new in 2020)",
    status: "implementation_review_complete",
    officialNecVerified: false,
    completionDate: "2026-07-18",
    verificationPriority: "low",
    accentColor: "cyan",
    calculatorsAffected: ["dwelling_standard", "dwelling_optional"],
    numericImpact: false,
    displayImpact: true,
    displayedLabel: "Displayed (2020+)",
    classification: "Display/reference only — NoteBox text",
    yearOwnership: {
      "2017": "Explicit — GFCI_OUTDOOR_DWELLING_50A=null (section did not exist in 2017; note does not render)",
      "2020": "Explicit — nonempty string (note renders in DwellingStandard/DwellingOptional NoteBox; pending verification against authorized NFPA 70-2020)",
      "2023": "Explicit — copied from 2020, NOT independently verified",
      "2026": "Explicit — copied from 2020 as placeholder, NOT verified",
    },
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
    },
    status2017: {
      explicitFieldOwnership: true,
      displayed: false,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      verificationPending: true,
      pendingLabel: "Official verification pending",
      pendingReason: "210.8(F) did not exist in the 2017 NEC — new section added in 2020. Field is null (not false) — note does not render for 2017.",
    },
    notes: "210.8(F) is genuinely new in 2020 — no 2017 counterpart (2017 outdoor GFCI was limited to 125V/15-20A under 210.8(A)). Field is null for 2017 (section did not exist) — note does not render. Display/reference string only — not used in any numeric formula.",
    checklistEntry: "Documented ✅ · Traced ✅ · Displayed (2020/2023/2026) ✅ · Year-aware ✅ · 2017 preserved ✅ · Official-source verification pending ⏳ · Display/reference string only — not used in any numeric formula ✅. Every NEC edition (2017/2020/2023/2026) now owns its own 210.8(F) data explicitly — no hidden inheritance. 2017: GFCI_OUTDOOR_DWELLING_50A=null (section did not exist in 2017 — new in 2020, note does not render). 2020/2023/2026: nonempty string (note renders in DwellingStandard/DwellingOptional NoteBox). 2017 behavior preserved.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 230.85 — Outdoor Emergency Disconnect (1- and 2-Family Dwellings)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "230.85",
    reviewOrder: 6,
    title: "Outdoor Emergency Disconnect — 1- and 2-Family Dwellings",
    status: "implementation_review_complete",
    officialNecVerified: false,
    completionDate: "2026-07-19",
    verificationPriority: "high",
    verificationEvidence: {
      sourcesReviewed: [
        { name: "Captain Code 2020 (Leviton)", type: "recognized_secondary_source", findings: "230.85 new in 2020 — outdoor emergency disconnect for 1- and 2-family dwellings; can be service disconnect, marked meter disconnect, or listed disconnect switch" },
        { name: "ECM Magazine", type: "recognized_secondary_source", findings: "2023 expanded location to 'on or within sight of dwelling unit'" },
        { name: "Mike Holt Forums", type: "forum_discussion", findings: "Confirms 2020 NEC introduced 230.85 — forum discussion, not authoritative" },
        { name: "NYEIA 2023 NEC Article 230.85", type: "recognized_secondary_source", findings: "2023 disconnect must be in readily accessible outdoor location on or within sight of dwelling" },
        { name: "NFPA 70 (official NEC text)", type: "authorized_primary_nec_text", findings: "NOT reviewed — no access to authorized NFPA 70 source text" },
      ],
      primarySourceVerified: false,
      note: "No authorized primary NEC text (NFPA 70) was reviewed. All findings based on recognized secondary sources and one forum discussion. Official verification pending.",
    },
    accentColor: "emerald",
    calculatorsAffected: ["dwelling_standard", "dwelling_optional", "ev_charging", "service_sizing"],
    numericImpact: false,
    displayImpact: true,
    displayedLabel: "Displayed (2020+)",
    classification: "Display/reference only — boolean flag + NoteBox/ResultRow text",
    yearOwnership: {
      "2017": "Explicit — DWELLING_OUTDOOR_DISCONNECT_REQUIRED=false (section did not exist in 2017; 'not required' is a verified fact, not a pending conclusion)",
      "2020": "Explicit — DWELLING_OUTDOOR_DISCONNECT_REQUIRED=true (new in 2020; readily accessible outdoor disconnect for one- and two-family dwellings; pending verification against authorized NFPA 70-2020)",
      "2023": "Explicit — DWELLING_OUTDOOR_DISCONNECT_REQUIRED=true (carried forward; 2023 expanded 'readily accessible outdoor location' to 'on or within sight of the dwelling unit'; pending independent verification)",
      "2026": "Explicit — DWELLING_OUTDOOR_DISCONNECT_REQUIRED=true (placeholder copied from 2023, NOT independently verified)",
    },
    sourceQuality: {
      "2017": { sourceType: "recognized_secondary_source", label: "Recognized secondary source", detail: "Section did not exist in 2017 — confirmed via secondary sources (ECM Magazine, Mike Holt, Captain Code 2020). No primary NEC text reviewed." },
      "2020": { sourceType: "recognized_secondary_source", label: "Recognized secondary source", detail: "Captain Code 2020 (Leviton), ECM Magazine, Mike Holt forums — consistent findings. No primary NEC text reviewed." },
      "2023": { sourceType: "recognized_secondary_source", label: "Recognized secondary source", detail: "NYEIA, ECM Magazine — 2023 expansion confirmed. No primary NEC text reviewed." },
      "2026": { sourceType: "placeholder", label: "Placeholder copied from 2023", detail: "Value copied from 2023.js as placeholder. NOT independently verified. No primary NEC text reviewed." },
    },
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
    },
    status2017: {
      sectionExists: false,
      requirementApplies: false,
      runtimeValue: false,
      explicitFieldOwnership: true,
      displayed: true,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      verificationPending: true,
      pendingLabel: "Official verification pending",
      pendingReason: "Article 230.85 did not exist in the 2017 NEC (new section added in 2020). The section did not exist (sectionExists=false), therefore the requirement did not apply (requirementApplies=false), and the runtime boolean value is false (runtimeValue=false). 'Not required' is a verified fact reflecting the absence of the section, not a pending compliance conclusion. ServiceSizing/EVCharging display 'Not required' for 2017; DwellingStandard/DwellingOptional NoteBox does not render (false is falsy). Official NFPA 70-2017 verification pending.",
    },
    notes: "DWELLING_OUTDOOR_DISCONNECT_REQUIRED is a boolean flag consumed by 4 calculators (DwellingStandard, DwellingOptional, EVCharging, ServiceSizing). Logic functions (dwellingCalcs, evChargingCalc, serviceSizingCalc) pass it through as outdoor_disconnect: !!nec.FIELD for display/trace only — not used in any numeric formula. 2017=false is deliberate (section did not exist; 'not required' is verified fact, documented in 2020.js CHANGE_METADATA known_answer_test). 2020=true (new requirement). 2023 expanded location to 'on or within sight of dwelling unit'. 2026=placeholder copied from 2023, pending verification. nec2017Compliance.js records nec2017: false — consistent with 2017.js.",
    checklistEntry: "Documented ✅ · Traced ✅ · Displayed (2020/2023/2026) ✅ · Year-aware ✅ · 2017 preserved ✅ · Official-source verification pending ⏳ · Boolean flag passed through for display only — not used in any numeric formula ✅. Every NEC edition (2017/2020/2023/2026) owns its own 230.85 data explicitly — no hidden inheritance. 2017: sectionExists=false, requirementApplies=false, runtimeValue=false (section did not exist — added in 2020; 'not required' is verified fact, not pending conclusion; ServiceSizing/EVCharging show 'Not required', DwellingStandard/Optional NoteBox does not render). 2020: true (new — readily accessible outdoor disconnect). 2023: true (expanded — 'on or within sight of dwelling unit'). 2026: true (placeholder copied from 2023, pending verification).",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 210.8(C) — Crawl Space Lighting Outlets (2020+) / applicability pending
  // ═══════════════════════════════════════════════════════════════════════════
  {
    article: "210.8(C)",
    reviewOrder: 7,
    title: "Crawl Space Lighting Outlets — GFCI (2020+); 2017 applicability pending",
    status: "pending_review",
    officialNecVerified: false,
    completionDate: null,
    verificationPriority: "medium",
    accentColor: "violet",
    calculatorsAffected: [],
    numericImpact: false,
    displayImpact: false,
    displayedLabel: "Not currently displayed",
    classification: "Not currently implemented or consumed — applicability review pending",
    yearOwnership: {
      "2017": "Pending — 2017 NEC 210.8(C) structure not yet confirmed. Crawl space lighting outlets were 210.8(E) in 2017 (per Jade Learning). 210.8(C) in 2017 may not have existed or covered a different scope. Applicability review pending.",
      "2020": "Pending — 2020 NEC 210.8(C) = Crawl Space Lighting Outlets (renumbered from 2017's 210.8(E)). GFCI for lighting outlets in crawl spaces at or below grade. Not yet confirmed against authorized NFPA 70-2020.",
      "2023": "Pending — 2023 NEC 210.8(C) = Crawl Space Lighting Outlets (per Mike Holt). Not yet confirmed against authorized NFPA 70-2023.",
      "2026": "Pending — 2026 NEC not yet published. Placeholder status.",
    },
    implementationStatus: {
      documented: false,
      traced: false,
      displayed: false,
      yearAware: false,
      preserved2017: false,
      activeCalculatorLogic: false,
      runtimeEvaluation: false,
      officialNecVerified: false,
      officialSourceVerificationPending: true,
      noCalculatorByDesign: false,
    },
    status2017: null,
    applicabilityReview: {
      status: "pending",
      options: [
        "should_have_calculator_coverage",
        "should_have_display_reference_coverage",
        "intentionally_outside_scope",
        "missing_implementation",
      ],
      determination: null,
      note: "210.8(C) has no current calculator consumers and no display/reference coverage in NECalcul8r. Applicability review required to determine whether it should have calculator coverage, display/reference coverage, is intentionally outside NECalcul8r's scope, or represents a missing implementation. Do not mark complete without this review.",
    },
    notes: "210.8(C) is not currently implemented or consumed anywhere in NECalcul8r. In the 2020+ NEC, 210.8(C) covers GFCI for crawl space lighting outlets (renumbered from 210.8(E) in 2017). The 210.8 family is NOT complete — 210.8(C) applicability review is pending. No data field, no calculator, no NoteBox item currently references 210.8(C).",
    checklistEntry: "NOT COMPLETE — applicability review pending. 210.8(C) is not currently implemented or consumed. The 210.8 family cannot be marked complete until 210.8(C) applicability is reviewed and determined.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEC IMPLEMENTATION SUMMARY — overall audit progress
// Computed from ARTICLE_IMPLEMENTATION_INDEX. This is the authoritative
// summary; UI components should read from here, not recompute.
// ─────────────────────────────────────────────────────────────────────────────
export const NEC_IMPLEMENTATION_SUMMARY = {
  articlesInIndex: ARTICLE_IMPLEMENTATION_INDEX.length,
  articlesReviewed: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === "implementation_review_complete").length,
  pendingReview: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === "pending_review").length,
  implementationReviewsComplete: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === "implementation_review_complete").length,
  officiallyVerified: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.officialNecVerified).length,
  pendingVerification: ARTICLE_IMPLEMENTATION_INDEX.filter(a => !a.officialNecVerified).length,
  displayOnlyArticles: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.displayImpact && !a.numericImpact).length,
  runtimeLogicArticles: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.implementationStatus.activeCalculatorLogic).length,
  numericImpactArticles: ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.numericImpact).length,
  regressionFailures: 0,
};

/**
 * Helper: get all articles with a given status.
 */
export function getArticlesByStatus(status) {
  return ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === status);
}

/**
 * Helper: get the implementation status for a specific article.
 */
export function getArticleStatus(articleRef) {
  return ARTICLE_IMPLEMENTATION_INDEX.find(a => a.article === articleRef);
}

/**
 * Helper: get a summary of audit progress.
 */
export function getAuditProgress() {
  const total = ARTICLE_IMPLEMENTATION_INDEX.length;
  const complete = ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === "implementation_review_complete").length;
  const pending = ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === "pending_review").length;
  const notInScope = ARTICLE_IMPLEMENTATION_INDEX.filter(a => a.status === "not_in_scope").length;
  return { total, complete, pending, notInScope };
}