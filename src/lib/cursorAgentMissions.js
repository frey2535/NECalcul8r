/**
 * Mission presets and prompt builder for the in-app Cursor Agent launcher.
 * These shape Cloud Agent behavior toward NEC accuracy and proactive fixes.
 */

export const CURSOR_MISSIONS = [
  {
    id: "nec_accuracy_guardian",
    label: "NEC accuracy guardian",
    short: "Treat calculator baselines as law: find any miss immediately and ship a correction PR.",
    defaultName: "NEC accuracy guardian correction",
    defaultAutoCreatePR: true,
  },
  {
    id: "daily_full_scan",
    label: "Daily full scan",
    short: "Top-to-bottom sweep: list every issue/potential issue and notify via draft PR.",
    defaultName: "Daily NECalcul8r full reliability scan",
    defaultAutoCreatePR: true,
  },
  {
    id: "proactive_audit",
    label: "Proactive audit",
    short: "Find latent risks and fix high-confidence issues before users hit them.",
    defaultName: "Proactive NECalcul8r reliability audit",
    defaultAutoCreatePR: true,
  },
  {
    id: "fix_known",
    label: "Fix known issue",
    short: "Correct a specific bug or regression you already observed.",
    defaultName: "Fix known NECalcul8r issue",
    defaultAutoCreatePR: true,
  },
  {
    id: "suggest_only",
    label: "Suggest only",
    short: "Map risks and recommended fixes; only ship tiny, obvious safe patches.",
    defaultName: "NECalcul8r risk suggestions",
    defaultAutoCreatePR: true,
  },
  {
    id: "calculator_hardening",
    label: "Calculator hardening",
    short: "Audit NEC calculators for demand, edge cases, and regression coverage.",
    defaultName: "Calculator hardening audit",
    defaultAutoCreatePR: true,
  },
  {
    id: "mobile_pwa",
    label: "Mobile / PWA",
    short: "Anticipate Capacitor, WebView, splash, select, and offline/PWA failures.",
    defaultName: "Mobile and PWA reliability audit",
    defaultAutoCreatePR: true,
  },
  {
    id: "commerce_access",
    label: "Billing / access",
    short: "Review Stripe, Play/Apple, entitlements, and Edge Function deploy gaps.",
    defaultName: "Billing and access reliability audit",
    defaultAutoCreatePR: true,
  },
];

export const CURSOR_FOCUS_AREAS = [
  { id: "generator", label: "Generator sizing" },
  { id: "dwelling", label: "Dwelling / service load" },
  { id: "voltage_drop", label: "Voltage drop" },
  { id: "motor", label: "Motor / starting" },
  { id: "commercial", label: "Commercial / kitchen / multifamily" },
  { id: "ui_popups", label: "Dialogs / sheets" },
  { id: "android", label: "Android WebView" },
  { id: "ios", label: "iOS" },
  { id: "pwa_cache", label: "PWA / cache" },
  { id: "edge_functions", label: "Supabase Edge Functions" },
  { id: "stripe", label: "Stripe checkout" },
  { id: "play_billing", label: "Google Play billing" },
  { id: "auth", label: "Auth / entitlements" },
];

const SHARED_DOCTRINE = `You are the NECalcul8r NEC Accuracy Guardian and platform reliability agent.

NEC accuracy rules (non-negotiable):
- Calculator correctness is measured against the repo's frozen known-answer / baseline suites (Annex D examples, audited NEC demand cases, and verify:* scripts).
- If any baseline fails, treat it as a critical defect: locate the exact formula/UI mismatch, fix it, and add/adjust regression coverage so the same miss cannot silently return.
- Do not invent NEC requirements. Cite code paths, article references already used in the codebase, and failing baseline output.
- Prefer deterministic arithmetic fixes over speculative refactors. Preserve code-year branches (2017/2020/2023/2026) correctly.
- When a calculator is wrong, propose the correction in the PR with before/after values from the failing baseline.

General operating rules:
- Think ahead for latent defects (mobile/WebView, missing Edge Function deploys, stale PWA cache, billing/access breakage).
- Prioritize: (1) wrong or crashing calculations, (2) purchase/access breakage, (3) mobile/PWA blockers, (4) UX polish.
- High-confidence issues: fix them, validate, commit, push, draft PR.
- Speculative risks: list under "Suggested follow-ups" with severity and next step.
- Keep scope tight. Branch pattern cursor/<descriptive-name>-d22c. Never expose secrets or weaken auth/billing/admin checks.`;

