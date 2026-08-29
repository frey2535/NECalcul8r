/**
 * Pull Box Sizing — NEC 314.28 (2020 NEC primary source)
 *
 * Calculates minimum pull box dimensions for straight pulls, angle pulls,
 * U pulls, splices, and terminations per NEC 314.28(A).
 *
 * ─── NEC 314.28 DEPENDENCY MATRIX ───────────────────────────────────
 *
 * 314.28    — Scope: applies to boxes/conduit bodies containing conductors
 *              4 AWG or larger (NOT based on box volume).
 * 314.28(A) — General — boxes must be sized per (1) or (2) based on pull type
 * 314.28(A)(1) — Straight pulls: box length ≥ 8 × trade size of largest raceway
 * 314.28(A)(2) — Angle/U pulls: distance to opposite wall ≥ 6 × largest raceway
 *                 in row + sum of trade sizes of additional raceways in same
 *                 row on same wall.
 * 314.28(B) — Splices: box must also meet applicable fill requirements.
 *              314.16 fill applicability depends on conductor size and
 *              installation — NOT automatically required for every splice.
 *
 * NOTE: 314.28(C) does NOT establish a universal 4×4×2 in minimum for all
 * pull boxes. That minimum applies to specific small boxes, not to pull boxes
 * sized under 314.28(A). Do not cite 314.28(C) as a general minimum.
 *
 * ─── CONDUCTOR-PATH MODEL ────────────────────────────────────────────
 * The user must identify which raceway connects to which (conductor paths).
 * Each path is auto-classified based on the entry walls:
 *   - Same wall → U pull
 *   - Opposite walls → straight pull
 *   - Adjacent walls → angle pull
 *   - Single entry → splice or termination (user-specified)
 *
 * Each raceway entry has a `row` property. Raceways on the same wall with the
 * same row value are in the same row. The row assignment affects the
 * "sum of additional raceways" calculation.
 *
 * ─── SPACING RULES (CORRECTED) ──────────────────────────────────────
 * Spacing is calculated ONLY between entries that enclose the same conductors
 * (i.e., the two ends of a conductor path). The 6× spacing rule is NOT
 * applied automatically to every raceway in the same row — only to connected
 * entries that are part of the same conductor path.
 *
 * For each spacing result, the following is displayed:
 *   - connected raceway IDs
 *   - walls
 *   - conductor-path ID
 *   - larger raceway size
 *   - required nearest-edge spacing
 *   - actual spacing (if entered)
 *   - PASS/FAIL
 *
 * ─── WALL-DIMENSION CALCULATION ─────────────────────────────────────
 * The angle/U wall-dimension calculation (6× largest + sum of additional)
 * includes ONLY the additional raceways belonging to the applicable row
 * on that wall. Raceways in other rows on the same wall are NOT included.
 *
 * ─── SPLICE AND TERMINATION HANDLING ────────────────────────────────
 * Splice: Conductors enter through one raceway and are spliced in the box.
 *   The row dimension requirement (6× largest + sum of additional in row)
 *   applies to provide space for pulling and splicing. No connected-entry
 *   spacing is generated (only one entry). 314.16 box-fill applicability
 *   depends on conductor size and installation.
 *
 * Termination: Conductors enter through one raceway and terminate on a device
 *   (lug, breaker, etc.) in the box. The row dimension requirement applies
 *   to provide space for pulling and terminating. No connected-entry spacing
 *   is generated (only one entry).
 *
 * Splice and termination are NOT treated as ordinary angle pulls. They have
 * only one entry, so the row requirement is calculated once (not twice as
 * with angle pulls which have two entries on different walls).
 *
 * ─── ZERO-AXIS HANDLING ─────────────────────────────────────────────
 * Where an axis returns zero, it means no 314.28 pull dimension was
 * calculated for that axis. Zero is NOT represented as an acceptable
 * physical box dimension. The message "No 314.28 pull dimension calculated
 * for this axis; other requirements may establish a minimum dimension."
 * is displayed instead.
 *
 * ─── CONDUCTOR SIZE ─────────────────────────────────────────────────
 * Conductor size is global — all configured raceways are assumed to contain
 * the selected conductor size. This is clearly displayed in the UI.
 *
 * ─── VERIFICATION STATUS ───────────────────────────────────────────
 * Source: 2020 NEC (NFPA 70-2020) — primary source per user requirement.
 * Status: DEFECT FOUND — CORRECTED, PENDING VERIFICATION
 * Previous logic had multiple errors. Corrected per user review. Still
 * pending verification against authorized 2020 NFPA 70 text.
 */

