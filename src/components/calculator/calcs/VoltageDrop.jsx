import React from "react";
import { useCalculatorInputs, useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcVoltageDrop } from "./logic/voltageDropCalc";

const FORMULAS = [
  { label: "Single-Phase Voltage Drop", formula: "VD = (2 × K × I × D) / CM", description: "K = resistivity constant (12.9 Cu / 21.2 Al), I = amps, D = one-way distance (ft), CM = circular mils of conductor" },
  { label: "Three-Phase Voltage Drop", formula: "VD = (1.732 × K × I × D) / CM", description: "1.732 = √3 factor for 3-phase circuits" },
  { label: "VD Percent", formula: "VD% = (VD / V_source) × 100", description: "Compare to 3% branch, 3% feeder, 5% combined limit" },
  { label: "Min CM for 3% limit", formula: "CM_min = (2 × K × I × D) / (V × 0.03)", description: "Rearranged to find minimum wire size" },
  { label: "AC Input Amps (DC PS)", formula: "Iac = (Vdc × Idc) ÷ (Vac × Eff × PF)", description: "AC-fed DC power supply: convert DC load to AC input current before voltage drop calc" },
];

const DEFAULTS = {
  voltage: 120, current: 20, length: 100, material: "copper", phases: "single", pf: 1,
  loadType: "standard",
  acSupplyVoltage: 120, dcOutputVoltage: 48, dcOutputCurrent: 5, efficiency: 90, powerFactor: 1.0,
};

