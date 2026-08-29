import React from "react";
import { useCalculatorInputs } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";
import { getTablesById } from "@/lib/necTables";
import { getNecData } from "@/data/nec";
import { calcEVCharging } from "./logic/evChargingCalc";

const FORMULAS = [
  { label: "Conductor Ampacity (NEC 625.42)", formula: "Min Conductor = EVSE Rating × 125%", description: "EVSE is a continuous load — multiplier applies to conductor and OCPD" },
  { label: "OCPD Rating", formula: "Min OCPD = EVSE Rating × 125% → next standard size", description: "Select next standard breaker size at or above the calculated minimum" },
  { label: "Total Feeder (multiple units)", formula: "Total A = Σ (EVSE_rating × 1.25 × simultaneous %)", description: "Demand management may reduce simultaneous charging percentage" },
];

export default function EVCharging({ category, necYear = "2023" }) {
  const nec = getNecData(necYear);
  const TABLES = getTablesById(["240_6_std_sizes", "310_15_b_16_copper"], necYear);

  const [v, setV] = useCalculatorInputs({
    level: "l2", voltage: 240, evseA: 32, numUnits: 1,
    demandManaged: "no", simultaneousLoad: 100,
  });
  const set = k => val => setV(p => ({ ...p, [k]: val }));

  const r = calcEVCharging(v, nec);
  const { conductorA_each, ocpd_each_A: ocpd_each, kW_each, feederAmps: feederA, totalKW, steps } = r;
  const voltage = parseFloat(v.voltage) || 240;
  const evseA = parseFloat(v.evseA) || 32;
  const numUnits = parseFloat(v.numUnits) || 1;

  // Level info
  const levelInfo = {
    l1: { label: "Level 1 (120V)", note: "~1.4 kW, adds ~4 miles/hr", typical: "12A max" },
    l2: { label: "Level 2 (240V)", note: "~7.2–19.2 kW, adds ~20–60 miles/hr", typical: "32–80A" },
    dc: { label: "DC Fast Charge", note: "50–350 kW, adds ~100+ miles/30 min", typical: "3Ø, high voltage" },
  };
  const info = levelInfo[v.level];

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        <ResultSection title={`Per EVSE Unit — NEC 625`}>
          <ResultRow label="EVSE Rating" value={evseA} unit="A" />
          <ResultRow label="Charging Power" value={kW_each.toFixed(1)} unit="kW" />
          <ResultRow label="Min Conductor (125%)" value={conductorA_each.toFixed(1)} unit="A" highlight />
          <ResultRow label="OCPD per Circuit" value={ocpd_each} unit="A" highlight />
        </ResultSection>
        <ResultSection title="Total Load — All Units">
          <ResultRow label="Number of EVSE Units" value={numUnits} />
          <ResultRow label={`Total Feeder Ampacity${v.demandManaged === "yes" ? " (managed)" : ""}`}
            value={feederA.toFixed(1)} unit="A" highlight />
          <ResultRow label="Total Load" value={totalKW.toFixed(1)} unit="kW" />
          {v.demandManaged === "yes" && (
            <ResultRow label="Simultaneous Load" value={`${v.simultaneousLoad}%`} sub="Per demand management setting" />
          )}
        </ResultSection>
        <ResultSection title={`NEC ${necYear} Requirements`}>
          <ResultRow label="GFCI Protection" value={nec.EV_GFCI_REQUIRED ? "Required (625.54)" : "Not required"} />
          <ResultRow label="Minimum Load per EVSE" value={nec.EV_MINIMUM_LOAD_VA > 0 ? `${nec.EV_MINIMUM_LOAD_VA}VA` : "None (use nameplate)"} sub="NEC 625.42" />
          {nec.DWELLING_SPD_REQUIRED !== undefined && (
            <ResultRow label="SPD Required (Dwelling)" value={nec.DWELLING_SPD_REQUIRED ? "Yes (230.67)" : "No"} />
          )}
          {nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED !== undefined && (
            <ResultRow label="Outdoor Disconnect" value={nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED ? "Required (230.85)" : "Not required"} />
          )}
        </ResultSection>
        <ResultSection title="Info">
          <div className="px-3 py-2 bg-muted/50 rounded text-xs space-y-1">
            <p className="font-semibold">{info.label}</p>
            <p className="text-muted-foreground">{info.note}</p>
            <p className="text-muted-foreground">Typical: {info.typical}</p>
          </div>
        </ResultSection>
        <FormulaBox steps={steps} formulas={FORMULAS} />
        {TABLES.map(t => <NECTableDisplay key={t.id} title={t.article + " — " + t.title} headers={t.headers} rows={t.rows} note={t.note} compact />)}
        <NoteBox>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>NEC {necYear} 625.42: EVSE branch circuits are continuous loads — conductor and OCPD rated at 125% of nameplate.</li>
            <li>NEC 625.54 — GFCI:{" "}
              {nec.EV_GFCI_REQUIRED
                ? "required for Level 1 and Level 2 EVSE outlet and hardwired installations."
                : "not broadly required for EVSE by this edition's model."}</li>
            {nec.EV_MINIMUM_LOAD_VA > 0 && (
              <li>NEC 625.42: minimum {nec.EV_MINIMUM_LOAD_VA}VA load per EVSE circuit applies.</li>
            )}
            {nec.DWELLING_SPD_REQUIRED && (
              <li>NEC 230.67: Surge Protective Device (SPD) required for dwelling unit services.</li>
            )}
            {nec.DWELLING_OUTDOOR_DISCONNECT_REQUIRED && (
              <li>NEC 230.85: Emergency disconnect required for one- and two-family dwelling outdoor locations.</li>
            )}
            <li>Numeric conductor/OCPD results may remain unchanged across NEC editions when the 125% multiplier and standard OCPD table are unchanged.</li>
          </ul>
        </NoteBox>
      </div>
    }>
      <Field label="Charger Level">
        <Select value={v.level} onChange={set("level")} options={[
          { value: "l1", label: "Level 1 — 120V" },
          { value: "l2", label: "Level 2 — 240V" },
          { value: "dc", label: "DC Fast Charge" },
        ]} />
      </Field>
      <Field label="EVSE Voltage">
        <Select value={v.voltage} onChange={set("voltage")} options={[
          { value: 120, label: "120V" }, { value: 208, label: "208V" }, { value: 240, label: "240V" },
          { value: 480, label: "480V (DC Fast)" },
        ]} />
      </Field>
      <Field label="EVSE Ampere Rating" unit="A" hint="Per-unit nameplate rating">
        <NumInput value={v.evseA} onChange={set("evseA")} placeholder="32" />
      </Field>
      <Field label="Number of EVSE Units"><NumInput value={v.numUnits} onChange={set("numUnits")} placeholder="1" min={1} /></Field>
      <Field label="Demand Management?">
        <Select value={v.demandManaged} onChange={set("demandManaged")} options={[
          { value: "no", label: "No — full simultaneous load" },
          { value: "yes", label: "Yes — managed charging" },
        ]} />
      </Field>
      {v.demandManaged === "yes" && (
        <Field label="Simultaneous Load" unit="%" hint="% of units charging at once">
          <NumInput value={v.simultaneousLoad} onChange={set("simultaneousLoad")} placeholder="100" min={10} max={100} />
        </Field>
      )}
    </CalcLayout>
  );
}