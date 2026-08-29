import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcBoxFill } from "./logic/boxFillCalc";

const FORMULAS = [
  { label: "Total Fill Required", formula: "Fill = (n_cond × V) + (n_egc > 0 ? V : 0) + (n_dev × 2V) + (clamps > 0 ? V : 0) + (fittings > 0 ? V : 0)", description: "V = volume per conductor from Table 314.16(B) based on largest wire size in box" },
  { label: "Compliance Check", formula: "Box Volume ≥ Total Fill Required", description: "Box must have sufficient cubic inch volume to pass NEC 314.16" },
];

// Box sizes from NEC Table 314.16(A)
const COMMON_BOXES = [
  { name: '(4 x 1¼) round/octagonal', vol: 12.5 },
  { name: '(4 x 1½) round/octagonal', vol: 15.5 },
  { name: '(4 x 2⅛) round/octagonal', vol: 21.5 },
  { name: '(4 x 1¼) square', vol: 18.0 },
  { name: '(4 x 1½) square', vol: 21.0 },
  { name: '(4 x 2⅛) square', vol: 30.3 },
  { name: '(4 11/16 x 1¼) square', vol: 25.5 },
  { name: '(4 11/16 x 1½) square', vol: 29.5 },
  { name: '(4 11/16 x 2⅛) square', vol: 42.0 },
  { name: '(3 x 2 x 1½) device', vol: 7.5 },
  { name: '(3 x 2 x 2) device', vol: 10.0 },
  { name: '(3 x 2 x 2¼) device', vol: 10.5 },
  { name: '(3 x 2 x 2½) device', vol: 12.5 },
  { name: '(3 x 2 x 2¾) device', vol: 14.0 },
  { name: '(3 x 2 x 3½) device', vol: 18.0 },
  { name: '(4 x 2⅛ x 1½) device', vol: 10.3 },
  { name: '(4 x 2⅛ x 1⅞) device', vol: 13.0 },
  { name: '(4 x 2⅛ x 2⅛) device', vol: 14.5 },
  { name: '(3¾ x 2 x 2½) masonry box', vol: 14.0 },
  { name: '(3¾ x 2 x 3½) masonry box', vol: 21.0 },
  { name: 'FS — single cover (1¾)', vol: 13.5 },
  { name: 'FD — single cover (2⅜)', vol: 18.0 },
  { name: 'FS — multiple cover (1¾)', vol: 18.0 },
  { name: 'FD — multiple cover (2⅜)', vol: 24.0 },
];

export default function BoxFill({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["314_16_b_box_fill", "314_16_a_box_volumes"], necYear);
  const [v, setV] = useCalculatorInputs({
    awg: "12",
    conductors: 4,
    grounding: 1,
    devices: 1,
    clamps: 0,
    supportFittings: 0,
    boxVolume: "18",
    customBoxVolume: "",
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcBoxFill(v, nec);
  const { volPerConductor: vol, conductorFill, groundFill, deviceFill, clampFill, supportFill,
    totalFill, boxVol, remaining, pass: ok, steps } = r;
  const isCustom = v.boxVolume === "custom";

  const minBox = COMMON_BOXES.find(b => b.vol >= totalFill);

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Fill Breakdown">
          <ResultRow label={`Conductors (${v.conductors} × ${vol} in³)`} value={conductorFill.toFixed(2)} unit="in³" />
          <ResultRow label={`Grounding (all EGCs = 1 × ${vol} in³)`} value={groundFill.toFixed(2)} unit="in³" />
          <ResultRow label={`Devices (${v.devices} × 2 × ${vol} in³)`} value={deviceFill.toFixed(2)} unit="in³" />
          <ResultRow label={`Cable Clamps (all = 1 × ${vol} in³)`} value={clampFill.toFixed(2)} unit="in³" />
          <ResultRow label={`Support Fittings (= 1 × ${vol} in³)`} value={supportFill.toFixed(2)} unit="in³" />
        </ResultSection>
        <ResultSection title="Summary">
          <ResultRow label="Total Fill Required" value={totalFill.toFixed(2)} unit="in³" highlight />
          <ResultRow label="Box Volume" value={boxVol > 0 ? boxVol.toFixed(1) : "—"} unit="in³" />
          <ResultRow label="Remaining Space" value={boxVol > 0 ? remaining.toFixed(2) : "—"} unit="in³" />
          <ResultRow label="Code Compliance" value={boxVol > 0 ? (ok ? "✓ PASS — Box is adequate" : "✗ FAIL — Box too small") : "Enter box volume"} failed={boxVol > 0 && !ok} />
        </ResultSection>
        {minBox && (
          <ResultSection title="Minimum Box Recommendation">
            <ResultRow label="Smallest Adequate Box" value={minBox.name} sub={`${minBox.vol} in³ min.`} highlight />
          </ResultSection>
        )}
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          NEC {necYear} 314.16(B): Each conductor counts as its volume. All EGCs = 1 conductor. Each device (switch/outlet) = 2× largest conductor connected. All internal cable clamps = 1 conductor. Fixture studs/hickeys = 1 conductor.
        </NoteBox>
      </div>
    }>
      <Field label="Largest Wire Size in Box" unit="AWG">
        <Select value={v.awg} onChange={set("awg")} options={Object.keys(nec.CONDUCTOR_VOLUME).map(k => ({ value: k, label: `#${k} AWG (${nec.CONDUCTOR_VOLUME[k]} in³)` }))} />
      </Field>
      <Field label="Current-Carrying Conductors" unit="count" hint="Each wire entering box counts as 1">
        <NumInput value={v.conductors} onChange={set("conductors")} placeholder="4" min={0} />
      </Field>
      <Field label="Equipment Grounding Conductors" unit="count" hint="All EGCs count as only 1 conductor total">
        <NumInput value={v.grounding} onChange={set("grounding")} placeholder="1" min={0} />
      </Field>
      <Field label="Devices (switches, receptacles)" unit="count" hint="Each = 2× largest conductor volume">
        <NumInput value={v.devices} onChange={set("devices")} placeholder="1" min={0} />
      </Field>
      <Field label="Internal Cable Clamps" unit="yes=1/no=0" hint="All clamps together = 1 conductor">
        <NumInput value={v.clamps} onChange={set("clamps")} placeholder="0" min={0} max={1} />
      </Field>
      <Field label="Support Fittings (studs/hickeys)" unit="yes=1/no=0" hint="= 1 conductor total">
        <NumInput value={v.supportFittings} onChange={set("supportFittings")} placeholder="0" min={0} max={1} />
      </Field>
      <Field label="Box Volume" unit="in³">
        <Select value={v.boxVolume} onChange={set("boxVolume")} options={[
          ...COMMON_BOXES.map(b => ({ value: String(b.vol), label: `${b.name} (${b.vol} in³)` })),
          { value: "custom", label: "Custom size..." }
        ]} />
      </Field>
      {isCustom && (
        <Field label="Custom Box Volume" unit="in³" hint="Enter the marked cubic inch volume of your box">
          <NumInput value={v.customBoxVolume} onChange={set("customBoxVolume")} placeholder="e.g. 32.5" min={0} />
        </Field>
      )}
    </CalcLayout>
  );
}