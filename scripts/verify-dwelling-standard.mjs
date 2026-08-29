/**
 * BUILD-GATE — Dwelling Standard (NEC 220.40)
 * Usage: npm run verify:dwelling-standard
 */

import { createServer } from "vite";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_VERSION = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf-8")).version;

async function main() {
  const server = await createServer({
    server: { middlewareMode: true },
    logLevel: "error",
  });

  try {
    const { runDwellingStandardBaseline } = await server.ssrLoadModule(
      "/src/data/nec/dwellingStandardBaseline.js"
    );
    const results = runDwellingStandardBaseline();
    const dateStr = new Date().toISOString();

    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log("  DWELLING STANDARD (NEC 220.40) — FROZEN BASELINE VERIFICATION");
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
    console.log("─── Annex D Benchmark Tests ───");
    for (const t of results.annexDTests) {
      console.log(`  ${t.pass ? "✓ PASS" : "✗ FAIL"}  ${t.id}`);
      if (t.source) console.log(`           ${t.source}`);
      if (!t.pass) {
        for (const [key, fr] of Object.entries(t.fieldResults)) {
          if (!fr.match) console.log(`           ✗ ${key}: expected ${fr.expected}, got ${fr.actual}`);
        }
      }
    }
    console.log("");
    console.log("─── 2017 Rule Regression ───");
    for (const t of results.regressionTests) {
      console.log(`  ${t.pass ? "✓ PASS" : "✗ FAIL"}  ${t.id} — ${t.description}`);
      if (!t.pass) {
        for (const [key, fr] of Object.entries(t.fieldResults)) {
          if (!fr.match) console.log(`           ✗ ${key}: expected ${JSON.stringify(fr.expected)}, got ${JSON.stringify(fr.actual)}`);
        }
      }
    }
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    if (results.allPass) {
      console.log(`  ✅ ALL ${results.total} TESTS PASS — Status: VERIFIED`);
      process.exitCode = 0;
    } else {
      console.log(`  ❌ ${results.failed} TEST(S) FAILED — Status: DEFECT FOUND`);
      console.log(`  Failing tests: ${results.failures.map((f) => f.id).join(", ")}`);
      process.exitCode = 1;
    }
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log("");
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error("Fatal error running baseline tests:", err);
  process.exit(1);
});