import { withTrace } from "@/lib/calculatorTrace";

// ─── Trade size → numeric inches ───────────────────────────────────
export const TRADE_SIZE_INCHES = {
  "1/2": 0.5,
  "3/4": 0.75,
  "1": 1.0,
  "1-1/4": 1.25,
  "1-1/2": 1.5,
  "2": 2.0,
  "2-1/2": 2.5,
  "3": 3.0,
  "3-1/2": 3.5,
  "4": 4.0,
  "5": 5.0,
  "6": 6.0,
};

export const TRADE_SIZE_OPTIONS = Object.keys(TRADE_SIZE_INCHES).map(k => ({
  value: k,
  label: `${k}" (Trade Size ${k})`,
}));

// ─── Conductor size ranking (for 314.28 applicability) ─────────────
// 314.28 applies to conductors 4 AWG and larger.
// Rank ≥ 6 means 4 AWG or larger.
export const CONDUCTOR_SIZE_RANK = {
  "14": 1, "12": 2, "10": 3, "8": 4, "6": 5, "4": 6, "3": 7, "2": 8, "1": 9,
  "1/0": 10, "2/0": 11, "3/0": 12, "4/0": 13,
  "250 kcmil": 14, "300 kcmil": 15, "350 kcmil": 16, "400 kcmil": 17,
  "500 kcmil": 18, "600 kcmil": 19, "700 kcmil": 20, "750 kcmil": 21,
  "1000 kcmil": 22,
};

export const CONDUCTOR_SIZE_OPTIONS = [
  { value: "14", label: "14 AWG" },
  { value: "12", label: "12 AWG" },
  { value: "10", label: "10 AWG" },
  { value: "8", label: "8 AWG" },
  { value: "6", label: "6 AWG" },
  { value: "4", label: "4 AWG" },
  { value: "3", label: "3 AWG" },
  { value: "2", label: "2 AWG" },
  { value: "1", label: "1 AWG" },
  { value: "1/0", label: "1/0 AWG" },
  { value: "2/0", label: "2/0 AWG" },
  { value: "3/0", label: "3/0 AWG" },
  { value: "4/0", label: "4/0 AWG" },
  { value: "250 kcmil", label: "250 kcmil" },
  { value: "300 kcmil", label: "300 kcmil" },
  { value: "350 kcmil", label: "350 kcmil" },
  { value: "400 kcmil", label: "400 kcmil" },
  { value: "500 kcmil", label: "500 kcmil" },
  { value: "600 kcmil", label: "600 kcmil" },
  { value: "700 kcmil", label: "700 kcmil" },
  { value: "750 kcmil", label: "750 kcmil" },
  { value: "1000 kcmil", label: "1000 kcmil" },
];

const MIN_AWG_RANK = 6; // 4 AWG

// ─── Wall definitions ──────────────────────────────────────────────
const WALLS = {
  top:    { id: "top",    label: "Top Wall",    opposes: "bottom", controlsDim: "Y" },
  bottom: { id: "bottom", label: "Bottom Wall", opposes: "top",    controlsDim: "Y" },
  left:   { id: "left",   label: "Left Wall",   opposes: "right",  controlsDim: "X" },
  right:  { id: "right",  label: "Right Wall",  opposes: "left",   controlsDim: "X" },
};

export const WALL_OPTIONS = Object.values(WALLS).map(w => ({
  value: w.id,
  label: w.label,
}));

const OPPOSITE_WALLS = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

/**
 * Classify a path based on the entry walls.
 * @returns {"straight"|"angle"|"u"|"splice"|"termination"}
 */
function classifyPath(entryA, entryB, explicitType) {
  if (explicitType === "splice" || explicitType === "termination") {
    return explicitType;
  }
  if (!entryA || !entryB) {
    return explicitType || "splice";
  }
  if (entryA.wall === entryB.wall) return "u";
  if (OPPOSITE_WALLS[entryA.wall] === entryB.wall) return "straight";
  return "angle";
}

/**
 * Calculate the row requirement for a row of raceways.
 * 6 × largest in row + sum of trade sizes of all additional raceways in row.
 * Includes ALL raceways in the same row on the same wall, regardless of
 * which conductor path they belong to.
 */
function calcRowRequirement(rowRaceways) {
  if (rowRaceways.length === 0) return 0;
  const sorted = rowRaceways.map(r => r.inches).sort((a, b) => b - a);
  const largest = sorted[0];
  const sumAdditional = sorted.slice(1).reduce((s, v) => s + v, 0);
  return 6 * largest + sumAdditional;
}

