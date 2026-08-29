import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcHVACLoad } from "./logic/hvacLoadCalc";
import FormulaBox from "../FormulaBox";

export default function HVACLoad({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({ nameplateAmps: 28, voltage: 240, phases: "single", compressorFLA: 20, fanFLA: 4, conductorType: "single" });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcHVACLoad(v, nec);
  const { totalFLA, conductorA, maxOCPD_calc, selectedOCPD, loadVA, steps } = r;
  const nameplateA = parseFloat(v.nameplateAmps) || 0;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="A/C Load Sizing (NEC 440)">
          <ResultRow label="Equipment Nameplate Current" value={nameplateA} unit="A" />
          <ResultRow label="Total FLA (all motors)" value={totalFLA.toFixed(1)} unit="A" />
          <ResultRow label="Load VA" value={loadVA.toFixed(0)} unit="VA" />
        </ResultSection>
        <ResultSection title="Conductor Sizing">
          <ResultRow label="Min Conductor Ampacity" value={conductorA.toFixed(1)} unit="A" highlight
            sub={v.conductorType === "single" ? "125% of nameplate (440.32)" : "125% largest + others (440.33)"} />
        </ResultSection>
        <ResultSection title="OCPD Sizing (NEC 440.22)">
          <ResultRow label="Max OCPD (175% nameplate)" value={maxOCPD_calc.toFixed(1)} unit="A" />
          <ResultRow label="Selected OCPD" value={selectedOCPD} unit="A" highlight />
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 440.32: Single motor-compressor conductor = {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% of nameplate. NEC 440.33: Multiple motors — largest × {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% + sum of others. NEC 440.22: OCPD ≤ 175% of nameplate rating (or equipment marking).</li>
            {nec.GFCI_EQUIPMENT_SERVICING_RECEPTACLE && <li><strong>210.8(E) Equipment Servicing GFCI ({necYear}):</strong> {nec.GFCI_EQUIPMENT_SERVICING_RECEPTACLE}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Equipment Nameplate Amps (MCA)" unit="A"><NumInput value={v.nameplateAmps} onChange={set("nameplateAmps")} placeholder="28" /></Field>
      <Field label="Motor Configuration">
        <Select value={v.conductorType} onChange={set("conductorType")} options={[
          { value: "single", label: "Single compressor motor" },
          { value: "multi", label: "Multiple motors (compressor + fan)" },
        ]} />
      </Field>
      {v.conductorType === "multi" && (
        <>
          <Field label="Compressor FLA" unit="A"><NumInput value={v.compressorFLA} onChange={set("compressorFLA")} placeholder="20" /></Field>
          <Field label="Fan Motor FLA" unit="A"><NumInput value={v.fanFLA} onChange={set("fanFLA")} placeholder="4" /></Field>
        </>
      )}
      <Field label="Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" },
          { value: 240, label: "240V" }, { value: 480, label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single" }, { value: "three", label: "Three" }]} />
      </Field>
    </CalcLayout>
  );
}