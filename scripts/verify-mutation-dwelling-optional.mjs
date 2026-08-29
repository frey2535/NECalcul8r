/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MUTATION TEST — Dwelling Optional (NEC 220.82)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Simulates the ORIGINAL DEFECT (electric heat incorrectly applied at 100%
 *  instead of 220.82(C)(4)/(C)(5) 65%/40%) and verifies that the frozen
 *  baseline test suite CATCHES it.
 *
 *  Expected result: The baseline must FAIL when the mutation is present.
 *  Expected failing tests: D2(a) and all heat-dominant HVAC tests.
 *
 *  This proves the test suite can detect the defect it was designed to
 *  prevent. Run this in DEVELOPER QA only — do NOT include in normal
 *  production verification.
 *
 *  Usage:  npm run verify:mutation:dwelling-optional
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createServer } from "vite";

async function main() {
  const server = await createServer({
    server: { middlewareMode: true },
    logLevel: "error",
  });

  try {
    const { runDwellingOptionalBaseline } = await server.ssrLoadModule(
      "/src/data/nec/dwellingOptionalBaseline.js"
    );

    // ─── MUTATION: Original defect — electric heat at 100% ───────────────
    // This is the broken version that existed BEFORE the NEC 220.82(C)
    // demand-factor fix. It uses Math.max of raw values (heat at 100%).
    function calcBroken(v, nec) {
      const sqft = Math.max(0, parseFloat(v.sqft) || 0);
      const gl = sqft * nec.DWELLING_LIGHTING_VA_PER_SQFT;
      const sa = 2 * nec.SMALL_APPLIANCE_VA;
      const lv = nec.LAUNDRY_VA;
      const other = Math.max(0, parseFloat(v.otherLoads) || 0);
      const gt = gl + sa + lv + other;
      const gd = gt <= 10000 ? gt : 10000 + (gt - 10000) * nec.OPTIONAL_DEMAND_FACTOR;

      const ac = Math.max(0, parseFloat(v.airCond) || 0);
      const hp = Math.max(0, parseFloat(v.heatPump) || 0);
      const hs = Math.max(0, parseFloat(v.heatStrip) || 0);

      // BROKEN: Math.max of raw values — heat at 100%, no demand factor,
      // no supplemental heat handling, no space heater logic
      const hvac = Math.max(ac, hs, hp);

      const total = hvac + gd;
      const V = parseFloat(v.voltage) || 240;
      const amps = total / V;
      const svc = Math.max(
        nec.STD_OCPD_SIZES.find((s) => s >= amps) || 400,
        nec.DWELLING_MIN_SERVICE_AMPS || 100
      );

      return {
        generalLighting_VA: Math.round(gl),
        generalTotal_VA: Math.round(gt),
        generalDemand_VA: Math.round(gd),
        largestHVAC_VA: Math.round(hvac),
        hvacLoad_VA: Math.round(hvac),
        totalVA: Math.round(total),
        totalAmps: Math.round(total / V),
        minService_A: svc,
      };
    }

    // Run the frozen baseline tests against the BROKEN calculator
    const results = runDwellingOptionalBaseline(calcBroken);

    // ─── Tests that MUST fail (defect must be detected) ─────────────────
    const mustFail = [
      "baseline_d2a_annex_d", // Annex D catches heat overcount
      "hvac_02_heat_gt_ac", // Heat > AC at 100% vs 40%
      "hvac_07_four_plus_units", // 40% demand factor ignored
      "hvac_08_fewer_than_four_units", // 65% demand factor ignored
      "hvac_12a_boundary_3_units", // 65% boundary
      "hvac_12b_boundary_4_units", // 40% boundary
    ];

    // ─── Tests that should still pass (no heat to overcount) ───────────
    const shouldPass = [
      "baseline_d2b_annex_d", // AC > heat — no heat to overcount
      "hvac_10_zero_hvac", // No HVAC
      "hvac_11_negative_input", // Clamped to 0
    ];

    const actualFailing = new Set(results.failures.map((f) => f.id));
    const actualPassing = new Set(
      [...results.annexDTests, ...results.hvacTests]
        .filter((t) => t.pass)
        .map((t) => t.id)
    );

    const allMustFailCaught = mustFail.every((id) => actualFailing.has(id));
    const allShouldPassStillPass = shouldPass.every((id) => actualPassing.has(id));

    // ─── Report ───
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log("  MUTATION TEST — Dwelling Optional (NEC 220.82)");
    console.log("  Simulated defect: Electric heat at 100% (original bug)");
    console.log("  Expected: Baseline tests MUST FAIL (defect detected)");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    console.log(`  Total tests run : ${results.total}`);
    console.log(`  Tests failed   : ${results.failed} (defect detected)`);
    console.log(`  Tests passed   : ${results.passed}`);
    console.log("");

    console.log("  ── Tests that MUST fail (defect detection) ──");
    for (const id of mustFail) {
      const caught = actualFailing.has(id);
      console.log(`  ${caught ? "✓ CAUGHT" : "✗ MISSED"}  ${id}`);
    }

    console.log("");
    console.log("  ── Tests that should still pass (no heat to overcount) ──");
    for (const id of shouldPass) {
      const passed = actualPassing.has(id);
      console.log(`  ${passed ? "✓ PASS " : "✗ FAIL "} ${id}`);
    }

    console.log("");
    console.log("  ── All failing tests ──");
    for (const f of results.failures) {
      console.log(`  ✗ FAIL  ${f.id}`);
    }

    console.log("");
    console.log("═══════════════════════════════════════════════════════════════════════════");
    const mutationDetected = allMustFailCaught && results.failed > 0;
    const noFalseAlarms = allShouldPassStillPass;

    if (mutationDetected && noFalseAlarms) {
      console.log("  ✅ MUTATION DETECTED — Baseline catches the original defect");
      console.log(`     ${results.failed} test(s) failed as expected, ${results.passed} passed as expected.`);
      console.log("═══════════════════════════════════════════════════════════════════════════");
      console.log("");
      process.exitCode = 0;
    } else {
      if (!mutationDetected) {
        console.log("  ❌ MUTATION NOT DETECTED — Baseline failed to catch the defect!");
        console.log(`     Expected failing tests not caught: ${mustFail.filter((id) => !actualFailing.has(id)).join(", ")}`);
      }
      if (!noFalseAlarms) {
        console.log("  ❌ FALSE ALARM — Tests that should pass are failing!");
        console.log(`     Unexpectedly failing: ${shouldPass.filter((id) => !actualPassing.has(id)).join(", ")}`);
      }
      console.log("═══════════════════════════════════════════════════════════════════════════");
      console.log("");
      process.exitCode = 1;
    }
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error("Fatal error running mutation test:", err);
  process.exit(1);
});