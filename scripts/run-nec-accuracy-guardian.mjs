#!/usr/bin/env node
/**
 * NEC Accuracy Guardian
 *
 * Runs every known-answer / baseline verification suite that gates release.
 * Any failure is treated as a critical calculator accuracy defect suitable for
 * immediate correction-agent launch and platform-owner notification.
 *
 * Usage:
 *   node scripts/run-nec-accuracy-guardian.mjs
 *   node scripts/run-nec-accuracy-guardian.mjs --json > nec-accuracy-report.json
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const SUITES = [
  { id: "generator-sizing", npm: "verify:generator-sizing", area: "generator" },
  { id: "dwelling-optional", npm: "verify:dwelling-optional", area: "dwelling" },
  { id: "dwelling-standard", npm: "verify:dwelling-standard", area: "dwelling" },
  { id: "commercial-load", npm: "verify:commercial-load", area: "commercial" },
  { id: "kitchen-equipment", npm: "verify:kitchen-equipment", area: "kitchen" },
  { id: "multifamily-load", npm: "verify:multifamily-load", area: "multifamily" },
  { id: "farm-load", npm: "verify:farm-load", area: "farm" },
  { id: "rv-park", npm: "verify:rv-park", area: "rv_park" },
  { id: "marina", npm: "verify:marina", area: "marina" },
  { id: "remaining-2017", npm: "verify:remaining-2017", area: "remaining" },
  { id: "neutral-load", npm: "verify:neutral-load", area: "neutral" },
  { id: "pull-box", npm: "verify:pull-box", area: "pull_box" },
  { id: "pricing-tiers", npm: "verify:pricing-tiers", area: "pricing" },
  { id: "commercial-load-2020", npm: "verify:commercial-load-2020", area: "commercial" },
  { id: "lighting-load-2020", npm: "verify:lighting-load-2020", area: "lighting" },
  { id: "remaining-2020", npm: "verify:remaining-2020", area: "remaining" },
  { id: "marina-2020", npm: "verify:marina-2020", area: "marina" },
  { id: "conductor-ampacity-2020", npm: "verify:conductor-ampacity-2020", area: "ampacity" },
  { id: "rv-park-2020", npm: "verify:rv-park-2020", area: "rv_park" },
  { id: "remaining-calcs-2020", npm: "verify:remaining-calcs-2020", area: "remaining" },
];

const asJson = process.argv.includes("--json");
const outPath = (() => {
  const idx = process.argv.indexOf("--out");
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

function runSuite(suite) {
  const started = Date.now();
  const result = spawnSync("npm", ["run", suite.npm], {
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  const ok = result.status === 0;
  return {
    id: suite.id,
    npm: suite.npm,
    area: suite.area,
    ok,
    exitCode: result.status ?? 1,
    ms: Date.now() - started,
    output: output.slice(0, 4000),
  };
}

const results = SUITES.map(runSuite);
const failed = results.filter((row) => !row.ok);
const passed = results.filter((row) => row.ok);

const findings = failed.map((row) => ({
  id: `nec-accuracy-${row.id}`,
  severity: "critical",
  area: `nec_${row.area}`,
  title: `NEC accuracy baseline failed: ${row.id}`,
  detail: row.output || `npm run ${row.npm} exited ${row.exitCode}`,
}));

const report = {
  ok: failed.length === 0,
  generatedAt: new Date().toISOString(),
  totalSuites: results.length,
  passed: passed.length,
  failed: failed.length,
  coverageNote:
    "100% of shipped known-answer / baseline suites. Failures are deterministic calculator defects relative to frozen NEC benchmarks (Annex D / audited cases), not a claim about every conceivable AHJ interpretation.",
  results,
  findings,
};

if (outPath) {
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (asJson) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log("");
  console.log("  NEC ACCURACY GUARDIAN");
  console.log(`  Suites: ${report.passed}/${report.totalSuites} passed`);
  console.log(`  ${report.coverageNote}`);
  console.log("");
  for (const row of results) {
    console.log(`  ${row.ok ? "✓" : "✗"} ${row.id} (${row.ms}ms)`);
    if (!row.ok) {
      const firstFailLine = row.output.split("\n").find((line) => /fail|error|✗/i.test(line)) || row.output.split("\n")[0];
      if (firstFailLine) console.log(`      ${firstFailLine.slice(0, 160)}`);
    }
  }
  console.log("");
}

process.exit(failed.length ? 1 : 0);
