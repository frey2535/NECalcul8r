import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, Select, NumInput } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import {
  calcPullBoxSizing,
  TRADE_SIZE_OPTIONS,
  WALL_OPTIONS,
  CONDUCTOR_SIZE_OPTIONS,
} from "./logic/pullBoxSizingCalc";

const FORMULAS = [
  { label: "Straight Pull (314.28(A)(1))", formula: "Box length = 8 × largest raceway trade size", description: "For straight pulls, the length of the box shall not be less than eight times the trade size of the largest raceway." },
  { label: "Angle/U Pull (314.28(A)(2))", formula: "Distance = 6 × largest in row + sum of additional raceway trade sizes in same row", description: "For angle or U pulls, the distance from each raceway entry to the opposite wall shall not be less than six times the trade size of the largest raceway in the row, plus the sum of the trade sizes of all additional raceway entries in the same row on the same wall." },
  { label: "Connected-Entry Spacing (314.28(A)(2))", formula: "Spacing = 6 × largest raceway in path (connected entries only)", description: "For raceways enclosing the same conductors (the two ends of a conductor path), nearest-edge-to-nearest-edge spacing must be at least six times the trade size of the largest raceway. This spacing is calculated ONLY between connected entries — NOT automatically for every raceway in the same row." },
];

let _idCounter = 0;
const nextId = () => `rw_${++_idCounter}`;
let _pathCounter = 0;
const nextPathId = () => `p_${++_pathCounter}`;

