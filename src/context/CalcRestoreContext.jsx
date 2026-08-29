import { createContext, useContext } from "react";

export const CalcRestoreContext = createContext(null);

export function useCalcRestore() {
  return useContext(CalcRestoreContext);
}
