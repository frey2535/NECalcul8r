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

    // ─── Summary ───
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    if (results.allPass) {
      console.log(`  ✅ ALL ${results.total} TESTS PASS — Status: VERIFIED`);
      console.log("═══════════════════════════════════════════════════════════════════════════");
      console.log("");
      process.exitCode = 0;
    } else {
      console.log(`  ❌ ${results.failed} TEST(S) FAILED — Status: DEFECT FOUND`);
      console.log(`  Failing tests: ${results.failures.map((f) => f.id).join(", ")}`);
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