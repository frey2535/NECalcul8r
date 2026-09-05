/**
 * Codebook Verification Gate
 *
 * Determines the verification tier for a calculator + NEC year combination
 * based solely on records stored in ArticleVerification.
 *
 * Gate levels:
 *   "verified"   — every required article/table has status="verified" for this year
 *   "partial"    — at least one verified, but one or more are pending/needs_correction
 *   "unverified" — no records exist, or all are pending
 *   "invalid"    — selected year is "2026" (pre-publication; never show verified)
 *
 * Usage:
 *   const gate = computeGate(calcId, articles, necYear, verificationMap);
 *   // verificationMap contains calc-specific and global article_ref/year statuses.
 */
import { normalizeArticleVerificationStatus } from "@/lib/articleVerificationStatus";

export function articleRefForYear(article, necYear) {
  return article?.yearRefs?.[necYear] || article?.ref;
}

export function computeGate(calcId, articles, necYear, verificationMap) {
  // Pure-math calculators (no articles) — gate doesn't apply
  if (!articles || articles.length === 0) return "verified";

  // 2026 is always unverified until final publication
  if (necYear === "2026") return "invalid";

  const statuses = articles.map(a => {
    const articleRef = articleRefForYear(a, necYear);
    const key = `${calcId}|${articleRef}|${necYear}`;
    const calcStatus = normalizeArticleVerificationStatus(verificationMap[key]);
    if (calcStatus !== "pending_review") return calcStatus;
    return normalizeArticleVerificationStatus(verificationMap[`global|${articleRef}|${necYear}`]);
  });

  // ai_reviewed_pending_human_approval does NOT count as verified for gate purposes
  const allVerified  = statuses.every(s => s === "verified");
  const someVerified = statuses.some(s => s === "verified");
  const anyError     = statuses.some(s => s === "needs_correction");
  const anyAiPending = statuses.some(s => s === "ai_reviewed_pending_human_approval");

  if (allVerified && !anyError) return "verified";
  if (someVerified || anyError || anyAiPending) return "partial";
  return "unverified";
}

export const GATE_META = {
  verified: {
    label: "Codebook Verified",
    short: "Codebook Verified",
    color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    description: "All referenced articles and tables have been manually verified against the published NEC for this edition.",
  },
  partial: {
    label: "Partially Verified",
    short: "Partial",
    color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dot: "bg-amber-400",
    description: "Some references have been verified, but one or more are still pending or need correction.",
  },
  unverified: {
    label: "Not Codebook Verified",
    short: "Unverified",
    color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
    description: "No references have been manually verified against the published NEC for this edition.",
  },
  invalid: {
    label: "NEC 2026 — Pending Publication",
    short: "Pre-publication",
    color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    description: "NEC 2026 has not yet been formally published. All references remain unverified until the final edition is released and manually reviewed.",
  },
};