import React, { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export default function UpdateAvailablePrompt() {
  const [update, setUpdate] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const onUpdateAvailable = (event) => {
      setUpdate(event.detail || { applyUpdate: () => window.location.reload() });
    };
    window.addEventListener("necalcul8r-update-available", onUpdateAvailable);
    return () => window.removeEventListener("necalcul8r-update-available", onUpdateAvailable);
  }, []);

  if (!update) return null;

  const applyUpdate = async () => {
    if (applying) return;
    setApplying(true);
    if (update?.targetSha) {
      sessionStorage.setItem("necalcul8r_update_attempted_sha", update.targetSha);
    }
    sessionStorage.setItem("necalcul8r_update_in_progress", "1");
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: "NECALCUL8R_CLEAR_CACHES" });
      if ("caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => undefined);
      }
    } catch {
      /* cache clearing is best-effort; the fallback reload below still proceeds */
    }
    try {
      if (typeof update.applyUpdate === "function") {
        await update.applyUpdate();
        return;
      }
    } catch {
      /* fall through to the hard reload below */
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("t", String(Date.now()));
    if (update?.targetSha) nextUrl.searchParams.set("build", update.targetSha);
    window.location.replace(nextUrl.toString());
  };

  return (
    <div className="fixed left-3 right-3 bottom-3 z-[80] sm:left-auto sm:right-5 sm:max-w-sm">
      <div className="rounded-2xl border border-border/60 bg-card shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Update available</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A newer version of NECalcul8r is ready. Update to get the latest fixes.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={applyUpdate}
                disabled={applying}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 transition-colors"
              >
                {applying ? "Updating..." : "Update now"}
              </button>
              <button
                type="button"
                onClick={() => setUpdate(null)}
                className="rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold px-3 py-1.5 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUpdate(null)}
            className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
            aria-label="Dismiss update"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
