import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import { calcSupplementalGrounding } from "./logic/supplementalGroundingCalc";

const FORMULAS = [
  { label: "Single Rod Resistance (Dwight Formula)", formula: "R = (ρ / 2πL) × [ln(4L/d) − 1]", description: "ρ = soil resistivity (Ω·cm), L = rod length (cm), d = rod diameter (cm)" },
  { label: "NEC Compliance Check (250.53(A)(2))", formula: "R ≤ 25 Ω → single rod sufficient; R > 25 Ω → add supplemental electrode", description: "If resistance > 25Ω, a second rod is required per NEC 250.53(A)(2)" },
];

// Typical soil resistivity values (Ω·cm)
const SOIL_TYPES = [
  { label: "Wet organic soil / swamp",      rho: 10000 },
  { label: "Moist clay / loam",             rho: 25000 },
  { label: "Moist sandy loam",              rho: 50000 },
  { label: "Average garden soil",           rho: 100000 },
  { label: "Dry sandy / rocky",             rho: 300000 },
  { label: "Gravel / crushed rock",         rho: 1000000 },
  { label: "Custom (enter below)",          rho: "custom" },
];

export default function SupplementalGroundingElectrode({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const [v, setV] = useCalculatorInputs({
    soilType: "0",
    customRho: 100000,
    rodLength: 8,       // feet
    rodDiameter: 0.625, // inches (5/8" standard)
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const soilRow = SOIL_TYPES[parseInt(v.soilType)];
  const r = calcSupplementalGrounding(v, nec);
  const { rho, resistance, compliant, needsSupplemental, twoRodResistance, twoRodCompliant, steps } = r;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Electrode Parameters">
          <ResultRow label="Soil Resistivity (ρ)" value={rho.toLocaleString()} unit="Ω·cm" />
          <ResultRow label="Rod Length" value={parseFloat(v.rodLength).toFixed(1)} unit="ft" />
          <ResultRow label="Rod Diameter" value={parseFloat(v.rodDiameter).toFixed(3)} unit="in" />
        </ResultSection>
        <ResultSection title="Resistance Calculation (Dwight Formula)">
          <ResultRow label="Single Rod Resistance" value={resistance.toFixed(1)} unit="Ω" highlight />
          <ResultRow label="NEC 25Ω Limit" value="25 Ω" sub="NEC 250.53(A)(2) threshold" />
          <ResultRow
            label="Single Rod Compliance"
            value={compliant ? "✓ PASS — Single rod OK" : "✗ FAIL — Supplemental required"}
            highlight={needsSupplemental}
          />
        </ResultSection>
        {needsSupplemental && (
          <ResultSection title="With Supplemental Rod (Estimated)">
            <ResultRow label="Two-Rod Resistance (est.)" value={twoRodResistance.toFixed(1)} unit="Ω" highlight />
            <ResultRow label="Two-Rod Compliance" value={twoRodCompliant ? "✓ PASS" : "✗ Still > 25Ω — consider additional rods or ground enhancement"} highlight={!twoRodCompliant} />
          </ResultSection>
        )}
        <FormulaBox steps={steps} formulas={FORMULAS} />
        <NoteBox>
          NEC {necYear} 250.53(A)(2): A single ground rod, pipe, or plate electrode must be supplemented with an additional electrode if the resistance to ground exceeds 25 ohms. The supplemental electrode must be spaced at least 6 ft from the first. Note: NEC does not require measuring resistance — simply installing the second electrode satisfies the requirement in most cases.
        </NoteBox>
      </div>
    }>
      <Field label="Soil Type / Resistivity">
        <Select value={v.soilType} onChange={set("soilType")} options={SOIL_TYPES.map((s, i) => ({ value: String(i), label: s.label }))} />
      </Field>
      {soilRow?.rho === "custom" && (
        <Field label="Custom Soil Resistivity" unit="Ω·cm" hint="Measured or estimated from soil test">
          <NumInput value={v.customRho} onChange={set("customRho")} placeholder="100000" min={1000} />
        </Field>
      )}
      <Field label="Ground Rod Length" unit="ft" hint="Standard: 8 ft (NEC 250.52(A)(5))">
        <NumInput value={v.rodLength} onChange={set("rodLength")} placeholder="8" min={1} max={40} />
      </Field>
      <Field label="Rod Diameter" unit="in" hint="Standard: 5/8″ (0.625 in)">
        <NumInput value={v.rodDiameter} onChange={set("rodDiameter")} placeholder="0.625" min={0.1} max={2} step={0.0625} />
      </Field>
    </CalcLayout>
  );
}