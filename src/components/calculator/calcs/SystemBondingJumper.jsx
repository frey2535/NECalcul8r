import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcSystemBondingJumper } from "./logic/bondingJumperCalcs";

const FORMULAS = [
  { label: "SBJ Sizing (NEC 250.30(A)(1))", formula: "SBJ = 12.5% × largest SDS ungrounded conductor area", description: "Per Table 250.102(C)(1); connects grounded conductor to SDS enclosure at source" },
  { label: "For Current-Limited SDS", formula: "SBJ sized per Table 250.102(C)(1) based on transformer secondary conductors", description: "Common for transformers, generators, and UPS separately derived systems" },
];

const CONDUCTOR_OPTIONS = [
  "14","12","10","8","6","4","3","2","1",
  "1/0","2/0","3/0","4/0",
  "250","300","350","400","500","600","700","750","1000",
].map(k => ({ value: k, label: parseInt(k) >= 250 && !k.includes("/") ? `${k} kcmil` : `#${k} AWG` }));

const SDS_TYPES = [
  { value: "transformer", label: "Transformer (dry-type or liquid)" },
  { value: "generator", label: "Generator" },
  { value: "ups", label: "UPS / Inverter" },
  { value: "solar", label: "Solar PV Inverter" },
  { value: "other", label: "Other SDS" },
];

export default function SystemBondingJumper({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    sdsType: "transformer",
    conductorSize: "2/0",
    sbjMaterial: "copper",
    parallelSets: 1,
    kva: 75,
    voltage: 208,
    phases: "three",
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const sets = Math.max(1, parseInt(v.parallelSets) || 1);
  const sbj = calcSystemBondingJumper(v, nec);
  const { conductorCM, totalCM, calcCM, sbjSize, secFLC, steps } = sbj;
  const totalKcmil = (totalCM / 1000).toFixed(0);
  const calcKcmil = (calcCM / 1000).toFixed(1);
  const table = v.sbjMaterial === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
  const row = table.find(r => totalCM <= r.cm);
  const kva = parseFloat(v.kva) || 75;
  const voltage = parseFloat(v.voltage) || 208;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={sbj} result={
      <div className="space-y-2">
        <ResultSection title="Separately Derived System">
          <ResultRow label="SDS Type" value={SDS_TYPES.find(t => t.value === v.sdsType)?.label || "—"} />
          <ResultRow label="Estimated Secondary FLC" value={secFLC.toFixed(1)} unit="A" sub={`${kva} kVA at ${voltage}V`} />
        </ResultSection>
        <ResultSection title="SDS Secondary Conductor">
          <ResultRow label="Conductor Size" value={v.conductorSize.includes("/") || parseInt(v.conductorSize) >= 250 ? `${v.conductorSize} kcmil` : `#${v.conductorSize} AWG`} />
          <ResultRow label="Single Conductor CM" value={conductorCM.toLocaleString()} unit="CM" />
          <ResultRow label="Parallel Sets" value={sets} />
          <ResultRow label="Total Circular Mils" value={totalCM.toLocaleString()} unit="CM" highlight />
        </ResultSection>
        <ResultSection title="System Bonding Jumper (NEC 250.30(A)(1) / Table 250.102(C)(1))">
          <ResultRow label="12.5% of Total CM" value={`${calcCM.toLocaleString()} CM (${calcKcmil} kcmil)`} sub="Design reference" />
          <ResultRow
            label="Required System Bonding Jumper"
            value={sbjSize}
            highlight
            sub={`${v.sbjMaterial === "copper" ? "Copper" : "Aluminum"} — NEC Table 250.102(C)(1)`}
          />
        </ResultSection>
        <ResultSection title="Full Table Reference (first 8 entries)">
          {table.slice(0, 8).map((r, i) => (
            <ResultRow key={i} label={r.label} value={r.size} highlight={r === row} />
          ))}
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 250.30(A)(1): SBJ connects the grounded (neutral) conductor of a separately derived system to the SDS enclosure/frame at the source. Sized per Table 250.102(C)(1) — 12.5% of largest ungrounded secondary conductor. Install at the SDS source only (transformer secondary, generator terminals, etc.). If the SDS has a main disconnect, SBJ can be at the first disconnect instead.
        </NoteBox>
      </div>
    }>
      <Field label="SDS Source Type">
        <Select value={v.sdsType} onChange={set("sdsType")} options={SDS_TYPES} />
      </Field>
      <Field label="SDS Rated Output" unit="kVA" hint="Used to estimate secondary FLC">
        <NumInput value={v.kva} onChange={set("kva")} placeholder="75" min={0} />
      </Field>
      <Field label="Secondary Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" },
          { value: 208, label: "208V (3Ø Y)" },
          { value: 240, label: "240V" },
          { value: 277, label: "277V" },
          { value: 480, label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[
          { value: "single", label: "Single-Phase" },
          { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
      <Field label="Largest Secondary Ungrounded Conductor">
        <Select value={v.conductorSize} onChange={set("conductorSize")} options={CONDUCTOR_OPTIONS} />
      </Field>
      <Field label="Number of Parallel Sets" unit="sets" hint="1 = single conductor per phase">
        <NumInput value={v.parallelSets} onChange={set("parallelSets")} placeholder="1" min={1} max={10} />
      </Field>
      <Field label="SBJ Material">
        <Select value={v.sbjMaterial} onChange={set("sbjMaterial")} options={[
          { value: "copper", label: "Copper" },
          { value: "aluminum", label: "Aluminum" },
        ]} />
      </Field>
    </CalcLayout>
  );
}