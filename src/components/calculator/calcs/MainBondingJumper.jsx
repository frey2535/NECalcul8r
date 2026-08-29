import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcMainBondingJumper } from "./logic/bondingJumperCalcs";

const FORMULAS = [
  { label: "MBJ / SBJ Sizing (NEC 250.28(D))", formula: "MBJ = 12.5% × largest ungrounded service or separately derived system conductor", description: "Based on Table 250.102(C)(1); minimum #1/0 AWG copper, max 3/0 Cu or 250 kcmil Al" },
  { label: "Parallel Sets", formula: "Use total circular mils of all parallel conductors in calculation", description: "When conductors run in parallel, sum their CM areas before applying 12.5%" },
];

const CONDUCTOR_OPTIONS = [
  "14","12","10","8","6","4","3","2","1",
  "1/0","2/0","3/0","4/0",
  "250","300","350","400","500","600","700","750","1000",
].map(k => ({ value: k, label: k.includes("/") || parseInt(k) > 4 && !k.includes("/") && parseInt(k) >= 250 ? `${k} kcmil` : `#${k} AWG` }));

export default function MainBondingJumper({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    conductorSize: "2/0",
    conductorMaterial: "copper",
    mbjMaterial: "copper",
    parallelSets: 1,
    applicationType: "service",  // "service" | "sds"
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const sets = Math.max(1, parseInt(v.parallelSets) || 1);
  const mbj = calcMainBondingJumper(v, nec);
  const { conductorCM, totalCM, calcCM, mbjSize, steps } = mbj;
  const totalKcmil = (totalCM / 1000).toFixed(0);
  const calcKcmil = (calcCM / 1000).toFixed(1);
  const table = v.mbjMaterial === "copper" ? nec.BJ_TABLE_COPPER : nec.BJ_TABLE_ALUMINUM;
  const row = table.find(r => totalCM <= r.cm);

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={mbj} result={
      <div className="space-y-2">
        <ResultSection title="Service / SDS Conductor">
          <ResultRow label="Conductor Size" value={v.conductorSize.includes("/") || parseInt(v.conductorSize) >= 250 ? `${v.conductorSize} kcmil` : `#${v.conductorSize} AWG`} />
          <ResultRow label="Single Conductor CM" value={conductorCM.toLocaleString()} unit="CM" />
          <ResultRow label="Parallel Sets" value={sets} />
          <ResultRow label="Total Circular Mils" value={totalCM.toLocaleString()} unit="CM" highlight />
          <ResultRow label="Total kcmil" value={totalKcmil} unit="kcmil" />
        </ResultSection>
        <ResultSection title="Bonding Jumper Sizing (NEC 250.28(D) / Table 250.102(C)(1))">
          <ResultRow label="12.5% of Total CM" value={`${calcCM.toLocaleString()} CM (${calcKcmil} kcmil)`} sub="Design reference" />
          <ResultRow
            label={v.applicationType === "service" ? "Required Main Bonding Jumper" : "Required System Bonding Jumper"}
            value={mbjSize}
            highlight
            sub={`${v.mbjMaterial === "copper" ? "Copper" : "Aluminum"} — NEC Table 250.102(C)(1)`}
          />
        </ResultSection>
        <ResultSection title="Full Table 250.102(C)(1) Reference">
          {table.slice(0, 8).map((r, i) => (
            <ResultRow key={i} label={r.label} value={r.size} highlight={r === row} />
          ))}
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 250.28(D): Main bonding jumper sized per Table 250.102(C)(1) — 12.5% of the area of the largest ungrounded service conductor(s). For parallel conductors, use total CM of all sets. MBJ connects the neutral (grounded) conductor to the service equipment enclosure at the first means of disconnect. Not permitted at sub-panels — use EGC instead.
        </NoteBox>
      </div>
    }>
      <Field label="Application Type">
        <Select value={v.applicationType} onChange={set("applicationType")} options={[
          { value: "service", label: "Service Entrance (Main Bonding Jumper)" },
          { value: "sds", label: "Separately Derived System (System Bonding Jumper)" },
        ]} />
      </Field>
      <Field label="Largest Ungrounded Conductor Size">
        <Select value={v.conductorSize} onChange={set("conductorSize")} options={CONDUCTOR_OPTIONS} />
      </Field>
      <Field label="Number of Parallel Sets" unit="sets" hint="1 = single conductor per phase; 2+ = parallel runs">
        <NumInput value={v.parallelSets} onChange={set("parallelSets")} placeholder="1" min={1} max={10} />
      </Field>
      <Field label="Bonding Jumper Material">
        <Select value={v.mbjMaterial} onChange={set("mbjMaterial")} options={[
          { value: "copper", label: "Copper" },
          { value: "aluminum", label: "Aluminum" },
        ]} />
      </Field>
    </CalcLayout>
  );
}