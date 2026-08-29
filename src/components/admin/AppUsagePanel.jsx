import React from "react";
import { FIELD_META } from "@/lib/calculatorTrace";
import { cn } from "@/lib/utils";

/**
 * Displays what the app actually uses for a given NEC article reference:
 * - Article description and notes from audit.js
 * - Source verification status (developer assumption, pending review, etc.)
 * - Whether the article changed across NEC years
 * - Calculator source notes
 * - Concrete values from FIELD_META (the actual numbers/formulas the app uses)
 */
export default function AppUsagePanel({ row }) {
  const fieldEntries = Object.entries(FIELD_META).filter(([, meta]) =>
    meta.source.includes(row.articleRef) || row.articleRef.includes(meta.source)
  );

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3 w-full">
      {/* Article description */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Article Description
        </p>
        <p className="text-sm text-foreground">{row.articleDesc}</p>
      </div>

      {/* Article note */}
      {row.articleNote && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Article Note
          </p>
          <p className="text-xs text-foreground leading-relaxed">{row.articleNote}</p>
        </div>
      )}

      {/* Source status & change flag */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Source status: </span>
          <span
            className={cn(
              "font-semibold",
              row.articleSource === "developer assumption"
                ? "text-amber-600"
                : row.articleSource === "pending manual review"
                ? "text-orange-600"
                : "text-emerald-600"
            )}
          >
            {row.articleSource}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Changed across years: </span>
          <span className="font-semibold">{row.articleChanged ? "Yes" : "No"}</span>
        </div>
      </div>

      {/* Calculator source notes */}
      {row.sourceNotes && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Calculator Source Notes
          </p>
          <p className="text-xs text-foreground leading-relaxed">{row.sourceNotes}</p>
        </div>
      )}

      {/* Concrete values from FIELD_META */}
      {fieldEntries.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Values Used by App
          </p>
          <div className="space-y-1.5">
            {fieldEntries.map(([fieldName, meta]) => (
              <div key={fieldName} className="flex gap-2 text-xs">
                <code className="font-mono text-blue-600 font-semibold shrink-0">
                  {fieldName}
                </code>
                <div>
                  <span className="font-semibold text-foreground">{meta.value}</span>
                  <span className="text-muted-foreground ml-2">— {meta.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fieldEntries.length === 0 && !row.articleNote && !row.sourceNotes && (
        <p className="text-xs text-muted-foreground italic">
          No additional app usage details recorded for this article.
        </p>
      )}
    </div>
  );
}