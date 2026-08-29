import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookOpen, FlaskConical } from "lucide-react";

const NEC_YEARS = [
  { year: "2017", label: "NEC 2017", description: "NFPA 70, 2017 Edition", beta: false },
  { year: "2020", label: "NEC 2020", description: "NFPA 70, 2020 Edition", beta: false },
];

export default function NECYearSelector({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        NEC Code Year
      </label>
      <div className="grid grid-cols-2 gap-3">
        {NEC_YEARS.map(({ year, label, description, beta }) => (
          <button
            key={year}
            type="button"
            onClick={() => onSelect(year)}
            className={cn(
              "relative rounded-lg border-2 p-4 text-left transition-all duration-200",
              "hover:border-primary/50 hover:shadow-md",
              selected === year
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card",
              beta && "opacity-80"
            )}
          >
            {selected === year && (
              <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px]">
                Selected
              </Badge>
            )}
            <p className="font-bold text-lg">{year}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            {beta && (
              <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                <FlaskConical className="w-3 h-3" /> Pending verification
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}