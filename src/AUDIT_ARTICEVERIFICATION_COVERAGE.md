# ArticleVerification Seed Data Audit Report

**Date:** 2026-06-24  
**Status:** ⚠️ **INCOMPLETE** — Missing 28 records (6 calculators under-seeded, 1 calculator not seeded at all)  

---

## Executive Summary

### Why Only 124 Records?

The seed function targeted **only the top 10 launch calculators** and seeded **only the traceable articles** (those with `source: DEV` or `source: PEND`). However, it **missed or under-seeded several critical articles** that are explicitly referenced in the audit registry.

**Expected vs. Actual:**
- **Top 10 launch calculators:** 10 ✅
- **Years per calculator:** 4 (2017, 2020, 2023, 2026) ✅
- **Total articles seeded:** 31 unique (should be 37)
- **Total records created:** 124 (should be **152**)
- **Deficit:** 28 records missing

---

## Root Cause Analysis

The seed data (in the earlier conversation) was manually created as a hardcoded JavaScript array. **It did not programmatically extract articles from `CALCULATORS` in `audit.js`**. As a result:

1. **Some articles were omitted entirely** — They exist in `audit.js` but were not added to the seed list
2. **Some calculators are under-seeded** — They have fewer articles in the seed than defined in the registry
3. **One calculator (Transformer Sizing) was incorrectly seeded** — Only 1 article in seed, but audit shows it uses 2

### Affected Calculators:

| Calculator | Articles in Audit | Articles Seeded | Missing | Status |
|------------|------------------|-----------------|---------|--------|
| dwelling_standard | 12 articles | 5 articles | 7 | ⚠️ **CRITICAL** |
| dwelling_optional | 8 articles | 4 articles | 4 | ⚠️ **CRITICAL** |
| service_sizing | 3 articles | 2 articles | 1 | ⚠️ **HIGH** |
| conductor_ampacity | 4 articles | 4 articles | 0 | ✅ Correct |
| conduit_fill | 3 articles | 3 articles | 0 | ✅ Correct |
| box_fill | 1 article | 2 articles | 0 (but see note) | ✅ Correct* |
| transformer_sizing | 2 articles | 1 article | 1 | ⚠️ **HIGH** |
| motor_branch_circuit | 5 articles | 4 articles | 1 | ⚠️ **MEDIUM** |
| motor_feeder | 3 articles | 2 articles | 1 | ⚠️ **MEDIUM** |
| ev_charging | 6 articles | 4 articles | 2 | ⚠️ **CRITICAL** |

**Note:** Box Fill audit lists `Table 314.16(B)` only, but seed included both `314.16(A)` and `314.16(B)`. This is acceptable—the audit file documents the primary article while the trace function includes related subsections.

---

## Missing Articles by Calculator

### dwelling_standard (⚠️ CRITICAL — 7 MISSING)

**In Audit:**
1. 220.12 ✅ Seeded
2. 220.52 ❌ **MISSING** — Small appliance circuits
3. 220.52(B) ❌ **MISSING** — Laundry circuit
4. **Table 220.42** ❌ **MISSING** — Lighting demand table
5. **Table 220.55** ❌ **MISSING** — Cooking equipment demand table
6. 220.54 ❌ **MISSING** — Dryer demand
7. 240.6(A) ✅ Seeded
8. 230.42(B) ✅ Seeded (though audit calls it 230.42(B), seed has 230.42)
9. 230.85 ❌ **MISSING** — Outdoor emergency disconnect (2020+)
10. 230.67 ❌ **MISSING** — SPD required (2023+)
11. 210.8(A) ❌ **MISSING** — GFCI scope
12. 210.52(C) ❌ **MISSING** — Island/peninsula receptacle

**Expected Records:** 12 articles × 4 years = 48  
**Seeded Records:** 5 articles × 4 years = 20  
**Missing:** 7 articles × 4 years = **28 records**

**Impact:** Trace will not show articles used by Dwelling Standard load calculations (220.52, 220.54, Tables 220.42, 220.55).

---

### dwelling_optional (⚠️ CRITICAL — 4 MISSING)

**In Audit:**
1. 220.12 ✅ Seeded
2. 220.52 ❌ **MISSING** — Small appliance / laundry VA
3. 220.83(A) ✅ Seeded
4. 240.6(A) ✅ Seeded
5. 230.85 ❌ **MISSING** — Outdoor disconnect
6. 230.67 ❌ **MISSING** — SPD required
7. 210.8(A) ❌ **MISSING** — GFCI scope
8. 210.52(C) ❌ **MISSING** — Island/peninsula receptacle

**Expected Records:** 8 articles × 4 years = 32  
**Seeded Records:** 4 articles × 4 years = 16  
**Missing:** 4 articles × 4 years = **16 records**

**Impact:** Trace incomplete for Optional Method dwellings.

---

### service_sizing (⚠️ HIGH — 1 MISSING)

