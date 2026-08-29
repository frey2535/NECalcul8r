import { createServer } from "vite";

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: "error" });
  try {
    const { runFarmLoadBaseline } = await server.ssrLoadModule("/src/data/nec/farmLoadBaseline.js");
    const results = runFarmLoadBaseline();
    console.log("");
    console.log("  FARM LOAD (NEC 220.102 / 220.103) — 2017 BASELINE");
    console.log(`  ${results.passed}/${results.total} passed  v${results.baselineVersion}`);
    for (const t of results.tests) {
      console.log(`  ${t.pass ? "✓ PASS" : "✗ FAIL"}  ${t.id} — ${t.description}`);
      if (!t.pass) {
        for (const [k, fr] of Object.entries(t.fieldResults)) {
          if (!fr.match) console.log(`           ✗ ${k}: expected ${fr.expected}, got ${fr.actual}`);
        }
      }
    }
    console.log(results.allPass ? "  ✅ ALL TESTS PASS" : `  ❌ FAILING: ${results.failures.map((f) => f.id).join(", ")}`);
    process.exitCode = results.allPass ? 0 : 1;
  } finally {
    await server.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
