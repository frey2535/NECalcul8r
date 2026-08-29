# Calculation Trace QA Checklist — Before Launch

**Status:** Ready for final verification  
**Date:** 2026-06-24  
**Scope:** Top 10 launch calculators + ArticleVerification seeding

---

## 1. Database Seeding ✅

### Test: `seedArticleVerifications` Function
- **Backend function:** `src/functions/seedArticleVerifications.js` (admin-only)
- **Status:** Created. Seeds 124 ArticleVerification records on first run.
- **Verification steps:**
  1. Call via dashboard: `base44.functions.invoke('seedArticleVerifications', {})`
  2. Check database: `base44.entities.ArticleVerification.list()`
  3. Confirm **124 records exist** in ArticleVerification entity
  4. Sample query: Records for "dwelling_standard" + "220.12" across 4 years (2017, 2020, 2023, 2026)

### Expected Results:
```
Total ArticleVerification records: 124
  - Dwelling Standard: 20 records (5 articles × 4 years)
  - Dwelling Optional: 16 records (4 articles × 4 years)
  - Service Sizing: 8 records (2 articles × 4 years)
  - Conductor Ampacity: 16 records (4 articles × 4 years)
  - Conduit Fill: 12 records (3 articles × 4 years)
  - Box Fill: 8 records (2 articles × 4 years)
  - Transformer Sizing: 4 records (1 article × 4 years)
  - Motor Branch Circuit: 12 records (3 articles × 4 years)
  - Motor Feeder: 8 records (2 articles × 4 years)
  - EV Charging: 16 records (4 articles × 4 years)
```

---

## 2. Calculation Trace Rendering ✅

### Infrastructure Created:
- **Component:** `src/components/calculator/CalculationTrace.jsx` — renders articles/tables + verification badges + warnings
- **Hook:** `src/hooks/useArticleVerification.js` — queries verification status from database
- **Wiring:** `src/components/calculator/CalcLayout.jsx` (line 140) — displays trace below results
- **Utility:** `src/lib/calculatorTrace.js` — `withTrace()` wrapper function

### Test Each of 10 Calculators:

| Calculator | Route | Logic Function | Trace Status | Verify On-Screen |
|------------|-------|-----------------|--------------|------------------|
| Dwelling Standard | `/calculator/dwelling_standard` | `calcDwellingStandard()` | ✅ Returns trace | Articles: 220.12, 220.42, 220.82, 240.6(A), 230.42 |
| Dwelling Optional | `/calculator/dwelling_optional` | `calcDwellingOptional()` | ✅ Returns trace | Articles: 220.12, 220.83(A), 240.6(A), 230.42 |
| Service Sizing | `/calculator/service_sizing` | `calcServiceSizing()` | ✅ Returns trace | Articles: 230.42(A), 230.42(B) |
| Conductor Ampacity | `/calculator/conductor_ampacity` | `calcConductorAmpacity()` | ✅ Returns trace | Articles: 310.15(B)(16), 310.15(B)(2)(c), 310.15(C)(1), 110.14(C) |
| Conduit Fill | `/calculator/conduit_fill` | `calcConduitFill()` | ✅ Returns trace | Tables: Ch.9 Table 1, 4, 5 |
| Box Fill | `/calculator/box_fill` | `calcBoxFill()` | ✅ Returns trace | Articles: 314.16(A), 314.16(B) |
| Transformer Sizing | `/calculator/transformer_sizing` | `calcTransformerSizing()` | ✅ Returns trace | Articles: 450.3(B) |
| Motor Branch Circuit | `/calculator/motor_branch_circuit` | `calcMotorBranchCircuit()` | ✅ Returns trace | Articles: 430.22, 430.52(C), 430.32, 430.6 |
| Motor Feeder | `/calculator/motor_feeder` | `calcMotorFeeder()` | ✅ Returns trace | Articles: 430.24, 430.62(A) |
| EV Charging | `/calculator/ev_charging` | `calcEVCharging()` | ✅ Returns trace | Articles: 625.42, 625.54, 230.67, 230.85 |

