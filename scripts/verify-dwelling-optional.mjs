/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BUILD-GATE TEST RUNNER — Dwelling Optional (NEC 220.82)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Executes all frozen baseline tests, prints a readable pass/fail report,
 *  and exits with a failure code if any test fails.
 *
 *  Usage:  npm run verify:dwelling-optional
 *
 *  This is a CONTROLLED test path — it does NOT run during normal page loads
 *  or production UI imports. Use this before releases to verify the Dwelling
 *  Optional calculator has not regressed.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createServer } from "vite";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgPath = resolve(__dirname, "..", "package.json");
const APP_VERSION = JSON.parse(readFileSync(pkgPath, "utf-8")).version;

async function main() {
  const server = await createServer({
    server: { middlewareMode: true },
    logLevel: "error",
  });

  try {
    const { runDwellingOptionalBaseline } = await server.ssrLoadModule(
      "/src/data/nec/dwellingOptionalBaseline.js"
    );
    const { calcDwellingOptional } = await server.ssrLoadModule(
      "/src/components/calculator/calcs/logic/dwellingCalcs.jsx"
    );
    const { getNecData } = await server.ssrLoadModule("/src/data/nec/index.js");

    const results = runDwellingOptionalBaseline();
    const dateStr = new Date().toISOString();

    // ─── Header ───
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log("  DWELLING OPTIONAL (NEC 220.82) — FROZEN BASELINE VERIFICATION");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log(`  Baseline version : ${results.baselineVersion}`);
    console.log(`  Baseline frozen  : ${results.baselineDate}`);
    console.log(`  App version      : ${APP_VERSION}`);
    console.log(`  Date executed    : ${dateStr}`);
    console.log(`  Total tests      : ${results.total}`);
    console.log(`  Passed           : ${results.passed}`);
    console.log(`  Failed           : ${results.failed}`);
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log("");

    // ─── Annex D Tests ───
    console.log("─── Annex D Benchmark Tests ───");
    for (const t of results.annexDTests) {
      const status = t.pass ? "✓ PASS" : "✗ FAIL";
      console.log(`  ${status}  ${t.id}`);
      console.log(`           ${t.source}`);
      if (!t.pass) {
        for (const [key, fr] of Object.entries(t.fieldResults)) {
          if (!fr.match) {
            console.log(`           ✗ ${key}: expected ${fr.expected}, got ${fr.actual}`);
          }
        }
      }
    }

    // ─── HVAC Regression Tests ───
    console.log("");
    console.log("─── HVAC Regression Tests (NEC 220.82(C) paths) ───");
    for (const t of results.hvacTests) {
      const status = t.pass ? "✓ PASS" : "✗ FAIL";
      console.log(`  ${status}  ${t.id} — ${t.description}`);
      console.log(`           ${t.necMethod}`);
      if (!t.pass) {
        for (const [key, fr] of Object.entries(t.fieldResults)) {
          if (!fr.match) {
            console.log(`           ✗ ${key}: expected ${fr.expected}, got ${fr.actual}`);
          }
        }
      }
    }

    // ─── Load-path never-throw (empty/partial NEC data) ───
    console.log("");
    console.log("─── Load-path hardening (must not throw) ───");
    const defaultUiInputs = {
      sqft: 2000, airCond: 5000, heatStrip: 0, heatPump: 0,
      heatUnits: 1, supplementalHeat: 0, supplementalSimultaneous: false, spaceHeater: 0,
      otherLoads: 8000, voltage: 240,
    };
    const loadPathCases = [
      { id: "empty-nec", inputs: {}, nec: {} },
      { id: "default-ui-empty-nec", inputs: defaultUiInputs, nec: {} },
      { id: "missing-hvac-table", inputs: defaultUiInputs, nec: { OPTIONAL_HVAC: null, STD_OCPD_SIZES: null } },
      ...["2017", "2020", "2023", "2026"].map((year) => ({
        id: `year-${year}`,
        inputs: defaultUiInputs,
        nec: getNecData(year),
      })),
    ];
    const loadPathFailures = [];
    for (const test of loadPathCases) {
      try {
        const out = calcDwellingOptional(test.inputs, test.nec);
        const finite = [out.totalVA, out.totalAmps, out.minService_A, out.hvacLoad_VA, out.generalDemand_VA]
          .every((n) => Number.isFinite(n));
        if (!finite) {
          loadPathFailures.push(`${test.id}: non-finite load outputs ${JSON.stringify({
            totalVA: out.totalVA, totalAmps: out.totalAmps, minService_A: out.minService_A,
          })}`);
          console.log(`  ✗ FAIL  ${test.id} — non-finite load outputs`);
        } else {
          console.log(`  ✓ PASS  ${test.id} — ${out.totalVA} VA / ${out.totalAmps} A / ${out.minService_A} A service`);
        }
      } catch (error) {
        loadPathFailures.push(`${test.id}: ${error?.message || error}`);
        console.log(`  ✗ FAIL  ${test.id} — threw ${error?.message || error}`);
      }
    }

    // ─── Summary ───
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    if (results.allPass && loadPathFailures.length === 0) {
      console.log(`  ✅ ALL ${results.total} BASELINE TESTS PASS — Status: VERIFIED`);
      console.log("  ✅ Load-path hardening: empty/partial NEC data does not crash");
      console.log("═══════════════════════════════════════════════════════════════════════════");
      console.log("");
      process.exitCode = 0;
    } else {
      const failing = [
        ...results.failures.map((f) => f.id),
        ...loadPathFailures,
      ];
      console.log(`  ❌ ${failing.length} TEST(S) FAILED — Status: DEFECT FOUND`);
      console.log(`  Failing tests: ${failing.join(", ")}`);
      console.log("═══════════════════════════════════════════════════════════════════════════");
      console.log("");
      process.exitCode = 1;
    }
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error("Fatal error running baseline tests:", err);
  process.exit(1);
});