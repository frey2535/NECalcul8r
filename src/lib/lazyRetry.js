/**
 * Wraps a dynamic import with a one-time page reload fallback.
 *
 * Vite (and most bundlers) serve lazy chunks from hashed URLs. When the
 * dev server rebuilds, the old hashed URL the browser is holding becomes
 * stale and `import()` rejects with
 *   "Failed to fetch dynamically imported module".
 * Reloading the page fetches a fresh index.html with up-to-date chunk URLs.
 *
 * A sessionStorage flag prevents an infinite reload loop if the chunk is
 * genuinely broken (e.g. a real syntax error) — the second load will not
 * retry again and the error will surface normally.
 */
export function lazyRetry(importFn, name = "chunk") {
  return () =>
    importFn().catch((error) => {
      const isChunkLoadError =
        error?.name === "ChunkLoadError" ||
        /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(error?.message || "");

      if (!isChunkLoadError) throw error;

      const flag = `__lazy_retry_${name}`;
      try {
        if (sessionStorage.getItem(flag)) {
          sessionStorage.removeItem(flag);
          throw error; // already retried — surface the real error
        }
        sessionStorage.setItem(flag, "1");
      } catch {
        // sessionStorage may be unavailable (private mode) — skip the guard
      }

      const url = new URL(window.location.href);
      url.searchParams.set("t", String(Date.now()));
      window.location.replace(url.toString());
      // Return a never-resolving promise so React Suspense stays pending
      // while the reload is in flight, instead of throwing immediately.
      return new Promise(() => {});
    });
}