import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcConduitFill } from "./logic/conduitFillCalc";

const FORMULAS = [
  { label: "Total Wire Area", formula: "Total Area = Σ (conductor count × wire cross-section area)", description: "Wire areas from NEC Ch.9 Table 5" },
  { label: "Fill Percentage", formula: "Fill % = (Total Wire Area / Conduit Area) × 100", description: "Must not exceed limits per NEC Ch.9 Table 1" },
  { label: "Minimum Conduit", formula: "Conduit Area ≥ Total Wire Area / Fill Limit", description: "Select smallest conduit where conduit area × fill limit ≥ wire area" },
];

// Map wire type label to C.1 row label (AWG/kcmil column)
const WIRE_TO_C1_ROW = {
  "14 THHN": "#14", "12 THHN": "#12", "10 THHN": "#10", "8 THHN": "#8",
  "6 THHN": "#6",   "4 THHN": "#4",   "3 THHN": "#3",   "2 THHN": "#2",
  "1 THHN": "#1",   "1/0 THHN": "#1/0", "2/0 THHN": "#2/0", "3/0 THHN": "#3/0",
  "4/0 THHN": "#4/0", "250 THHN": "250 kcmil", "300 THHN": "300 kcmil",
  "350 THHN": "350 kcmil", "400 THHN": "400 kcmil", "500 THHN": "500 kcmil",
  "600 THHN": "600 kcmil", "700 THHN": "700 kcmil", "750 THHN": "750 kcmil",
  "900 THHN": "900 kcmil", "1000 THHN": "1000 kcmil",
};

