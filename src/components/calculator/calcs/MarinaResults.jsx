import React from "react";
import { ResultRow, ResultSection, NoteBox } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import NECTableDisplay from "../NECTableDisplay";

export default function MarinaResults({ r, necYear, tempRating, material, length, demandTable }) {
  const phaseLabels = r.phaseCurrents.length === 3 ? ["A", "B", "C"] : ["L1", "L2"];

  return (
    <div className="space-y-2">
      <ResultSection title="Connected Shore Power Load">
        {r.receptacleSummary.map((rec, i) => (
          <ResultRow key={i} label={`${rec.rating} × ${rec.quantity}`} value={rec.totalVA.toLocaleString()} unit="VA"
            sub={`${rec.amps}A @ ${rec.voltage}V · ${rec.slip} · ${rec.feeder} · ${rec.panel}`} />
        ))}
        <ResultRow label="Total Connected Shore Power" value={r.totalConnectedReceptacles.toLocaleString()} unit="VA" highlight />
        <ResultRow label="Total Receptacle Count" value={r.totalReceptacleCount} unit="receptacles" />
      </ResultSection>

      <ResultSection title={`Demand Factor (${r.demandTableRef || "Table 555.12"})`}>
        <ResultRow label="Demand Factor" value={r.demandFactorPct} unit="%" highlight sub={`${r.demandTableRef || "Table 555.12"} → ${r.totalReceptacleCount} receptacles`} />
        <ResultRow label="Shore Power Demand Load" value={r.demandLoadShore.toLocaleString()} unit="VA" highlight />
      </ResultSection>

      <ResultSection title="Additional Marina Loads">
        {r.additionalLoads.map((l, i) => (
          <ResultRow key={i} label={l.label} value={l.va.toLocaleString()} unit="VA" sub={l.detail} />
        ))}
        <ResultRow label="Total Additional Loads" value={r.totalAdditional.toLocaleString()} unit="VA" />
      </ResultSection>

      <ResultSection title="Service Sizing">
        <ResultRow label="Total Service Load" value={r.totalServiceVA.toLocaleString()} unit="VA" highlight />
        <ResultRow label="Calculated Current" value={r.totalA} unit="A" highlight />
        <ResultRow label="Minimum Standard Service" value={r.minService} unit="A" highlight sub="Next standard size ≥ amps" />
      </ResultSection>

      {r.transformer && (
        <ResultSection title="Transformer Sizing (450.3)">
          <ResultRow label="Transformer Size" value={r.transformer.kVA} unit="kVA" highlight sub={`Required: ${r.transformer.requiredKVA} kVA`} />
          <ResultRow label="Primary FLC" value={r.transformer.primaryFLC} unit="A" />
          <ResultRow label="Secondary FLC" value={r.transformer.secondaryFLC} unit="A" />
          <ResultRow label="Primary OCPD" value={r.transformer.primaryOCPD} unit="A" sub="Table 450.3(B) — 125% of FLC" />
          <ResultRow label="Secondary OCPD" value={r.transformer.secondaryOCPD} unit="A" sub="Table 450.3(B) — 125% of FLC" />
        </ResultSection>
      )}

      <ResultSection title="Conductor & Equipment Ground">
        <ResultRow label={`Recommended Conductor (${tempRating}°C)`} value={`#${r.conductorAWG} AWG`} sub={`${material === "copper" ? "Copper" : "Aluminum"} · ${r.conductorAmpacity} A ampacity`} highlight />
        <ResultRow label="Equipment Grounding Conductor" value={`#${r.egcAWG} AWG`} sub={`Table 250.122 @ ${r.minService} A OCPD`} />
      </ResultSection>

      {r.vdV != null && (
        <ResultSection title="Voltage Drop">
          <ResultRow label="Voltage Drop" value={r.vdV} unit="V" sub={`${length} ft feeder`} failed={!r.vdOk} />
          <ResultRow label="Voltage Drop %" value={r.vdPct} unit="%" failed={!r.vdOk} />
          <ResultRow label="End-of-Line Voltage" value={r.endV} unit="V" failed={!r.vdOk} />
        </ResultSection>
      )}

      <ResultSection title="Phase Loading">
        {r.phaseCurrents.map((c, i) => (
          <ResultRow key={i} label={`Phase ${phaseLabels[i]}`} value={c} unit="A" />
        ))}
        <ResultRow label="Phase Imbalance" value={r.phaseImbalance} unit="%" failed={r.phaseImbalance > 10} />
      </ResultSection>

      {r.dockSummary && r.dockSummary.length > 0 && (
        <ResultSection title="Per-Dock Breakdown">
          {r.dockSummary.map((d, i) => (
            <ResultRow key={i} label={d.dock} value={d.totalVA.toLocaleString()} unit="VA"
              sub={`${d.receptacleCount} receptacles · DF ${d.demandFactorPct}% → ${d.demandLoadVA.toLocaleString()} VA demand`} />
          ))}
        </ResultSection>
      )}

      {r.feederSummary.length > 0 && (
        <ResultSection title="Feeder Summary">
          {r.feederSummary.map((f, i) => (
            <ResultRow key={i} label={f.feeder} value={f.totalVA.toLocaleString()} unit="VA" sub={`${f.receptacleCount} receptacles`} />
          ))}
        </ResultSection>
      )}

      {r.panelSummary.length > 0 && (
        <ResultSection title="Panel Summary">
          {r.panelSummary.map((p, i) => (
            <ResultRow key={i} label={p.panel} value={p.totalVA.toLocaleString()} unit="VA" sub={`${p.receptacleCount} receptacles`} />
          ))}
        </ResultSection>
      )}

      <FormulaBox steps={r.steps} formulas={[
        { label: "Connected Load (NEC 555.11)", formula: "VA = Σ (receptacle count × amps × voltage)", description: "Each receptacle VA = amps × nominal voltage" },
        { label: `Demand Factor (NEC ${r.demandTableRef || "Table 555.12"})`, formula: `DF = ${r.demandTableRef || "Table 555.12"} lookup by total receptacle count`, description: "Demand factors range from 100% (1–4) to 30% (71+)" },
        { label: "Demand Load", formula: "VA = total connected × DF", description: "Apply demand factor to sum of receptacle ratings" },
        { label: "Total Service Load", formula: "VA = shore power demand + additional loads", description: "Additional loads sized separately per NEC 220" },
        { label: "Service Current", formula: "I = VA ÷ (V × √3) [3Ø] or VA ÷ V [1Ø]", description: "Convert total VA to amps" },
      ]} />

      {demandTable && <NECTableDisplay title={`${demandTable.article} — ${demandTable.title}`} headers={demandTable.headers} rows={demandTable.rows} note={demandTable.note} compact />}

      <NoteBox>
        NEC {necYear} Article 555: Marina shore power demand factors from {r.demandTableRef || "Table 555.12"}. Demand factors are applied to the sum of the ratings of all shore power receptacles based on total receptacle count. Note 1: Where two receptacles for an individual slip have different ratings, demand factors apply to the sum. Note 2: Where two or more receptacles supply an individual slip, demand factors apply to the sum at that slip. Receptacle ratings per NEC 555.11. Additional marina loads (office, fuel dock, lighting, etc.) are calculated separately using existing production calculators (motor branch circuit, HVAC, lighting load) and added at 100%. Voltage drop, EGC sizing, conductor ampacity, and transformer sizing reuse existing production engines.
      </NoteBox>
    </div>
  );
}