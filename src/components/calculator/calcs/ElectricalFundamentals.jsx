import React, { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Lightbulb, Plus, Trash2, Zap } from "lucide-react";
import FormulaBox from "../FormulaBox";
import { CalcLayout, Field, ResultRow, ResultSection, NoteBox, NumInput, Select } from "../CalcLayout";
import { solveOhmsLaw, calcSeriesCircuit, calcParallelCircuit, calcAcPower } from "./logic/electricalFundamentalsCalc";

const FORMULA_GROUPS = {
  V: {
    title: "Voltage — E or V",
    unit: "volts (V)",
    formulas: ["E = I × R", "E = P ÷ I", "E = √(P × R)"],
  },
  I: {
    title: "Current — I",
    unit: "amperes (A)",
    formulas: ["I = E ÷ R", "I = P ÷ E", "I = √(P ÷ R)"],
  },
  R: {
    title: "Resistance — R",
    unit: "ohms (Ω)",
    formulas: ["R = E ÷ I", "R = E² ÷ P", "R = P ÷ I²"],
  },
  P: {
    title: "Power — P",
    unit: "watts (W)",
    formulas: ["P = E × I", "P = I² × R", "P = E² ÷ R"],
  },
};

const NEC_APPLICATIONS = [
  ["Article 100", "Definitions and terminology used throughout the NEC."],
  ["110", "General requirements for electrical installations and equipment."],
  ["210", "Branch circuits — calculated current may be used when applying branch-circuit requirements."],
  ["215", "Feeders — calculated current and load values may be used in feeder design."],
  ["220", "Load calculations — NEC demand and load rules are separate from the theory formulas on this page."],
  ["240", "Overcurrent protection — calculated current may be used when selecting protection under the applicable rule."],
  ["310", "Conductors — ampacity and conductor sizing remain subject to NEC conductor rules."],
  ["430", "Motors — motor calculations use special NEC rules in addition to basic electrical theory."],
  ["450", "Transformers — transformer sizing and protection use specific NEC requirements."],
  ["460", "Capacitors — power-factor correction uses additional NEC requirements."],
];

