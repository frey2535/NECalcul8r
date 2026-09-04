import React from "react";
import { base44 } from "@/api/base44Client";
import { normalizeArticleVerificationStatus } from "@/lib/articleVerificationStatus";

const GLOBAL_REF_PREFIX = "global";

function mergeReferenceStatus(current = "pending_review", next = "pending_review") {
  if (current === "needs_correction" || next === "needs_correction") return "needs_correction";
  if (current === "verified" || next === "verified") return "verified";
  if (current === "ai_reviewed_pending_human_approval" || next === "ai_reviewed_pending_human_approval") {
    return "ai_reviewed_pending_human_approval";
  }
  return "pending_review";
}

function globalReferenceKey(articleRef, year) {
  return `${GLOBAL_REF_PREFIX}|${articleRef}|${year}`;
}

function getGlobalReferenceStatus(records, articleRef, year) {
  return records
    .filter(r => r.article_ref === articleRef && r.nec_year === year)
    .reduce((status, rec) => mergeReferenceStatus(status, normalizeArticleVerificationStatus(rec.status)), "pending_review");
}

/**
 * Loads ArticleVerification records for a given necYear.
 *
 * Returns:
 *   getStatus(articleRef, year)  — used by CalculationTrace for per-ref display
 *   verificationMap              — calc-specific and global article_ref|year statuses for computeGate
 *   isLoading
 */
export function useArticleVerification(necYear) {
  const [records, setRecords] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!necYear) return;
    setIsLoading(true);
    // Load all records — gate needs calcId|article_ref|year keys
    base44.entities.ArticleVerification.list("-updated_date", 5000)
      .then(recs => {
        setRecords((recs || []).map((rec) => ({
          ...rec,
          status: normalizeArticleVerificationStatus(rec.status),
        })));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [necYear]);

  // For CalculationTrace: article_ref:year → { status, notes }
  const getStatus = React.useCallback((articleRef, year) => {
    const status = getGlobalReferenceStatus(records, articleRef, year);
    const rec = records.find(r =>
      r.article_ref === articleRef
      && r.nec_year === year
      && normalizeArticleVerificationStatus(r.status) === status
    ) || records.find(r => r.article_ref === articleRef && r.nec_year === year);
    return { status, notes: rec?.notes || null };
  }, [records]);

  // For computeGate: calc-specific status wins, then global article_ref/year status.
  const verificationMap = React.useMemo(() => {
    const map = {};
    for (const r of records) {
      const status = normalizeArticleVerificationStatus(r.status);
      map[`${r.calculator_id}|${r.article_ref}|${r.nec_year}`] = status;
      const refKey = globalReferenceKey(r.article_ref, r.nec_year);
      map[refKey] = mergeReferenceStatus(map[refKey], status);
    }
    return map;
  }, [records]);

  return { getStatus, verificationMap, isLoading };
}