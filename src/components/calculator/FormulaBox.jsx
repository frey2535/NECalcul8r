import React from "react";

/**
 * FormulaBox — renders either dynamic step-by-step calculations (with actual
 * input values plugged in) or static formula definitions (backward compatible).
 *
 * Props:
 *   steps?: Array<{ label, expression, result, unit? }>
 *     - Dynamic: shows the actual math with user's input values
 *     - expression: the formula with numbers plugged in (e.g. "(2 × 21.2 × 100 × 80) / 66,360")
 *     - result: the computed answer (e.g. "5.11")
 *     - unit: optional unit string (e.g. "V", "%", "A")
 *
 *   formulas?: Array<{ label, formula, description? }>
 *     - Static: generic formula definitions (legacy support)
 */
export default function FormulaBox({ steps, formulas }) {
  const hasSteps = steps && steps.length > 0;
  const hasFormulas = formulas && formulas.length > 0;
  if (!hasSteps && !hasFormulas) return null;

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-blue-200 flex items-center gap-2">
        <span className="text-base">📐</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
          {hasSteps ? "Step-by-Step Calculation" : "Formulas Used"}
        </p>
      </div>
      <div className="divide-y divide-blue-100">
        {hasSteps && steps.map((s, i) => (
          <div key={`step-${i}`} className="px-3.5 py-3.5 flex gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">
              {s.label}
            </p>
            {s.formula && (
              <code className="block text-[11px] font-mono text-blue-600/90 italic mb-1 break-all leading-relaxed">
                {s.formula}
              </code>
            )}
            <code className="block text-xs font-mono font-semibold text-blue-900 bg-blue-100/60 rounded-lg px-2.5 py-1.5 break-all leading-relaxed">
              {s.expression}
            </code>
            {s.result != null && (
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">=</span>
                <span className="text-sm font-extrabold text-blue-700 tabular-nums">
                  {s.result}{s.unit ? ` ${s.unit}` : ""}
                </span>
              </div>
            )}
            {s.note && (
              <p className="text-[10px] text-blue-700/80 mt-1.5 leading-snug">{s.note}</p>
            )}
            </div>
          </div>
        ))}
        {hasFormulas && !hasSteps && formulas.map((f, i) => (
          <div key={`formula-${i}`} className="px-3.5 py-3">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{f.label}</p>
            <code className="block text-xs font-mono font-semibold text-blue-900 bg-blue-100/60 rounded-lg px-2.5 py-1.5 break-all leading-relaxed">
              {f.formula}
            </code>
            {f.description && (
              <p className="text-[10px] text-blue-700/80 mt-1.5 leading-snug">{f.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}