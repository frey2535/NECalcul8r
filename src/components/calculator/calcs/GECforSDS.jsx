import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcGECforSDS } from "./logic/bondingJumperCalcs";

const FORMULAS = [
  { label: "GEC for SDS (NEC 250.30(A)(4))", formula: "GEC size = Table 250.66 based on largest SDS secondary ungrounded conductor", description: "Same table as service GEC but applied to the transformer/generator secondary conductors" },
  { label: "Max GEC Size", formula: "Max: #3/0 AWG copper or 250 kcmil aluminum (no need to exceed)", description: "Applies only when the GEC connects to a rod, pipe, or plate electrode" },
];

export default function GECforSDS({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [serviceSize, setServiceSize] = useRestoredField("serviceSize", "0");
  const [material, setMaterial] = useRestoredField("material", "copper");

  const r = calcGECforSDS({ serviceSize, material }, nec);
  const { gecSize, steps } = r;
  const row = nec.GEC_TABLE[parseInt(serviceSize)];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ serviceSize, material }} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="GEC for SDS (NEC Table 250.66)">
          <ResultRow label="SDS Secondary Conductor Size" value={row?.service || "—"} />
          <ResultRow label="GEC Material" value={material === "copper" ? "Copper" : "Aluminum"} />
          <ResultRow label="Minimum GEC Size" value={gecSize ? `#${gecSize} AWG` : "—"} highlight />
        </ResultSection>
        <ResultSection title="Full Table 250.66 Reference">
          {nec.GEC_TABLE.map((r, i) => (
            <ResultRow key={i} label={r.service}
              value={material === "copper" ? `#${r.copper} AWG` : `#${r.aluminum} AWG`}
              highlight={i === parseInt(serviceSize)} />
          ))}
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 250.30(A)(4): The GEC for a separately derived system is sized per Table 250.66 based on the largest SDS secondary ungrounded conductor — not the service entrance conductors. Install at the source of the SDS (transformer secondary, generator). Maximum size: #3/0 AWG Cu or 250 kcmil Al when connecting to rod/pipe/plate electrodes.
        </NoteBox>
      </div>
    }>
      <Field label="Largest SDS Secondary Ungrounded Conductor">
        <Select value={serviceSize} onChange={setServiceSize}           options={nec.GEC_TABLE.map((r, i) => ({ value: String(i), label: r.service }))} />
      </Field>
      <Field label="GEC Material">
        <Select value={material} onChange={setMaterial} options={[
          { value: "copper", label: "Copper" },
          { value: "aluminum", label: "Aluminum" },
        ]} />
      </Field>
    </CalcLayout>
  );
}