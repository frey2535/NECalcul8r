import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "Demand Load", formula: "Demand VA = Connected VA × Demand Factor (%)", description: "Apply tiered demand factors per applicable NEC table to connected load" },
  { label: "VA Reduction", formula: "Savings = Connected VA − Demand VA", description: "Reduction allowed when sizing feeders and services" },
];
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcDemandFactor } from "./logic/demandFactorCalc";

export default function DemandFactor({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["220_42_lighting_demand", "220_44_receptacle_demand", "220_54_dryer_demand"], necYear);

  const [v, setV] = useCalculatorInputs({ loadType: "lighting_dwelling", totalVA: 50000 });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcDemandFactor(v, nec);
  const { totalVA: total, demandVA: demand, savingsVA, savingsPct, explanation, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Demand Factor Applied">
          <ResultRow label="Total Connected Load" value={total.toFixed(0)} unit="VA" />
          <ResultRow label="Demand Load (after factor)" value={demand.toFixed(0)} unit="VA" highlight />
          <ResultRow label="VA Reduction" value={savingsVA.toFixed(0)} unit="VA" />
          <ResultRow label="Effective Demand Factor" value={`${(100 - savingsPct).toFixed(1)}%`}
            sub={total > 0 ? `${savingsPct.toFixed(1)}% reduction from full load` : ""} />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>{explanation}</NoteBox>
      </div>
    }>
      <Field label="Load Type / NEC Table">
        <Select value={v.loadType} onChange={set("loadType")} options={[
          { value: "lighting_dwelling", label: "Dwelling Lighting (NEC Table 220.42)" },
          { value: "lighting_hotel", label: "Hotel/Motel Lighting (NEC Table 220.42)" },
          { value: "lighting_warehouse", label: "Warehouse Lighting (NEC Table 220.42)" },
          { value: "receptacle_commercial", label: "Commercial Receptacles (NEC 220.44)" },
          { value: "dryer_dwelling", label: "Electric Dryers — 1 unit (NEC 220.54)" },
          { value: "fixed_appliance", label: "Fixed Appliances ≥4 units (NEC 220.53)" },
          { value: "neutral_conductor", label: "Feeder Neutral Load (NEC 220.61)" },
        ]} />
      </Field>
      <Field label="Total Connected Load" unit="VA">
        <NumInput value={v.totalVA} onChange={set("totalVA")} placeholder="50000" />
      </Field>
    </CalcLayout>
  );
}