import React, { useState } from "react";
import MarinaReceptacleEditor from "./MarinaReceptacleEditor";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";

export default function MarinaDockEditor({ docks, onChange, phases, phaseMode }) {
  const [expandedDock, setExpandedDock] = useState(0);

  const updateDock = (i, key, val) => {
    const next = [...docks];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };

  const addDock = () => {
    const newIdx = docks.length;
    onChange([...docks, {
      id: `d${Date.now()}`,
      name: `Dock ${String.fromCharCode(65 + newIdx)}`,
      receptacles: [{ id: `r${Date.now()}`, rating: "30A", quantity: 1, slip: "", feeder: "Feeder 1", panel: "Panel A" }],
    }]);
    setExpandedDock(newIdx);
  };

  const removeDock = (i) => onChange(docks.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase">Marina Docks</p>
        <button onClick={addDock} className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
          <Plus className="w-3 h-3" /> Add Dock
        </button>
      </div>
      {docks.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2 text-center">No docks added. Click "Add Dock" to begin.</p>
      )}
      {docks.map((dock, i) => {
        const totalRecs = dock.receptacles.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);
        return (
          <div key={dock.id || i} className="border border-border rounded-lg bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <button onClick={() => setExpandedDock(expandedDock === i ? null : i)} className="text-muted-foreground hover:text-foreground shrink-0">
                {expandedDock === i ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={dock.name}
                onChange={e => updateDock(i, "name", e.target.value)}
                placeholder={`Dock ${String.fromCharCode(65 + i)}`}
                className="flex h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{totalRecs} rec.</span>
              <button onClick={() => removeDock(i)} className="text-destructive hover:text-destructive/80 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {expandedDock === i && (
              <div className="px-3 pb-3 border-t border-border pt-2">
                <MarinaReceptacleEditor
                  receptacles={dock.receptacles}
                  onChange={recs => updateDock(i, "receptacles", recs)}
                  phases={phases}
                  phaseMode={phaseMode}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}