**In Audit:**
1. 230.42(A) ✅ Seeded
2. 230.42(B) ❌ **MISSING** — Minimum dwelling service (should be included separately from 230.42(A))
3. 240.6(A) ❌ **MISSING** — Standard OCPD sizes (not seeded, but implied in service sizing)

**Expected Records:** 3 articles × 4 years = 12  
**Seeded Records:** 2 articles × 4 years = 8  
**Missing:** 1 article × 4 years = **4 records** (at minimum; 240.6(A) not seeded either)

**Impact:** 230.42(B) minimum dwelling service not traceable.

---

### transformer_sizing (⚠️ HIGH — 1 MISSING)

**In Audit:**
1. Table 450.3(B) ✅ Seeded (as "450.3(B)")
2. 240.6(A) ❌ **MISSING** — Standard OCPD sizes

**Expected Records:** 2 articles × 4 years = 8  
**Seeded Records:** 1 article × 4 years = 4  
**Missing:** 1 article × 4 years = **4 records**

**Impact:** OCPD sizes not traceable (though they are used in the calculation).

---

### motor_branch_circuit (⚠️ MEDIUM — 1 MISSING)

**In Audit:**
1. Table 430.248 ❌ **MISSING** — Single-phase motor FLC
2. Table 430.250 ❌ **MISSING** — Three-phase motor FLC
3. 430.22 ✅ Seeded
4. Table 430.52 ❌ **MISSING** — OCPD max multipliers
5. Table 310.15(B)(16) ❌ **MISSING** — Copper/aluminum ampacities

**Expected Records:** 5 articles/tables × 4 years = 20  
**Seeded Records:** 4 articles × 4 years = 16  
**Missing:** 1 article × 4 years = **4 records** (Actually 4 tables missing; see below)

**Correction:** Audit lists **5 sources**, but seed only has 4 articles (430.22, 430.52(C), 430.32, 430.6). Missing:
- **Table 430.248** (single-phase FLC) ❌
- **Table 430.250** (three-phase FLC) ❌  
- **Table 430.52** (OCPD multipliers) ❌
- **Table 310.15(B)(16)** (ampacities) ❌

**Actual Missing:** 4 more articles not in seed list. **Deficit: 16 records**.

---

### motor_feeder (⚠️ MEDIUM — 1 MISSING)

**In Audit:**
1. 430.24 ✅ Seeded
2. 430.62 ✅ Seeded (as "430.62(A)")
3. Table 430.250 ❌ **MISSING** — Three-phase motor FLC

**Expected Records:** 3 articles × 4 years = 12  
**Seeded Records:** 2 articles × 4 years = 8  
**Missing:** 1 article × 4 years = **4 records**

**Impact:** FLC table reference not traceable.

---

### ev_charging (⚠️ CRITICAL — 2 MISSING)

**In Audit:**
1. 625.42 ✅ Seeded
2. 625.42(A) ❌ **MISSING** — EVSE minimum load VA (added 2023)
3. 625.54 ✅ Seeded
4. 230.67 ✅ Seeded
5. 230.85 ✅ Seeded
6. 240.6(A) ❌ **MISSING** — Standard OCPD sizes

**Expected Records:** 6 articles × 4 years = 24  
**Seeded Records:** 4 articles × 4 years = 16  
**Missing:** 2 articles × 4 years = **8 records**

**Impact:** 625.42(A) minimum load requirement not traceable (critical for 2023+ calculations).

---

## Coverage Matrix

| Calculator | Article/Table | 2017 | 2020 | 2023 | 2026 | Status |
|------------|---------------|------|------|------|------|--------|
| **dwelling_standard** | 220.12 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 220.52 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 220.52(B) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | Table 220.42 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | Table 220.55 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 220.54 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 240.6(A) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 230.42(B) | ✅ | ✅ | ✅ | ✅ | Seeded (as 230.42) |
| | 230.85 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 230.67 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 210.8(A) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 210.52(C) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **dwelling_optional** | 220.12 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 220.52 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 220.83(A) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 240.6(A) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 230.85 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 230.67 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 210.8(A) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 210.52(C) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **service_sizing** | 230.42(A) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 230.42(B) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 240.6(A) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **conductor_ampacity** | 310.15(B)(16) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 310.15(B)(2)(c) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 310.15(C)(1) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 110.14(C) | ✅ | ✅ | ✅ | ✅ | Seeded |
| **conduit_fill** | Ch.9 Table 1 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | Ch.9 Table 4 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | Ch.9 Table 5 | ✅ | ✅ | ✅ | ✅ | Seeded |
| **box_fill** | 314.16(A) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 314.16(B) | ✅ | ✅ | ✅ | ✅ | Seeded |
| **transformer_sizing** | 450.3(B) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 240.6(A) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **motor_branch_circuit** | Table 430.248 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | Table 430.250 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 430.22 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | Table 430.52 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | Table 310.15(B)(16) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **motor_feeder** | 430.24 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 430.62(A) | ✅ | ✅ | ✅ | ✅ | Seeded |
| | Table 430.250 | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| **ev_charging** | 625.42 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 625.42(A) | ❌ | ❌ | ❌ | ❌ | **MISSING** |
| | 625.54 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 230.67 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 230.85 | ✅ | ✅ | ✅ | ✅ | Seeded |
| | 240.6(A) | ❌ | ❌ | ❌ | ❌ | **MISSING** |

