import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcMotorBranchCircuit } from "./logic/motorBranchCircuitCalc";

const FORMULAS = [
  { label: "FLC (NEC 430.6)", formula: "Use Table 430.248 (1-phase) or 430.250 (3-phase) — NOT nameplate FLA", description: "Table FLC is always used for conductor and OCPD sizing per NEC 430.6(A)" },
  { label: "Branch Circuit Conductor (NEC 430.22)", formula: "Min Conductor Ampacity = 1.25 × FLC", description: "Conductor must be rated at least 125% of the motor FLC" },
  { label: "Max OCPD (NEC 430.52)", formula: "Max OCPD = FLC × multiplier from Table 430.52", description: "Next larger standard size permitted if calculated value is not standard" },
  { label: "Overload Protection (NEC 430.32)", formula: "Overload = FLA × 1.15 (SF≥1.15) or FLA × 1.25 (all others)", description: "Uses nameplate FLA — not table FLC — for overload sizing" },
];

// TABLES fetched inside component with necYear

// NEC motor tables now loaded from getNecData() — see shared.js


export default function MotorBranchCircuit({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["430_248_flc_1phase", "430_250_flc_3phase", "430_250_flc_3phase_sync", "430_52_ocpd_multipliers", "240_6_std_sizes"], necYear);
  const FLC_3PH = nec.MOTOR_FLC_3PHASE;
  const FLC_3PH_SYNC = nec.MOTOR_FLC_3PHASE_SYNCHRONOUS || FLC_3PH;
  const FLC_1PH_230 = nec.MOTOR_FLC_1PHASE;
  const [v, setV] = useCalculatorInputs({
    phases: "three",
    motorType: "AC Polyphase (Other than Wound-Rotor)",
    hp: "10",
    voltage: "460",
    ocpdType: "itcb",
    termRating: "75",
    nameplateFL: "",   // optional nameplate FLA for overload calc
    sfAbove115: "yes", // service factor ≥ 1.15?
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const motorType = v.motorType || "AC Polyphase (Other than Wound-Rotor)";
  const typeMultipliers = (nec.MOTOR_OCPD_TABLE_430_52 && nec.MOTOR_OCPD_TABLE_430_52[motorType]) || nec.MOTOR_OCPD_MULTIPLIERS;
  const OCPD_MULT = {
    ntdf:  { label: "Non-Time-Delay Fuse",            mult: typeMultipliers["Non-Time Delay Fuse"] },
    dtef:  { label: "Dual-Element (Time-Delay) Fuse", mult: typeMultipliers["Dual Element Fuse"] },
    itb:   { label: "Instantaneous-Trip Breaker",     mult: typeMultipliers["Instantaneous Trip Breaker"] },
    itcb:  { label: "Inverse Time Circuit Breaker",   mult: typeMultipliers["Inverse Time Breaker"] },
  };
  const motorTypeOptions = Object.keys(nec.MOTOR_OCPD_TABLE_430_52 || {}).map(t => ({ value: t, label: t }));

  const is3ph = v.phases === "three";
  const isSync = is3ph && v.motorType === "Synchronous";
  const flcTable = isSync ? FLC_3PH_SYNC : (is3ph ? FLC_3PH : FLC_1PH_230);
  const hpOptions = Object.keys(flcTable).map(k => ({ value: k, label: `${k} HP` }));

  const voltageOptions = (() => {
    const row = flcTable[v.hp] || {};
    const all = is3ph
      ? (isSync ? [230, 460, 575, 2300] : [115, 200, 208, 230, 460, 575, 2300])
      : [115, 200, 208, 230];
    return all
      .filter(vol => row[String(vol)] != null)
      .map(vol => ({ value: String(vol), label: `${vol}V` }));
  })();

  const r = calcMotorBranchCircuit(v, nec);
  const { flc, conductorMinA, wireSize, ocpdCalc, ocpdSelected, overloadMaxA, overloadFactor, allOCPD, steps } = r;
  const fla = parseFloat(v.nameplateFL) || flc;
  const mult = OCPD_MULT[v.ocpdType]?.mult || 2.5;
  const flcSource = is3ph
    ? `Table 430.250 — ${v.hp} HP @ ${v.voltage}V`
    : `Table 430.248 — ${v.hp} HP @ ${v.voltage}V`;
  const termRating = parseInt(v.termRating) || 75;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title="Motor Full-Load Current (NEC 430.6)">
          <ResultRow label="FLC — Table Value" value={flc} unit="A" highlight />
          <ResultRow label="Source" value={flcSource} />
          <ResultRow label="Motor HP" value={`${v.hp} HP`} />
          <ResultRow label="Voltage" value={`${v.voltage}V`} />
        </ResultSection>

        <ResultSection title="Branch Circuit Conductor (NEC 430.22)">
          <ResultRow label="Min Ampacity (125% × FLC)" value={conductorMinA.toFixed(1)} unit="A" highlight />
          <ResultRow
            label={`Min Wire Size (${termRating}°C terminals)`}
            value={`#${wireSize} AWG`}
            highlight
            sub={`From NEC ${nec.AMPACITY_TABLE || "Table 310.15(B)(16)"} copper`}
          />
        </ResultSection>

        <ResultSection title="Branch Circuit OCPD (NEC 430.52)">
          <ResultRow label="Motor Type" value={v.motorType} />
          <ResultRow label="OCPD Type" value={OCPD_MULT[v.ocpdType]?.label} />
          <ResultRow label="Table 430.52 Multiplier" value={`${(mult * 100).toFixed(0)}%`} />
          <ResultRow label="Calculated Max OCPD" value={ocpdCalc.toFixed(1)} unit="A" />
          <ResultRow label="Selected Max OCPD" value={ocpdSelected} unit="A" highlight
            sub="Next standard size up per NEC 430.52(C)(1)" />
        </ResultSection>

        <ResultSection title="Overload Protection (NEC 430.32)">
          <ResultRow label="FLA Used" value={fla} unit="A"
            sub={v.nameplateFL ? "From nameplate entry" : "Using table FLC (enter nameplate FLA above for accuracy)"} />
          <ResultRow label={`Factor (${v.sfAbove115 === "yes" ? "SF≥1.15 → 115%" : "SF<1.15 → 125%"})`}
            value={`${(overloadFactor * 100).toFixed(0)}%`} />
          <ResultRow label="Max Overload Device" value={overloadMaxA.toFixed(1)} unit="A" highlight />
        </ResultSection>

        <ResultSection title="All OCPD Types — Quick Reference">
          {Object.entries(OCPD_MULT).map(([key, o]) => {
            const selected = allOCPD[key];
            return (
              <ResultRow
                key={key}
                label={o.label}
                value={selected}
                unit="A max"
                highlight={key === v.ocpdType}
                sub={`${(o.mult * 100).toFixed(0)}% × ${flc}A FLC`}
              />
            );
          
          })}
        </ResultSection>

        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => (
          <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />
        ))}
        <NoteBox>
          NEC {necYear} 430.6(A): Always use table FLC (not nameplate) for conductor and OCPD sizing. NEC 430.22: Conductors must be rated ≥ {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% of FLC. NEC 430.52(C)(1): If calculated OCPD is not a standard size, use the next larger standard size. NEC 430.32: Overload protection sized to nameplate FLA — not table FLC.
        </NoteBox>
      </div>
    }>
      <Field label="Phase">
        <Select value={v.phases} onChange={val => {
          set("phases")(val);
          const newIs3ph = val === "three";
          set("motorType")(newIs3ph ? "AC Polyphase (Other than Wound-Rotor)" : "Single-Phase");
          set("hp")(newIs3ph ? "10" : "1");
          set("voltage")(newIs3ph ? "460" : "230");
        }} options={[
          { value: "three", label: "Three-Phase (Table 430.250)" },
          { value: "single", label: "Single-Phase (Table 430.248)" },
        ]} />
      </Field>

      <Field label="Motor Type" hint="Per NEC Table 430.52 — affects OCPD multipliers and FLC table (430.250)">
        <Select value={v.motorType} onChange={val => {
          set("motorType")(val);
          const newIsSync = is3ph && val === "Synchronous";
          const newTable = newIsSync ? FLC_3PH_SYNC : (is3ph ? FLC_3PH : FLC_1PH_230);
          const validHps = Object.keys(newTable);
          const newHp = validHps.includes(v.hp) ? v.hp : validHps[0];
          set("hp")(newHp);
          const newRow = newTable[newHp] || {};
          const fallback = newIsSync ? 460 : (is3ph ? 460 : 230);
          const newVol = newRow[v.voltage] != null ? v.voltage : (newRow[fallback] != null ? String(fallback) : Object.keys(newRow)[0]);
          set("voltage")(newVol);
        }} options={motorTypeOptions} />
      </Field>

      <Field label="Motor Horsepower" unit="HP">
        <Select value={v.hp} onChange={val => {
          set("hp")(val);
          const row = flcTable[val] || {};
          const fallback = isSync ? 460 : (is3ph ? 460 : 230);
          const newVol = row[v.voltage] != null ? v.voltage : (row[fallback] != null ? String(fallback) : Object.keys(row)[0]);
          set("voltage")(newVol);
        }} options={hpOptions} />
      </Field>

      <Field label="Supply Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={voltageOptions} />
      </Field>

      <Field label="OCPD Type" hint="Per NEC Table 430.52">
        <Select value={v.ocpdType} onChange={set("ocpdType")} options={Object.entries(OCPD_MULT).map(([k, o]) => ({ value: k, label: o.label }))} />
      </Field>

      <Field label="Terminal Temperature Rating" hint="NEC 110.14(C) — limits conductor ampacity">
        <Select value={v.termRating} onChange={set("termRating")} options={[
          { value: "60", label: "60°C (residential terminals)" },
          { value: "75", label: "75°C (commercial/industrial)" },
        ]} />
      </Field>

      <Field label="Motor Service Factor" hint="Affects max overload device (NEC 430.32)">
        <Select value={v.sfAbove115} onChange={set("sfAbove115")} options={[
          { value: "yes", label: "SF ≥ 1.15 or temp rise ≤ 40°C → 115% overload" },
          { value: "no",  label: "SF < 1.15 or unlisted → 125% overload" },
        ]} />
      </Field>

      <Field label="Nameplate FLA (optional)" unit="A" hint="If entered, used for overload calc instead of table FLC">
        <NumInput value={v.nameplateFL} onChange={set("nameplateFL")} placeholder={`e.g. ${flc}`} min={0} />
      </Field>
    </CalcLayout>
  );
}