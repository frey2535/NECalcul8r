import { createServer } from "vite";

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: "error" });
  try {
    const { runRemainingCalcs2020Baseline } = await server.ssrLoadModule("/src/data/nec/remainingCalcs2020Baseline.js");
    const results = runRemainingCalcs2020Baseline();
    console.log("");
    console.log("  REMAINING CALCULATORS — 2020 PENDING-SAME");
    console.log(`  ${results.passed}/${results.total} passed  v${results.baselineVersion}`);
    for (const s of results.suites) {
      console.log(`  ${s.allPass ? "✓" : "✗"} ${s.title}  ${s.passed}/${s.total}`);
      if (!s.allPass) {
        for (const t of s.tests) {
          if (t.pass) continue;
          console.log(`    ✗ FAIL  ${t.id} — ${t.description}`);
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
