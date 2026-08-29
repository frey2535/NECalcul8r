/**
 * Pure calculation logic for Conductor Ampacity (NEC 310.15).
 */

import { withTrace } from "@/lib/calculatorTrace";

export function getTempFactor(tempFactors, tempRating, ambientC) {
  const table = tempFactors[tempRating];
  if (!table) return 1;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (ambientC >= keys[i]) return table[keys[i]];
  }
  return table[keys[0]];
}

export function getBundleFactor(bundleFactors, count) {
  if (count <= 3) return bundleFactors[3] || 1.0;
  if (count <= 6) return bundleFactors[6] || 0.80;
  if (count <= 9) return bundleFactors[9] || 0.70;
  if (count <= 20) return bundleFactors[20] || 0.50;
  if (count <= 30) return bundleFactors[30] || 0.45;
  if (count <= 40) return bundleFactors[40] || 0.40;
  return bundleFactors[999] || 0.35;
}

/**
 * @param {object} v - inputs: awg, material, tempRating, ambient, bundled, useTerminal
 * @param {object} nec - necData from getNecData(year)
 */
export function calcConductorAmpacity(v, nec) {
  const table = v.material === "copper" ? nec.COPPER_AMPACITY : nec.ALUMINUM_AMPACITY;
  const row = table[v.awg];
  if (!row) return null;

  const ampacityTable = nec.AMPACITY_TABLE || "Table 310.15(B)(16)";
  const tempArticle = nec.AMPACITY_TEMP_ARTICLE || "310.15(B)(2)(a)";
  const bundleArticle = nec.AMPACITY_BUNDLE_ARTICLE || "310.15(B)(3)(a)";
  const dwellingArticle = nec.DWELLING_SERVICE_ARTICLE || "310.15(B)(7)";

  const baseKey = v.tempRating === "60" ? "t60" : v.tempRating === "75" ? "t75" : "t90";
  const baseAmpacity = row[baseKey];
  const tc = getTempFactor(nec.TEMP_FACTORS, v.tempRating, parseFloat(v.ambient) || 30);
  const bf = getBundleFactor(nec.BUNDLE_FACTORS, parseInt(v.bundled) || 3);
  const corrected = baseAmpacity * tc * bf;

  const terminalLimit = v.useTerminal === "60" ? row.t60 : row.t75;
  const finalAmpacity = Math.min(corrected, terminalLimit);

  const isDwellingService = v.isDwellingService === true || v.isDwellingService === "true";
  const dwellingServiceFactor = nec.DWELLING_SERVICE_CONDUCTOR_FACTOR || 0.83;
  const maxDwellingServiceA = isDwellingService ? Math.round((finalAmpacity / dwellingServiceFactor) * 10) / 10 : null;

  const steps = [
    { label: `Base Ampacity (${ampacityTable})`, formula: `Ampacity = ${ampacityTable} lookup by AWG & temp rating`, expression: `${v.material === "copper" ? "Copper" : "Aluminum"} #${v.awg} AWG @ ${v.tempRating}°C`, result: baseAmpacity, unit: "A" },
    { label: `Temperature Correction (${tempArticle})`, formula: "Corrected = Base × TempFactor", expression: `${baseAmpacity} × ${Math.round(tc * 1000) / 1000}`, result: Math.round(baseAmpacity * tc * 10) / 10, unit: "A", note: `Ambient ${parseFloat(v.ambient) || 30}°C → factor ${Math.round(tc * 1000) / 1000}` },
    { label: `Bundling Adjustment (${bundleArticle})`, formula: "Adjusted = Corrected × BundleFactor", expression: `${Math.round(baseAmpacity * tc * 10) / 10} × ${Math.round(bf * 1000) / 1000}`, result: Math.round(corrected * 10) / 10, unit: "A", note: `${parseInt(v.bundled) || 3} current-carrying conductors → factor ${Math.round(bf * 1000) / 1000}` },
    { label: "Terminal Temperature Limit (110.14(C))", formula: "Final = min(Adjusted, TerminalLimit)", expression: `min(${Math.round(corrected * 10) / 10}, ${terminalLimit})`, result: Math.round(finalAmpacity * 10) / 10, unit: "A", note: `${v.useTerminal === "60" ? "60°C" : "75°C"} terminal rating` },
  ];
  if (isDwellingService) {
    steps.push({ label: `Dwelling Service Rating (${dwellingArticle})`, formula: "Max service = Final ÷ 83%", expression: `${Math.round(finalAmpacity * 10) / 10} ÷ ${dwellingServiceFactor}`, result: maxDwellingServiceA, unit: "A", note: "Dwelling service/feeder conductors may be sized at 83% of service rating" });
  }
  const result = {
    baseAmpacity,
    t60: row.t60,
    t75: row.t75,
    t90: row.t90,
    tempCorrectionFactor: Math.round(tc * 1000) / 1000,
    bundleFactor: Math.round(bf * 1000) / 1000,
    correctedAmpacity: Math.round(corrected * 10) / 10,
    terminalLimit,
    finalAmpacity: Math.round(finalAmpacity * 10) / 10,
    isDwellingService,
    maxDwellingServiceA,
    ampacityTable,
    tempArticle,
    bundleArticle,
    dwellingServiceArticle: isDwellingService ? dwellingArticle : null,
    steps,
  };
  return withTrace(result, {
    articles_used: [ampacityTable.replace(/^Table /, ""), tempArticle, bundleArticle, "110.14(C)", ...(isDwellingService ? [dwellingArticle] : [])],
    tables_used: [ampacityTable, `Table ${tempArticle}`, `Table ${bundleArticle}`],
    fields_used: ["COPPER_AMPACITY", "ALUMINUM_AMPACITY", "TEMP_FACTORS", "BUNDLE_FACTORS", ...(isDwellingService ? ["DWELLING_SERVICE_CONDUCTOR_FACTOR"] : [])],
  });
}