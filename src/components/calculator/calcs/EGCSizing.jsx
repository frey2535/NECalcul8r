import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcEGCSizing } from "./logic/groundingCalc";

const FORMULAS = [
  { label: "EGC Sizing Rule", formula: "EGC size = f(OCPD rating) per Table 250.122", description: "EGC sized based on the rating of the OCPD protecting the circuit, not the load" },
  { label: "Proportional Increase", formula: "EGC_adjusted = EGC_table × (Actual CM / Min Required CM)", description: "If conductors are upsized for voltage drop, EGC must be proportionally increased" },
];
import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, Select } from "../CalcLayout";

export default function EGCSizing({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const EGC_TABLE = nec.EGC_TABLE;
  const TABLES = getTablesById(["250_122_egc"], necYear);
  const [ocpd, setOcpd] = useRestoredField("ocpd", "100");
  const [material, setMaterial] = useRestoredField("material", "copper");
  const [voltageDropUpsizeRatio, setVoltageDropUpsizeRatio] = useRestoredField("voltageDropUpsizeRatio", "1");

  const r = calcEGCSizing({ ocpd, material, voltageDropUpsizeRatio }, nec);
  const { awg, adjustedAwg, upsizeNote, steps } = r;
  const ocpdVal = parseInt(ocpd);
  const row = EGC_TABLE.find(r => r.ocpd >= ocpdVal) || EGC_TABLE[EGC_TABLE.length - 1];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ocpd, material, voltageDropUpsizeRatio }} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="EGC Sizing (NEC Table 250.122)">
          <ResultRow label="OCPD Rating" value={ocpdVal} unit="A" />
          <ResultRow label="Conductor Material" value={material === "copper" ? "Copper" : "Aluminum"} />
          <ResultRow label="Minimum EGC Size" value={`#${awg} AWG`} highlight />
          {adjustedAwg !== awg && <ResultRow label="Adjusted EGC (250.122(A))" value={`#${adjustedAwg} AWG`} highlight sub={upsizeNote} />}
          <ResultRow label="NEC Table Used" value="Table 250.122" sub="Based on OCPD protecting circuit" />
        </ResultSection>
        <ResultSection title="Full Table Reference">
          {EGC_TABLE.slice(0, 10).map(r => (
            <ResultRow key={r.ocpd} label={`${r.ocpd}A OCPD`}
              value={material === "copper" ? `#${r.copper} AWG` : `#${r.aluminum} AWG`}
              highlight={r.ocpd === row?.ocpd} />
          ))}
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 250.122: EGC must be sized per Table 250.122 based on the rating of the OCPD protecting the circuit. 250.122(A): If ungrounded conductors are increased in size for any reason (including voltage drop), the EGC must be increased proportionally. 250.122(B): Where multiple circuits are in a single raceway, the EGC must be sized for the largest OCPD. EGCs must never be smaller than the table values.</NoteBox>
      </div>
    }>
      <Field label="OCPD (Breaker/Fuse) Rating" unit="A">
        <Select value={ocpd} onChange={setOcpd} options={EGC_TABLE.map(r => ({ value: String(r.ocpd), label: `${r.ocpd}A` }))} />
      </Field>
      <Field label="EGC Material">
        <Select value={material} onChange={setMaterial} options={[
          { value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }
        ]} />
      </Field>
      <Field label="Voltage Drop Upsize" hint="250.122(A) — increase EGC proportionally if ungrounded conductors are upsized">
        <Select value={voltageDropUpsizeRatio} onChange={setVoltageDropUpsizeRatio} options={[
          { value: "1", label: "None (no upsizing)" },
          { value: "1.1", label: "10% upsized" },
          { value: "1.15", label: "15% upsized" },
          { value: "1.2", label: "20% upsized" },
          { value: "1.25", label: "25% upsized" },
        ]} />
      </Field>
    </CalcLayout>
  );
}