/**
 * Build a wall-row trace object with detailed breakdown.
 */
function buildWallRowTrace(wallId, rowId, rowRaceways) {
  const wall = WALLS[wallId];
  const sorted = [...rowRaceways].sort((a, b) => b.inches - a.inches);
  const largest = sorted[0];
  const sixX = 6 * largest.inches;
  const additional = sorted.slice(1);
  const sumAdditional = additional.reduce((s, r) => s + r.inches, 0);
  const rowTotal = sixX + sumAdditional;

  return {
    wall: wallId,
    wallName: wall.label,
    row: rowId,
    largestRaceway: { id: largest.id, size: largest.size, inches: largest.inches },
    sixXValue: sixX,
    additionalRaceways: additional.map(r => ({ id: r.id, size: r.size, inches: r.inches })),
    sumAdditional: sumAdditional,
    rowTotal: rowTotal,
    controlledAxis: wall.controlsDim,
    rule: "314.28(A)(2)",
    racewayCount: rowRaceways.length,
    allRaceways: sorted.map(r => ({ id: r.id, size: r.size, inches: r.inches })),
  };
}

/**
 * Calculate minimum pull box dimensions per NEC 314.28.
 *
 * @param {object} v - inputs
 *   v.conductorSize: string — AWG or kcmil (determines 314.28 applicability)
 *   v.raceways: Array<{ id, size, wall, row }>
 *   v.paths: Array<{ id, entryA, entryB, type }>
 *   v.boxLength: string|number - optional user box length (Y, inches)
 *   v.boxWidth: string|number  - optional user box width (X, inches)
 *   v.actualSpacings: object - optional, keyed by path ID, actual spacing in inches
 * @param {object} nec - NEC data (unused — 314.28 rules are constant)
 * @returns {object} calculation outputs + trace
 */