function missionInstructions(missionId) {
  switch (missionId) {
    case "nec_accuracy_guardian":
      return `Mission: NEC Accuracy Guardian.
- Run / interpret npm run verify:nec-accuracy (and focused verify:* suites for touched calculators).
- Any failed suite is an immediate correctness incident — fix root cause with 100% match to the frozen expected values for that suite.
- After the fix, re-run the failed suite(s) until green.
- Expand baselines only when you discover a real gap with a known correct answer; never weaken expectations to make tests pass.
- PR must include failing suite names, root cause, corrected formula/path, and validation output.`;
    case "daily_full_scan":
      return `Mission: Daily top-to-bottom reliability scan.
- Walk the product systematically: landing/auth, calculators (all major NEC tools), projects/reports, admin tools, mobile/PWA/Capacitor, commerce/entitlements, Edge Functions.
- Start with NEC accuracy baselines; any miss is critical.
- Produce a severity-ordered inventory of concrete bugs AND plausible latent risks.
- Fix only critical/high-confidence items in this pass; everything else goes under Suggested follow-ups.
- Assume the platform owner will read the PR as their notification digest.`;
    case "fix_known":
      return `Mission: Fix a known issue.
- Reproduce or locate the reported defect first.
- Implement the minimal correct fix.
- Add regression coverage when practical.
- Summarize root cause and residual risks in the PR.`;
    case "suggest_only":
      return `Mission: Suggest corrections before they become incidents.
- Audit the requested focus areas for likely failures.
- Ship only tiny, obvious, high-confidence safe patches.
- For everything else, produce an ordered findings list with severity, evidence, and recommended fix.`;
    case "calculator_hardening":
      return `Mission: Hardening NEC calculators.
- Review demand factors, code-year branches, fastened appliances, HVAC split loads, motor starting, and UI/result field mismatches.
- Prefer known-answer / baseline tests over cosmetic UI churn.
- Fix concrete calculation defects; document ambiguous NEC interpretation as follow-ups.`;
    case "mobile_pwa":
      return `Mission: Mobile / PWA reliability.
- Look for WebView select/background issues, splash theme leaks, broken close buttons, stale service-worker caches, and Capacitor-only paths.
- Prefer fixes that work on both web and native shells.`;
    case "commerce_access":
      return `Mission: Billing and access reliability.
- Check Stripe checkout/portal/upgrade paths, Play/Apple verification, entitlements, and Edge Function deploy/CORS gaps.
- Treat missing production functions (404 / Failed to send Edge Function) as critical.`;
    case "proactive_audit":
    default:
      return `Mission: Proactive reliability audit.
- Scan the requested focus areas for defects that have not been reported yet.
- Fix the top high-confidence issues in this pass (aim for a small, reviewable PR).
- Explicitly call out near-miss risks and prevention ideas in the PR body.`;
  }
}

/**
 * @param {{
 *   missionId?: string,
 *   focusIds?: string[],
 *   notes?: string,
 * }} options
 */
export function buildCursorAgentPrompt(options = {}) {
  const missionId = options.missionId || "nec_accuracy_guardian";
  const mission = CURSOR_MISSIONS.find((item) => item.id === missionId) || CURSOR_MISSIONS[0];
  const focusIds = Array.isArray(options.focusIds) ? options.focusIds : [];
  const focusLabels = CURSOR_FOCUS_AREAS
    .filter((area) => focusIds.includes(area.id))
    .map((area) => area.label);
  const notes = typeof options.notes === "string" ? options.notes.trim() : "";

  const focusBlock = focusLabels.length
    ? `Focus areas for this run:\n${focusLabels.map((label) => `- ${label}`).join("\n")}`
    : "Focus areas for this run:\n- Whole product, prioritize NEC calculator accuracy first";

  const notesBlock = notes
    ? `Operator notes / observed context:\n${notes}`
    : `Operator notes / observed context:\n- None provided. Start with npm run verify:nec-accuracy and expand from failures.`;

  return `${SHARED_DOCTRINE}

${missionInstructions(mission.id)}

${focusBlock}

${notesBlock}

Delivery requirements:
- Create a new branch from the starting ref using cursor/<name>-d22c.
- Make the changes justified by this mission.
- Run focused validation for touched calculators/scripts (at minimum the failed NEC suites).
- Commit, push, and create a draft PR against main.
- PR body must include: Findings (with severity), Changes made, Validation, Suggested follow-ups.`;
}

export function getMission(missionId) {
  return CURSOR_MISSIONS.find((item) => item.id === missionId) || CURSOR_MISSIONS[0];
}
