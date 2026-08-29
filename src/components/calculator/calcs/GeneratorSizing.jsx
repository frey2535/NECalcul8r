import React from "react";
import { useCalculatorInputs, useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcGeneratorSizing } from "./logic/generatorSizingCalc";
import FormulaBox from "../FormulaBox";

const GEN_SIZES = [7.5, 10, 15, 20, 25, 30, 45, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000];

export default function GeneratorSizing({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [mode, setMode] = useRestoredField("mode", "service"); // "service" | "loads"
  const [v, setV] = useCalculatorInputs({
    // Service-based inputs
    serviceA: 200, serviceV: 240, servicePhases: "single", demandFactor: 80,
    // Load-based inputs
    criticalLoadsVA: 20000, motorLoadsVA: 5000, lightingVA: 3000, otherVA: 2000,
    // Shared
    pf: 0.8,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const gr = calcGeneratorSizing({ ...v, mode }, nec);
  const { serviceTotalVA, demandKVA, demandKW, serviceKW_withStarting, serviceGenSize,
    totalRunningVA, totalWithStarting, requiredKW, loadGenSize, steps } = gr;
  const pf = parseFloat(v.pf) || 0.8;
  const serviceA = parseFloat(v.serviceA) || 200;
  const demandPct = parseFloat(v.demandFactor) || 80;
  const critical = parseFloat(v.criticalLoadsVA) || 0;
  const motor = parseFloat(v.motorLoadsVA) || 0;
  const lighting = parseFloat(v.lightingVA) || 0;
  const other = parseFloat(v.otherVA) || 0;
  const motorStarting = motor * 6;
  const requiredKVA = totalWithStarting / 1000;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ...v, mode }} outputValues={gr} result={
      <div className="space-y-2">
        {mode === "service" ? (
          <>
            <ResultSection title="Service Load">
              <ResultRow label="Service Size" value={serviceA} unit="A" />
              <ResultRow label="Total Service VA" value={(serviceTotalVA / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label={`Demand Load (${demandPct}%)`} value={demandKVA.toFixed(1)} unit="kVA" />
              <ResultRow label="Demand kW" value={demandKW.toFixed(1)} unit="kW" sub={`at PF = ${pf}`} />
            </ResultSection>
            <ResultSection title="Generator Requirements">
              <ResultRow label="With 25% Motor Starting" value={serviceKW_withStarting.toFixed(1)} unit="kW" highlight />
              <ResultRow label="Recommended Generator" value={`${serviceGenSize} kW`} highlight
                sub="Next standard size above requirement" />
            </ResultSection>
            <ResultSection title="Standard Generator Sizes">
              {GEN_SIZES.filter(s => s >= demandKW * 0.8 && s <= serviceKW_withStarting * 2).map(s => (
                <ResultRow key={s} label={`${s} kW`}
                  value={s >= serviceKW_withStarting ? "✓ Suitable" : "Too small"}
                  highlight={s === serviceGenSize} />
              ))}
            </ResultSection>
          </>
        ) : (
          <>
            <ResultSection title="Load Summary">
              <ResultRow label="Critical Loads" value={(critical / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Motor (running)" value={(motor / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Motor Starting (6×)" value={(motorStarting / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Lighting" value={(lighting / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="Other" value={(other / 1000).toFixed(1)} unit="kVA" />
            </ResultSection>
            <ResultSection title="Generator Requirements">
              <ResultRow label="Total Running Load" value={(totalRunningVA / 1000).toFixed(1)} unit="kVA" />
              <ResultRow label="With Motor Starting" value={(totalWithStarting / 1000).toFixed(1)} unit="kVA" highlight />
              <ResultRow label="Required kW" value={requiredKW.toFixed(1)} unit="kW" highlight sub={`at PF = ${pf}`} />
              <ResultRow label="Recommended Generator" value={`${loadGenSize} kW`} highlight />
            </ResultSection>
          </>
        )}
        <FormulaBox steps={steps} />
        <NoteBox>
          NEC {necYear} 702 / 445: Generator must supply all connected loads. Use demand factors per NEC 220 to avoid over-sizing.
          Motor starting current is typically 6× running — this determines peak kVA. Transfer switch required per NEC 702.5.
          Size generator at 125% of continuous load per NEC 445.13.
          {gr.dwelling_generator_shutdown_note ? ` ${gr.dwelling_generator_shutdown_article}: ${gr.dwelling_generator_shutdown_note}` : ""}
        </NoteBox>
      </div>
    }>
      <Field label="Calculation Method">
        <Select value={mode} onChange={setMode} options={[
          { value: "service", label: "From Service Size (back-calculate)" },
          { value: "loads", label: "From Individual Loads" },
        ]} />
      </Field>

      {mode === "service" ? (
        <>
          <Field label="Service Size" unit="A">
            <NumInput value={v.serviceA} onChange={set("serviceA")} placeholder="200" />
          </Field>
          <Field label="Service Voltage">
            <Select value={v.serviceV} onChange={set("serviceV")} options={[
              { value: 120, label: "120V" }, { value: 208, label: "208V" },
              { value: 240, label: "240V" }, { value: 480, label: "480V" },
            ]} />
          </Field>
          <Field label="Phase">
            <Select value={v.servicePhases} onChange={set("servicePhases")} options={[
              { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" },
            ]} />
          </Field>
          <Field label="Demand Factor" unit="%" hint="Typical: 60–80% for most facilities">
            <NumInput value={v.demandFactor} onChange={set("demandFactor")} placeholder="80" min={10} max={100} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Critical / Essential Loads" unit="VA">
            <NumInput value={v.criticalLoadsVA} onChange={set("criticalLoadsVA")} placeholder="20000" />
          </Field>
          <Field label="Motor Loads (running)" unit="VA" hint="Starting = 6× running is applied automatically">
            <NumInput value={v.motorLoadsVA} onChange={set("motorLoadsVA")} placeholder="5000" />
          </Field>
          <Field label="Lighting Loads" unit="VA">
            <NumInput value={v.lightingVA} onChange={set("lightingVA")} placeholder="3000" />
          </Field>
          <Field label="Other Loads" unit="VA">
            <NumInput value={v.otherVA} onChange={set("otherVA")} placeholder="2000" />
          </Field>
        </>
      )}

      <Field label="Power Factor" unit="PF" hint="Typical: 0.8 for motors, 1.0 for resistive">
        <NumInput value={v.pf} onChange={set("pf")} placeholder="0.8" min={0.1} max={1} step={0.01} />
      </Field>
    </CalcLayout>
  );
}