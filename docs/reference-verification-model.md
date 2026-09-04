# NEC reference verification model

NEC source verification and calculator implementation verification are separate concerns.

## Global NEC reference verification

An NEC article or table should be verified once per NEC year.

Example:

```text
Table 220.42 | 2017 | verified
```

That means the project has checked the table/article text against the licensed NEC source for that year.

When the same article/table appears in multiple calculator traces, the verified reference status can be reused. The user should not have to verify the same code text from scratch for every calculator.

## Calculator-specific implementation review

A calculator can still apply a verified reference incorrectly.

Examples:

- wrong table row
- wrong exception
- wrong year-specific reference
- missing condition
- wrong displayed output

Those checks belong to calculator implementation review and regression tests.

## Current app behavior

`ArticleVerification` records are still stored per calculator/reference/year, but the trace and verification gate now build a global article/year status from all matching records:

- if any matching record is `needs_correction`, the global reference is treated as needing correction
- otherwise, if any matching record is exact `verified`, the global reference is treated as verified
- otherwise, AI-pending and pending states remain pending

Calculator-specific `needs_correction` still overrides a global verified status for that calculator.

Legacy statuses like `verified_2017`, `verified_2020`, and `verified_2023` are treated as `pending_review` until a documented licensed-source review updates the record to exact `verified`.
