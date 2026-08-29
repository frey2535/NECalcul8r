import { createServer } from "vite";

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, logLevel: "error" });
  try {
    const { runRemaining2017Baseline } = await server.ssrLoadModule("/src/data/nec/remaining2017Baseline.js");
    const results = runRemaining2017Baseline();
    console.log("");
    console.log("  REMAINING CALCULATORS — 2017 BASELINE");
    console.log(`  ${results.passed}/${results.total} passed  v${results.baselineVersion}`);
    for (const s of results.suites) {
      console.log("");
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
    console.log("");
    if (results.allPass) {
      console.log("  ✅ ALL REMAINING 2017 TESTS PASS");
    } else {
      console.log(`  ❌ FAILING SUITES: ${results.failures.map((f) => f.id).join(", ")}`);
    }
    process.exitCode = results.allPass ? 0 : 1;
  } finally {
    await server.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
