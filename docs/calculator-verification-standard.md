# Calculator verification standard

Passing regression tests is not enough to claim a calculator is correct.

Before a calculator can be considered production-verified, it must pass all of these checks:

1. Official NEC article text reviewed for the selected code year.
2. All referenced tables verified against the official source.
3. Applicability and scope rules reviewed.
4. Exceptions reviewed and documented.
5. Year-specific differences reviewed for 2017, 2020, 2023, and future editions when offered.
6. Every displayed output field has an expected value in tests.
7. Saved-result fields match the UI fields.
8. Notes/articles shown to the user match the rule path actually used.
9. At least one independent known-answer case exists for each rule path.
10. Regression tests prevent fixed defects from returning.

## Verification statuses

- `release-ready verified`: all required dimensions are covered.
- `blocked / needs review`: one or more article, table, exception, or output coverage gaps remain.
- `regression tested`: the calculator matches existing expected values, but official source verification may still be incomplete.

## Audit command

Run:

```bash
npm run audit:calculator-verification
```

To fail when any calculator is not release-ready:

```bash
npm run audit:calculator-verification:strict
```

The strict command should not be added to release CI until all calculators have official-source review and full-output test coverage. Its purpose is to show what still prevents a 100%-confidence claim.

## Important limitation

No app should claim NEC calculations are 100% correct without licensed source review and qualified electrical/code expert review. The software can enforce traceability and test coverage, but final professional responsibility requires authoritative review.
