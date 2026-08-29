/**
 * NEC Data Loader — centralized NEC rules keyed by code year.
 * 
 * Usage:
 *   import { getNecData } from '@/data/nec';
 *   const nec = getNecData('2023');
 *   nec.copperAmpacity["12"].t75  // → 25
 * 
 * Each calculator should call getNecData(necYear) ONCE at the top of the component,
 * then destructure the sections it needs.
 */

import * as shared from './shared';
import * as nec2017 from './2017';
import * as nec2020 from './2020';
import * as nec2023 from './2023';
import * as nec2026 from './2026';

// Cache year data to avoid re-merging on every render
const cache = {};

/**
 * Returns the complete NEC data set for a given year.
 * Merges shared (unchanging) data with year-specific overrides.
 * Year-specific exports override shared ones when keys conflict.
 */
export function getNecData(year) {
  if (cache[year]) return cache[year];

  let yearMod;
  switch (year) {
    case "2017": yearMod = nec2017; break;
    case "2020": yearMod = nec2020; break;
    case "2023": yearMod = nec2023; break;
    case "2026": yearMod = nec2026; break;
    default:
      throw new Error(`[getNecData] Invalid NEC year "${year}". Allowed values: 2017, 2020, 2023, 2026. Select a valid NEC year before calculating.`);
  }

  const data = {
    ...shared,
    ...yearMod,
    year,
    isVerified: yearMod.VERIFIED !== false,
  };

  cache[year] = data;
  return data;
}

/**
 * Compare calculations across all NEC years.
 * Runs the same input through all available years and returns differences.
 * 
 * @param {string} calculatorName - The calculator key (e.g. 'dwelling', 'conductor_ampacity')
 * @param {object} inputs - Calculator inputs (varies per calculator)
 * @param {function} calculateFn - The pure calculation function (inputs, necData) => outputs
 * @returns {object} Results keyed by year with any differences highlighted
 */
export function compareNecYears(calculatorName, inputs, calculateFn) {
  const years = ["2017", "2020", "2023", "2026"];
  const results = {};

  for (const year of years) {
    const nec = getNecData(year);
    results[year] = {
      outputs: calculateFn(inputs, nec),
      verified: nec.isVerified,
    };
  }

  // Detect differences
  const allKeys = new Set();
  for (const year of years) {
    const outputs = results[year].outputs || {};
    Object.keys(outputs).forEach(k => allKeys.add(k));
  }

  const differences = [];
  for (const key of allKeys) {
    const values = years.map(y => results[y].outputs?.[key]);
    const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
    if (uniqueValues.length > 1) {
      differences.push({
        field: key,
        values: Object.fromEntries(years.map((y, i) => [y, values[i]])),
      });
    }
  }

  return {
    calculator: calculatorName,
    inputs,
    results,
    differences,
    hasDifferences: differences.length > 0,
    summary: differences.length === 0
      ? "No calculation differences detected across NEC years for these inputs."
      : `Found ${differences.length} field(s) that vary across NEC years.`,
  };
}