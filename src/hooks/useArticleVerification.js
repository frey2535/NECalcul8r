import React from "react";
import { base44 } from "@/api/base44Client";
import { normalizeArticleVerificationStatus } from "@/lib/articleVerificationStatus";

/**
 * Loads ArticleVerification records for a given necYear.
 *
 * Returns:
 *   getStatus(articleRef, year)  — used by CalculationTrace for per-ref display
 *   verificationMap              — { "calcId|article_ref|year": status } for computeGate
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
    const rec = records.find(r => r.article_ref === articleRef && r.nec_year === year);
    return { status: normalizeArticleVerificationStatus(rec?.status), notes: rec?.notes || null };
  }, [records]);

  // For computeGate: calcId|article_ref|year → status string
  const verificationMap = React.useMemo(() => {
    const map = {};
    for (const r of records) {
      map[`${r.calculator_id}|${r.article_ref}|${r.nec_year}`] = normalizeArticleVerificationStatus(r.status);
    }
    return map;
  }, [records]);

  return { getStatus, verificationMap, isLoading };
}