/**
 * Live app + screen context for the in-app Cursor agent.
 * Sent with each chat turn so the agent can see where the user is and what's on screen.
 */
import { NEC_CATEGORIES } from "@/data/calculatorCatalog";

const MAX_VISIBLE_CHARS = 8000;
const MAX_FIELD_CHARS = 4000;
const MAX_ERROR_CHARS = 2000;

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "PATH",
  "META",
  "LINK",
  "HEAD",
]);

function safeText(value, max = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isVisible(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.getAttribute?.("aria-hidden") === "true") return false;
  if (el.hasAttribute?.("hidden")) return false;
  try {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
  } catch {
    // ignore
  }
  return true;
}

function collectVisibleText(root, maxChars = MAX_VISIBLE_CHARS) {
  if (!root) return "";
  const parts = [];
  let total = 0;

  const walk = (node) => {
    if (total >= maxChars || !node) return;
    if (node.nodeType === 3) {
      const text = safeText(node.nodeValue, 400);
      if (text) {
        parts.push(text);
        total += text.length + 1;
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.dataset?.agentIgnore === "true") return;
    if (el.getAttribute?.("data-agent-ignore") === "true") return;
    // Skip the assistant panel itself so we don't echo the chat transcript.
    if (el.getAttribute?.("aria-label") === "Assistant side panel") return;
    if (el.id === "nec-accuracy-assistant-root") return;
    if (!isVisible(el)) return;

    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    for (const child of el.childNodes) walk(child);
  };

  walk(root);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function collectFormFields(root, maxChars = MAX_FIELD_CHARS) {
  if (!root) return [];
  const fields = [];
  let total = 0;
  const controls = root.querySelectorAll("input, textarea, select");
  for (const el of controls) {
    if (total >= maxChars) break;
    if (!isVisible(el)) continue;
    if (el.type === "password" || el.type === "hidden" || el.type === "file") continue;
    if (el.dataset?.agentIgnore === "true") continue;

    let label = "";
    if (el.id) {
      const safeId = el.id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const byFor = root.querySelector(`label[for="${safeId}"]`);
      if (byFor) label = safeText(byFor.textContent, 120);
    }
    if (!label) {
      const parentLabel = el.closest("label");
      if (parentLabel) label = safeText(parentLabel.textContent, 120);
    }
    if (!label) {
      const fieldRoot = el.closest("[data-field], .space-y-1, .space-y-2, .grid, .flex");
      const nearby = fieldRoot?.querySelector("label, .text-xs, .text-sm, span, p");
      if (nearby) label = safeText(nearby.textContent, 120);
    }
    if (!label) label = safeText(el.getAttribute("aria-label") || el.name || el.placeholder, 80) || "field";

    let value = "";
    if (el.tagName === "SELECT") {
      const opt = el.options?.[el.selectedIndex];
      value = safeText(opt?.text || el.value, 160);
    } else if (el.type === "checkbox" || el.type === "radio") {
      value = el.checked ? "checked" : "unchecked";
    } else {
      value = safeText(el.value, 200);
    }

    const line = `${label}: ${value || "(empty)"}`;
    fields.push(line);
    total += line.length + 1;
  }
  return fields;
}

function collectErrors(root, maxChars = MAX_ERROR_CHARS) {
  if (!root) return [];
  const selectors = [
    "[role='alert']",
    ".text-destructive",
    ".text-red-600",
    ".text-red-700",
    ".text-amber-800",
    ".bg-destructive\\/5",
    ".border-destructive",
    ".bg-amber-50",
  ];
  const seen = new Set();
  const out = [];
  let total = 0;
  for (const sel of selectors) {
    let nodes = [];
    try {
      nodes = root.querySelectorAll(sel);
    } catch {
      continue;
    }
    for (const el of nodes) {
      if (total >= maxChars) break;
      if (!isVisible(el)) continue;
      const text = safeText(el.textContent, 400);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      total += text.length + 1;
    }
  }
  return out;
}

function calculatorFromPath(pathname) {
  const match = String(pathname || "").match(/^\/calculator\/([^/?#]+)/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  const cat = NEC_CATEGORIES.find((item) => item.id === id);
  return cat
    ? {
        id: cat.id,
        label: cat.label,
        article: cat.article,
        description: cat.description,
        sourceHint: `src/components/calculator/calcs/ (look up CalculatorPanel MAP for ${cat.id})`,
      }
    : { id, label: id };
}

function appMapSummary() {
  const routes = [
    "/ — calculator list",
    "/calculator/:calcId — open calculator",
    "/nec-tables — NEC tables",
    "/projects — saved projects",
    "/history — history",
    "/purchase — plans / IAP",
    "/profile — account",
    "/accuracy-assistant — Cursor Agent full page",
    "/admin/* — platform admin tools",
  ];
  const calcs = NEC_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ");
  return { routes, calculatorCount: NEC_CATEGORIES.length, calculators: calcs.slice(0, 3500) };
}

/**
 * @param {{
 *   pathname?: string,
 *   search?: string,
 *   hash?: string,
 *   necYear?: string,
 *   user?: object | null,
 *   entitlementLabel?: string,
 * }} options
 */
export function collectAgentScreenContext(options = {}) {
  const loc = typeof window !== "undefined" ? window.location : null;
  const pathname = options.pathname || loc?.pathname || "/";
  const search = options.search ?? loc?.search ?? "";
  const hash = options.hash ?? loc?.hash ?? "";
  const necYear = options.necYear || null;
  const calculator = calculatorFromPath(pathname);
  const appMap = appMapSummary();

  let visibleText = "";
  let fields = [];
  let errors = [];
  let pageHeading = "";
  let viewport = null;

  if (typeof document !== "undefined" && document?.querySelector) {
    const main =
      document.querySelector("main")
      || document.querySelector("[data-app-main]")
      || document.body;
    pageHeading = safeText(
      document.querySelector("h1")?.textContent
        || document.title
        || "",
      160,
    );
    if (main) {
      visibleText = collectVisibleText(main);
      fields = collectFormFields(main);
      errors = collectErrors(main);
    }
    if (typeof window !== "undefined" && Number.isFinite(window.innerWidth)) {
      viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      };
    }
  }

  const user = options.user || null;
  const identity = user
    ? {
        email: user.email || null,
        plan: options.entitlementLabel || user.plan_key || user.access_type || null,
        access_status: user.access_status || null,
        is_platform_admin: Boolean(user.is_platform_admin),
      }
    : null;

  return {
    capturedAt: new Date().toISOString(),
    route: { pathname, search, hash },
    necYear,
    calculator,
    pageHeading,
    viewport,
    identity,
    appMap,
    errors,
    formFields: fields,
    visibleText,
  };
}

/** Format context as a compact string for the LLM system/session block. */
export function formatAgentScreenContext(context) {
  if (!context) return "";
  const lines = [
    "## Live app / screen context (auto-captured from the user's current NECalcul8r UI)",
    `capturedAt: ${context.capturedAt}`,
    `route: ${context.route?.pathname || ""}${context.route?.search || ""}${context.route?.hash || ""}`,
    context.necYear ? `necYear: ${context.necYear}` : null,
    context.pageHeading ? `pageHeading: ${context.pageHeading}` : null,
    context.viewport
      ? `viewport: ${context.viewport.width}x${context.viewport.height}@${context.viewport.dpr}x`
      : null,
    context.identity
      ? `user: email=${context.identity.email || "n/a"}; plan=${context.identity.plan || "n/a"}; admin=${context.identity.is_platform_admin}`
      : null,
  ].filter(Boolean);

  if (context.calculator) {
    lines.push(
      `openCalculator: id=${context.calculator.id}; label=${context.calculator.label || ""}; article=${context.calculator.article || ""}`,
    );
    if (context.calculator.sourceHint) lines.push(`calculatorSourceHint: ${context.calculator.sourceHint}`);
  }

  lines.push("appRoutes:");
  for (const route of context.appMap?.routes || []) lines.push(`  - ${route}`);
  lines.push(`calculators(${context.appMap?.calculatorCount || 0}): ${context.appMap?.calculators || ""}`);

  if (context.errors?.length) {
    lines.push("visibleErrors:");
    for (const err of context.errors.slice(0, 12)) lines.push(`  - ${err}`);
  }
  if (context.formFields?.length) {
    lines.push("formFields:");
    for (const field of context.formFields.slice(0, 80)) lines.push(`  - ${field}`);
  }
  if (context.visibleText) {
    lines.push("visibleText:");
    lines.push(context.visibleText);
  }

  return lines.join("\n").slice(0, 14000);
}
