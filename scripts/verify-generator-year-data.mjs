import { createServer } from "vite";

async function main() {
  const server = await createServer({
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { entries: [], noDiscovery: true },
    server: { middlewareMode: true },
  });

  try {
    const { getNecData } = await server.ssrLoadModule("/src/data/nec/index.js");
    const { calcGeneratorSizing } = await server.ssrLoadModule("/src/components/calculator/calcs/logic/generatorSizingCalc.jsx");

    const cases = [
      { year: "2017", sqft: 4000, expectedConnected: 16500, expectedDemand: 7725, unitArticle: "Table 220.12", demandArticle: "Table 220.42" },
      { year: "2020", sqft: 4000, expectedConnected: 16500, expectedDemand: 7725, unitArticle: "Table 220.12", demandArticle: "Table 220.42" },
      { year: "2023", sqft: 4000, expectedConnected: 16500, expectedDemand: 7725, unitArticle: "220.41", demandArticle: "Table 220.45" },
      { year: "2026", sqft: 4000, expectedConnected: 12500, expectedDemand: 6325, unitArticle: "120.41", demandArticle: "Table 120.45" },
    ];

    let failed = 0;
    for (const t of cases) {
      const nec = getNecData(t.year);
      const rules = nec.GENERATOR_SIZING_RULES;
      const out = calcGeneratorSizing({
        occupancy: "residential",
        mode: "whole_house",
        necYear: t.year,
        squareFeet: t.sqft,
        kitchenCircuits: 2,
        laundryCircuits: 1,
        refrigeratorVA: 0,
        rangeVA: 0,
        cooktopVA: 0,
        ovenVA: 0,
        dryerVA: 0,
        waterHeaterVA: 0,
        dishwasherVA: 0,
        hvacCoolingVA: 0,
        hvacBlowerVA: 0,
        hvacHeatingVA: 0,
        wellPumpVA: 0,
        otherFixedApplianceVA: 0,
        otherFixedApplianceCount: 0,
        otherEssentialVA: 0,
        otherOptionalVA: 0,
        largestMotorRunningVA: 0,
        largestMotorLRA: 0,
      }, nec);

      const checks = [
        ["rules object", Boolean(rules), true],
        ["generalConnectedVA", out.generalConnectedVA, t.expectedConnected],
        ["generalDemandVA", out.generalDemandVA, t.expectedDemand],
        ["unit-load article", rules?.dwellingGeneral?.unitLoadArticle, t.unitArticle],
        ["demand article", rules?.dwellingGeneral?.demandTableArticle, t.demandArticle],
      ];

      for (const [label, actual, expected] of checks) {
        const ok = actual === expected;
        console.log(`${ok ? "PASS" : "FAIL"} | NEC ${t.year} | ${label} | actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
        if (!ok) failed++;
      }
    }

    const nec2023 = getNecData("2023");
    const known = calcGeneratorSizing({
      occupancy: "residential",
      mode: "whole_house",
      necYear: "2023",
      squareFeet: 2000,
      kitchenCircuits: 2,
      laundryCircuits: 1,
      refrigeratorVA: 1000,
      refrigeratorFastenedInPlace: false,
      rangeVA: 12000,
      dryerVA: 4200,
      waterHeaterVA: 4500,
      dishwasherVA: 1500,
      wellPumpVA: 1000,
      hvacCoolingVA: 5000,
      hvacBlowerVA: 1000,
      hvacHeatingVA: 10000,
      hvacCoincidence: "noncoincident",
      largestMotorRunningVA: 4000,
      otherEssentialVA: 0,
      otherOptionalVA: 0,
    }, nec2023);

    const knownChecks = [
      ["12 kW range demand", known.cookingDemandVA, 8000],
      ["dryer minimum", known.dryerDemandVA, 5000],
      ["noncoincident HVAC", known.hvacDemandVA, 10000],
      ["largest motor 25% adder", known.largestMotorAdderVA, 1000],
    ];
    for (const [label, actual, expected] of knownChecks) {
      const ok = actual === expected;
      console.log(`${ok ? "PASS" : "FAIL"} | NEC 2023 | ${label} | actual=${actual} expected=${expected}`);
      if (!ok) failed++;
    }

    if (failed) process.exitCode = 1;
    else console.log("PASS: selected-year generator NEC data drives calculation outputs");
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
