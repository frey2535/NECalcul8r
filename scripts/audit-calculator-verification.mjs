import { createServer } from "vite";

const strict = process.argv.includes("--strict");

async function main() {
  const server = await createServer({
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { entries: [], noDiscovery: true },
    server: { middlewareMode: true },
  });

  try {
    const { CALCULATORS } = await server.ssrLoadModule("/src/data/nec/audit.js");
    const { auditCalculators } = await server.ssrLoadModule("/src/data/nec/verificationStandard.js");
    const report = auditCalculators(CALCULATORS);

    console.log("");
    console.log("  CALCULATOR CODE VERIFICATION AUDIT");
    console.log("  This is stricter than regression testing.");
    console.log(`  Total calculators       : ${report.total}`);
    console.log(`  Release-ready verified  : ${report.releaseReadyCount}`);
    console.log(`  Blocked / needs review  : ${report.blockedCount}`);
    console.log("");

    for (const calc of report.blocked) {
      console.log(`  ✗ ${calc.id} — ${calc.name}`);
      for (const gap of calc.gaps) console.log(`    - ${gap}`);
      for (const article of calc.unverifiedArticles.slice(0, 8)) {
        console.log(`    - ${article.ref}: ${article.source}`);
      }
      if (calc.unverifiedArticles.length > 8) {
        console.log(`    - ...${calc.unverifiedArticles.length - 8} more unverified reference(s)`);
      }
      console.log("");
    }

    if (report.releaseReady.length) {
      console.log("  Release-ready calculators:");
      for (const calc of report.releaseReady) console.log(`    ✓ ${calc.id} — ${calc.name}`);
      console.log("");
    }

    if (strict && report.blockedCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
