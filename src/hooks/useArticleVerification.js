import React from "react";
import { base44 } from "@/api/base44Client";

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
        setRecords(recs);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [necYear]);

  // For CalculationTrace: article_ref:year → { status, notes }
  const getStatus = React.useCallback((articleRef, year) => {
    const rec = records.find(r => r.article_ref === articleRef && r.nec_year === year);
    return { status: rec?.status || "pending_review", notes: rec?.notes || null };
  }, [records]);

  // For computeGate: calcId|article_ref|year → status string
  const verificationMap = React.useMemo(() => {
    const map = {};
    for (const r of records) {
      map[`${r.calculator_id}|${r.article_ref}|${r.nec_year}`] = r.status || "pending_review";
    }
    return map;
  }, [records]);

  return { getStatus, verificationMap, isLoading };
}