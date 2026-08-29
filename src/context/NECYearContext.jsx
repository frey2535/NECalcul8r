import React, { createContext, useContext, useState, useCallback } from "react";

const NEC_YEARS = ["2017", "2020"];

const NECYearContext = createContext({
  year: "2017",
  setYear: () => {},
  years: NEC_YEARS,
});

export function NECYearProvider({ children }) {
  const [year, setYearState] = useState(() => {
    try {
      const saved = localStorage.getItem("nec-selected-year");
      return saved && NEC_YEARS.includes(saved) ? saved : "2017";
    } catch {
      return "2017";
    }
  });

  // Save synchronously so the value is persisted before any navigation or
  // page reload can happen — a useEffect-based save can be skipped if the
  // page unloads between the state update and the effect running.
  const setYear = useCallback((newYear) => {
    setYearState(newYear);
    try { localStorage.setItem("nec-selected-year", newYear); } catch {}
  }, []);

  return (
    <NECYearContext.Provider value={{ year, setYear, years: NEC_YEARS }}>
      {children}
    </NECYearContext.Provider>
  );
}

export function useNECYear() {
  return useContext(NECYearContext);
}