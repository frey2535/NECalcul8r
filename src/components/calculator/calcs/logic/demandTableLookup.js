/**
 * Shared helpers for demand-factor-table calculators (RV Park, Marina).
 *
 * Reads demand factors directly from the centralized NEC Tables
 * implementation (necTables.js), which is the single source of truth.
 * Also provides a conductor-size selector that reuses the existing
 * ampacity tables from necData.
 */

import { getTableById } from "@/lib/necTables";

/**
 * Parse a range cell from a NEC table row label.
 * Handles: "1", "7–9", "7-9", "36 plus", "71 plus".
 * Returns {min, max} or null.
 */
export function parseRangeCell(cell) {
  const trimmed = String(cell).trim();
  if (/plus/i.test(trimmed)) {
    const min = parseInt(trimmed);
    return { min, max: Infinity };
  }
  const dashMatch = trimmed.match(/^(\d+)\s*[–-]\s*(\d+)$/);
  if (dashMatch) {
    return { min: parseInt(dashMatch[1]), max: parseInt(dashMatch[2]) };
  }
  const single = parseInt(trimmed);
  if (!isNaN(single)) return { min: single, max: single };
  return null;
}

/**
 * Look up a demand factor (%) from a centralized NEC table by count.
 * @param {string} tableId - NEC_TABLES entry id (e.g. "551_73_a_rv_park_demand")
 * @param {number} count - number of sites/receptacles
 * @returns {number} demand factor as a percentage (e.g. 55 for 55%)
 */
export function getDemandFactorPct(tableId, count) {
  if (count <= 0) return 0;
  const table = getTableById(tableId);
  if (!table) return 0;
  for (const row of table.rows) {
    const range = parseRangeCell(row[0]);
    if (range && count >= range.min && count <= range.max) {
      return parseFloat(row[1]);
    }
  }
  const lastRow = table.rows[table.rows.length - 1];
  return lastRow ? parseFloat(lastRow[1]) : 0;
}

/**
 * Find the smallest conductor AWG whose ampacity at the given temp column
 * meets or exceeds the required amps.
 * @param {object} ampacityTable - nec.COPPER_AMPACITY or nec.ALUMINUM_AMPACITY
 * @param {string} tempRating - "60", "75", or "90"
 * @param {number} requiredAmps
 * @returns {{awg: string, ampacity: number}}
 */
export function findConductorSize(ampacityTable, tempRating, requiredAmps) {
  const baseKey = tempRating === "60" ? "t60" : tempRating === "75" ? "t75" : "t90";
  for (const [awg, row] of Object.entries(ampacityTable)) {
    if (row[baseKey] >= requiredAmps) {
      return { awg, ampacity: row[baseKey] };
    }
  }
  const entries = Object.entries(ampacityTable);
  const last = entries[entries.length - 1];
  return { awg: last[0], ampacity: last[1][baseKey] };
}

/**
 * Format a conductor size label: AWG for sizes up to 4/0, kcmil for 250+.
 * @param {string} awg - conductor size key from ampacity table (e.g. "12", "4/0", "400")
 * @returns {string} formatted label (e.g. "#12 AWG", "#4/0 AWG", "400 kcmil")
 */
export function formatConductorLabel(awg) {
  const num = parseInt(awg);
  if (!awg.includes("/") && num >= 250) {
    return `${awg} kcmil`;
  }
  return `#${awg} AWG`;
}

/**
 * Compute per-phase/leg currents from site/receptacle distribution.
 * 240V loads are balanced across all legs/phases.
 * 120V loads are distributed as evenly as possible.
 *
 * @param {Array<{count, amps, phaseType}>} items
 * @param {"single"|"three"} phases
 * @returns {{phaseCurrents: number[], imbalance: number}}
 */
export function computePhaseLoading(items, phases) {
  const numPhases = phases === "three" ? 3 : 2;
  const phaseCurrents = new Array(numPhases).fill(0);
  for (const s of items) {
    if (s.count <= 0) continue;
    if (s.phaseType === "240V") {
      // 240V loads draw current on all legs/phases equally
      for (let p = 0; p < numPhases; p++) {
        phaseCurrents[p] += s.count * s.amps;
      }
    } else {
      // 120V loads: distribute evenly across phases
      for (let i = 0; i < s.count; i++) {
        phaseCurrents[i % numPhases] += s.amps;
      }
    }
  }
  const maxI = Math.max(...phaseCurrents);
  const minI = Math.min(...phaseCurrents);
  const imbalance = maxI > 0 ? ((maxI - minI) / maxI) * 100 : 0;
  return { phaseCurrents, imbalance };
}