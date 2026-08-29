import React from "react";
import { useRestoredField } from "@/hooks/useCalculatorInputs";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, Select, NumInput } from "../CalcLayout";
import FormulaBox from "../FormulaBox";
import { getNecData } from "@/data/nec";
import {
  calcNeutralLoad,
  SYSTEM_TYPE_OPTIONS,
  LOAD_TYPE_OPTIONS,
  APPLIANCE_TYPE_OPTIONS,
  NEUTRAL_STUDY_VALUE_TYPE_OPTIONS,
  NEUTRAL_STUDY_SOURCE_OPTIONS,
  SYSTEM_TYPES,
} from "./logic/neutralLoadCalc";

const FORMULAS = [
  { label: "NEC Maximum Unbalanced Fundamental Load (220.61(A))", formula: "1φ: |L1 - L2| (opposing legs cancel) | 3φ: vector summation (balanced = 0)", description: "The neutral load is the maximum unbalance — the net unbalanced load between the neutral and ungrounded conductors. Reducible linear loads (linear + other reducible) are COMBINED per phase before ONE calculation. Line-to-line loads do not contribute. 220.61(A) supplies the maximum unbalanced load calculation — NOT a harmonic-current formula." },
  { label: "Nonreducible Linear Loads (220.61(A))", formula: "Phase cancellation applies; NO demand reduction", description: '"Nonreducible" means not eligible for demand reduction — NOT "noncancelling". Phase cancellation still applies.' },
  { label: "Cooking/Dryer Reduction (220.61(B)(1))", formula: "Range/dryer neutral = demand × 70%", description: "Household ranges, wall ovens, cooking units, and electric dryers at 70% of demand. This is a PERMITTED reduction, not an exact neutral current formula. Each appliance requires type, demand, connection, phase/legs, and count. Incorporation method (scalar vs. phase-total) depends on the connection." },
  { label: "Excess Over 200A (220.61(B)(2))", formula: "Final reducible amps = 200 + (excess × 70%)", description: "70% demand factor on the portion of reducible unbalanced load exceeding 200A. NOT applied to nonlinear harmonic or nonreducible portions. This is a NEC-permitted neutral demand reduction." },
  { label: "External Harmonic Neutral (NOT a 220.61 formula)", formula: "User-entered via neutral study — total RMS, harmonic-only RMS, or measured", description: "220.61(C) PROHIBITS reduction for nonlinear loads on 3φ 4W wye. It does NOT supply a formula for exact harmonic neutral current. The user must enter the neutral current from a harmonic study, equipment data, measurement, or manufacturer information. This is an EXTERNALLY determined value — NOT a 220.61 calculation." },
  { label: "RMS Combination — Final Conductor Design Current", formula: "Total RMS: final = entered value | Harmonic-only: final = sqrt(fundamental² + harmonic²)", description: "Total RMS: the entered value is treated as the complete neutral RMS current — the independently calculated NEC fundamental is NOT added again. Harmonic-only: root-sum-square (RSS) combination — NOT arithmetic sum. Individual spectrum: UNSUPPORTED (input definitions not verified)." },
];

let loadIdCounter = 100;

