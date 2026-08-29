import React from "react";
import { Field, NumInput, Select } from "../CalcLayout";
import { RECEPTACLE_RATINGS } from "./logic/marinaShorePowerCalc";
import { Trash2, Plus } from "lucide-react";

export default function MarinaReceptacleEditor({ receptacles, onChange, phases, phaseMode }) {
  const phaseOptions = (phases === "three" ? ["A", "B", "C"] : ["L1", "L2"]).map(p => ({ value: p, label: p }));

  const update = (i, key, val) => {
    const next = [...receptacles];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...receptacles, { id: `r${Date.now()}`, rating: "30A", quantity: 1, slip: "", feeder: "Feeder 1", panel: "Panel A" }]);
  const remove = (i) => onChange(receptacles.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase">Shore Power Receptacles</p>
        <button onClick={add} className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
          <Plus className="w-3 h-3" /> Add Receptacle
        </button>
      </div>
      {receptacles.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2 text-center">No receptacles added. Click "Add Receptacle" to begin.</p>
      )}
      {receptacles.map((rec, i) => (
        <div key={rec.id || i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Receptacle {i + 1}</span>
            <button onClick={() => remove(i)} className="text-destructive hover:text-destructive/80">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rating">
              <Select value={rec.rating} onChange={val => update(i, "rating", val)} options={[
                ...RECEPTACLE_RATINGS.map(r => ({ value: r, label: r === "custom" ? "Custom" : `${r} Receptacle` })),
              ]} />
            </Field>
            <Field label="Quantity" unit="count">
              <NumInput value={rec.quantity} onChange={val => update(i, "quantity", val)} placeholder="1" min={0} />
            </Field>
          </div>
          {rec.rating === "custom" && (
            <div className="grid grid-cols-3 gap-2">
              <Field label="Amps" unit="A">
                <NumInput value={rec.customAmps} onChange={val => update(i, "customAmps", val)} placeholder="30" min={0} />
              </Field>
              <Field label="Voltage" unit="V">
                <NumInput value={rec.customVoltage} onChange={val => update(i, "customVoltage", val)} placeholder="120" min={0} />
              </Field>
              <Field label="Poles">
                <Select value={String(rec.customPoles || 1)} onChange={val => update(i, "customPoles", parseInt(val))} options={[
                  { value: "1", label: "1-Pole" }, { value: "2", label: "2-Pole" }, { value: "3", label: "3-Pole" },
                ]} />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Field label="Slip">
              <input type="text" value={rec.slip || ""} onChange={e => update(i, "slip", e.target.value)} placeholder="Slip 1" className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
            </Field>
            <Field label="Feeder">
              <input type="text" value={rec.feeder || ""} onChange={e => update(i, "feeder", e.target.value)} placeholder="Feeder 1" className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
            </Field>
            <Field label="Panel">
              <input type="text" value={rec.panel || ""} onChange={e => update(i, "panel", e.target.value)} placeholder="Panel A" className="flex h-11 w-full rounded-xl border border-input bg-muted/50 px-3 py-1 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-foreground" />
            </Field>
          </div>
          {phaseMode === "manual" && (
            <Field label="Phase Assignment">
              <Select value={rec.manualPhase || ""} onChange={val => update(i, "manualPhase", val)} options={[
                { value: "", label: "— Select —" }, ...phaseOptions,
              ]} />
            </Field>
          )}
        </div>
      ))}
    </div>
  );
}