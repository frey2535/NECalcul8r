export function normalizeArticleVerificationStatus(status) {
  if (!status) return "pending_review";
  if (status === "verified") return "verified";
  if (/^verified_\d{4}$/.test(status)) return "pending_review";
  return status;
}

export function isArticleVerificationStatusVerified(status) {
  return normalizeArticleVerificationStatus(status) === "verified";
}
