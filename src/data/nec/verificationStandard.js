const UNVERIFIED_SOURCES = new Set([
  "developer assumption",
  "pending manual review",
  "pending manual/codebook verification",
  "unverified",
]);

const REQUIRED_DIMENSIONS = [
  "official NEC article text verified",
  "tables verified",
  "exceptions reviewed",
  "applicability/scope reviewed",
  "year-specific differences reviewed",
  "all displayed output fields tested",
  "UI/saved-result mapping tested",
];

function sourceIsVerified(source) {
  if (!source) return false;
  return !UNVERIFIED_SOURCES.has(source);
}

function refLooksLikeTable(ref = "") {
  return /\btable\b|ch\.?9/i.test(ref);
}

function textMentionsException(value = "") {
  return /\bexception\b|\bexcept\b|\bnot applicable\b|\bwhere\b/i.test(value);
}

function articleHasExceptionReview(article) {
  return textMentionsException(article.ref)
    || textMentionsException(article.desc)
    || textMentionsException(article.note);
}

export function auditCalculator(calc) {
  const articles = calc.articles || [];
  const unverifiedArticles = articles.filter((article) => !sourceIsVerified(article.source));
  const tableRefs = articles.filter((article) => refLooksLikeTable(article.ref) || refLooksLikeTable(article.desc));
  const exceptionRefs = articles.filter(articleHasExceptionReview);

  const gaps = [];
  if (articles.length === 0 && calc.usesGetNecData) {
    gaps.push("uses NEC data but declares no article/table references");
  }
  if (unverifiedArticles.length > 0) {
    gaps.push(`${unverifiedArticles.length} article/table reference(s) are not officially verified`);
  }
  if (tableRefs.length === 0 && articles.length > 0) {
    gaps.push("no table references declared");
  }
  if (!calc.sourceNotes) {
    gaps.push("missing source notes");
  }
  if (!calc.testInputs) {
    gaps.push("missing audit test inputs");
  }
  if (typeof calc.calculate !== "function" && articles.length > 0) {
    gaps.push("missing audit output projection");
  }
  if (articles.some((article) => article.note && textMentionsException(article.note)) && exceptionRefs.length === 0) {
    gaps.push("exception language exists but no exception review is declared");
  }

  return {
    id: calc.id,
    name: calc.name,
    category: calc.category || "Uncategorized",
    releaseReady: gaps.length === 0,
    requiredDimensions: REQUIRED_DIMENSIONS,
    declaredArticleCount: articles.length,
    declaredTableCount: tableRefs.length,
    declaredExceptionReviewCount: exceptionRefs.length,
    unverifiedArticleCount: unverifiedArticles.length,
    unverifiedArticles: unverifiedArticles.map((article) => ({
      ref: article.ref,
      source: article.source || "missing source",
      desc: article.desc,
      note: article.note,
    })),
    gaps,
  };
}

export function auditCalculators(calculators) {
  const calculatorsByStatus = (calculators || []).map(auditCalculator);
  const releaseReady = calculatorsByStatus.filter((calc) => calc.releaseReady);
  const blocked = calculatorsByStatus.filter((calc) => !calc.releaseReady);
  return {
    total: calculatorsByStatus.length,
    releaseReadyCount: releaseReady.length,
    blockedCount: blocked.length,
    releaseReady,
    blocked,
  };
}

export { REQUIRED_DIMENSIONS, UNVERIFIED_SOURCES };