export function calcPullBoxSizing(v, nec) {
  const conductorSize = v.conductorSize || "4";
  const raceways = (v.raceways || []).filter(r => r.size && r.wall);
  const paths = (v.paths || []).filter(p => p.entryA || p.entryB);
  const userBoxLength = parseFloat(v.boxLength) || 0;
  const userBoxWidth = parseFloat(v.boxWidth) || 0;
  const actualSpacings = v.actualSpacings || {};

  // ─── Check 314.28 applicability ─────────────────────────────────
  const conductorRank = CONDUCTOR_SIZE_RANK[conductorSize] || 0;
  const applicable = conductorRank >= MIN_AWG_RANK;

  // ─── Parse raceways ──────────────────────────────────────────────
  const parsed = raceways.map(r => ({
    ...r,
    inches: TRADE_SIZE_INCHES[r.size] || 0,
    row: r.row || "1", // default row
  }));

  // ─── Group raceways by wall and row ──────────────────────────────
  const byWallRow = {};
  for (const r of parsed) {
    if (!byWallRow[r.wall]) byWallRow[r.wall] = {};
    if (!byWallRow[r.wall][r.row]) byWallRow[r.wall][r.row] = [];
    byWallRow[r.wall][r.row].push(r);
  }

  let minX = 0;
  let minY = 0;
  let steps = [];
  let spacingRequirements = [];
  let wallRowTraces = [];
  let straightPullTraces = [];
  let classifiedPaths = [];

  // ─── Track which wall/rows have been traced (avoid duplicates) ──
  const tracedWallRows = new Set();

  // ─── Classify paths and calculate path-specific requirements ─────
  for (const path of paths) {
    const entryA = parsed.find(r => r.id === path.entryA);
    const entryB = parsed.find(r => r.id === path.entryB);
    const type = classifyPath(entryA, entryB, path.type);

    const pathInfo = {
      id: path.id,
      type,
      entryA: path.entryA,
      entryB: path.entryB,
      entryASize: entryA?.size || null,
      entryBSize: entryB?.size || null,
      entryAWall: entryA?.wall || null,
      entryBWall: entryB?.wall || null,
    };

    if (type === "straight") {
      // 314.28(A)(1): box length ≥ 8 × largest raceway
      const largest = Math.max(entryA.inches, entryB.inches);
      const required = 8 * largest;
      const isHorizontal = entryA.wall === "left" || entryA.wall === "right";
      const axis = isHorizontal ? "X" : "Y";

      pathInfo.requirement = required;
      pathInfo.dimension = axis;
      pathInfo.rule = "314.28(A)(1) — Straight pull";

      if (isHorizontal) {
        minX = Math.max(minX, required);
      } else {
        minY = Math.max(minY, required);
      }

      // ─── Straight pull trace ────────────────────────────────────
      straightPullTraces.push({
        pathId: path.id,
        entryAId: entryA.id,
        entryBId: entryB.id,
        entryASize: entryA.size,
        entryBSize: entryB.size,
        entryAWall: entryA.wall,
        entryBWall: entryB.wall,
        opposingWalls: `${entryA.wall} ↔ ${entryB.wall}`,
        largestRaceway: largest,
        largestRacewayLabel: entryA.inches >= entryB.inches ? entryA.size : entryB.size,
        multiplier: 8,
        required: required,
        controlledAxis: axis,
        rule: "314.28(A)(1)",
      });

      steps.push({
        label: `Straight Pull — ${entryA.wall}↔${entryB.wall} (314.28(A)(1))`,
        formula: "Box length = 8 × largest raceway",
        expression: `8 × ${largest}"`,
        result: required,
        unit: "in",
        note: `Path ${path.id}: ${entryA.size}" on ${entryA.wall} ↔ ${entryB.size}" on ${entryB.wall}. Controls ${axis}.`,
      });
    } else if (type === "angle" || type === "u") {
      // 314.28(A)(2): distance to opposite wall = 6 × largest in row + sum of additional
      const pathLargest = Math.max(entryA.inches, entryB.inches);

      // For each entry, calculate the row requirement
      const entries = entryB ? [entryA, entryB] : [entryA];
      for (const entry of entries) {
        const rowKey = `${entry.wall}:${entry.row}`;
        const rowRaceways = byWallRow[entry.wall]?.[entry.row] || [entry];
        const rowReq = calcRowRequirement(rowRaceways);
        const wall = WALLS[entry.wall];
        const dim = wall.controlsDim;

        pathInfo.rowRequirement = rowReq;
        pathInfo.dimension = dim;
        pathInfo.rule = `314.28(A)(2) — ${type === "u" ? "U" : "Angle"} pull`;

        if (dim === "X") {
          minX = Math.max(minX, rowReq);
        } else {
          minY = Math.max(minY, rowReq);
        }

        // ─── Wall-row trace (only once per wall/row) ───────────────
        if (!tracedWallRows.has(rowKey)) {
          tracedWallRows.add(rowKey);
          wallRowTraces.push(buildWallRowTrace(entry.wall, entry.row, rowRaceways));
        }

        steps.push({
          label: `${type === "u" ? "U" : "Angle"} Pull — ${entry.wall} wall, row ${entry.row} → ${dim} (314.28(A)(2))`,
          formula: "Distance = 6 × largest in row + sum of additional in row",
          expression: rowRaceways.length === 1
            ? `6 × ${entry.inches}"`
            : `6 × ${Math.max(...rowRaceways.map(r => r.inches))}" + ${rowRaceways.map(r => r.inches).sort((a, b) => b - a).slice(1).map(s => `${s}"`).join(" + ")}`,
          result: rowReq,
          unit: "in",
          note: `Path ${path.id}: ${entry.size}" on ${entry.wall} wall, row ${entry.row}. ${rowRaceways.length} raceway(s) in row. Controls ${dim}.`,
        });
      }

      // ─── Connected-entry spacing (ONLY for connected entries) ───
      // Spacing is calculated ONLY between entries that enclose the same
      // conductors (the two ends of this conductor path). The 6× spacing
      // rule is NOT applied to every raceway in the same row.
      const connSpacing = 6 * pathLargest;
      const actual = actualSpacings[path.id] !== undefined ? parseFloat(actualSpacings[path.id]) || 0 : null;
      const spacingPass = actual !== null ? actual >= connSpacing : null;

      pathInfo.connectedSpacing = connSpacing;

      spacingRequirements.push({
        type: "connected",
        pathId: path.id,
        pathType: type,
        entryAId: entryA.id,
        entryBId: entryB.id,
        entryASize: entryA.size,
        entryBSize: entryB.size,
        entryAWall: entryA.wall,
        entryBWall: entryB.wall,
        largerRacewaySize: Math.max(entryA.inches, entryB.inches),
        largerRacewayLabel: entryA.inches >= entryB.inches ? entryA.size : entryB.size,
        requiredSpacing: connSpacing,
        actualSpacing: actual,
        pass: spacingPass,
        label: `Path ${path.id}: ${entryA.size}" (${entryA.wall}) ↔ ${entryB.size}" (${entryB.wall})`,
        rule: "314.28(A)(2) — Connected entry spacing",
      });

      steps.push({
        label: `Spacing — Path ${path.id} connected entries (314.28(A)(2))`,
        formula: "Spacing = 6 × largest raceway in path",
        expression: `6 × ${pathLargest}"`,
        result: connSpacing,
        unit: "in",
        note: `Minimum nearest-edge-to-nearest-edge spacing between ${entryA.size}" (${entryA.wall}) and ${entryB.size}" (${entryB.wall}).${actual !== null ? ` Actual: ${actual}" → ${spacingPass ? "PASS" : "FAIL"}` : ""}`,
      });
    } else if (type === "splice" || type === "termination") {
      // ─── Splice / Termination — explicitly defined ───────────────
      // Splice: Conductors enter through one raceway and are spliced in the box.
      //   Row dimension requirement applies (6× largest + sum of additional in row).
      //   No connected-entry spacing (only one entry).
      //   314.16 box-fill applicability depends on conductor size and installation.
      //
      // Termination: Conductors enter through one raceway and terminate on a device.
      //   Row dimension requirement applies (6× largest + sum of additional in row).
      //   No connected-entry spacing (only one entry).
      //
      // These are NOT treated as ordinary angle pulls. They have one entry,
      // so the row requirement is calculated once, not twice.
      const entry = entryA || entryB;
      if (entry) {
        const rowKey = `${entry.wall}:${entry.row}`;
        const rowRaceways = byWallRow[entry.wall]?.[entry.row] || [entry];
        const rowReq = calcRowRequirement(rowRaceways);
        const wall = WALLS[entry.wall];
        const dim = wall.controlsDim;

        pathInfo.rowRequirement = rowReq;
        pathInfo.dimension = dim;
        pathInfo.rule = `314.28(A)(2) — ${type === "splice" ? "Splice" : "Termination"}`;
        pathInfo.spliceEffect = type === "splice"
          ? "Conductors enter through one raceway and are spliced in the box. Row dimension requirement (6× largest + sum of additional in row) applies. No connected-entry spacing (only one entry). 314.16 box-fill applicability depends on conductor size and installation."
          : "Conductors enter through one raceway and terminate on a device in the box. Row dimension requirement (6× largest + sum of additional in row) applies. No connected-entry spacing (only one entry).";

        if (dim === "X") {
          minX = Math.max(minX, rowReq);
        } else {
          minY = Math.max(minY, rowReq);
        }

        // ─── Wall-row trace (only once per wall/row) ───────────────
        if (!tracedWallRows.has(rowKey)) {
          tracedWallRows.add(rowKey);
          wallRowTraces.push(buildWallRowTrace(entry.wall, entry.row, rowRaceways));
        }

        steps.push({
          label: `${type === "splice" ? "Splice" : "Termination"} — ${entry.wall} wall, row ${entry.row} → ${dim} (314.28(A)(2))`,
          formula: "Distance = 6 × largest in row + sum of additional in row",
          expression: rowRaceways.length === 1
            ? `6 × ${entry.inches}"`
            : `6 × ${Math.max(...rowRaceways.map(r => r.inches))}" + ${rowRaceways.map(r => r.inches).sort((a, b) => b - a).slice(1).map(s => `${s}"`).join(" + ")}`,
          result: rowReq,
          unit: "in",
          note: `Path ${path.id}: ${entry.size}" on ${entry.wall} wall, row ${entry.row}. ${type === "splice" ? "Conductors spliced" : "Conductors terminate"} in box. Controls ${dim}. No connected-entry spacing (single entry).`,
        });
      }
    }

    classifiedPaths.push(pathInfo);
  }

  // ─── Compliance check (if user provided box dimensions) ──────────
  let pass = null;
  let complianceSteps = [];
  if (userBoxLength > 0 && userBoxWidth > 0) {
    const lengthOk = userBoxLength >= minY;
    const widthOk = userBoxWidth >= minX;
    pass = lengthOk && widthOk;

    complianceSteps.push({
      label: "Compliance Check — Length (Y, top↔bottom)",
      formula: "Box length ≥ Min Y",
      expression: `${userBoxLength}" ≥ ${minY}"`,
      result: lengthOk ? "PASS" : "FAIL",
      note: lengthOk ? "Box length is adequate." : "Box length is insufficient.",
    });
    complianceSteps.push({
      label: "Compliance Check — Width (X, left↔right)",
      formula: "Box width ≥ Min X",
      expression: `${userBoxWidth}" ≥ ${minX}"`,
      result: widthOk ? "PASS" : "FAIL",
      note: widthOk ? "Box width is adequate." : "Box width is insufficient.",
    });
    complianceSteps.push({
      label: "Overall Result",
      formula: "Both dimensions must pass",
      expression: `${lengthOk ? "✓" : "✗"} Length AND ${widthOk ? "✓" : "✗"} Width`,
      result: pass ? "PASS" : "FAIL",
      note: pass ? "Box meets NEC 314.28 requirements." : "Box does NOT meet NEC 314.28 requirements.",
    });
  }

  // ─── Warnings ───────────────────────────────────────────────────
  let unsupportedWarning = null;
  if (parsed.length === 0) {
    unsupportedWarning = "Add at least one raceway entry to calculate minimum box dimensions.";
  } else if (paths.length === 0) {
    unsupportedWarning = "Add at least one conductor path (connecting two raceway entries) to classify the pull type and calculate dimensions.";
  }

  let applicabilityWarning = null;
  if (!applicable && parsed.length > 0) {
    applicabilityWarning = `NEC 314.28 applies to conductors 4 AWG and larger. Selected conductor size (${conductorSize}) is smaller than 4 AWG. NEC 314.16 (box fill) applies instead — use the Box Fill calculator. No 314.28 pull-sizing calculation is performed.`;
  }

  // ─── Unmapped raceway warning ───────────────────────────────────
  const mappedIds = new Set();
  for (const p of paths) {
    if (p.entryA) mappedIds.add(p.entryA);
    if (p.entryB) mappedIds.add(p.entryB);
  }
  const unmapped = parsed.filter(r => !mappedIds.has(r.id));
  let unmappedWarning = null;
  if (unmapped.length > 0) {
    unmappedWarning = `${unmapped.length} raceway(s) not assigned to any conductor path. Add a path for each raceway to calculate its pull requirements.`;
  }

  // ─── Zero-axis messages ─────────────────────────────────────────
  // Where an axis returns zero, do not represent zero as an acceptable
  // physical box dimension.
  const ZERO_AXIS_MESSAGE = "No 314.28 pull dimension calculated for this axis; other requirements may establish a minimum dimension.";
  const xAxisMessage = minX === 0 ? ZERO_AXIS_MESSAGE : null;
  const yAxisMessage = minY === 0 ? ZERO_AXIS_MESSAGE : null;

  // ─── Global conductor size notice ──────────────────────────────
  const conductorSizeNotice = "All configured raceways are assumed to contain the selected conductor size.";

  // ─── Splice/termination info ─────────────────────────────────────
  const spliceTerminationInfo = {
    splice: "Conductors enter through one raceway and are spliced in the box. The row dimension requirement (6× largest + sum of additional in row) applies to provide space for pulling and splicing. No connected-entry spacing is generated (only one entry). 314.16 box-fill applicability depends on conductor size and installation — use professional judgment.",
    termination: "Conductors enter through one raceway and terminate on a device (lug, breaker, etc.) in the box. The row dimension requirement (6× largest + sum of additional in row) applies to provide space for pulling and terminating. No connected-entry spacing is generated (only one entry).",
    notAnglePull: "Splice and termination paths are NOT treated as ordinary angle pulls. They have only one entry, so the row requirement is calculated once (not twice as with angle pulls which have two entries on different walls).",
  };

  const allSteps = [...steps, ...complianceSteps];

  const result = {
    applicable,
    conductorSize,
    minX: Math.round(minX * 100) / 100,
    minY: Math.round(minY * 100) / 100,
    minBoxDimensions: `${Math.round(minX * 100) / 100}" × ${Math.round(minY * 100) / 100}"`,
    paths: classifiedPaths,
    spacingRequirements,
    wallRowTraces,
    straightPullTraces,
    userBoxLength,
    userBoxWidth,
    pass,
    steps: allSteps,
    racewayCount: parsed.length,
    pathCount: paths.length,
    unsupportedWarning,
    applicabilityWarning,
    unmappedWarning,
    xAxisMessage,
    yAxisMessage,
    conductorSizeNotice,
    spliceTerminationInfo,
  };

  return withTrace(result, {
    articles_used: ["314.28", "314.28(A)", "314.28(A)(1)", "314.28(A)(2)", "314.28(B)"],
    tables_used: [],
    fields_used: [],
  });
}