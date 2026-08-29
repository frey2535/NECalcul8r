import { createServer } from "vite";

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: "error" });
  try {
    const { runCommercialLoadBaseline } = await server.ssrLoadModule("/src/data/nec/commercialLoadBaseline.js");
    const results = runCommercialLoadBaseline();
    console.log("");
    console.log("  COMMERCIAL LOAD (NEC 220.12 / 220.42 / 220.44) — 2017 BASELINE");
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
