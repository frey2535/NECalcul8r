import React from "react";
import { Field, NumInput, Select } from "../CalcLayout";
import { LOAD_TYPE_LABELS } from "./logic/marinaShorePowerCalc";
import { Trash2, Plus } from "lucide-react";

const MOTOR_TYPES = ["boat_lift", "pump_out", "fire_pump"];
const HVAC_TYPES = ["hvac"];
const LIGHTING_TYPES = ["lighting"];

const OCCUPANCY_OPTIONS = [
  { value: "commercial", label: "Commercial (3.5 VA/ft²)" },
  { value: "office", label: "Office (3.5 VA/ft²)" },
  { value: "warehouse", label: "Warehouse (0.25 VA/ft²)" },
  { value: "restaurant", label: "Restaurant (2 VA/ft²)" },
  { value: "garage", label: "Garage (0.5 VA/ft²)" },
  { value: "store", label: "Store (3 VA/ft²)" },
];

export default function MarinaLoadEditor({ loads, onChange }) {
  const typeOptions = Object.entries(LOAD_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));

  const update = (i, key, val) => {
    const next = [...loads];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...loads, { id: `l${Date.now()}`, type: "office", va: 5000 }]);
  const remove = (i) => onChange(loads.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase">Other Marina Loads</p>
        <button onClick={add} className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
          <Plus className="w-3 h-3" /> Add Load
        </button>
      </div>
      {loads.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2 text-center">No additional loads. Click "Add Load" to add marina loads.</p>
      )}
      {loads.map((load, i) => {
        const isMotor = MOTOR_TYPES.includes(load.type);
        const isHVAC = HVAC_TYPES.includes(load.type);
        const isLighting = LIGHTING_TYPES.includes(load.type);
        return (
          <div key={load.id || i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{LOAD_TYPE_LABELS[load.type] || "Load"}</span>
              <button onClick={() => remove(i)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Field label="Load Type">
              <Select value={load.type} onChange={val => update(i, "type", val)} options={typeOptions} />
            </Field>
            {isMotor && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Horse Power" unit="HP">
                  <NumInput value={load.hp} onChange={val => update(i, "hp", val)} placeholder="5" min={0} />
                </Field>
                <Field label="Voltage" unit="V">
                  <NumInput value={load.motorVoltage} onChange={val => update(i, "motorVoltage", val)} placeholder="208" min={0} />
                </Field>
                <Field label="Phase">
                  <Select value={load.motorPhase || "three"} onChange={val => update(i, "motorPhase", val)} options={[
                    { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" },
                  ]} />
                </Field>
              </div>
            )}
            {isHVAC && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Nameplate Amps" unit="A">
                  <NumInput value={load.nameplateAmps} onChange={val => update(i, "nameplateAmps", val)} placeholder="20" min={0} />
                </Field>
                <Field label="Voltage" unit="V">
                  <NumInput value={load.hvacVoltage} onChange={val => update(i, "hvacVoltage", val)} placeholder="208" min={0} />
                </Field>
                <Field label="Phase">
                  <Select value={load.hvacPhase || "three"} onChange={val => update(i, "hvacPhase", val)} options={[
                    { value: "single", label: "Single-Phase" }, { value: "three", label: "Three-Phase" },
                  ]} />
                </Field>
              </div>
            )}
            {isLighting && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Floor Area" unit="ft²">
                  <NumInput value={load.sqft} onChange={val => update(i, "sqft", val)} placeholder="1000" min={0} />
                </Field>
                <Field label="Occupancy Type">
                  <Select value={load.occupancy || "commercial"} onChange={val => update(i, "occupancy", val)} options={OCCUPANCY_OPTIONS} />
                </Field>
              </div>
            )}
            {!isMotor && !isHVAC && !isLighting && (
              <Field label="Connected Load" unit="VA">
                <NumInput value={load.va} onChange={val => update(i, "va", val)} placeholder="5000" min={0} />
              </Field>
            )}
          </div>
        );
      })}
    </div>
  );
}