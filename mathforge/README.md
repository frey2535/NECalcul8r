# Axiom Arena

Teen-focused math training from **elementary through calculus**. Competitive Arena mode, scratch paper for long multiplication/division, detailed tutorials with international methods, parent remote watch, and an Accuracy Agent that verifies every generated problem.

**No calculator. Ever.**

## Quick start

```bash
cd mathforge
npm install
npm run dev
```

Open http://localhost:5180

## Verify math engine + Accuracy Agent

```bash
npm run verify
```

This samples every topic generator across difficulties and asserts zero verification failures.

## Features

- **Math engine** — seeded PRNG generates unique problems (no recycled loops)
- **Accuracy Agent** — every problem’s steps and answer are verified before practice
- **Scratch paper** — freehand canvas for long multiplication & division
- **Lessons** — step-by-step examples + “why shortcuts work” + non-US methods (lattice, Vedic, Singapore bars, Egyptian doubling, BODMAS/GEMA, etc.)
- **Progress** — proficiency / needs-work map per topic
- **Arena** — 60s rush vs ghost rival
- **Parent HQ** — family code, live session feed, per-kid coaching view

## Curriculum bands

Elementary → Middle School → Algebra → Geometry → Precalculus → Calculus

## Note on this repo

Axiom Arena lives in `/mathforge` alongside NECalcul8r as a standalone Vite app (`package.json` independent).
