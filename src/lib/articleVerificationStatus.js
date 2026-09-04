export function normalizeArticleVerificationStatus(status) {
  if (!status) return "pending_review";
  if (status === "verified" || /^verified_\d{4}$/.test(status)) return "verified";
  return status;
}

export function isArticleVerificationStatusVerified(status) {
  return normalizeArticleVerificationStatus(status) === "verified";
}
