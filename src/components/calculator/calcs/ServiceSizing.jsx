import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcServiceSizing } from "./logic/serviceSizingCalc";
import FormulaBox from "../FormulaBox";

export default function ServiceSizing({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({ totalVA: 40000, voltage: 240, phases: "single", continuousPct: 80 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcServiceSizing(v, nec);
  const { totalAmps, adjustedAmps, minService_A: finalService, steps } = r;
  const totalVA = parseFloat(v.totalVA) || 40000;
  const voltage = parseFloat(v.voltage) || 240;
  const contPct = (parseFloat(v.continuousPct) || 80) / 100;
  const nonContPct = 1 - contPct;
  const continuousA = totalAmps * contPct;
  const nonContinuousA = totalAmps * nonContPct;
  const minResidential = nec.DWELLING_MIN_SERVICE_AMPS || 100;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Service Load">
          <ResultRow label="Total Load" value={totalVA.toFixed(0)} unit="VA" />
          <ResultRow label="Calculated Current" value={totalAmps.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="Continuous Load Adjustment (NEC 230.42)">
          <ResultRow label="Continuous Portion (×125%)" value={(continuousA * 1.25).toFixed(1)} unit="A" />
          <ResultRow label="Noncontinuous Portion" value={nonContinuousA.toFixed(1)} unit="A" />
          <ResultRow label="Adjusted Service Ampacity" value={adjustedAmps.toFixed(1)} unit="A" highlight />
        </ResultSection>
        <ResultSection title="Service Equipment">
          <ResultRow label="Minimum Service Size" value={`${finalService}A`} highlight
            sub="100A minimum per NEC 230.79(C) for one-family dwellings" />
          <ResultRow label="Service Disconnect Rating" value={`${finalService}A`} sub="NEC 230.70" />
          {nec.DWELLING_SPD_REQUIRED !== undefined && (
            <ResultRow label="Dwelling SPD Required" value={nec.DWELLING_SPD_REQUIRED ? `Yes (${nec.SPD_ARTICLE || "230.67"})` : "No"} />
          )}
          {nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED !== undefined && (
            <ResultRow label="Outdoor Emergency Disconnect" value={nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED ? "Required (230.85)" : "Not required"} />
          )}
        </ResultSection>
        <FormulaBox steps={steps} />
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 230.42: Service conductor ampacity ≥ load. Continuous loads × {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% for service sizing. Minimum {nec.DWELLING_MIN_SERVICE_AMPS}A one-family dwelling service per NEC 230.79(C). NEC 240.6 standard ratings apply.</li>
            {nec.DWELLING_SPD_TYPE && <li><strong>{nec.SPD_ARTICLE || "230.67"} SPD ({necYear}):</strong> {nec.DWELLING_SPD_TYPE}</li>}
            {nec.OVERVOLTAGE_ARTICLE_NOTE && <li><strong>Article {nec.OVERVOLTAGE_ARTICLE}:</strong> {nec.OVERVOLTAGE_ARTICLE_NOTE}</li>}
            {nec.SUPPLY_SIDE_DISCONNECT_NOTE && <li><strong>{nec.SUPPLY_SIDE_DISCONNECT_ARTICLE}:</strong> {nec.SUPPLY_SIDE_DISCONNECT_NOTE}</li>}
            {nec.DWELLING_OUTDOOR_DISCONNECT_NOTE && <li><strong>230.85 Emergency Disconnect ({necYear}):</strong> {nec.DWELLING_OUTDOOR_DISCONNECT_NOTE}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Total Calculated Load" unit="VA"><NumInput value={v.totalVA} onChange={set("totalVA")} placeholder="40000" /></Field>
      <Field label="Service Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V 3Ø" },
          { value: 240, label: "240V" }, { value: 480, label: "480V 3Ø" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[
          { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" }
        ]} />
      </Field>
      <Field label="Percentage Continuous Loads" unit="%" hint="Loads operating ≥3 hours">
        <NumInput value={v.continuousPct} onChange={set("continuousPct")} placeholder="80" min={0} max={100} />
      </Field>
    </CalcLayout>
  );
}