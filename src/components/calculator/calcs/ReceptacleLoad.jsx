import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcReceptacleLoad } from "./logic/receptacleCalc";
import FormulaBox from "../FormulaBox";

export default function ReceptacleLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({ count: 50, vaPerReceptacle: 180, voltage: 120, phases: "single", applyDemand: true });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcReceptacleLoad(v, nec);
  const { totalConnected_VA: totalVA, demandAdjusted_VA: demandVA,
    totalAmps, demandAmps, circuits_required: circuitsNeeded, steps } = r;
  const count = parseFloat(v.count) || 0;
  const vaEach = parseFloat(v.vaPerReceptacle) || 180;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Receptacle Load (NEC 220.14)">
          <ResultRow label="Number of Receptacles" value={count} />
          <ResultRow label="VA per Receptacle" value={`${vaEach} VA`} sub="NEC 220.14(I): 180 VA each" />
          <ResultRow label="Total Connected Load" value={totalVA.toFixed(0)} unit="VA" />
          <ResultRow label="Total Current" value={totalAmps.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="After Demand Factor (NEC 220.44)">
          <ResultRow label="Demand Load" value={demandVA.toFixed(0)} unit="VA" highlight
            sub="First 10 kVA @ 100%, remainder @ 50%" />
          <ResultRow label="Demand Current" value={demandAmps.toFixed(1)} unit="A" highlight />
          <ResultRow label="Reduction" value={`${(totalVA - demandVA).toFixed(0)} VA saved`} />
        </ResultSection>
        <ResultSection title="Circuit Planning">
          <ResultRow label="20A Circuits Required (80%)" value={circuitsNeeded} unit="circuits" highlight />
          <ResultRow label="Receptacles per Circuit" value={`${Math.ceil(count / circuitsNeeded)}`} />
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 220.14(I): Each single or duplex receptacle = 180 VA.</li>
            <li>NEC {necYear} 220.44: Commercial demand — {nec.RECEPTACLE_DEMAND_TIERS.map((t) => `${(t.factor * 100).toFixed(0)}%${t.band < Infinity ? ` first ${t.band.toLocaleString()} VA` : " remainder"}`).join(", ")}.</li>
            <li>NEC 210.52(A): Dwelling wall receptacles must be spaced so no point is more than 6 ft from an outlet.</li>
            {nec.ISLAND_PENINSULA_RULE && <li><strong>210.52(C)(2) Island/Peninsula ({necYear}):</strong> {nec.ISLAND_PENINSULA_RULE}</li>}
            {nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE && <li><strong>210.52(G) Garage/Basement ({necYear}):</strong> {nec.GARAGE_BASEMENT_RECEPTACLE_SCOPE}</li>}
            {nec.GFCI_SCOPE_DWELLING && <li><strong>210.8(A) Dwelling GFCI ({necYear}):</strong> {nec.GFCI_SCOPE_DWELLING}</li>}
            {nec.GFCI_SCOPE_OTHER_THAN_DWELLING && <li><strong>210.8(B) Other-Than-Dwelling GFCI ({necYear}):</strong> {nec.GFCI_SCOPE_OTHER_THAN_DWELLING}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Number of Receptacles"><NumInput value={v.count} onChange={set("count")} placeholder="50" /></Field>
      <Field label="VA per Receptacle" unit="VA" hint="NEC default: 180 VA per duplex receptacle">
        <NumInput value={v.vaPerReceptacle} onChange={set("vaPerReceptacle")} placeholder="180" />
      </Field>
      <Field label="Apply Demand Factor (NEC 220.44)?">
        <Select value={String(v.applyDemand)} onChange={val => setV(p => ({ ...p, applyDemand: val }))} options={[
          { value: "true", label: "Yes — Commercial (220.44)" },
          { value: "false", label: "No — Use full load" },
        ]} />
      </Field>
      <Field label="Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single" }, { value: "three", label: "Three" }]} />
      </Field>
    </CalcLayout>
  );
}