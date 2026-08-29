import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcGECSizing } from "./logic/groundingCalc";

const FORMULAS = [
  { label: "GEC Sizing Rule", formula: "GEC size = f(Largest Service Entrance Conductor) per Table 250.66", description: "Based on the largest ungrounded service entrance conductor; max 3/0 Cu or 250kcmil Al" },
];
import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, Select } from "../CalcLayout";

export default function GECSizing({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const GEC_TABLE = nec.GEC_TABLE;
  const TABLES = getTablesById(["250_66_gec"], necYear);
  const [serviceSize, setServiceSize] = useRestoredField("serviceSize", "0");
  const [material, setMaterial] = useRestoredField("material", "copper");
  const [electrodeType, setElectrodeType] = useRestoredField("electrodeType", "service_conductor");

  const row = GEC_TABLE[parseInt(serviceSize)];
  const r = calcGECSizing({ serviceSize, material, electrodeType }, nec);
  const { gecSize, electrodeNote, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ serviceSize, material, electrodeType }} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="GEC Sizing (NEC Table 250.66)">
          <ResultRow label="Service Conductor Size" value={row?.service || "—"} />
          <ResultRow label="GEC Material" value={material === "copper" ? "Copper" : "Aluminum"} />
          <ResultRow label="Minimum GEC Size" value={`#${gecSize} AWG`} highlight />
          {electrodeNote && <ResultRow label="Electrode Type Note" value={electrodeNote} sub="250.66(C)" />}
        </ResultSection>
        <ResultSection title="Full Table 250.66">
          {GEC_TABLE.map((r, i) => (
            <ResultRow key={i} label={r.service}
              value={material === "copper" ? `#${r.copper} AWG` : `#${r.aluminum} AWG`}
              highlight={i === parseInt(serviceSize)} />
          ))}
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 250.66: GEC sized based on largest service entrance conductor. 250.66(C): For made electrodes (ground rods, pipes, plates), the GEC need not be larger than #6 Cu or #4 Al. Maximum GEC size for service conductors: copper #3/0, aluminum 250 kcmil. GEC connects to grounding electrode system per NEC 250.50.</NoteBox>
      </div>
    }>
      <Field label="Largest Service Entrance Conductor">
        <Select value={serviceSize} onChange={setServiceSize} options={GEC_TABLE.map((r, i) => ({
          value: String(i), label: r.service
        }))} />
      </Field>
      <Field label="GEC Material">
        <Select value={material} onChange={setMaterial} options={[
          { value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }
        ]} />
      </Field>
      <Field label="Grounding Electrode Type" hint="250.66(C) — made electrodes capped at #6 Cu / #4 Al">
        <Select value={electrodeType} onChange={setElectrodeType} options={[
          { value: "service_conductor", label: "Service conductor (Table 250.66)" },
          { value: "made_electrode", label: "Made electrode (rod/pipe/plate — 250.66(C))" },
        ]} />
      </Field>
    </CalcLayout>
  );
}