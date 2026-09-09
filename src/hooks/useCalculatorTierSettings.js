import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  CALCULATOR_TIER_SETTINGS_ENTITY,
  CALCULATOR_TIER_SETTINGS_KEY,
  compactCalculatorTierGroups,
  getCalculatorTierGroupConfig,
} from "@/lib/calculatorTierGroups";

function settingsGroups(record) {
  if (Array.isArray(record?.groups)) return record.groups;
  if (record?.groups && typeof record.groups === "object") return record.groups;
  return null;
}

export function useCalculatorTierSettings({ enabled = true } = {}) {
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const records = await base44.entities[CALCULATOR_TIER_SETTINGS_ENTITY].filter(
        { settings_key: CALCULATOR_TIER_SETTINGS_KEY },
        "-updated_date",
        1
      );
      const nextRecord = records?.[0] || null;
      setRecord(nextRecord);
      return nextRecord;
    } catch (nextError) {
      setError(nextError);
      setRecord(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const calculatorTierGroups = useMemo(
    () => getCalculatorTierGroupConfig(settingsGroups(record)),
    [record]
  );

  return {
    record,
    calculatorTierGroups,
    compactGroups: compactCalculatorTierGroups(calculatorTierGroups),
    isLoading,
    error,
    reload: loadSettings,
  };
}
