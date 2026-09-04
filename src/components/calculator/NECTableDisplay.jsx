import React from "react";
import { cn } from "@/lib/utils";

export default function NECTableDisplay({ title, headers, rows, note, compact = false }) {
  if (!rows || rows.length === 0) return null;
  const columnCount = headers?.length || rows[0]?.length || 0;
  const fitColumns = columnCount <= 3;
  return (
    <div className="calc-table-card mt-4 rounded-xl border border-slate-200 shadow-md overflow-hidden">
      {title && (
        <div className="px-3.5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2">
          <span className="text-base">📋</span>
          <p className={cn("font-bold text-slate-700 leading-snug", compact ? "text-[10px]" : "text-xs")}>{title}</p>
        </div>
      )}
      {!fitColumns && (
        <div className="px-3.5 py-1.5 bg-blue-50 border-b border-blue-100 text-[10px] font-semibold text-blue-700">
          Wide table — scroll left/right to view all columns
        </div>
      )}
      <div className="nec-scroll" style={{ overflowX: "scroll", overflowY: "auto", maxHeight: "18rem", width: "100%", scrollbarGutter: "stable both-edges" }}>
        <table className={cn("text-left border-collapse", fitColumns && "w-full")} style={{ minWidth: fitColumns ? "100%" : "max-content" }}>
          {headers && headers.length > 0 && (
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                {headers.map((h, i) => (
                  <th key={i} className={cn("px-3 font-bold text-slate-600 uppercase tracking-wide sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] align-top", fitColumns ? "whitespace-normal" : "whitespace-nowrap", compact ? "py-1.5 text-[9px]" : "py-2 text-[10px]")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={cn("border-b border-slate-100 last:border-0 transition-colors duration-150 hover:bg-blue-50/70", ri % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                {row.map((cell, ci) => (
                  <td key={ci} className={cn("px-3 text-slate-700 font-medium align-top", fitColumns ? "whitespace-normal" : "whitespace-nowrap", compact ? "py-1.5 text-[10px]" : "py-2 text-xs")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && (
        <div className="px-3.5 py-2.5 bg-amber-50 border-t border-amber-100">
          <p className={cn("text-amber-700 leading-snug", compact ? "text-[10px]" : "text-xs")}>
            <strong>Note:</strong> {note}
          </p>
        </div>
      )}
    </div>
  );
}