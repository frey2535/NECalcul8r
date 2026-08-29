import { useState } from "react";
import { useCalcRestore } from "@/context/CalcRestoreContext";

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function mergeRestored(defaults, inputs) {
  if (inputs == null) return defaults;
  if (Array.isArray(defaults) && Array.isArray(inputs)) return inputs;
  if (isPlainObject(defaults) && isPlainObject(inputs)) return { ...defaults, ...inputs };
  if (isPlainObject(inputs) && !isPlainObject(defaults) && !Array.isArray(defaults)) {
    return defaults;
  }
  return inputs;
}

/** useState for a calculator input object/array that can reload a saved snapshot. */
export function useCalculatorInputs(defaults) {
  const restore = useCalcRestore();
  return useState(() => mergeRestored(defaults, restore?.inputs));
}

/** useState for one field pulled out of a saved snapshot object. */
export function useRestoredField(key, defaultValue) {
  const restore = useCalcRestore();
  const inputs = restore?.inputs;
  const initial =
    isPlainObject(inputs) && inputs[key] !== undefined ? inputs[key] : defaultValue;
  return useState(initial);
}
