import { createServer } from "vite";

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: "error" });
  try {
    const { runRVParkLoad2020Baseline } = await server.ssrLoadModule("/src/data/nec/rvParkLoad2020Baseline.js");
    const results = runRVParkLoad2020Baseline();
    console.log("");
    console.log("  RV PARK LOAD — 2020 BASELINE");
    console.log(`  ${results.passed}/${results.total} passed  v${results.baselineVersion}`);
    for (const s of results.suites) {
      console.log(`  ${s.allPass ? "✓" : "✗"} ${s.title}  ${s.passed}/${s.total}`);
      for (const t of s.tests) {
        console.log(`    ${t.pass ? "✓ PASS" : "✗ FAIL"}  ${t.id} — ${t.description}`);
        if (!t.pass) {
          for (const [k, fr] of Object.entries(t.fieldResults)) {
            if (!fr.match) console.log(`             ✗ ${k}: expected ${JSON.stringify(fr.expected)}, got ${JSON.stringify(fr.actual)}`);
          }
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
