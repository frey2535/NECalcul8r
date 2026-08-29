# Standardized Implementation Closeout Report — Article 230.85

**Article:** 230.85 — Outdoor Emergency Disconnect — 1- and 2-Family Dwellings  
**Review Order:** 6  
**Status:** implementation_review_complete  
**Official NEC Verified:** false  
**Completion Date:** 2026-07-19  

---

## 1. Source Reviewed

| Source | Type | Findings |
|--------|------|----------|
| Captain Code 2020 (Leviton) | Recognized secondary source | 230.85 new in 2020 — outdoor emergency disconnect for 1- and 2-family dwellings; can be service disconnect, marked meter disconnect, or listed disconnect switch |
| ECM Magazine | Recognized secondary source | 2023 expanded location to "on or within sight of dwelling unit" |
| Mike Holt Forums | Forum discussion | Confirms 2020 NEC introduced 230.85 — forum discussion, not authoritative |
| NYEIA 2023 NEC Article 230.85 | Recognized secondary source | 2023 disconnect must be in readily accessible outdoor location on or within sight of dwelling |
| NFPA 70 (official NEC text) | Authorized primary NEC text | **NOT reviewed** — no access to authorized NFPA 70 source text |

**Primary source verified:** No — no authorized primary NEC text (NFPA 70) was reviewed.

---

## 2. 2017 Requirement or Section Status

**Article 230.85 did not exist in the 2017 NEC.** The section was added in the 2020 NEC.

| Metadata | Value |
|----------|-------|
| `sectionExists` | `false` — the section did not exist in the 2017 NEC |
| `requirementApplies` | `false` — the requirement did not apply (section did not exist) |
| `runtimeValue` | `false` — the boolean runtime value is `false` |
| `explicitFieldOwnership` | `true` — `DWELLING_OUTDOOR_DISCONNECT_REQUIRED = false` is explicitly defined in `2017.js` |
| `displayed` | `true` — ServiceSizing/EVCharging display "Not required" for 2017; DwellingStandard/DwellingOptional NoteBox does not render (false is falsy) |

**Key distinction:** "Not required" is a verified fact reflecting the absence of the section, not a pending compliance conclusion. This is distinct from 210.8(E) and 210.8(F) where `null` was used because 2017 applicability was genuinely pending verification.

---

## 3. 2020 Requirement Summary

230.85 was **new in the 2020 NEC**. For one- and two-family dwelling units, all service conductors must terminate in disconnecting means that have a short-circuit current rating equal to or greater than the available fault current. The disconnect must be installed in a **readily accessible outdoor location** — either on the dwelling itself or within sight of it.

The outdoor emergency disconnect can consist of:
- The service disconnect(s), or
- A properly marked meter disconnect(s), or
- Other listed disconnect switches

**Runtime value:** `DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true` in `2020.js`

---

## 4. 2023 Change Summary

The 2023 NEC **expanded** the location requirement from "readily accessible outdoor location" to **"on or within sight of the dwelling unit."** This clarification ensures the disconnect is accessible to emergency responders.

**Runtime value:** `DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true` in `2023.js` (carried forward from 2020)

---

## 5. 2026 Placeholder Status

The 2026 NEC has not been published. The value is a **placeholder copied from 2023** — NOT independently verified.

**Runtime value:** `DWELLING_OUTDOOR_DISCONNECT_REQUIRED = true` in `2026.js` (placeholder)

---

## 6. Exact Code Change

| Edition | Field | Value | Source |
|---------|-------|-------|--------|
| 2017 | `DWELLING_OUTDOOR_DISCONNECT_REQUIRED` | `false` | `2017.js` — section did not exist |
| 2020 | `DWELLING_OUTDOOR_DISCONNECT_REQUIRED` | `true` | `2020.js` — new requirement |
| 2023 | `DWELLING_OUTDOOR_DISCONNECT_REQUIRED` | `true` | `2023.js` — carried forward, location expanded |
| 2026 | `DWELLING_OUTDOOR_DISCONNECT_REQUIRED` | `true` | `2026.js` — placeholder copied from 2023 |