function fmt(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function FormulaWheel({ selected, onSelect }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <div className="text-center mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ohm's Law & Power Formula Wheel</p>
        <p className="text-[10px] text-muted-foreground mt-1">Tap the quantity you want to solve for.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(FORMULA_GROUPS).map(([key, group]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={[
              "rounded-xl border p-3 text-left transition-all",
              selected === key
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-sm"
                : "border-border bg-card hover:border-blue-300"
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-300">{key === "V" ? "E / V" : key}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{group.unit}</span>
            </div>
            <p className="text-xs font-bold mt-1">{group.title}</p>
            <div className="mt-2 space-y-1 font-mono text-[11px]">
              {group.formulas.map(f => <div key={f}>{f}</div>)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LearningCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-blue-600" />
        <p className="text-xs font-black uppercase tracking-wide">{title}</p>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function ResistorInputs({ resistors, setResistors }) {
  const update = (index, value) => {
    setResistors(prev => prev.map((r, i) => i === index ? value : r));
  };
  const remove = (index) => {
    setResistors(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };
  return (
    <div className="space-y-2">
      {resistors.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-8 text-xs font-bold text-muted-foreground">R{i + 1}</span>
          <div className="flex-1">
            <NumInput value={r} onChange={value => update(i, value)} placeholder="10" min={0.01} />
          </div>
          <span className="text-xs text-muted-foreground">Ω</span>
          <button type="button" onClick={() => remove(i)} className="h-11 w-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted" aria-label={`Remove resistor ${i + 1}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setResistors(prev => prev.length >= 12 ? prev : [...prev, "10"])}
        className="w-full h-11 rounded-xl border border-dashed border-blue-300 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30"
      >
        <Plus className="w-4 h-4" /> Add resistor
      </button>
    </div>
  );
}

export default function ElectricalFundamentals({ category, necYear = "2023" }) {
  const [lesson, setLesson] = useState("ohms");
  const [solveFor, setSolveFor] = useState("I");
  const [formula, setFormula] = useState("V_R");
  const [a, setA] = useState("120");
  const [b, setB] = useState("12");
  const [sourceVoltage, setSourceVoltage] = useState("120");
  const [resistors, setResistors] = useState(["10", "20", "30"]);
  const [acSystem, setAcSystem] = useState("single");
  const [acVoltage, setAcVoltage] = useState("120");
  const [acCurrent, setAcCurrent] = useState("10");
  const [pf, setPf] = useState("0.8");

  const ohm = useMemo(() => solveOhmsLaw({ solveFor, formula, a, b }), [solveFor, formula, a, b]);
  const series = useMemo(() => calcSeriesCircuit({ voltage: sourceVoltage, resistors }), [sourceVoltage, resistors]);
  const parallel = useMemo(() => calcParallelCircuit({ voltage: sourceVoltage, resistors }), [sourceVoltage, resistors]);
  const ac = useMemo(() => calcAcPower({ system: acSystem, voltage: acVoltage, current: acCurrent, powerFactor: pf }), [acSystem, acVoltage, acCurrent, pf]);

  const formulaOptions = useMemo(() => ({
    I: [
      { value: "V_R", label: "Voltage + Resistance → Current" },
      { value: "P_V", label: "Power + Voltage → Current" },
      { value: "P_R", label: "Power + Resistance → Current" },
    ],
    V: [
      { value: "I_R", label: "Current + Resistance → Voltage" },
      { value: "P_I", label: "Power + Current → Voltage" },
      { value: "P_R", label: "Power + Resistance → Voltage" },
    ],
    R: [
      { value: "V_I", label: "Voltage + Current → Resistance" },
      { value: "V_P", label: "Voltage + Power → Resistance" },
      { value: "P_I", label: "Power + Current → Resistance" },
    ],
    P: [
      { value: "V_I", label: "Voltage + Current → Power" },
      { value: "I_R", label: "Current + Resistance → Power" },
      { value: "V_R", label: "Voltage + Resistance → Power" },
    ],
  }), []);

  const labelsByFormula = {
    I: { V_R: ["Voltage", "Resistance"], P_V: ["Power", "Voltage"], P_R: ["Power", "Resistance"] },
    V: { I_R: ["Current", "Resistance"], P_I: ["Power", "Current"], P_R: ["Power", "Resistance"] },
    R: { V_I: ["Voltage", "Current"], V_P: ["Voltage", "Power"], P_I: ["Power", "Current"] },
    P: { V_I: ["Voltage", "Current"], I_R: ["Current", "Resistance"], V_R: ["Voltage", "Resistance"] },
  };
  const units = { Voltage: "V", Current: "A", Resistance: "Ω", Power: "W" };
  const inputLabels = labelsByFormula[solveFor][formula] || ["Value 1", "Value 2"];

  const ohmSteps = [
    { label: "Identify the unknown", formula: `Solve for ${solveFor === "V" ? "E / V" : solveFor}`, expression: `${FORMULA_GROUPS[solveFor].title}`, result: "Selected" },
    { label: "Select the formula", formula: ohm.formulaText, expression: ohm.formulaText, result: "Correct formula" },
    { label: "Substitute known values", formula: ohm.formulaText, expression: ohm.substitution, result: "Substituted" },
    { label: "Solve", formula: ohm.formulaText, expression: ohm.substitution, result: solveFor === "V" ? fmt(ohm.V) : solveFor === "I" ? fmt(ohm.I) : solveFor === "R" ? fmt(ohm.R) : fmt(ohm.P), unit: solveFor === "V" ? "V" : solveFor === "I" ? "A" : solveFor === "R" ? "Ω" : "W" },
  ];

  const inputValues = lesson === "ohms"
    ? { lesson, solveFor, formula, a, b }
    : lesson === "ac"
      ? { lesson, system: acSystem, voltage: acVoltage, current: acCurrent, powerFactor: pf }
      : { lesson, voltage: sourceVoltage, resistors };

  const outputValues = lesson === "ohms" ? ohm : lesson === "series" ? series : lesson === "parallel" ? parallel : ac;

  const result = (
    <div className="space-y-3">
      {lesson === "ohms" && (
        <>
          <FormulaWheel selected={solveFor} onSelect={(key) => {
            setSolveFor(key);
            setFormula(formulaOptions[key][0].value);
          }} />
          <ResultSection title="Solved Values">
            <ResultRow label="Voltage (E / V)" value={fmt(ohm.V)} unit="V" highlight={solveFor === "V"} />
            <ResultRow label="Current (I)" value={fmt(ohm.I)} unit="A" highlight={solveFor === "I"} />
            <ResultRow label="Resistance (R)" value={fmt(ohm.R)} unit="Ω" highlight={solveFor === "R"} />
            <ResultRow label="Power (P)" value={fmt(ohm.P)} unit="W" highlight={solveFor === "P"} />
          </ResultSection>
          <FormulaBox steps={ohmSteps} formulas={Object.entries(FORMULA_GROUPS).flatMap(([key, group]) => group.formulas.map((f, i) => ({ label: `${key} formula ${i + 1}`, formula: f })))} />
          <div className="grid sm:grid-cols-2 gap-2">
            <LearningCard icon={BookOpen} title="School notation">
              Many electrical courses use <strong>E</strong> for voltage (electromotive force). In the field you will also see <strong>V</strong>. In this calculator, E and V mean voltage.
            </LearningCard>
            <LearningCard icon={CheckCircle2} title="Check your work">
              Recalculate using another valid relationship. Example: after finding I, verify that E = I × R and confirm the original voltage is reproduced.
            </LearningCard>
          </div>
        </>
      )}

      {lesson === "series" && (
        <>
          <ResultSection title="Series Circuit Results">
            <ResultRow label="Total Resistance" value={fmt(series.totalR)} unit="Ω" highlight />
            <ResultRow label="Circuit Current" value={fmt(series.current)} unit="A" highlight />
            <ResultRow label="Total Power" value={fmt(series.totalP)} unit="W" />
            <ResultRow label="Voltage Check" value={fmt(series.voltageCheck)} unit="V" sub="Individual voltage drops should add to source voltage." />
          </ResultSection>
          <div className="space-y-1.5">
            {series.branches.map(row => (
              <ResultRow key={row.index} label={`R${row.index}: ${fmt(row.R)} Ω`} value={`${fmt(row.V)} V • ${fmt(row.I)} A • ${fmt(row.P)} W`} />
            ))}
          </div>
          <FormulaBox
            steps={[
              { label: "Add all resistances", formula: "Rₜ = R₁ + R₂ + ...", expression: resistors.map(r => Number(r) || 0).join(" + "), result: fmt(series.totalR), unit: "Ω" },
              { label: "Find circuit current", formula: "I = E ÷ Rₜ", expression: `${fmt(series.voltage)} ÷ ${fmt(series.totalR)}`, result: fmt(series.current), unit: "A" },
              { label: "Find each voltage drop", formula: "Vₙ = I × Rₙ", expression: "Use the same current through every series component", result: fmt(series.voltageCheck), unit: "V total" },
            ]}
            formulas={[
              { label: "Total resistance", formula: "Rₜ = R₁ + R₂ + R₃ + ..." },
              { label: "Circuit current", formula: "I = E ÷ Rₜ" },
              { label: "Voltage drop", formula: "Vₙ = I × Rₙ" },
              { label: "Kirchhoff voltage check", formula: "Eₛ = V₁ + V₂ + V₃ + ..." },
            ]}
          />
          <LearningCard icon={Lightbulb} title="What to remember">
            A series circuit has one current path. Current is the same through every component, resistance adds, and the individual voltage drops add up to the source voltage.
          </LearningCard>
        </>
      )}

      {lesson === "parallel" && (
        <>
          <ResultSection title="Parallel Circuit Results">
            <ResultRow label="Equivalent Resistance" value={fmt(parallel.totalR)} unit="Ω" highlight />
            <ResultRow label="Total Current" value={fmt(parallel.totalI)} unit="A" highlight />
            <ResultRow label="Total Power" value={fmt(parallel.totalP)} unit="W" />
          </ResultSection>
          <div className="space-y-1.5">
            {parallel.branches.map(row => (
              <ResultRow key={row.index} label={`Branch ${row.index}: ${fmt(row.R)} Ω`} value={`${fmt(row.V)} V • ${fmt(row.I)} A • ${fmt(row.P)} W`} />
            ))}
          </div>
          <FormulaBox
            steps={[
              { label: "Find equivalent resistance", formula: "1/Rₜ = 1/R₁ + 1/R₂ + ...", expression: resistors.map(r => `1/${Number(r) || 0}`).join(" + "), result: fmt(parallel.totalR), unit: "Ω" },
              { label: "Find each branch current", formula: "Iₙ = E ÷ Rₙ", expression: "Source voltage is across every branch", result: fmt(parallel.totalI), unit: "A total" },
              { label: "Check total current", formula: "Iₜ = I₁ + I₂ + I₃ + ...", expression: "Add all branch currents", result: fmt(parallel.currentCheck), unit: "A" },
            ]}
            formulas={[
              { label: "Equivalent resistance", formula: "1/Rₜ = 1/R₁ + 1/R₂ + 1/R₃ + ..." },
              { label: "Branch current", formula: "Iₙ = E ÷ Rₙ" },
              { label: "Kirchhoff current check", formula: "Iₜ = I₁ + I₂ + I₃ + ..." },
            ]}
          />
          <LearningCard icon={Lightbulb} title="What to remember">
            Every parallel branch has the same source voltage. Branch currents depend on branch resistance, and the total current equals the sum of all branch currents.
          </LearningCard>
        </>
      )}

      {lesson === "ac" && (
        <>
          <ResultSection title="AC Power Triangle">
            <ResultRow label="Apparent Power (S)" value={fmt(ac.VA)} unit="VA" highlight />
            <ResultRow label="Real Power (P)" value={fmt(ac.W)} unit="W" highlight />
            <ResultRow label="Reactive Power (Q)" value={fmt(ac.VAR)} unit="VAR" />
            <ResultRow label="Power Factor" value={fmt(ac.PF, 3)} />
            <ResultRow label="Phase Angle" value={fmt(ac.angleDeg)} unit="°" />
          </ResultSection>
          <FormulaBox
            steps={[
              { label: "Apparent power", formula: ac.system === "three" ? "S = √3 × V × I" : "S = V × I", expression: ac.system === "three" ? `√3 × ${fmt(ac.V)} × ${fmt(ac.I)}` : `${fmt(ac.V)} × ${fmt(ac.I)}`, result: fmt(ac.VA), unit: "VA" },
              { label: "Real power", formula: "P = S × PF", expression: `${fmt(ac.VA)} × ${fmt(ac.PF, 3)}`, result: fmt(ac.W), unit: "W" },
              { label: "Reactive power", formula: "Q = √(S² − P²)", expression: `√(${fmt(ac.VA)}² − ${fmt(ac.W)}²)`, result: fmt(ac.VAR), unit: "VAR" },
              { label: "Power factor angle", formula: "θ = arccos(PF)", expression: `arccos(${fmt(ac.PF, 3)})`, result: fmt(ac.angleDeg), unit: "°" },
            ]}
            formulas={[
              { label: "Single-phase VA", formula: "S = V × I" },
              { label: "Three-phase VA", formula: "S = √3 × V × I" },
              { label: "Real power", formula: "P = S × PF" },
              { label: "Reactive power", formula: "Q = √(S² − P²)" },
              { label: "Power factor", formula: "PF = P ÷ S" },
            ]}
          />
          <LearningCard icon={BookOpen} title="VA vs W vs VAR">
            <strong>VA</strong> is apparent power, <strong>W</strong> is real power that performs useful work, and <strong>VAR</strong> is reactive power exchanged with magnetic or electric fields. Power factor describes how much apparent power becomes real power.
          </LearningCard>
        </>
      )}

      <NoteBox title="Electrical Theory & NEC Application">
        <p className="mb-2"><strong>The formulas on this calculator are electrical-theory relationships, not NEC formulas.</strong> The NEC governs how calculated values are applied to real installations.</p>
        <div className="space-y-1.5">
          {NEC_APPLICATIONS.map(([article, text]) => (
            <div key={article}><strong>NEC {necYear} {article}:</strong> {text}</div>
          ))}
        </div>
        <p className="mt-2">Always apply the selected NEC edition, local amendments, equipment instructions, and AHJ requirements before installation.</p>
      </NoteBox>
    </div>
  );

  return (
    <CalcLayout
      category={category}
      necYear={necYear}
      inputValues={inputValues}
      outputValues={outputValues}
      result={result}
    >
      <Field label="Learning Module">
        <Select value={lesson} onChange={setLesson} options={[
          { value: "ohms", label: "Level 1 — Ohm's Law & Power" },
          { value: "series", label: "Level 2 — Series Circuits" },
          { value: "parallel", label: "Level 3 — Parallel Circuits" },
          { value: "ac", label: "Level 4 — AC Power Fundamentals" },
        ]} />
      </Field>

      {lesson === "ohms" && (
        <>
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2"><Zap className="w-4 h-4" /> Start here: What are you solving for?</p>
            <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-1">Choose the unknown, then choose the two values you already know.</p>
          </div>
          <Field label="Solve For">
            <Select value={solveFor} onChange={(value) => {
              setSolveFor(value);
              setFormula(formulaOptions[value][0].value);
            }} options={[
              { value: "I", label: "Current — I (amperes)" },
              { value: "V", label: "Voltage — E / V (volts)" },
              { value: "R", label: "Resistance — R (ohms)" },
              { value: "P", label: "Power — P (watts)" },
            ]} />
          </Field>
          <Field label="Values You Know">
            <Select value={formula} onChange={setFormula} options={formulaOptions[solveFor]} />
          </Field>
          <Field label={inputLabels[0]} unit={units[inputLabels[0]]}>
            <NumInput value={a} onChange={setA} min={0} />
          </Field>
          <Field label={inputLabels[1]} unit={units[inputLabels[1]]}>
            <NumInput value={b} onChange={setB} min={0} />
          </Field>
        </>
      )}

      {(lesson === "series" || lesson === "parallel") && (
        <>
          <Field label="Source Voltage" unit="V">
            <NumInput value={sourceVoltage} onChange={setSourceVoltage} min={0} />
          </Field>
          <Field label={lesson === "series" ? "Series Resistors" : "Parallel Branch Resistors"}>
            <ResistorInputs resistors={resistors} setResistors={setResistors} />
          </Field>
        </>
      )}

      {lesson === "ac" && (
        <>
          <Field label="AC System">
            <Select value={acSystem} onChange={setAcSystem} options={[
              { value: "single", label: "Single-Phase AC" },
              { value: "three", label: "Three-Phase AC (balanced)" },
            ]} />
          </Field>
          <Field label={acSystem === "three" ? "Line-to-Line Voltage" : "Voltage"} unit="V">
            <NumInput value={acVoltage} onChange={setAcVoltage} min={0} />
          </Field>
          <Field label="Current" unit="A">
            <NumInput value={acCurrent} onChange={setAcCurrent} min={0} />
          </Field>
          <Field label="Power Factor" hint="Enter 0.00 to 1.00">
            <NumInput value={pf} onChange={setPf} min={0} max={1} step="0.01" />
          </Field>
        </>
      )}
    </CalcLayout>
  );
}