export default function NeutralLoad({ category, necYear = "2020" }) {
  const nec = getNecData(necYear);
  const [systemType, setSystemType] = useRestoredField("systemType", "1φ-3W 120/240V");
  const [loads, setLoads] = useRestoredField("loads", [
    { id: "l1", type: "linear_ln", va: 10000, phase: "L1" },
    { id: "l2", type: "linear_ln", va: 5000, phase: "L2" },
  ]);
  const [neutralStudy, setNeutralStudy] = useRestoredField("neutralStudy", {
    valueType: "",
    source: "",
    totalRmsA: "",
    harmonicOnlyRmsA: "",
    harmonics: { h3: "", h5: "", h7: "", h9: "", h11: "", h13: "" },
  });

  const sys = SYSTEM_TYPES[systemType];
  const is3Phase = systemType.startsWith("3φ");

  const v = { systemType, loads, neutralStudy };
  const r = calcNeutralLoad(v, nec);

  const addLoad = () => {
    const newId = "l" + (++loadIdCounter);
    setLoads(prev => [...prev, { id: newId, type: "linear_ln", va: "", phase: sys.phases[0] }]);
  };

  const removeLoad = (id) => {
    setLoads(prev => prev.filter(l => l.id !== id));
  };

  const updateLoad = (id, field, value) => {
    setLoads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const updateStudy = (field, value) => {
    setNeutralStudy(prev => ({ ...prev, [field]: value }));
  };

  const updateHarmonic = (h, value) => {
    setNeutralStudy(prev => ({ ...prev, harmonics: { ...prev.harmonics, [h]: value } }));
  };

  const isIndividualSpectrum = neutralStudy.valueType === "individual_spectrum";
  const isTotalRms = neutralStudy.valueType === "total_rms" || neutralStudy.valueType === "measured_total_rms";
  const isHarmonicOnly = neutralStudy.valueType === "harmonic_only_rms";

  return (
    <CalcLayout category={category} necYear={necYear} inputValues={v} outputValues={r} trace={r.trace} result={
      <div className="space-y-2">
        {/* Limitations */}
        {r.limitations.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold">Calculation Limitations</p>
            {r.limitations.map((lim, i) => (
              <p key={i}>⚠ {lim}</p>
            ))}
          </div>
        )}

        <ResultSection title="Four Distinguished Concepts">
          <ResultRow label="1. NEC Fundamental Neutral (220.61(A)+(B))" value={r.necFundamentalNeutral_VA} unit="VA" sub={`${r.necFundamentalNeutral_A} A — maximum unbalanced fundamental load after permitted reductions`} />
          {r.necExcessReductionApplied && (
            <ResultRow label="2. NEC-Permitted Reduction (220.61(B)(2))" value={r.necPermittedReduction_A} unit="A" sub="excess over 200A × 30% reduction" />
          )}
          {r.externalHarmonicAvailable ? (
            <ResultRow
              label="3. External Harmonic Neutral (NOT 220.61)"
              value={r.externalHarmonicNeutral_A}
              unit="A"
              sub={`${r.externalHarmonicTotalRmsDirect ? "Total RMS direct" : "Harmonic-only RMS"} — source: ${r.externalHarmonicSourceLabel}`}
            />
          ) : r.individualSpectrumUnsupported ? (
            <ResultRow label="3. External Harmonic Neutral" value="UNSUPPORTED" unit="" sub="Individual spectrum — enter total RMS instead" />
          ) : is3Phase ? (
            <ResultRow label="3. External Harmonic Neutral" value="N/A" unit="" sub="NOT AVAILABLE — enter neutral study value (220.61(C))" />
          ) : null}
          <ResultRow label="4. Final Conductor Design Current" value={r.finalConductorDesign_A} unit="A" highlight sub={r.rmsCombinationMethod} />
        </ResultSection>

        <ResultSection title="Neutral Load — Separated Components">
          <ResultRow label="Fundamental Linear Neutral" value={r.fundamentalLinearNeutral_VA} unit="VA" sub={`${r.fundamentalLinearNeutral_A} A — 220.61(A), reducible linear combined`} />
          {r.rangeDryerReductionApplied && (
            <>
              <ResultRow label="Range/Dryer Total Demand" value={r.rangeDryerTotalDemand_VA} unit="VA" sub="Tables 220.54/220.55" />
              <ResultRow label="Range/Dryer Neutral (70%)" value={r.rangeDryerNeutral_VA} unit="VA" sub={`${r.rangeDryerNeutral_A} A — 220.61(B)(1), phase-total: ${r.rangeDryerNeutralPhaseTotal} VA, scalar: ${r.rangeDryerNeutralScalar} VA`} />
            </>
          )}
          {r.nonreducibleLinearNeutral_VA > 0 && (
            <ResultRow label="Nonreducible Linear Neutral" value={r.nonreducibleLinearNeutral_VA} unit="VA" sub={`${r.nonreducibleLinearNeutral_A} A — cancellation applies, no demand reduction`} />
          )}
          {r.lineToLine_VA > 0 && (
            <ResultRow label="Line-to-Line (excluded)" value={r.lineToLine_VA} unit="VA" sub="does not contribute to neutral" />
          )}
        </ResultSection>

        <ResultSection title="Portions & Reduction">
          <ResultRow label="Reducible Portion" value={r.reducible_VA} unit="VA" sub={`${r.reducible_A} A — eligible for excess reduction`} />
          <ResultRow label="Non-Reducible Portion" value={r.nonReducible_VA} unit="VA" sub={`${r.nonReducible_A} A — no excess reduction`} />
          {r.excessReductionApplied && (
            <>
              <ResultRow label="Excess Over 200A" value={r.excessAmps} unit="A" sub="220.61(B)(2)" />
              <ResultRow label="Permitted Reduction" value={r.permittedReduction_A} unit="A" sub="excess × 30% (70% factor applied)" />
            </>
          )}
        </ResultSection>

        <ResultSection title="Final Neutral">
          <ResultRow label="Final Neutral Load" value={r.finalNeutral_VA} unit="VA" highlight />
          <ResultRow label="Final Neutral Current" value={r.finalNeutral_A} unit="A" highlight sub={`at ${r.lineToNeutralV}V line-to-neutral — ${r.rmsCombinationMethod}`} />
        </ResultSection>

        {/* Range/dryer details */}
        {r.rangeDryerDetails.length > 0 && (
          <ResultSection title="Range/Dryer Details — Incorporation Trace">
            {r.rangeDryerDetails.map((d, i) => (
              <div key={i} className="text-xs p-2 rounded-lg bg-muted/50 space-y-0.5">
                <p className="font-semibold">{d.applianceLabel} (count: {d.count})</p>
                <p>Calculated Demand: {d.demandVA} VA</p>
                <p>Permitted Neutral %: {Math.round(d.neutralPercentage * 100)}%</p>
                <p>Calculated Neutral Portion: {d.neutralVA} VA</p>
                <p>System Type: {d.systemType}</p>
                <p>Connection: {d.connection}</p>
                <p>Assigned Legs: {d.assignedLegs.join("-")}</p>
                <p>Incorporation: {d.incorporationMethod} — {d.incorporationDescription}</p>
              </div>
            ))}
            <div className="text-xs p-2 rounded-lg bg-primary/10 border border-primary/20">
              <p className="font-semibold">Resulting Maximum Unbalanced Neutral Load</p>
              <p>After incorporating all range/dryer entries: {r.reducible_VA} VA reducible + {r.nonReducible_VA} VA non-reducible = {r.necFundamentalNeutral_VA} VA NEC fundamental</p>
            </div>
          </ResultSection>
        )}

        {/* RSS components */}
        {r.externalHarmonicAvailable && !r.externalHarmonicTotalRmsDirect && r.rssComponents.length > 0 && (
          <ResultSection title="RMS Combination Trace">
            {r.rssComponents.map((c, i) => (
              <ResultRow key={i} label={c.label} value={c.amps} unit="A" />
            ))}
            <ResultRow label="sqrt(sum of squares)" value={r.finalConductorDesign_A} unit="A" highlight sub="root-sum-square — NOT arithmetic sum" />
          </ResultSection>
        )}

        <FormulaBox steps={r.steps} formulas={FORMULAS} />

        <NoteBox>
          <p className="font-bold mb-1">NEC 220.61 — Feeder or Service Neutral Load</p>
          <p className="mb-1"><strong>220.61(A) — Basic Calculation:</strong> The neutral load is the maximum unbalance. Reducible linear loads are combined per phase before one calculation. Nonreducible loads still cancel (phase cancellation applies) but receive no demand reduction. Line-to-line loads do not contribute. 220.61(A) supplies the maximum unbalanced load calculation — NOT a harmonic-current formula.</p>
          <p className="mb-1"><strong>220.61(B)(1) — Cooking/Dryer Reduction:</strong> Ranges, wall ovens, cooking units, and dryers at 70% of demand. This is a permitted reduction, not an exact neutral current formula. Incorporation method (scalar vs. phase-total) depends on the connection.</p>
          <p className="mb-1"><strong>220.61(B)(2) — Excess Over 200A:</strong> 70% on the portion exceeding 200A. Applied to reducible portion only — NOT to nonlinear harmonic or nonreducible portions. This is a NEC-permitted neutral demand reduction.</p>
          <p className="mb-1"><strong>220.61(C) — Prohibited Reductions:</strong> No reduction for nonlinear loads on 3φ 4W wye. 220.61(C) PROHIBITS reduction — it does NOT supply a formula for exact harmonic neutral current. External input required (harmonic study, equipment data, measurement, or manufacturer information).</p>
          <p className="mb-1"><strong>RMS Combination:</strong> Total RMS: entered value used directly (fundamental NOT added again). Harmonic-only: root-sum-square sqrt(fundamental² + harmonic²). Individual spectrum: UNSUPPORTED.</p>
          <p className="mt-2 text-amber-700 dark:text-amber-400">
            ⚠ Verification Status: DEFECT CORRECTED — ADDITIONAL DEFECT FOUND. Pending verification against authorized 2020 NFPA 70 text.
          </p>
        </NoteBox>
      </div>
    }>
      <Field label="System Type" hint="Select the electrical system configuration">
        <Select value={systemType} onChange={setSystemType} options={SYSTEM_TYPE_OPTIONS} />
      </Field>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Loads ({loads.length})
          </p>
          <button
            type="button"
            onClick={addLoad}
            className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
          >
            + Add Load
          </button>
        </div>

        <div className="space-y-3">
          {loads.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No loads added. Click "Add Load" to begin.
            </p>
          )}
          {loads.map((load, idx) => (
            <LoadRow
              key={load.id}
              load={load}
              index={idx}
              sys={sys}
              onChange={(field, value) => updateLoad(load.id, field, value)}
              onRemove={() => removeLoad(load.id)}
            />
          ))}
        </div>
      </div>

      {/* Neutral study input */}
      <div className="pt-3 mt-3 border-t border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Neutral Study — External Harmonic Neutral (220.61(C))
        </p>
        <div className="p-3 rounded-xl border border-border bg-card space-y-2">
          <p className="text-xs text-muted-foreground">
            NEC 220.61(C) prohibits reduction for nonlinear loads on 3φ 4W wye. It does NOT supply a formula for exact harmonic neutral current. Enter the externally determined neutral current from a harmonic study, equipment data, measurement, or manufacturer information. This is NOT a 220.61 calculation.
          </p>
          <Field label="Neutral Study Value Type">
            <Select
              value={neutralStudy.valueType}
              onChange={(val) => updateStudy("valueType", val)}
              options={[{ value: "", label: "— Select value type —" }, ...NEUTRAL_STUDY_VALUE_TYPE_OPTIONS]}
            />
          </Field>

          {isIndividualSpectrum && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300">
              ⚠ <strong>UNSUPPORTED.</strong> Individual harmonic spectrum mode: input definitions and engineering method cannot be verified. Enter a total RMS value instead.
            </div>
          )}

          {isTotalRms && (
            <>
              <Field label="Total Neutral RMS Current" unit="A" hint="Includes all fundamental and harmonic components">
                <NumInput
                  value={neutralStudy.totalRmsA}
                  onChange={(val) => updateStudy("totalRmsA", val)}
                  placeholder="e.g. 75"
                  min={0}
                />
              </Field>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                ℹ Entered value is treated as the complete neutral RMS current, including all fundamental and harmonic components. The independently calculated NEC fundamental is NOT added again.
              </p>
            </>
          )}

          {isHarmonicOnly && (
            <>
              <Field label="Harmonic-Only Neutral RMS Current" unit="A" hint="Harmonic current only — combined with NEC fundamental via RSS">
                <NumInput
                  value={neutralStudy.harmonicOnlyRmsA}
                  onChange={(val) => updateStudy("harmonicOnlyRmsA", val)}
                  placeholder="e.g. 75"
                  min={0}
                />
              </Field>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                ℹ Combined with NEC fundamental via root-sum-square: sqrt(fundamental² + harmonic²). NOT arithmetic sum.
              </p>
            </>
          )}

          {(isTotalRms || isHarmonicOnly) && (
            <Field label="Source of Value">
              <Select
                value={neutralStudy.source}
                onChange={(val) => updateStudy("source", val)}
                options={[{ value: "", label: "— Select source —" }, ...NEUTRAL_STUDY_SOURCE_OPTIONS]}
              />
            </Field>
          )}

          {!neutralStudy.valueType && is3Phase && (
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ⚠ No neutral study value entered. The calculated neutral does NOT include harmonic neutral current. A harmonic study, equipment data, or measured neutral current is required.
            </p>
          )}
        </div>
      </div>
    </CalcLayout>
  );
}