export default function ConduitFill({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["ch9_t1_conduit_fill", "ch9_t4_emt", "ch9_t5_wire_area", "ch9_t5a_compact_rhh", "ch9_t5a_compact_thw", "ch9_t5a_compact_thhn", "ch9_t5a_compact_xhhw"], necYear);
  const ANNEX_C_MAP = {
    "EMT":    { id: "annex_c_emt_thhn",   label: "C.1",  name: "EMT" },
    "IMC":    { id: "annex_c_imc_thhn",   label: "C.4",  name: "IMC" },
    "RMC":    { id: "annex_c_rmc_thhn",   label: "C.8",  name: "RMC" },
    "PVC 40": { id: "annex_c_pvc40_thhn", label: "C.11", name: "PVC Sch. 40" },
    "PVC 80": { id: "annex_c_pvc80_thhn", label: "C.10", name: "PVC Sch. 80" },
  };
  const [wires, setWires] = useRestoredField("wires", [{ type: "12 THHN", count: 3 }]);
  const [conduitType, setConduitType] = useRestoredField("conduitType", "EMT");
  const annexCInfo = ANNEX_C_MAP[conduitType];
  const [annexCTable] = getTablesById(annexCInfo ? [annexCInfo.id] : [], necYear);

  const addWire = () => setWires(p => [...p, { type: "12 THHN", count: 1 }]);
  const removeWire = i => setWires(p => p.filter((_, idx) => idx !== i));
  const updateWire = (i, key, val) => setWires(p => p.map((w, idx) => idx === i ? { ...w, [key]: val } : w));

  const r = calcConduitFill({ wires, conduitType }, nec);
  const { totalWireArea, totalWiresCount, fillLimit, recommendedSize, recommendedArea, fillPctActual, allSizes, steps } = r;
  const CONDUIT_SIZE_ORDER = ["1/2","3/4","1","1-1/4","1-1/2","2","2-1/2","3","3-1/2","4"];
  const conduitSizes = CONDUIT_SIZE_ORDER.filter(s => nec.CONDUIT_AREAS[s]);

  const wireOptions = Object.keys(nec.WIRE_AREAS).map(k => ({ value: k, label: `#${k}` }));

  // Build C.1 cross-reference: only show when all wires are THHN (C.1 is THHN/EMT only)
  const allTHHN = wires.every(w => w.type.includes("THHN"));
  // C.1 header columns: ["AWG/kcmil", "1/2\"", "3/4\"", ...]
  const c1ColMap = annexCTable ? annexCTable.headers.slice(1) : []; // ["1/2\"", "3/4\"", ...]
  const CONDUIT_SIZE_TO_C1_COL = {"1/2":0,"3/4":1,"1":2,"1-1/4":3,"1-1/2":4,"2":5,"2-1/2":6,"3":7,"3-1/2":8,"4":9};

  // For a single wire type+count, look up max allowed from C.1 and compare
  const singleWireType = wires.length === 1 ? wires[0].type : null;
  const singleWireCount = wires.length === 1 ? (parseInt(wires[0].count) || 0) : null;
  const annexCRowLabel = singleWireType ? WIRE_TO_C1_ROW[singleWireType] : null;
  const annexCRow = (annexCTable && annexCRowLabel) ? annexCTable.rows.find(r => r[0] === annexCRowLabel) : null;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ wires, conduitType }} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Wire Fill Summary">
          <ResultRow label="Total Wire Count" value={totalWiresCount} unit="conductors" />
          <ResultRow label="Total Wire Cross-Section" value={totalWireArea.toFixed(4)} unit="in²" highlight />
          <ResultRow label="Fill Limit Applied" value={`${(fillLimit * 100).toFixed(0)}%`}
            sub={totalWiresCount === 1 ? "1 conductor limit" : totalWiresCount === 2 ? "2 conductor limit" : "3+ conductor limit"} />
        </ResultSection>
        <ResultSection title="Minimum Conduit Size">
          {recommendedSize ? (
            <>
              <ResultRow label="Minimum Conduit Size" value={`${recommendedSize}" ${conduitType}`} highlight />
              <ResultRow label="Conduit Total Area" value={recommendedArea.toFixed(3)} unit="in²" />
              <ResultRow label="Actual Fill %" value={fillPctActual.toFixed(1)} unit="%" />
            </>
          ) : (
            <ResultRow label="Result" value="No standard conduit fits — use parallel runs" failed />
          )}
        </ResultSection>
        <ResultSection title="All Conduit Sizes (fill %)">
          {allSizes.map(({ size, area, pct, fits }) => (
            <ResultRow key={size} label={`${size}" ${conduitType}`} value={`${pct.toFixed(1)}%`}
              unit={fits ? "✓" : "✗"} sub={`${area.toFixed(3)} in² total area`} failed={!fits} />
          ))}
        </ResultSection>
        {/* Annex C cross-reference for selected conduit type + THHN */}
        {annexCTable && allTHHN && annexCRow && (
          <ResultSection title={`Annex C Table ${annexCInfo.label} Verification (${annexCInfo.name} + THHN)`}>
            <div className="text-[10px] text-muted-foreground mb-1">Max conductors allowed per ${annexCInfo.label} vs. your count ({singleWireCount}):</div>
            {conduitSizes.map((size, i) => {
              const colIdx = CONDUIT_SIZE_TO_C1_COL[size];
              const maxAllowed = colIdx !== undefined ? parseInt(annexCRow[colIdx + 1]) || 0 : 0;
              const fits = singleWireCount <= maxAllowed;
              return (
                <ResultRow
                  key={size}
                  label={`${size}" ${annexCInfo.name} — ${annexCInfo.label} max`}
                  value={maxAllowed === 0 ? "—" : String(maxAllowed)}
                  unit={maxAllowed > 0 ? (fits ? "✓ fits" : "✗ too many") : ""}
                  highlight={size === recommendedSize}
                  failed={maxAllowed > 0 && !fits}
                />
              );
            })}
          </ResultSection>
        )}
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {annexCTable && <NECTableDisplay title={annexCTable.article + " — " + annexCTable.title} headers={annexCTable.headers} rows={annexCTable.rows} note={annexCTable.note} compact />}
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} Chapter 9, Table 1: {Object.entries(nec.FILL_LIMITS).map(([n, pct]) => `${n} wire${n > 1 ? "s" : ""} = ${(pct * 100).toFixed(0)}%`).join(", ")} max fill. Wire areas from Table 5. Conduit areas from Table 4.</NoteBox>
      </div>
    }>
      <Field label="Conduit Type">
        <Select value={conduitType} onChange={setConduitType} options={[
          { value: "EMT",    label: "EMT (Electrical Metallic Tubing)" },
          { value: "IMC",    label: "IMC (Intermediate Metal Conduit)" },
          { value: "RMC",    label: "RMC (Rigid Metal Conduit)" },
          { value: "PVC 40", label: "PVC Schedule 40" },
          { value: "PVC 80", label: "PVC Schedule 80" },
        ]} />
      </Field>
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase">Conductors</div>
        {wires.map((w, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Wire Group {i + 1}</span>
              {wires.length > 1 && <button onClick={() => removeWire(i)} className="text-xs text-destructive hover:underline">Remove</button>}
            </div>
            <Field label="Wire Type / Size">
              <Select value={w.type} onChange={val => updateWire(i, "type", val)} options={wireOptions} />
            </Field>
            <Field label="Count">
              <NumInput value={w.count} onChange={val => updateWire(i, "count", val)} placeholder="3" min={1} />
            </Field>
          </div>
        ))}
        <button onClick={addWire} className="text-xs text-primary hover:underline">+ Add Wire Type</button>
      </div>
    </CalcLayout>
  );
}