const SKIP_KEYS = new Set(["steps", "trace", "limitations"]);

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeSnapshot(value, depth = 0) {
  if (depth > 6) return null;
  if (value == null) return value;
  if (typeof value === "function") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeSnapshot(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SKIP_KEYS.has(key)) continue;
      const next = sanitizeSnapshot(nested, depth + 1);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return String(value);
}

const SUMMARY_FIELDS = [
  ["totalAmps", "A"],
  ["totalA", "A"],
  ["total_amps", "A"],
  ["minService_A", "A service"],
  ["minService", "A service"],
  ["totalVA", "VA"],
  ["totalServiceVA", "VA"],
  ["VD_pct", "% VD"],
  ["amps", "A"],
  ["loadA", "A"],
  ["kVA", "kVA"],
  ["demandedKW", "kW"],
  ["gecSize", "AWG GEC"],
  ["awg", "AWG"],
  ["adjustedAwg", "AWG"],
  ["feederOCPD", "A OCPD"],
  ["ocpd", "A OCPD"],
  ["recommendedSize", ""],
  ["fillPct", "% fill"],
];

export function summarizeOutputs(outputs, fallback = "Saved calculation") {
  if (!isPlainObject(outputs)) return fallback;
  for (const [key, unit] of SUMMARY_FIELDS) {
    const raw = outputs[key];
    if (raw == null || typeof raw === "object") continue;
    if (typeof raw === "number") {
      const display = Number.isInteger(raw) ? String(raw) : raw.toFixed(1);
      return unit ? `${display} ${unit}` : display;
    }
    return unit ? `${raw} ${unit}` : String(raw);
  }
  return fallback;
}

function prettyLabel(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bawa\b/gi, "AWG")
    .replace(/\bva\b/gi, "VA")
    .replace(/\bkva\b/gi, "kVA")
    .replace(/\bocpd\b/gi, "OCPD")
    .replace(/\bvd\b/gi, "VD")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatVal(value) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  return String(value);
}

export function flattenSnapshot(value, prefix = "") {
  const rows = [];
  if (value == null) return rows;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`;
      if (item != null && typeof item === "object") rows.push(...flattenSnapshot(item, key));
      else rows.push({ label: key, value: formatVal(item) });
    });
    return rows;
  }
  if (!isPlainObject(value)) {
    return [{ label: prefix || "Value", value: formatVal(value) }];
  }
  for (const [key, nested] of Object.entries(value)) {
    if (SKIP_KEYS.has(key)) continue;
    const label = prefix ? `${prefix} · ${prettyLabel(key)}` : prettyLabel(key);
    if (nested != null && typeof nested === "object") rows.push(...flattenSnapshot(nested, label));
    else rows.push({ label, value: formatVal(nested) });
  }
  return rows;
}

export function lastProjectStorageKey(userId) {
  return `necalcul8r_last_project_${userId || "anon"}`;
}
