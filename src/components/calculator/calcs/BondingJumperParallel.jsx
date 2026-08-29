import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcBondingJumperParallel } from "./logic/bondingJumperCalcs";

const FORMULAS = [
  { label: "Parallel Bonding Jumper (NEC 250.102(C))", formula: "Total CM = CM per conductor × number of parallel sets", description: "Sum the CM of all parallel conductors, then size bonding jumper per Table 250.102(C)(1)" },
  { label: "Bonding Jumper per Raceway", formula: "Size each bonding jumper based on conductors in THAT raceway", description: "If bonding jumpers are installed in each raceway individually, size based on conductors in that raceway only" },
];

const CONDUCTOR_OPTIONS = [
  "2","1","1/0","2/0","3/0","4/0","250","300","350","400","500","600","700","750"
].map(k => ({ value: k, label: parseInt(k) >= 250 && !k.includes("/") ? `${k} kcmil` : `#${k} AWG` }));

export default function BondingJumperParallel({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    conductorSize: "2/0",
    parallelSets: 2,
    bjMaterial: "copper",
    method: "total", // "total" = single BJ sized for all, "per_raceway" = one BJ per raceway
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const sets = Math.max(1, parseInt(v.parallelSets) || 1);
  const bj = calcBondingJumperParallel(v, nec);
  const { cmPerConductor, totalCM, totalBJSize, perRacewayBJSize, steps } = bj;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={bj} result={
      <div className="space-y-2">
        <ResultSection title="Parallel Run Summary">
          <ResultRow label="Conductor Size per Set" value={v.conductorSize.includes("/") || parseInt(v.conductorSize) >= 250 ? `${v.conductorSize} kcmil` : `#${v.conductorSize} AWG`} />
          <ResultRow label="CM per Conductor" value={cmPerConductor.toLocaleString()} unit="CM" />
          <ResultRow label="Parallel Sets" value={sets} />
          <ResultRow label="Total CM (all sets)" value={totalCM.toLocaleString()} unit="CM" highlight />
        </ResultSection>
        <ResultSection title="Bonding Jumper Sizing (NEC 250.102(C))">
          <ResultRow label="Single BJ for All Parallels" value={totalBJSize} highlight sub="Based on total CM of all parallel sets" />
          <ResultRow label="BJ per Individual Raceway" value={perRacewayBJSize} sub="Based on CM of conductors in one raceway only" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 250.102(C)(1): When conductors are installed in parallel in multiple raceways or cables, the bonding jumper must be sized based on the total circular mils of all parallel conductors. Alternatively, a separate bonding jumper can be installed in each raceway, sized for the conductors in that raceway only.
        </NoteBox>
      </div>
    }>
      <Field label="Conductor Size per Parallel Set">
        <Select value={v.conductorSize} onChange={set("conductorSize")} options={CONDUCTOR_OPTIONS} />
      </Field>
      <Field label="Number of Parallel Sets" unit="sets">
        <NumInput value={v.parallelSets} onChange={set("parallelSets")} placeholder="2" min={2} max={10} />
      </Field>
      <Field label="Bonding Jumper Material">
        <Select value={v.bjMaterial} onChange={set("bjMaterial")} options={[
          { value: "copper", label: "Copper" },
          { value: "aluminum", label: "Aluminum" },
        ]} />
      </Field>
    </CalcLayout>
  );
}