import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcPoolSpa } from "./logic/poolSpaCalc";
import FormulaBox from "../FormulaBox";

export default function PoolSpa({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    pumpHP: 1.5, pumpV: 240, heaterKW: 6, lightingW: 300,
    bondingRequired: "yes", gfciRequired: "yes", installType: "pool"
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcPoolSpa(v, nec);
  const { flc, pumpConductorA, pumpOCPD, heaterA, lightingA, totalA, clearances, steps } = r;
  const pumpV = parseFloat(v.pumpV) || 240;
  const totalKW = (pumpV * totalA) / 1000;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Pump Motor (NEC 430 / 680)">
          <ResultRow label="Full-Load Current" value={flc.toFixed(1)} unit="A" />
          <ResultRow label="Min Conductor Ampacity (125%)" value={pumpConductorA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Max OCPD (250% ITB)" value={pumpOCPD} unit="A" />
        </ResultSection>
        <ResultSection title="Other Loads">
          <ResultRow label="Heater Load" value={heaterA.toFixed(1)} unit="A" />
          <ResultRow label="Lighting Load" value={lightingA.toFixed(1)} unit="A" />
          <ResultRow label="Estimated Total Service" value={totalA.toFixed(1)} unit="A" highlight />
        </ResultSection>
        <ResultSection title="NEC 680 Requirements">
          {clearances.map((c, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 px-3 bg-muted/50 rounded text-xs">
              <span className="font-mono text-primary flex-shrink-0">{c.article}</span>
              <span>{c.item}</span>
            </div>
          ))}
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 680: All pool/spa equipment requires GFCI protection, equipotential bonding, and minimum clearance from water. Disconnect must be within sight of pool equipment per 680.12.</li>
            {nec.POOL_PUMP_GFCI_NOTE && <li><strong>680.21(C)/(D) Pump GFCI ({necYear}):</strong> {nec.POOL_PUMP_GFCI_NOTE}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Installation Type">
        <Select value={v.installType} onChange={set("installType")} options={[
          { value: "pool", label: "Swimming Pool" },
          { value: "spa", label: "Hot Tub / Spa" },
        ]} />
      </Field>
      <Field label="Pump Motor Horsepower">
        <Select value={v.pumpHP} onChange={set("pumpHP")} options={[
          { value: 0.5, label: "1/2 HP" }, { value: 0.75, label: "3/4 HP" }, { value: 1, label: "1 HP" },
          { value: 1.5, label: "1-1/2 HP" }, { value: 2, label: "2 HP" }, { value: 3, label: "3 HP" }, { value: 5, label: "5 HP" },
        ]} />
      </Field>
      <Field label="Pump Voltage">
        <Select value={v.pumpV} onChange={set("pumpV")} options={[{ value: 120, label: "120V" }, { value: 240, label: "240V" }]} />
      </Field>
      <Field label="Heater Load" unit="kW" hint="Enter 0 if no heater">
        <NumInput value={v.heaterKW} onChange={set("heaterKW")} placeholder="6" />
      </Field>
      <Field label="Lighting Load" unit="W" hint="Underwater + deck lights">
        <NumInput value={v.lightingW} onChange={set("lightingW")} placeholder="300" />
      </Field>
    </CalcLayout>
  );
}