export default function VoltageDrop({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["210_19_voltage_drop", "ch9_t8_conductors", "310_15_b_16_copper", "ch9_t5_wire_area", "ch9_t5a_compact_thhn"], necYear);
  const [v, setV] = useCalculatorInputs(DEFAULTS);
  const set = (k) => (val) => setV(p => ({ ...p, [k]: val }));

  const [selectedAWG, setSelectedAWG] = useRestoredField("selectedAWG", "12");
  const r = calcVoltageDrop({ ...v, selectedAWG }, nec);
  const { K, VD, VD_pct, endV, ok3, ok5, minWire3_awg, minWire5_awg, CM_needed_3pct, effectiveCurrent, acdc, steps } = r;
  const isAcDc = v.loadType === "acdc";
  const wires = Object.entries(nec.CONDUCTOR_CM)
    .filter(([awg]) => ["14","12","10","8","6","4","3","2","1","1/0","2/0","3/0","4/0","250","300","350"].includes(awg))
    .map(([awg, cm]) => ({ awg, cm }))
    .sort((a, b) => a.cm - b.cm);

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={{ ...v, selectedAWG }} outputValues={r} result={
      <div className="space-y-2">
        {isAcDc && acdc && (
          <ResultSection title="AC-to-DC Power Conversion">
            <ResultRow label="DC Output Watts" value={acdc.dcOutputWatts} unit="W" />
            <ResultRow label="AC Input Watts" value={acdc.acInputWatts} unit="W" />
            <ResultRow label="AC Input Amps" value={acdc.acInputAmps} unit="A" highlight sub={`Eff ${acdc.efficiencyDecimal*100}%, PF ${acdc.powerFactor}`} />
          </ResultSection>
        )}
        <ResultSection title="Selected Wire Performance">
          <Field label="Check wire size" unit="">
            <Select value={selectedAWG} onChange={setSelectedAWG}
              options={wires.map(w => ({ value: w.awg, label: `#${w.awg} AWG (${w.cm.toLocaleString()} CM)` }))} />
          </Field>
          <div className="mt-3 space-y-2">
            <ResultRow label={isAcDc ? "Voltage Drop (AC side)" : "Voltage Drop"} value={VD.toFixed(2)} unit="V" highlight />
            <ResultRow label="Voltage Drop %" value={VD_pct.toFixed(2)} unit="%" highlight />
            <ResultRow label="End Voltage" value={endV.toFixed(1)} unit="V" />
            <ResultRow label="Current Used" value={effectiveCurrent} unit="A" sub={isAcDc ? "calculated AC input" : "entered amps"} />
            <ResultRow label="3% Branch Limit" value={ok3 ? "✓ PASS" : "✗ FAIL"} failed={!ok3} />
            <ResultRow label="5% Total Limit" value={ok5 ? "✓ PASS" : "✗ FAIL"} failed={!ok5} />
          </div>
        </ResultSection>
        <ResultSection title="Minimum Wire for Compliance">
          <ResultRow label="≤3% Wire Size" value={`#${minWire3_awg} AWG`} sub="NEC 210.19 recommendation" highlight />
          <ResultRow label="≤5% Wire Size" value={`#${minWire5_awg} AWG`} sub="NEC 215.2 recommendation" />
          <ResultRow label="Required CM (3%)" value={CM_needed_3pct.toFixed(0)} unit="CM" />
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          NEC {necYear} 210.19 & 215.2 recommend ≤3% voltage drop on branch circuits and ≤5% total (feeder+branch). Formula: VD = (K × I × D × 2) / CM for single-phase. K = {K} for {v.material}.
          {isAcDc && (
            <>
              <br /><br />
              <strong>Note:</strong> For AC-fed DC power supplies, voltage drop is calculated on the AC input side using AC input current ({effectiveCurrent} A), not DC output current ({v.dcOutputCurrent} A).
            </>
          )}
        </NoteBox>
      </div>
    }>
      <Field label="Load Input Type" unit="">
        <Select value={v.loadType} onChange={set("loadType")} options={[
          { value: "standard", label: "Standard Amps" },
          { value: "acdc", label: "AC to DC Power Supply" },
        ]} />
      </Field>

      {isAcDc ? (
        <>
          <Field label="AC Supply Voltage" unit="V" hint="Source voltage feeding the power supply">
            <Select value={v.acSupplyVoltage} onChange={set("acSupplyVoltage")} options={[
              { value: 120, label: "120V (1Ø)" }, { value: 208, label: "208V" },
              { value: 240, label: "240V (1Ø)" }, { value: 277, label: "277V (3Ø)" },
              { value: 480, label: "480V (3Ø)" },
            ]} />
          </Field>
          <Field label="DC Output Voltage" unit="V" hint="Voltage of the DC load (e.g. 48VDC)">
            <NumInput value={v.dcOutputVoltage} onChange={set("dcOutputVoltage")} placeholder="48" />
          </Field>
          <Field label="DC Output Current" unit="A" hint="DC load current (NOT AC input current)">
            <NumInput value={v.dcOutputCurrent} onChange={set("dcOutputCurrent")} placeholder="5" />
          </Field>
          <Field label="Power Supply Efficiency" unit="%" hint="Default 90%">
            <NumInput value={v.efficiency} onChange={set("efficiency")} placeholder="90" />
          </Field>
          <Field label="Power Factor" unit="" hint="Default 1.0 (advanced: 0.95)">
            <Select value={v.powerFactor} onChange={set("powerFactor")} options={[
              { value: 1.0, label: "1.0 (default)" },
              { value: 0.95, label: "0.95 (advanced)" },
            ]} />
          </Field>
        </>
      ) : (
        <>
          <Field label="System Voltage" unit="V">
            <Select value={v.voltage} onChange={set("voltage")} options={[
              { value: 120, label: "120V (1Ø)" }, { value: 208, label: "208V" },
              { value: 240, label: "240V (1Ø)" }, { value: 277, label: "277V (3Ø)" },
              { value: 480, label: "480V (3Ø)" },
            ]} />
          </Field>
          <Field label="Load Current" unit="Amps">
            <NumInput value={v.current} onChange={set("current")} placeholder="20" />
          </Field>
        </>
      )}

      <Field label="Phase" unit="">
        <Select value={v.phases} onChange={set("phases")} options={[
          { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" },
        ]} />
      </Field>
      <Field label="Conductor Material" unit="">
        <Select value={v.material} onChange={set("material")} options={[
          { value: "copper", label: "Copper (K=12.9)" }, { value: "aluminum", label: "Aluminum (K=21.2)" },
        ]} />
      </Field>
      <Field label="One-Way Distance" unit="ft" hint={isAcDc ? "Distance from AC source to power supply (not round-trip)" : "Distance from panel to load (not round-trip)"}>
        <NumInput value={v.length} onChange={set("length")} placeholder="100" />
      </Field>
    </CalcLayout>
  );
}