No numeric formula change. Boolean flag only.

---

## 7. Exceptions

Per secondary sources: the emergency disconnect requirement applies to **one- and two-family dwelling units** only. No exceptions documented in secondary sources reviewed. Official exception review pending authorized NFPA 70 source text.

---

## 8. Occupancies Affected

- **One-family dwelling units** (single-family homes)
- **Two-family dwelling units** (duplexes)

Does NOT apply to multifamily dwellings, commercial, or other occupancies.

---

## 9. Equipment and Locations Affected

**Equipment:**
- Service disconnecting means
- Meter disconnects (if properly marked)
- Listed disconnect switches

**Locations:**
- 2020: "readily accessible outdoor location" on the dwelling
- 2023: "on or within sight of the dwelling unit" (expanded)

---

## 10. Files Searched

All files in `src/` were searched for `DWELLING_OUTDOOR_DISCONNECT_REQUIRED` and `230.85`:

- `src/data/nec/2017.js`
- `src/data/nec/2020.js`
- `src/data/nec/2023.js`
- `src/data/nec/2026.js`
- `src/data/nec/audit.js`
- `src/lib/calculatorTrace.js`
- `src/lib/nec2017Compliance.js`
- `src/pages/NECCoverageReport.jsx`
- `src/components/calculator/calcs/DwellingStandard.jsx`
- `src/components/calculator/calcs/DwellingOptional.jsx`
- `src/components/calculator/calcs/EVCharging.jsx`
- `src/components/calculator/calcs/ServiceSizing.jsx`
- `src/components/calculator/calcs/logic/dwellingCalcs.jsx`
- `src/components/calculator/calcs/logic/evChargingCalc.jsx`
- `src/components/calculator/calcs/logic/serviceSizingCalc.jsx`

---

## 11. Consumers Found

| # | File | Consumer Type |
|---|------|---------------|
| 1 | `src/lib/calculatorTrace.js` | FIELD_META registry (trace) |
| 2 | `src/lib/nec2017Compliance.js` | 2017 compliance reference (nec2017: false) |
| 3 | `src/pages/NECCoverageReport.jsx` | Coverage report (year field listing) |
| 4 | `src/components/calculator/calcs/DwellingStandard.jsx` | NoteBox `<li>` display |
| 5 | `src/components/calculator/calcs/DwellingOptional.jsx` | NoteBox `<li>` display |
| 6 | `src/components/calculator/calcs/EVCharging.jsx` | ResultRow + NoteBox display |
| 7 | `src/components/calculator/calcs/ServiceSizing.jsx` | ResultRow display |
| 8 | `src/components/calculator/calcs/logic/dwellingCalcs.jsx` | Pass-through: `outdoor_disconnect: !!nec.FIELD` |
| 9 | `src/components/calculator/calcs/logic/evChargingCalc.jsx` | Pass-through: `outdoor_disconnect: !!nec.FIELD` |
| 10 | `src/components/calculator/calcs/logic/serviceSizingCalc.jsx` | Pass-through: `outdoor_disconnect: !!nec.FIELD` |

---

## 12. Consumer Classifications

| Consumer | Classification | Numeric? | Runtime? | Display? | Trace? |
|----------|---------------|----------|----------|----------|--------|
| calculatorTrace.js | Trace/coverage | No | No | No | Yes |
| nec2017Compliance.js | Compliance reference | No | No | No | Yes |
| NECCoverageReport.jsx | Coverage report | No | No | No | Yes |
| DwellingStandard.jsx | Display (NoteBox) | No | No | Yes | No |
| DwellingOptional.jsx | Display (NoteBox) | No | No | Yes | No |
| EVCharging.jsx | Display (ResultRow + NoteBox) | No | No | Yes | No |
| ServiceSizing.jsx | Display (ResultRow) | No | No | Yes | No |
| dwellingCalcs.jsx | Pass-through (display/trace) | No | No | Yes | Yes |
| evChargingCalc.jsx | Pass-through (display/trace) | No | No | Yes | Yes |
| serviceSizingCalc.jsx | Pass-through (display/trace) | No | No | Yes | Yes |

