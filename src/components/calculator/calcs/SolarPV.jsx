import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

function buildFormulas(nec) {
  return [
    { label: "Backfeed Breaker (NEC 690.8 / 705.12)", formula: `Min OCPD = Inverter Output Current × ${nec.SOLAR_BACKFEED_MULTIPLIER}`, description: "PV circuits are treated as continuous loads" },
    { label: "120% Rule (NEC 705.12(B)(2))", formula: `Main CB + PV Backfeed CB ≤ Busbar Rating × ${nec.SOLAR_BUSBAR_120PCT}`, description: "If this is exceeded, a supply-side connection or panel upgrade is required" },
  ];
}
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcSolarPV } from "./logic/solarPVCalc";

export default function SolarPV({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["240_6_std_sizes", "310_15_b_16_copper"], necYear);

  const [v, setV] = useCalculatorInputs({
    systemDC_kW: 10, inverterAC_kW: 9.6, inverterOutputA: 40,
    inverterOutputV: 240, phases: "single", utilityV: 240,
    backfeedCB: 40, mainBreakerA: 200, busbarA: 225,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcSolarPV(v, nec);
  const { minConductorA, minBackfeedCB_calc, minBackfeedCB, rule120_limit, rule120_used, rule120_ok, efficiency, steps } = r;
  const inverterA = parseFloat(v.inverterOutputA) || 40;
  const dcKW = parseFloat(v.systemDC_kW) || 10;
  const acKW = parseFloat(v.inverterAC_kW) || 9.6;
  const busbarA = parseFloat(v.busbarA) || 225;
  const mainCB = parseFloat(v.mainBreakerA) || 200;
  const backfeedCB = parseFloat(v.backfeedCB) || 40;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Inverter Output (NEC 690.8)">
          <ResultRow label="Inverter Output Current" value={inverterA.toFixed(1)} unit="A" />
          <ResultRow label="Min Conductor Ampacity (125%)" value={minConductorA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Min Backfeed Breaker (125%)" value={minBackfeedCB} unit="A" highlight />
        </ResultSection>
        <ResultSection title="120% Rule — Panel Compliance (NEC 705.12)">
          <ResultRow label="Panel Busbar Rating" value={busbarA} unit="A" />
          <ResultRow label="120% Limit" value={rule120_limit.toFixed(0)} unit="A" />
          <ResultRow label="Main CB + Backfeed CB" value={rule120_used} unit="A" />
          <ResultRow label="120% Rule" value={rule120_ok ? "✓ PASS" : "✗ FAIL — Reduce backfeed CB or upgrade panel"} highlight={!rule120_ok} />
        </ResultSection>
        <ResultSection title="System Summary">
          <ResultRow label="DC System Size" value={dcKW.toFixed(1)} unit="kW" />
          <ResultRow label="AC Output" value={acKW.toFixed(1)} unit="kW" />
          <ResultRow label="Inverter Efficiency" value={`${efficiency.toFixed(1)}%`} />
        </ResultSection>
        <FormulaBox steps={steps} formulas={buildFormulas(nec)} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 690 / 705: Backfeed breaker = {(nec.SOLAR_BACKFEED_MULTIPLIER * 100).toFixed(0)}% of inverter output (690.8). 120% Rule (705.12): Main CB + PV CB ≤ {(nec.SOLAR_BUSBAR_120PCT * 100).toFixed(0)}% of busbar rating. All DC conductors must be labeled "PV SYSTEM".</NoteBox>
      </div>
    }>
      <Field label="DC System Size" unit="kW"><NumInput value={v.systemDC_kW} onChange={set("systemDC_kW")} placeholder="10" /></Field>
      <Field label="Inverter AC Output" unit="kW"><NumInput value={v.inverterAC_kW} onChange={set("inverterAC_kW")} placeholder="9.6" /></Field>
      <Field label="Inverter Output Current" unit="A"><NumInput value={v.inverterOutputA} onChange={set("inverterOutputA")} placeholder="40" /></Field>
      <Field label="Phase">
        <Select value={v.phases} onChange={set("phases")} options={[{ value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" }]} />
      </Field>
      <Field label="Panel Busbar Rating" unit="A" hint="Typically 125% of main breaker">
        <NumInput value={v.busbarA} onChange={set("busbarA")} placeholder="225" />
      </Field>
      <Field label="Main Breaker Rating" unit="A"><NumInput value={v.mainBreakerA} onChange={set("mainBreakerA")} placeholder="200" /></Field>
      <Field label="Proposed Backfeed Breaker" unit="A"><NumInput value={v.backfeedCB} onChange={set("backfeedCB")} placeholder="40" /></Field>
    </CalcLayout>
  );
}