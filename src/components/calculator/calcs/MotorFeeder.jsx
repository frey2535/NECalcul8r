import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "Feeder Conductor (NEC 430.24)", formula: "Feeder A = 1.25 × FLC_largest + Σ FLC_remaining", description: "Largest motor FLC at 125%, all other motors at 100%" },
  { label: "Feeder OCPD (NEC 430.62)", formula: "Feeder OCPD = Largest motor OCPD + Σ FLC_remaining", description: "Select next standard size not less than this calculated value" },
];
import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcMotorFeeder } from "./logic/motorFeederCalc";

export default function MotorFeeder({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["430_250_flc_3phase", "430_250_flc_3phase_sync", "430_248_flc_1phase", "430_52_ocpd_multipliers", "240_6_std_sizes"], necYear);
  const [motors, setMotors] = useRestoredField("motors", [
    { flc: 28, hp: 10, isContinuous: true },
    { flc: 15.2, hp: 5, isContinuous: false },
    { flc: 6.8, hp: 2, isContinuous: false },
  ]);
  const [voltage, setVoltage] = useRestoredField("voltage", "208");
  const [phases, setPhases] = useRestoredField("phases", "three");

  const updateMotor = (i, key, val) => {
    setMotors(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: val } : m));
  };
  const addMotor = () => setMotors(prev => [...prev, { flc: 10, hp: 3, isContinuous: false }]);
  const removeMotor = i => setMotors(prev => prev.filter((_, idx) => idx !== i));

  const motorResult = calcMotorFeeder({ motors, voltage, phases }, nec);
  const { largest, sumOthers, totalFLC, feederAmpacity, largestOCPD, feederOCPD_calc, feederOCPD, steps } = motorResult;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ motors, voltage, phases }} outputValues={motorResult} trace={motorResult.trace} result={
      <div className="space-y-2">
        <ResultSection title="Motor Summary">
          <ResultRow label="Largest Motor FLC" value={largest.toFixed(1)} unit="A" />
          <ResultRow label="Sum of Other Motor FLCs" value={sumOthers.toFixed(1)} unit="A" />
          <ResultRow label="Total FLC (all motors)" value={totalFLC.toFixed(1)} unit="A" />
        </ResultSection>
        <ResultSection title="Feeder Sizing (NEC 430.24)">
          <ResultRow label="Feeder Conductor Ampacity" value={feederAmpacity.toFixed(1)} unit="A" highlight
            sub="Largest × 125% + sum of others" />
        </ResultSection>
        <ResultSection title="Feeder OCPD (NEC 430.62)">
          <ResultRow label="Largest Motor OCPD (max)" value={largestOCPD} unit="A" />
          <ResultRow label="Calculated Feeder OCPD" value={feederOCPD_calc.toFixed(1)} unit="A" />
          <ResultRow label="Selected Feeder OCPD" value={feederOCPD} unit="A" highlight />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>NEC {necYear} 430.24: Feeder ampacity = 125% of largest motor FLC + 100% of all other FLC. NEC 430.62: Feeder OCPD = largest branch OCPD + sum of other motor FLCs (use next standard size up).</NoteBox>
      </div>
    }>
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase">Motors</div>
        {motors.map((m, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Motor {i + 1}</span>
              {motors.length > 1 && (
                <button onClick={() => removeMotor(i)} className="text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
            <Field label="Full-Load Current (FLC)" unit="A">
              <NumInput value={m.flc} onChange={val => updateMotor(i, "flc", parseFloat(val))} placeholder="28" />
            </Field>
          </div>
        ))}
        <button onClick={addMotor} className="text-xs text-primary hover:underline">+ Add Motor</button>
      </div>
      <Field label="System Voltage">
        <Select value={voltage} onChange={setVoltage} options={[
          { value: "120", label: "120V" }, { value: "208", label: "208V" },
          { value: "240", label: "240V" }, { value: "480", label: "480V" },
        ]} />
      </Field>
      <Field label="Phase">
        <Select value={phases} onChange={setPhases} options={[
          { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
    </CalcLayout>
  );
}