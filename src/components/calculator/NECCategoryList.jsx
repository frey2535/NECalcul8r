import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const colorMap = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red: "bg-red-100 text-red-700 border-red-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
};

const selectedColorMap = {
  blue: "bg-blue-600 text-white border-blue-600",
  green: "bg-green-600 text-white border-green-600",
  purple: "bg-purple-600 text-white border-purple-600",
  orange: "bg-orange-500 text-white border-orange-500",
  red: "bg-red-600 text-white border-red-600",
  teal: "bg-teal-600 text-white border-teal-600",
  indigo: "bg-indigo-600 text-white border-indigo-600",
  yellow: "bg-yellow-500 text-white border-yellow-500",
  slate: "bg-slate-600 text-white border-slate-600",
  amber: "bg-amber-500 text-white border-amber-500",
  cyan: "bg-cyan-600 text-white border-cyan-600",
  gray: "bg-gray-600 text-white border-gray-600",
};

export default function NECCategoryList({ categories, selectedId, onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = categories.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.article.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Search calculations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.map(cat => {
          const isSelected = cat.id === selectedId;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 border-b border-border/50 transition-all hover:bg-muted/60 flex items-start gap-2.5",
                isSelected && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <span className={cn(
                "mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0",
                isSelected ? selectedColorMap[cat.color] : colorMap[cat.color]
              )}>
                {cat.color.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold truncate", isSelected && "text-primary")}>{cat.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{cat.article}</p>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No calculations found</p>
        )}
      </div>
      <div className="p-2 border-t border-border bg-muted/30">
        <p className="text-[10px] text-center text-muted-foreground">{categories.length} NEC Calculations Available</p>
      </div>
    </div>
  );
}