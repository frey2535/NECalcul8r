/** Detect Android native clients without requiring a custom CORS header. */
export function isAndroidClient(req: Request, payload: Record<string, unknown> = {}) {
  const headerPlatform = (req.headers.get("x-necalcul8r-client-platform") || "").toLowerCase();
  const bodyPlatform = String(payload.clientPlatform || payload.platform || "").toLowerCase();
  return headerPlatform === "android" || bodyPlatform === "android";
}