function LoadRow({ load, index, sys, onChange, onRemove }) {
  const isRangeDryer = load.type === "range_dryer";

  return (
    <div className="p-3 rounded-xl border border-border bg-card space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Load {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-destructive hover:text-destructive/80 font-medium"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Field label="Load Type">
          <Select
            value={load.type}
            onChange={(val) => onChange("type", val)}
            options={LOAD_TYPE_OPTIONS}
          />
        </Field>
        <Field label={isRangeDryer ? "Calculated Demand" : "VA"} unit="VA">
          <NumInput
            value={load.va}
            onChange={(val) => onChange("va", val)}
            placeholder="e.g. 5000"
            min={0}
          />
        </Field>
        {isRangeDryer && (
          <>
            <Field label="Appliance Type">
              <Select
                value={load.applianceType || "range"}
                onChange={(val) => onChange("applianceType", val)}
                options={APPLIANCE_TYPE_OPTIONS}
              />
            </Field>
            <Field label="Count" unit="units">
              <NumInput
                value={load.count || 1}
                onChange={(val) => onChange("count", val)}
                placeholder="1"
                min={1}
              />
            </Field>
          </>
        )}
        <Field label="Phase / Connection">
          <Select
            value={load.phase}
            onChange={(val) => onChange("phase", val)}
            options={sys.phaseOptions}
          />
        </Field>
      </div>
    </div>
  );
}