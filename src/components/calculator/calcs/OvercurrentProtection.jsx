import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";

const FORMULAS = [
  { label: "OCPD for Continuous Load (NEC 210.20)", formula: "Min OCPD = (Continuous × 1.25) + Noncontinuous", description: "Continuous load = 3+ hours of operation" },
  { label: "Round Up Rule (NEC 240.4(B))", formula: "Next standard size up is permitted if conductor ampacity is not a standard size", description: "Exception: small conductor limits per NEC 240.4(D) — cannot exceed these" },
];
import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { getNecData } from "@/data/nec";
import { calcOvercurrentProtection } from "./logic/overcurrentProtectionCalc";

export default function OvercurrentProtection({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["240_6_std_sizes", "310_15_b_16_copper"], necYear);
  const [v, setV] = useCalculatorInputs({ conductorAmpacity: 65, isContinuous: false, continuousLoad: 50, noncontinuousLoad: 15, awg: "large", allowNextUp: true });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcOvercurrentProtection(v, nec);
  const { exactMatch, nextSizeUp, nextSizeDown, recommendedOCPD, requiredOCPD, smallCondMax, continuousPass, nextUpBlocked, steps } = r;
  const ampacity = parseFloat(v.conductorAmpacity) || 65;
  const contLoad = parseFloat(v.continuousLoad) || 0;
  const nonContLoad = parseFloat(v.noncontinuousLoad) || 0;

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} result={
      <div className="space-y-2">
        <ResultSection title="Conductor Protection (NEC 240.4)">
          <ResultRow label="Conductor Ampacity" value={ampacity} unit="A" />
          <ResultRow label="Exact Standard Size Match" value={exactMatch ? `${exactMatch}A` : "None"} />
          <ResultRow label="Next Size Down" value={`${nextSizeDown}A`} />
          <ResultRow label="Next Size Up (if allowed)" value={nextSizeUp ? `${nextSizeUp}A` : "N/A"} />
          {nextUpBlocked && <ResultRow label="Next Size Up Blocked" value="≥ 800A — 240.4(B)" highlight sub="Next size up not permitted for ampacity ≥ 800A" />}
          <ResultRow label="Recommended OCPD" value={`${recommendedOCPD}A`} highlight />
        </ResultSection>
        {v.isContinuous && (
          <ResultSection title="Continuous Load Rule (NEC 210.20)">
            <ResultRow label={`Continuous Load × ${(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}%`} value={(contLoad * nec.CONTINUOUS_LOAD_MULTIPLIER).toFixed(1)} unit="A" />
            <ResultRow label="Noncontinuous Load" value={nonContLoad.toFixed(1)} unit="A" />
            <ResultRow label="Minimum OCPD for Loads" value={requiredOCPD.toFixed(1)} unit="A" highlight />
            <ResultRow label="Compliance" value={continuousPass ? "✓ PASS" : "✗ FAIL — OCPD too small"} highlight={!continuousPass} />
          </ResultSection>
        )}
        {smallCondMax && (
          <ResultSection title="Small Conductor Override (NEC 240.4(D))">
            <ResultRow label={`Max OCPD for #${v.awg} AWG`} value={`${smallCondMax}A`} highlight
              sub="NEC 240.4(D) overrides standard sizing" />
          </ResultSection>
        )}
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        {r.arc_energy_reduction_applies && (
          <ResultSection title="Arc Energy Reduction (NEC 240.67 / 240.87)">
            <ResultRow label={`OCPD ≥ ${nec.ARC_ENERGY_REDUCTION_THRESHOLD_AMPS}A`} value="Arc energy reduction required" highlight
              sub="Fuses (240.67) and circuit breakers (240.87) rated 1200A+" />
          </ResultSection>
        )}
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 240.4(B): If conductor ampacity doesn't match a standard OCPD size, the next higher size may be used (unless ≥ 800A). NEC 240.4(D): {nec.SMALL_CONDUCTOR_MAX_OCPD ? Object.entries(nec.SMALL_CONDUCTOR_MAX_OCPD).map(([awg, max]) => `#${awg} max ${max}A`).join(", ") : ""}. NEC 210.20: OCPD ≥ {(nec.CONTINUOUS_LOAD_MULTIPLIER * 100).toFixed(0)}% of continuous loads.</li>
            {nec.ARC_ENERGY_REDUCTION_NOTE && <li><strong>240.67/240.87 ({necYear}):</strong> {nec.ARC_ENERGY_REDUCTION_NOTE}</li>}
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Conductor Ampacity" unit="A" hint={`From NEC ${nec.AMPACITY_TABLE || "Table 310.15(B)(16)"}`}>
        <NumInput value={v.conductorAmpacity} onChange={set("conductorAmpacity")} placeholder="65" />
      </Field>
      <Field label="Small Conductor Override">
        <Select value={v.awg} onChange={set("awg")} options={[
          { value: "large", label: "Larger than #10 AWG" },
          { value: "10", label: "#10 AWG (max 30A)" },
          { value: "12", label: "#12 AWG (max 20A)" },
          { value: "14", label: "#14 AWG (max 15A)" },
        ]} />
      </Field>
      <Field label="Has Continuous Loads?">
        <Select value={v.isContinuous} onChange={val => setV(p => ({ ...p, isContinuous: val === "true" }))} options={[
          { value: "false", label: "No" }, { value: "true", label: "Yes" }
        ]} />
      </Field>
      {v.isContinuous && (
        <>
          <Field label="Continuous Load" unit="A" hint="Load operating ≥3 hrs continuously">
            <NumInput value={v.continuousLoad} onChange={set("continuousLoad")} placeholder="50" />
          </Field>
          <Field label="Noncontinuous Load" unit="A">
            <NumInput value={v.noncontinuousLoad} onChange={set("noncontinuousLoad")} placeholder="15" />
          </Field>
        </>
      )}
      <Field label="Allow Next Size Up? (NEC 240.4(B))">
        <Select value={v.allowNextUp} onChange={val => setV(p => ({ ...p, allowNextUp: val === "true" }))} options={[
          { value: "true", label: "Yes (allowed per NEC)" }, { value: "false", label: "No (use next size down)" }
        ]} />
      </Field>
    </CalcLayout>
  );
}