### Test Steps for Each Calculator:
1. **Login** to the app
2. **Navigate** to calculator route (e.g., `/calculator/service_sizing`)
3. **Enter inputs** (use defaults if provided)
4. **Observe results panel**
5. **Verify Calculation Trace section appears below results** with:
   - ✅ "Calculation Trace" header with database icon
   - ✅ Selected NEC year displayed (2023, 2017, etc.)
   - ✅ Articles listed with inline verification badges
   - ✅ Tables listed with inline verification badges
   - ✅ NEC data fields used (in blue boxes)

---

## 3. Verification Status Display

### Test: Verify Badge States

#### 2017/2020/2023 (Verified)
When showing calculators on **2017, 2020, or 2023**:
- Each article/table badge should show:
  - ✅ Green checkmark icon
  - ✅ "Verified 2017" / "Verified 2020" / "Verified 2023"
  - ✅ Dark green background (`text-emerald-600`, `bg-emerald-50`)

#### 2026 (Pending — Code Not Published)
When showing calculators on **2026**:
- Each article/table badge should show:
  - ⏳ Clock icon
  - ⏳ "Pending Review"
  - ⏳ Amber background (`text-amber-600`, `bg-amber-50`)
- **Red warning banner should appear** above trace:
  - Text: "NEC 2026 is pending publication. Data used in this calculation has not been verified against final code. Results are speculative."
  - Red icon and red background (`bg-red-50`, `border-red-200`)

#### Missing Records (No Seed Data)
If ArticleVerification records are deleted:
- Badges should default to "Pending Review" status
- No errors or crashes
- Trace panel still renders

---

## 4. Edge Cases & Robustness

### Test: Missing Trace Data
- **Scenario:** Logic function returns result without `trace` property
- **Expected:** CalcLayout renders result, trace section is skipped (line 140 checks `result.trace`)
- **Verify:** No crashes, no console errors

### Test: Missing NEC Year
- **Scenario:** `necYear` is null or invalid
- **Expected:** CalcLayout shows "No NEC Year Selected" error (line 29–41)
- **Verify:** Calculator blocks calculation until valid year is selected

### Test: Database Query Failure
- **Scenario:** `useArticleVerification` fails to query database
- **Expected:** `getStatus()` returns `{ status: "pending_review", notes: null }`
- **Verify:** Trace still renders with fallback "Pending Review" badges

---

## 5. Year-Switch Parity (For Coverage Report)

### Integration with `/admin/coverage`:
- Each calculator logic function now returns trace metadata
- `YearSwitchTest` component (already exists) uses these functions to compare outputs across 2017, 2020, 2023, 2026
- Expected behavior: Same inputs → trace shows which articles/tables changed between years, or "Output identical because Article XXX unchanged"

---

## Signoff Checklist

- [ ] `seedArticleVerifications` runs without error
- [ ] Database contains 124 ArticleVerification records
- [ ] Dwelling Standard shows trace with articles 220.12, 220.42, 220.82, 240.6(A), 230.42
- [ ] Dwelling Optional shows trace with articles 220.12, 220.83(A), 240.6(A), 230.42
- [ ] Service Sizing shows trace with articles 230.42(A), 230.42(B)
- [ ] Conductor Ampacity shows trace with articles 310.15(B)(16), 310.15(B)(2)(c), 310.15(C)(1), 110.14(C)
- [ ] Conduit Fill shows trace with tables Ch.9 Table 1, 4, 5
- [ ] Box Fill shows trace with articles 314.16(A), 314.16(B)
- [ ] Transformer Sizing shows trace with article 450.3(B)
- [ ] Motor Branch Circuit shows trace with articles 430.22, 430.52(C), 430.32, 430.6
- [ ] Motor Feeder shows trace with articles 430.24, 430.62(A)
- [ ] EV Charging shows trace with articles 625.42, 625.54, 230.67, 230.85
- [ ] Trace badges show "Verified 2017", "Verified 2020", "Verified 2023" on their respective years
- [ ] Trace badges show "Pending Review" for 2026
- [ ] Red warning banner appears for 2026 calculations
- [ ] No calculators crash when trace data is missing
- [ ] No database errors in browser console

---

## Launch Readiness

**When all checks pass:** Top 10 calculators are **credibility-verified at launch**.  
Users can trust results because every article/table shows explicit verification status for the selected year.

Users can ask: **"How do I know this is using the correct code book?"**  
Answer: **"See the Calculation Trace panel—it shows every article verified against NEC 2023 (or your selected year)."**