export default function PullBoxSizing({ category, necYear = "2020" }) {
  const nec = getNecData(necYear);
  const [conductorSize, setConductorSize] = useRestoredField("conductorSize", "4");
  const [raceways, setRaceways] = useRestoredField("raceways", [
    { id: nextId(), size: "3", wall: "left", row: "1" },
    { id: nextId(), size: "3", wall: "right", row: "1" },
  ]);
  const [paths, setPaths] = useRestoredField("paths", [
    { id: nextPathId(), entryA: raceways[0].id, entryB: raceways[1].id, type: "auto" },
  ]);
  const [boxLength, setBoxLength] = useRestoredField("boxLength", "");
  const [boxWidth, setBoxWidth] = useRestoredField("boxWidth", "");
  const [actualSpacings, setActualSpacings] = useRestoredField("actualSpacings", {});

  const addRaceway = (wall = "left") => {
    setRaceways(prev => [...prev, { id: nextId(), size: "2", wall, row: "1" }]);
  };
  const removeRaceway = (id) => {
    setRaceways(prev => prev.filter(r => r.id !== id));
    setPaths(prev => prev.filter(p => p.entryA !== id && p.entryB !== id));
  };
  const updateRaceway = (id, field, value) => {
    setRaceways(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addPath = () => {
    setPaths(prev => [...prev, { id: nextPathId(), entryA: raceways[0]?.id || "", entryB: raceways[1]?.id || "", type: "auto" }]);
  };
  const removePath = (id) => {
    setPaths(prev => prev.filter(p => p.id !== id));
    setActualSpacings(prev => { const c = { ...prev }; delete c[id]; return c; });
  };
  const updatePath = (id, field, value) => {
    setPaths(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const updateActualSpacing = (pathId, value) => {
    setActualSpacings(prev => ({ ...prev, [pathId]: value }));
  };

  const v = { conductorSize, raceways, paths, boxLength, boxWidth, actualSpacings };
  const r = calcPullBoxSizing(v, nec);

  // Group raceways by wall for display
  const byWall = { top: [], bottom: [], left: [], right: [] };
  raceways.forEach(rw => { if (byWall[rw.wall]) byWall[rw.wall].push(rw); });

  const racewayOptions = raceways.map(rw => ({
    value: rw.id,
    label: `${rw.size}" on ${rw.wall} (row ${rw.row})`,
  }));

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        {r.applicabilityWarning && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300">
            ⚠ {r.applicabilityWarning}
          </div>
        )}

        {r.unsupportedWarning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            ⚠ {r.unsupportedWarning}
          </div>
        )}

        {r.unmappedWarning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            ⚠ {r.unmappedWarning}
          </div>
        )}

        {/* Global conductor size notice */}
        {r.applicable && (
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-[10px] text-blue-700 dark:text-blue-300">
            ℹ {r.conductorSizeNotice}
          </div>
        )}

        <ResultSection title="Minimum Box Dimensions">
          <ResultRow label="Conductor Size" value={r.conductorSize} sub={r.applicable ? "314.28 applies (≥ 4 AWG)" : "314.28 does NOT apply (< 4 AWG)"} />
          <ResultRow
            label="Min Width (X — left↔right)"
            value={r.minX > 0 ? r.minX : "—"}
            unit={r.minX > 0 ? "in" : ""}
            sub={r.xAxisMessage}
            highlight={r.minX > 0}
          />
          <ResultRow
            label="Min Length (Y — top↔bottom)"
            value={r.minY > 0 ? r.minY : "—"}
            unit={r.minY > 0 ? "in" : ""}
            sub={r.yAxisMessage}
            highlight={r.minY > 0}
          />
          <ResultRow label="Minimum Box Size" value={r.minBoxDimensions} sub="per 314.28(A)" />
        </ResultSection>

        {/* Straight pull traces */}
        {r.straightPullTraces.length > 0 && (
          <ResultSection title="Straight Pull Traces (314.28(A)(1))">
            {r.straightPullTraces.map((sp, i) => (
              <div key={i} className="p-2 rounded-lg bg-card border border-border text-[10px] space-y-0.5">
                <div className="font-bold text-foreground">Path {sp.pathId}: {sp.entryASize}" ({sp.entryAWall}) ↔ {sp.entryBSize}" ({sp.entryBWall})</div>
                <div className="text-muted-foreground">Opposing walls: {sp.opposingWalls}</div>
                <div className="text-muted-foreground">Largest raceway: {sp.largestRacewayLabel}" ({sp.largestRaceway}")</div>
                <div className="text-muted-foreground">8 × {sp.largestRaceway}" = <span className="font-bold text-foreground">{sp.required}"</span></div>
                <div className="text-muted-foreground">Controlled axis: {sp.controlledAxis}</div>
              </div>
            ))}
          </ResultSection>
        )}

        {/* Wall-row traces */}
        {r.wallRowTraces.length > 0 && (
          <ResultSection title="Wall-Row Traces (314.28(A)(2))">
            {r.wallRowTraces.map((wr, i) => (
              <div key={i} className="p-2 rounded-lg bg-card border border-border text-[10px] space-y-0.5">
                <div className="font-bold text-foreground">{wr.wallName}, Row {wr.row}</div>
                <div className="text-muted-foreground">Largest raceway: {wr.largestRaceway.size}" ({wr.largestRaceway.inches}")</div>
                <div className="text-muted-foreground">6 × {wr.largestRaceway.inches}" = {wr.sixXValue}"</div>
                {wr.additionalRaceways.length > 0 ? (
                  <div className="text-muted-foreground">
                    Additional raceways: {wr.additionalRaceways.map(a => `${a.size}" (${a.inches}")`).join(" + ")} = {wr.sumAdditional}"
                  </div>
                ) : (
                  <div className="text-muted-foreground">Additional raceways: none</div>
                )}
                <div className="text-muted-foreground">Row total: <span className="font-bold text-foreground">{wr.rowTotal}"</span></div>
                <div className="text-muted-foreground">Controlled axis: {wr.controlledAxis}</div>
                <div className="text-muted-foreground">Raceways in row: {wr.racewayCount}</div>
              </div>
            ))}
          </ResultSection>
        )}

        {/* Spacing requirements — connected entries only */}
        {r.spacingRequirements.length > 0 && (
          <ResultSection title="Spacing Requirements (Connected Entries Only)">
            {r.spacingRequirements.map((req, i) => (
              <div key={i} className="p-2 rounded-lg bg-card border border-border text-[10px] space-y-0.5">
                <div className="font-bold text-foreground">{req.label}</div>
                <div className="text-muted-foreground">Path ID: {req.pathId} ({req.pathType === "u" ? "U" : "Angle"} pull)</div>
                <div className="text-muted-foreground">Connected raceway IDs: {req.entryAId} ↔ {req.entryBId}</div>
                <div className="text-muted-foreground">Walls: {req.entryAWall} ↔ {req.entryBWall}</div>
                <div className="text-muted-foreground">Larger raceway: {req.largerRacewayLabel}" ({req.largerRacewaySize}")</div>
                <div className="text-muted-foreground">Required nearest-edge spacing: <span className="font-bold text-foreground">{req.requiredSpacing}"</span></div>
                {req.actualSpacing !== null ? (
                  <div className={req.pass ? "text-green-600 dark:text-green-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"}>
                    Actual spacing: {req.actualSpacing}" → {req.pass ? "✓ PASS" : "✗ FAIL"}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic">Actual spacing: not entered</div>
                )}
              </div>
            ))}
          </ResultSection>
        )}

        {/* Splice/termination info */}
        {r.paths.some(p => p.type === "splice" || p.type === "termination") && (
          <ResultSection title="Splice / Termination Handling">
            {r.paths.filter(p => p.type === "splice" || p.type === "termination").map((p, i) => (
              <div key={i} className="p-2 rounded-lg bg-card border border-border text-[10px] space-y-1">
                <div className="font-bold text-foreground">Path {p.id}: {p.type === "splice" ? "Splice" : "Termination"}</div>
                <div className="text-muted-foreground">{p.spliceEffect}</div>
              </div>
            ))}
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-300">
              {r.spliceTerminationInfo.notAnglePull}
            </div>
          </ResultSection>
        )}

        {r.pass !== null && (
          <ResultSection title="Compliance Check">
            <ResultRow label="Box Length (Y)" value={r.userBoxLength} unit="in" />
            <ResultRow label="Box Width (X)" value={r.userBoxWidth} unit="in" />
            <ResultRow
              label="Overall Result"
              value={r.pass ? "✓ PASS — Box is adequate" : "✗ FAIL — Box too small"}
              failed={!r.pass}
              highlight={r.pass}
            />
          </ResultSection>
        )}

        <FormulaBox steps={r.steps} formulas={FORMULAS} />

        <NoteBox>
          <p className="font-bold mb-1">NEC 314.28 — Pull and Junction Box Sizing</p>
          <p className="mb-1"><strong>Applicability:</strong> 314.28 applies to boxes/conduit bodies containing conductors 4 AWG or larger. For smaller conductors, use NEC 314.16 (Box Fill).</p>
          <p className="mb-1"><strong>314.28(A)(1) — Straight Pulls:</strong> Box length ≥ 8 × trade size of largest raceway.</p>
          <p className="mb-1"><strong>314.28(A)(2) — Angle/U Pulls:</strong> Distance to opposite wall ≥ 6 × largest raceway in row + sum of additional raceway trade sizes in same row on same wall.</p>
          <p className="mb-1"><strong>Spacing (Corrected):</strong> The 6× spacing rule is calculated ONLY between connected entries (entries enclosing the same conductors). It is NOT applied automatically to every raceway in the same row.</p>
          <p className="mb-1"><strong>314.28(B) — Splices:</strong> Where splices are made, the box may also need to satisfy 314.16 fill requirements. Applicability depends on conductor size and the actual installation — use professional judgment.</p>
          <p className="mb-1"><strong>Splice/Termination:</strong> These are NOT treated as ordinary angle pulls. They have one entry, so the row requirement is calculated once. No connected-entry spacing is generated.</p>
          <p className="mb-1"><strong>Zero Axis:</strong> Where an axis returns zero, no 314.28 pull dimension was calculated for that axis. Other requirements may establish a minimum dimension.</p>
          <p className="mt-2 text-amber-700 dark:text-amber-400">
            ⚠ Verification Status: DEFECT FOUND — CORRECTED, PENDING VERIFICATION. Pending verification against authorized 2020 NFPA 70 text.
          </p>
        </NoteBox>
      </div>
    }>
      {/* Conductor Size */}
      <Field label="Conductor Size" hint="314.28 applies to conductors 4 AWG and larger">
        <Select value={conductorSize} onChange={setConductorSize} options={CONDUCTOR_SIZE_OPTIONS} />
      </Field>

      {/* Raceway Entries */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">Raceway Entries</p>
          <span className="text-[10px] text-muted-foreground">{raceways.length} raceway(s)</span>
        </div>

        {/* Top wall */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => addRaceway("top")}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
          >
            + Add to Top Wall
          </button>
          <div className="flex gap-1 flex-wrap justify-center min-h-[28px]">
            {byWall.top.length === 0 ? (
              <span className="text-[10px] text-muted-foreground italic">No raceways</span>
            ) : byWall.top.map(rw => (
              <RacewayChip key={rw.id} raceway={rw} onRemove={removeRaceway} onUpdate={updateRaceway} />
            ))}
          </div>
        </div>

        {/* Middle: Left + Center + Right */}
        <div className="flex items-stretch gap-2">
          <div className="flex flex-col items-center gap-1 flex-1">
            <button
              onClick={() => addRaceway("left")}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors w-full"
            >
              + Left
            </button>
            <div className="flex flex-col gap-1 flex-1 min-h-[40px] w-full">
              {byWall.left.length === 0 ? (
                <span className="text-[10px] text-muted-foreground italic text-center py-2">—</span>
              ) : byWall.left.map(rw => (
                <RacewayChip key={rw.id} raceway={rw} onRemove={removeRaceway} onUpdate={updateRaceway} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center px-2">
            <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-center">
              <span className="text-[9px] text-muted-foreground leading-tight">Pull<br/>Box</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 flex-1">
            <button
              onClick={() => addRaceway("right")}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors w-full"
            >
              + Right
            </button>
            <div className="flex flex-col gap-1 flex-1 min-h-[40px] w-full">
              {byWall.right.length === 0 ? (
                <span className="text-[10px] text-muted-foreground italic text-center py-2">—</span>
              ) : byWall.right.map(rw => (
                <RacewayChip key={rw.id} raceway={rw} onRemove={removeRaceway} onUpdate={updateRaceway} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom wall */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1 flex-wrap justify-center min-h-[28px]">
            {byWall.bottom.length === 0 ? (
              <span className="text-[10px] text-muted-foreground italic">No raceways</span>
            ) : byWall.bottom.map(rw => (
              <RacewayChip key={rw.id} raceway={rw} onRemove={removeRaceway} onUpdate={updateRaceway} />
            ))}
          </div>
          <button
            onClick={() => addRaceway("bottom")}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
          >
            + Add to Bottom Wall
          </button>
        </div>
      </div>

      {/* Conductor Paths */}
      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conductor Paths</p>
          <button
            onClick={addPath}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
          >
            + Add Path
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Map which raceway connects to which. Type is auto-detected from wall positions. Spacing is calculated only between connected entries.</p>
        {paths.map(p => (
          <PathRow
            key={p.id}
            path={p}
            racewayOptions={racewayOptions}
            onRemove={removePath}
            onUpdate={updatePath}
            actualSpacing={actualSpacings[p.id] || ""}
            onActualSpacingChange={updateActualSpacing}
          />
        ))}
      </div>

      {/* Optional compliance check */}
      <div className="pt-2 border-t border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Optional: Check Existing Box</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Box Length (Y)" unit="in" hint="top↔bottom dimension">
            <NumInput value={boxLength} onChange={setBoxLength} placeholder="e.g. 24" min={0} />
          </Field>
          <Field label="Box Width (X)" unit="in" hint="left↔right dimension">
            <NumInput value={boxWidth} onChange={setBoxWidth} placeholder="e.g. 24" min={0} />
          </Field>
        </div>
      </div>
    </CalcLayout>
  );
}

// ─── Raceway Chip Component ──────────────────────────────────────
function RacewayChip({ raceway, onRemove, onUpdate }) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1 rounded-lg bg-card border border-border shadow-sm w-full">
      <select
        value={raceway.size}
        onChange={e => onUpdate(raceway.id, "size", e.target.value)}
        className="text-[10px] font-bold bg-transparent border-none outline-none cursor-pointer min-w-0"
      >
        {TRADE_SIZE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={raceway.wall}
        onChange={e => onUpdate(raceway.id, "wall", e.target.value)}
        className="text-[10px] font-bold bg-transparent border-none outline-none cursor-pointer min-w-0"
      >
        {WALL_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="text-[10px] text-muted-foreground">row</span>
      <input
        type="text"
        value={raceway.row}
        onChange={e => onUpdate(raceway.id, "row", e.target.value)}
        className="text-[10px] font-bold w-8 bg-transparent border border-border rounded px-1 outline-none"
      />
      <button
        onClick={() => onRemove(raceway.id)}
        className="text-[10px] text-red-500 hover:text-red-700 font-bold ml-0.5"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Path Row Component ───────────────────────────────────────────
function PathRow({ path, racewayOptions, onRemove, onUpdate, actualSpacing, onActualSpacingChange }) {
  return (
    <div className="p-2 rounded-lg bg-card border border-border space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground">{path.id}</span>
        <select
          value={path.entryA}
          onChange={e => onUpdate(path.id, "entryA", e.target.value)}
          className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 outline-none flex-1 min-w-0"
        >
          <option value="">— select —</option>
          {racewayOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-[10px] text-muted-foreground">→</span>
        <select
          value={path.entryB}
          onChange={e => onUpdate(path.id, "entryB", e.target.value)}
          className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 outline-none flex-1 min-w-0"
        >
          <option value="">— none —</option>
          {racewayOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={path.type}
          onChange={e => onUpdate(path.id, "type", e.target.value)}
          className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 outline-none"
        >
          <option value="auto">Auto-detect</option>
          <option value="splice">Splice</option>
          <option value="termination">Termination</option>
        </select>
        <button
          onClick={() => onRemove(path.id)}
          className="text-[10px] text-red-500 hover:text-red-700 font-bold"
        >
          ✕
        </button>
      </div>
      {/* Actual spacing input for connected entries */}
      <div className="flex items-center gap-2 pl-6">
        <span className="text-[9px] text-muted-foreground">Actual spacing (optional):</span>
        <input
          type="number"
          value={actualSpacing}
          onChange={e => onActualSpacingChange(path.id, e.target.value)}
          placeholder="in"
          min={0}
          className="text-[10px] w-16 bg-transparent border border-border rounded px-1 py-0.5 outline-none"
        />
        <span className="text-[9px] text-muted-foreground">in</span>
      </div>
    </div>
  );
}