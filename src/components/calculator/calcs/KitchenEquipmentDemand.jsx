import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcKitchenEquipment } from "./logic/kitchenEquipmentCalc";

const FORMULAS = [
  { label: "Kitchen Equipment Demand (NEC 220.56)", formula: "Demand = Total connected kW × Table 220.56 demand factor", description: "Applied to commercial cooking equipment (ranges, ovens, fryers, etc.) — NOT residential" },
  { label: "Feeder Conductor", formula: "I = (Demand kW × 1000) / (V × √3 or V)", description: "Size conductors and OCPD based on demanded load" },
];

export default function KitchenEquipmentDemand({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [equipment, setEquipment] = useRestoredField("equipment", [
    { name: "Range / Oven",  kw: 12 },
    { name: "Fryer",         kw: 15 },
    { name: "Griddle",       kw: 10 },
    { name: "Steamer",       kw: 8  },
    { name: "Broiler",       kw: 10 },
  ]);
  const [voltage, setVoltage] = useRestoredField("voltage", "208");
  const [phases, setPhases] = useRestoredField("phases", "three");

  const addItem = () => setEquipment(p => [...p, { name: `Equipment ${p.length + 1}`, kw: 5 }]);
  const removeItem = i => setEquipment(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setEquipment(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const r = calcKitchenEquipment({ equipment, voltage, phases }, nec);
  const { count, totalConnectedKW, demandFactor, demandedKW, demandedVA, loadA, conductorA, ocpd, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ equipment, voltage, phases }} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Equipment Summary">
          {equipment.map((e, i) => (
            <ResultRow key={i} label={e.name} value={(parseFloat(e.kw) || 0).toFixed(1)} unit="kW" />
          ))}
          <ResultRow label="Total Connected" value={totalConnectedKW.toFixed(1)} unit="kW" highlight />
          <ResultRow label="Number of Appliances" value={count} />
        </ResultSection>
        <ResultSection title="Demand Calculation (NEC Table 220.56)">
          <ResultRow label={`Demand Factor (${count} units)`} value={`${demandFactor}%`} highlight />
          <ResultRow label="Table 220.56 Load" value={r.tableDemandKW.toFixed(1)} unit="kW" />
          <ResultRow label="Two Largest (floor)" value={r.twoLargestKW.toFixed(1)} unit="kW" />
          <ResultRow label="Demanded Load" value={demandedKW.toFixed(1)} unit="kW" highlight />
          <ResultRow label="Demanded VA" value={Math.round(demandedVA).toLocaleString()} unit="VA" />
        </ResultSection>
        <ResultSection title="Feeder Sizing">
          <ResultRow label="Load Current" value={loadA.toFixed(1)} unit="A" />
          <ResultRow label="Conductor Ampacity (125%)" value={conductorA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Minimum OCPD" value={ocpd} unit="A" highlight />
        </ResultSection>
        <ResultSection title="NEC Table 220.56 Reference">
          {nec.COMMERCIAL_KITCHEN_DEMAND.filter(r => r.units <= 10).map((r, i) => (
            <ResultRow key={i} label={`${r.units} appliance${r.units > 1 ? "s" : ""}`} value={`${r.factor}%`} highlight={count <= r.units && (i === 0 || count > nec.COMMERCIAL_KITCHEN_DEMAND[i - 1]?.units)} />
          ))}
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 220.56: Commercial kitchen equipment only — not dwelling ranges (use {nec.RANGE_DEMAND_ARTICLE || "Table 220.55"}). Demand is at the feeder, not the branch circuit. Calculated load is not less than the two largest loads. Space-heating, ventilating, and air-conditioning equipment are not in this table. {necYear === "2017" ? "2017 Table 220.56: 6 or more units at 65%." : ""}
        </NoteBox>
      </div>
    }>
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase">Cooking Equipment</p>
        {equipment.map((e, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Item {i + 1}</span>
              {equipment.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
            <Field label="Equipment Name">
              <input
                type="text"
                value={e.name}
                onChange={ev => updateItem(i, "name", ev.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-slate-50 px-3.5 py-1 text-sm font-medium"
              />
            </Field>
            <Field label="Nameplate Rating" unit="kW">
              <NumInput value={e.kw} onChange={val => updateItem(i, "kw", val)} placeholder="10" min={0} />
            </Field>
          </div>
        ))}
        <button onClick={addItem} className="text-xs text-primary hover:underline">+ Add Equipment</button>
      </div>
      <Field label="Feeder Voltage">
        <Select value={voltage} onChange={setVoltage} options={[
          { value: "120", label: "120V" }, { value: "208", label: "208V" },
          { value: "240", label: "240V" }, { value: "480", label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={phases} onChange={setPhases} options={[
          { value: "single", label: "Single-Phase" },
          { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
    </CalcLayout>
  );
}