**No consumer uses this field in a numeric formula.**

---

## 13. Duplicate Logic Review

No duplicate logic found. The field is consumed by exactly one logic function per calculator:
- `dwellingCalcs.jsx` — both `calcDwellingStandard` and `calcDwellingOptional` pass it through as `outdoor_disconnect: !!nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED`
- `evChargingCalc.jsx` — `calcEVCharging` passes it through
- `serviceSizingCalc.jsx` — `calcServiceSizing` passes it through

No duplicated math, no conflicting values, no redundant calculations.

---

## 14. Calculators Affected

| Calculator | Source File | Impact |
|------------|------------|--------|
| Dwelling Standard | `DwellingStandard.jsx` | NoteBox display (2020+) |
| Dwelling Optional | `DwellingOptional.jsx` | NoteBox display (2020+) |
| EV Charging | `EVCharging.jsx` | ResultRow + NoteBox display |
| Service Sizing | `ServiceSizing.jsx` | ResultRow display |

---

## 15. Numeric Impact

**None.** `DWELLING_OUTDOOR_DISCONNECT_REQUIRED` is a boolean flag. No numeric formula, no ampacity calculation, no load calculation, no sizing calculation consumes this field. It is passed through to the result object as `outdoor_disconnect: !!nec.FIELD` for display and trace only.

---

## 16. Display Impact

**Yes — display/reference only.**

| Calculator | 2017 Display | 2020+ Display |
|------------|-------------|---------------|
| DwellingStandard | NoteBox does not render (false is falsy) | NoteBox renders: "230.85: Outdoor emergency disconnect required" |
| DwellingOptional | NoteBox does not render | NoteBox renders |
| EVCharging | ResultRow: "Not required" | ResultRow: "Required (230.85)" + NoteBox |
| ServiceSizing | ResultRow: "Not required" | ResultRow: "Required (230.85)" |

---

## 17. Trace Status

**Traced.** The field is registered in `calculatorTrace.js` FIELD_META:
```
DWELLING_OUTDOOR_DISCONNECT_REQUIRED: { value: "See year", source: "230.85", description: "Outdoor emergency disconnect requirement.", usedBy: ["Dwelling Standard", "Dwelling Optional"] }
```

Logic functions include it in their `fields_used` arrays for traceability.

---

## 18. Coverage Status

**Covered.** The field appears in `NECCoverageReport.jsx` as a year-specific field for 4 calculators:
- `dwelling_standard` — calcYearFields includes `DWELLING_OUTDOOR_DISCONNECT_REQUIRED`
- `dwelling_optional` — calcYearFields includes `DWELLING_OUTDOOR_DISCONNECT_REQUIRED`
- `ev_charging` — calcYearFields includes `DWELLING_OUTDOOR_DISCONNECT_REQUIRED`
- `service_sizing` — calcYearFields includes `DWELLING_OUTDOOR_DISCONNECT_REQUIRED`

---

## 19. implementationStatus

```json
{
  "documented": true,
  "traced": true,
  "displayed": true,
  "yearAware": true,
  "preserved2017": true,
  "activeCalculatorLogic": false,
  "runtimeEvaluation": false,
  "officialNecVerified": false,
  "officialSourceVerificationPending": true,
  "noCalculatorByDesign": false
}
```

---

## 20. 2017 Regression Results

| Check | Result |
|-------|--------|
| 2017.js value | `false` (explicit, unchanged) |
| ServiceSizing 2017 display | "Not required" (correct — section did not exist) |
| EVCharging 2017 display | "Not required" (correct) |
| DwellingStandard 2017 NoteBox | Does not render (false is falsy — correct) |
| DwellingOptional 2017 NoteBox | Does not render (correct) |
| nec2017Compliance.js | `nec2017: false` (consistent) |
| 2020.js CHANGE_METADATA | "should read false for 2017" (consistent) |