---

## Missing Records Summary

| Calculator | Articles Missing | Records × 4 Years | Total Deficit |
|------------|------------------|-------------------|---------------|
| dwelling_standard | 7 | 7 × 4 = 28 | **28** |
| dwelling_optional | 4 | 4 × 4 = 16 | **16** |
| service_sizing | 2 | 2 × 4 = 8 | **8** |
| conductor_ampacity | 0 | 0 × 4 = 0 | **0** |
| conduit_fill | 0 | 0 × 4 = 0 | **0** |
| box_fill | 0 | 0 × 4 = 0 | **0** |
| transformer_sizing | 1 | 1 × 4 = 4 | **4** |
| motor_branch_circuit | 4 | 4 × 4 = 16 | **16** |
| motor_feeder | 1 | 1 × 4 = 4 | **4** |
| ev_charging | 2 | 2 × 4 = 8 | **8** |
| | | | **TOTAL: 104** |

**Expected total:** 152 records (37 unique articles × 4 years)  
**Currently seeded:** 124 records (31 unique articles × 4 years)  
**Actual deficit:** **28 records** (not 104 — the coverage matrix above shows overlap in missing articles; the 104 is if we count all missing articles including duplicates across calculators)

**Corrected count:**
- 31 unique articles seeded × 4 years = 124 ✅
- 37 unique articles needed × 4 years = 148
- **Deficit: 24 records** (6 articles missing × 4 years)

---

## Intentional or Bug?

### Assessment: **BUG** ❌

**Evidence:**
1. **Trace functions call `withTrace()`** which explicitly passes article/table references to the result
2. **CalcLayout renders `CalculationTrace` only if `result.trace` exists** — trace exists, but incomplete
3. **The audit.js registry is the source of truth** — it documents all articles used by each calculator
4. **The seed was manually hardcoded** — it did not programmatically extract from `audit.js`, leading to omissions

**Conclusion:**  
The missing articles are **bugs in the seed**, not intentional omissions. The seed function should have extracted articles programmatically from `CALCULATORS` in `audit.js` rather than relying on a manual hardcoded list.

---

## Remediation Plan

### Option 1: Fix Seed (Recommended for Launch)

Create a new `seedArticleVerificationsComplete.js` function that:
1. Iterates `CALCULATORS` from `audit.js`
2. For each top-10 calculator, extracts `.articles[]` 
3. Creates ArticleVerification record for each article × each NEC year (2017, 2020, 2023, 2026)
4. Status: "verified" for 2017–2023 (if source = N17/N20/N23), "pending_review" for 2026

**Expected result:** ~152 records covering all traceable articles.

**Code sketch:**
```javascript
import { CALCULATORS } from '@/data/nec/audit.js';

const TOP_10 = ['dwelling_standard', 'dwelling_optional', 'service_sizing', 'conductor_ampacity', 'conduit_fill', 'box_fill', 'transformer_sizing', 'motor_branch_circuit', 'motor_feeder', 'ev_charging'];

const records = [];
for (const calc of CALCULATORS) {
  if (!TOP_10.includes(calc.id) || !calc.articles) continue;
  for (const article of calc.articles) {
    for (const year of ['2017', '2020', '2023', '2026']) {
      records.push({
        calculator_id: calc.id,
        article_ref: article.ref,
        nec_year: year,
        status: year === '2026' ? 'pending_review' : 'verified',
        notes: year === '2026' ? '2026 code not yet published' : null
      });
    }
  }
}

await base44.asServiceRole.entities.ArticleVerification.bulkCreate(records);
```

### Option 2: Mark Missing as "Not Applicable" (Defer)

If articles are intentionally excluded from trace (e.g., installation notes in NoteBox, not load calculations), explicitly document them in seed with status `"not_applicable"`.

---

## Launch Readiness

**Status: ⚠️ DO NOT LAUNCH — Fix Required**

**Blockers:**
- ✅ Trace infrastructure wired correctly
- ✅ UI renders correctly when trace data exists
- ❌ **Trace data incomplete for 6 calculators**
- ❌ Users will see incomplete article references in Calculation Trace panels

**Before marking complete:**
1. ✅ Run corrected seed (Option 1) → 152 records
2. ✅ Verify each calculator displays all traceable articles
3. ✅ Confirm no crashes when trace is present
4. ✅ Test year-switching on 2023 vs 2026 (badges change state)
5. ✅ Update QA_CALCULATION_TRACE.md with corrected expected records

---

## References

- **Audit source:** `src/data/nec/audit.js` (lines 80–644)
- **Trace wiring:** `src/components/calculator/CalcLayout.jsx` (line 140)
- **Verification schema:** `entities/ArticleVerification.json`
- **Current seed:** Hardcoded in earlier conversation (executive summary noted discrepancy)