import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcConductorAmpacity, getTempFactor, getBundleFactor } from "./logic/conductorAmpacityCalc";

const FORMULAS = [
  { label: "Corrected Ampacity", formula: "I_adj = I_base × CF_temp × CF_bundle", description: "I_base from the year-owned ampacity table, CF_temp = temperature correction factor, CF_bundle = bundling adjustment factor" },
  { label: "Terminal Limit (NEC 110.14(C))", formula: "I_final = min(I_adj, I_terminal_rating)", description: "Final ampacity cannot exceed the terminal temperature rating limit" },
];


export default function ConductorAmpacity({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["310_15_b_16_copper", "310_15_b_16_aluminum", "310_15_b_2_temp_correction", "310_15_c_1_bundling"], necYear);
  const [v, setV] = useCalculatorInputs({ awg: "12", material: "copper", tempRating: "75", ambient: 30, bundled: 3, useTerminal: "60", isDwellingService: false });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcConductorAmpacity(v, nec);
  if (!r) return null;
  const { baseAmpacity, t60, t75, t90, tempCorrectionFactor: tc, bundleFactor: bf,
    correctedAmpacity: corrected, terminalLimit, finalAmpacity, isDwellingService, maxDwellingServiceA, steps } = r;
  const table = v.material === "copper" ? nec.COPPER_AMPACITY : nec.ALUMINUM_AMPACITY;
  const row = table[v.awg];
  if (!row) return null;

  const awgOptions = Object.keys(v.material === "copper" ? nec.COPPER_AMPACITY : nec.ALUMINUM_AMPACITY).map(k => ({ value: k, label: `#${k} AWG` }));

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Ampacity Calculation">
          <ResultRow label="Base Ampacity (Table)" value={baseAmpacity} unit="A" />
          <ResultRow label="Temp Correction Factor" value={tc.toFixed(2)} />
          <ResultRow label="Bundling Derating Factor" value={bf.toFixed(2)} />
          <ResultRow label="Corrected Ampacity" value={corrected.toFixed(1)} unit="A" />
          <ResultRow label="Terminal Rating Limit" value={terminalLimit} unit="A" />
          <ResultRow label="Final Allowable Ampacity" value={finalAmpacity.toFixed(1)} unit="A" highlight />
          {isDwellingService && <ResultRow label="Max Dwelling Service (83% rule)" value={maxDwellingServiceA} unit="A" highlight sub={r.dwellingServiceArticle} />}
        </ResultSection>
        <ResultSection title="All Temperature Ratings (Base)">
          <ResultRow label="@ 60°C" value={t60} unit="A" />
          <ResultRow label="@ 75°C" value={t75} unit="A" />
          <ResultRow label="@ 90°C" value={t90} unit="A" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          NEC {necYear} {r.ampacityTable}: Base ampacity from table. Apply temperature correction per {r.tempArticle} and bundling derating per {r.bundleArticle}. Terminal temperature per NEC 110.14(C) limits final ampacity.{r.dwellingServiceArticle ? ` Dwelling service/feeder 83% rule: ${r.dwellingServiceArticle}.` : ""}
        </NoteBox>
      </div>
    }>
      <Field label="Wire Size (AWG / kcmil)">
        <Select value={v.awg} onChange={set("awg")} options={awgOptions} />
      </Field>
      <Field label="Conductor Material">
        <Select value={v.material} onChange={set("material")} options={[
          { value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" }
        ]} />
      </Field>
      <Field label="Insulation Temperature Rating">
        <Select value={v.tempRating} onChange={set("tempRating")} options={[
          { value: "60", label: "60°C (THHN/THWN at 60°C use)" },
          { value: "75", label: "75°C (THWN, XHHW)" },
          { value: "90", label: "90°C (THHN, XHHW-2)" },
        ]} />
      </Field>
      <Field label="Ambient Temperature" unit="°C / °F" hint="Default: 30°C (86°F) per NEC tables">
        <Select value={v.ambient} onChange={set("ambient")} options={[
          { value: 21, label: "21–25°C  (70–77°F)" },
          { value: 26, label: "26–30°C  (79–86°F) — default" },
          { value: 31, label: "31–35°C  (88–95°F)" },
          { value: 36, label: "36–40°C  (97–104°F)" },
          { value: 41, label: "41–45°C  (106–113°F)" },
          { value: 46, label: "46–50°C  (115–122°F)" },
          { value: 51, label: "51–55°C  (124–131°F)" },
          { value: 56, label: "56–60°C  (133–140°F)" },
          { value: 61, label: "61–65°C  (142–149°F)" },
          { value: 66, label: "66–70°C  (151–158°F)" },
        ]} />
      </Field>
      <Field label="Current-Carrying Conductors in Raceway" unit="count" hint="≤3 = no derating">
        <Select value={v.bundled} onChange={set("bundled")} options={[
          { value: 3, label: "1–3 (factor = 1.00)" },
          { value: 4, label: "4–6 (factor = 0.80)" },
          { value: 7, label: "7–9 (factor = 0.70)" },
          { value: 10, label: "10–20 (factor = 0.70)" },
          { value: 21, label: "21–30 (factor = 0.65)" },
          { value: 31, label: "31–40 (factor = 0.60)" },
          { value: 41, label: "41+ (factor = 0.50)" },
        ]} />
      </Field>
      <Field label="Terminal Temperature Rating" unit="" hint="NEC 110.14(C) — limits final ampacity">
        <Select value={v.useTerminal} onChange={set("useTerminal")} options={[
          { value: "60", label: "60°C terminals (typical residential)" },
          { value: "75", label: "75°C terminals (commercial/industrial)" },
        ]} />
      </Field>
      <Field label="Dwelling Service/Feeder Conductor?" hint={`${nec.DWELLING_SERVICE_ARTICLE || "310.15(B)(7)"} — 83% rule`}>
        <Select value={v.isDwellingService} onChange={val => setV(p => ({ ...p, isDwellingService: val === "true" }))} options={[
          { value: "false", label: "No (general purpose)" },
          { value: "true", label: "Yes (dwelling service/feeder — 83% rule)" },
        ]} />
      </Field>
    </CalcLayout>
  );
}