**2017 behavior preserved. No regression.**

---

## 21. Explicit Year Ownership

| Edition | File | Value | Explicit? | Source Type |
|---------|------|-------|-----------|-------------|
| 2017 | `2017.js` | `false` | Yes | Recognized secondary source (section absence confirmed) |
| 2020 | `2020.js` | `true` | Yes | Recognized secondary source (Captain Code 2020, ECM, Mike Holt) |
| 2023 | `2023.js` | `true` | Yes | Recognized secondary source (NYEIA, ECM) |
| 2026 | `2026.js` | `true` | Yes | Placeholder copied from 2023 |

**No hidden inheritance.** Every edition owns its own value explicitly.

---

## 22. Files Modified

| File | Change |
|------|--------|
| `src/data/nec/ArticleImplementationIndex.js` | Added 230.85 entry (reviewOrder: 6) with verificationEvidence, sourceQuality, enhanced status2017 (sectionExists/requirementApplies/runtimeValue); added 210.8(C) entry (reviewOrder: 7, status: pending_review); added pendingReview and articlesInIndex to NEC_IMPLEMENTATION_SUMMARY; documented reviewOrder in header |
| `src/components/ImplementationSummary.jsx` | Added "Pending review" metric to summary display |

**No data files (2017.js, 2020.js, 2023.js, 2026.js) were modified** — all values were already correct and explicitly owned.

---

## 23. Remaining Official-Source Limitations

1. **No authorized primary NEC text (NFPA 70) was reviewed** for any edition. All findings are based on recognized secondary sources and one forum discussion.
2. **2020 requirement** — pending verification against authorized NFPA 70-2020 text.
3. **2023 expansion** ("on or within sight of dwelling unit") — pending verification against authorized NFPA 70-2023 text.
4. **2026 placeholder** — copied from 2023, NOT independently verified. Must be updated when NFPA 70-2026 is published.
5. **Exceptions** — no exceptions documented in secondary sources. Official exception review pending.
6. **Mike Holt Forums** — forum discussion was used as supporting evidence only, not as authoritative verification.
7. **210.8(C) applicability** — the 210.8 family is NOT complete. 210.8(C) (Crawl Space Lighting Outlets) has no current consumers and requires a separate applicability review before the 210.8 family can be marked complete.

---

## Source-Quality Labeling

| Edition | Source Type | Label | Authoritative? |
|---------|------------|-------|-----------------|
| 2017 | Recognized secondary source | Section absence confirmed via secondary sources | No — not primary NEC text |
| 2020 | Recognized secondary source | Captain Code 2020, ECM Magazine, Mike Holt | No — not primary NEC text |
| 2023 | Recognized secondary source | NYEIA, ECM Magazine | No — not primary NEC text |
| 2026 | Placeholder | Copied from 2023 | No — placeholder, not verified |

**No edition is verified against authorized primary NEC text.** `officialNecVerified: false` for all editions.

---

## Index Verification

The 230.85 entry includes:

| Required Field | Present? | Value |
|----------------|----------|-------|
| `reviewOrder` | ✅ | `6` |
| `verificationPriority` | ✅ | `"high"` |
| `verificationEvidence` | ✅ | Sources reviewed with type labels |
| `implementationStatus` | ✅ | Full status object |
| `status2017` | ✅ | Enhanced with sectionExists/requirementApplies/runtimeValue |
| Explicit 2020 ownership | ✅ | `yearOwnership["2020"]` |
| Explicit 2023 ownership | ✅ | `yearOwnership["2023"]` |
| Explicit 2026 placeholder ownership | ✅ | `yearOwnership["2026"]` |
| `officialNecVerified` | ✅ | `false` (no primary-source verification occurred) |
| `sourceQuality` | ✅ | Per-edition source type labels |

---

*Closeout report generated 2026-07-19. Article 230.85 implementation review complete — official NEC verification pending.*