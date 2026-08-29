import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getNecData } from "@/data/nec";
import { getTablesById } from "@/lib/necTables";
import { calcRVParkLoad } from "./logic/rvParkLoadCalc";

const FORMULAS = [
  { label: "Connected Load (NEC 551.71)", formula: "VA = Σ (site count × receptacle VA rating)", description: "20A=2400 VA, 30A=3600 VA, 50A=12000 VA" },
  { label: "Demand Factor (NEC Table 551.73(A))", formula: "DF = Table 551.73(A) lookup by total site count", description: "Demand factors range from 100% (1 site) to 41% (36+ sites)" },
  { label: "Demand Load", formula: "VA = total connected × DF", description: "Apply demand factor to total connected RV load" },
  { label: "Total Service Load", formula: "VA = RV demand + additional park loads", description: "Additional loads sized separately per NEC 220" },
  { label: "Service Current", formula: "I = VA ÷ (V × √3) [3Ø] or VA ÷ V [1Ø]", description: "Convert total VA to amps" },
];

export default function RVParkLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [sites20A, setSites20A] = useRestoredField("sites20A", 10);
  const [sites30A, setSites30A] = useRestoredField("sites30A", 20);
  const [sites50A, setSites50A] = useRestoredField("sites50A", 5);
  const [voltage, setVoltage] = useRestoredField("voltage", "240");
  const [phases, setPhases] = useRestoredField("phases", "single");
  const [additionalLoads, setAdditionalLoads] = useRestoredField("additionalLoads", [
    { name: "Office", va: 5000 },
    { name: "Bathhouse", va: 2000 },
    { name: "Laundry", va: 3000 },
  ]);
  const [material, setMaterial] = useRestoredField("material", "copper");
  const [tempRating, setTempRating] = useRestoredField("tempRating", "75");
  const [length, setLength] = useRestoredField("length", 200);
  const [maxVD, setMaxVD] = useRestoredField("maxVD", "3");

  const r = calcRVParkLoad({ sites20A, sites30A, sites50A, voltage, phases, additionalLoads, material, tempRating, length, maxVD }, nec);
  const [demandTable] = getTablesById(["551_73_a_rv_park_demand"], necYear);

  const addLoad = () => setAdditionalLoads(p => [...p, { name: `Load ${p.length + 1}`, va: 1000 }]);
  const removeLoad = i => setAdditionalLoads(p => p.filter((_, idx) => idx !== i));
  const updateLoad = (i, key, val) => setAdditionalLoads(p => p.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ sites20A, sites30A, sites50A, voltage, phases, additionalLoads, material, tempRating, length, maxVD }} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Connected RV Load">
          <ResultRow label="20A Sites (120V)" value={r.connected20A.toLocaleString()} unit="VA" sub={`${parseInt(sites20A) || 0} sites × 2,400 VA`} />
          <ResultRow label="30A Sites (120V)" value={r.connected30A.toLocaleString()} unit="VA" sub={`${parseInt(sites30A) || 0} sites × 3,600 VA`} />
          <ResultRow label="50A Sites (120/240V)" value={r.connected50A.toLocaleString()} unit="VA" sub={`${parseInt(sites50A) || 0} sites × 12,000 VA`} />
          <ResultRow label="Total Connected RV Load" value={r.totalConnectedRV.toLocaleString()} unit="VA" highlight />
          <ResultRow label="Total Campsite Count" value={r.totalSites} unit="sites" />
        </ResultSection>
        <ResultSection title="Demand Factor (Table 551.73(A))">
          <ResultRow label="Demand Factor" value={r.demandFactorPct} unit="%" highlight sub={`Table 551.73(A) → ${r.totalSites} sites`} />
          <ResultRow label="RV Demand Load" value={r.demandLoadRV.toLocaleString()} unit="VA" highlight />
        </ResultSection>
        <ResultSection title="Additional Park Loads">
          {r.additionalLoads.map((l, i) => (
            <ResultRow key={i} label={l.name} value={l.va.toLocaleString()} unit="VA" />
          ))}
          <ResultRow label="Total Additional Loads" value={r.totalAdditional.toLocaleString()} unit="VA" />
        </ResultSection>
        <ResultSection title="Service Sizing">
          <ResultRow label="Total Service Load" value={r.totalServiceVA.toLocaleString()} unit="VA" highlight />
          <ResultRow label="Calculated Current" value={r.totalA} unit="A" highlight />
          <ResultRow label="Minimum Standard Service" value={r.minService} unit="A" highlight sub="Next standard size ≥ amps" />
        </ResultSection>
        <ResultSection title="Conductor & Equipment Ground">
          <ResultRow label={`Recommended Conductor (${tempRating}°C)`} value={r.conductorLabel} sub={`${material === "copper" ? "Copper" : "Aluminum"} · ${r.conductorAmpacity} A · sized to ${r.minService} A service disconnect`} highlight />
          <ResultRow label="Equipment Grounding Conductor" value={r.egcLabel} sub={`Table 250.122 @ ${r.minService} A OCPD`} />
        </ResultSection>
        {r.vdV != null && (
          <ResultSection title="Voltage Drop">
            <ResultRow label="Voltage Drop" value={r.vdV} unit="V" sub={`${length} ft feeder`} failed={!r.vdOk} />
            <ResultRow label="Voltage Drop %" value={r.vdPct} unit="%" failed={!r.vdOk} />
            <ResultRow label="End-of-Line Voltage" value={r.endV} unit="V" failed={!r.vdOk} />
          </ResultSection>
        )}
        <ResultSection title="Phase Loading (Demand-Adjusted)">
          {r.phaseCurrents.map((c, i) => (
            <ResultRow key={i} label={`Phase ${phases === "three" ? ["A","B","C"][i] : ["L1","L2"][i]}`} value={c} unit="A" sub={`Demand-adjusted · aligns with ${r.totalA} A service current`} />
          ))}
          <ResultRow label="Phase Imbalance" value={r.phaseImbalance} unit="%" failed={r.phaseImbalance > 10} />
        </ResultSection>
        <FormulaBox steps={r.steps} formulas={FORMULAS} />
        {demandTable && <NECTableDisplay title={`${demandTable.article} — ${demandTable.title}`} headers={demandTable.headers} rows={demandTable.rows} note={demandTable.note} compact />}
        <NoteBox>
          NEC {necYear} 551.73(A): Count each site once at its highest-rated receptacle (20A = 2400 VA, 30A = 3600 VA, 50A = 12,000 VA). Apply Table 551.73(A) to that connected RV load by total site count (1 site 100% … 36+ sites 41%). Office, laundry, bathhouse, pool, and other amenities are calculated under Article 220 and added — they do not take Table 551.73(A). {necYear === "2017" ? "2017 Table 551.73(A): 36 plus sites remain at 41%." : ""}
        </NoteBox>
      </div>
    }>
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">Site Counts</p>
        <Field label="20A Sites (120V)" unit="sites">
          <NumInput value={sites20A} onChange={setSites20A} placeholder="10" min={0} />
        </Field>
        <Field label="30A Sites (120V)" unit="sites">
          <NumInput value={sites30A} onChange={setSites30A} placeholder="20" min={0} />
        </Field>
        <Field label="50A Sites (120/240V)" unit="sites">
          <NumInput value={sites50A} onChange={setSites50A} placeholder="5" min={0} />
        </Field>
      </div>
      <Field label="Distribution System">
        <Select value={voltage} onChange={setVoltage} options={[
          { value: "240", label: "120/240V Single-Phase" },
          { value: "208", label: "208Y/120V Three-Phase" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={phases} onChange={setPhases} options={[
          { value: "single", label: "Single-Phase" },
          { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase">Additional Park Loads</p>
        {additionalLoads.map((l, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Load {i + 1}</span>
              {additionalLoads.length > 1 && <button onClick={() => removeLoad(i)} className="text-xs text-destructive hover:underline">Remove</button>}
            </div>
            <Field label="Load Name">
              <input type="text" value={l.name} onChange={e => updateLoad(i, "name", e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3.5 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
            </Field>
            <Field label="Connected Load" unit="VA">
              <NumInput value={l.va} onChange={val => updateLoad(i, "va", val)} placeholder="5000" min={0} />
            </Field>
          </div>
        ))}
        <button onClick={addLoad} className="text-xs text-primary hover:underline">+ Add Load</button>
      </div>
      <Field label="Conductor Material">
        <Select value={material} onChange={setMaterial} options={[
          { value: "copper", label: "Copper" },
          { value: "aluminum", label: "Aluminum" },
        ]} />
      </Field>
      <Field label="Temperature Column (Insulation)">
        <Select value={tempRating} onChange={setTempRating} options={[
          { value: "60", label: "60°C (TW, UF)" },
          { value: "75", label: "75°C (THWN, XHHW)" },
          { value: "90", label: "90°C (THHN, XHHW-2)" },
        ]} />
      </Field>
      <Field label="Feeder Length (one-way)" unit="ft" hint="For voltage drop calculation">
        <NumInput value={length} onChange={setLength} placeholder="200" min={0} />
      </Field>
      <Field label="Maximum Voltage Drop">
        <Select value={maxVD} onChange={setMaxVD} options={[
          { value: "3", label: "3% (branch circuit)" },
          { value: "5", label: "5% (branch + feeder)" },
        ]} />
      </Field>
    </CalcLayout>
  );
}