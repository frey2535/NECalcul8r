import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export default function UpdateAvailablePrompt() {
  const [update, setUpdate] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const onUpdateAvailable = (event) => {
      setUpdate(event.detail || { applyUpdate: () => window.location.reload() });
    };
    if (window.__necalcul8rPendingUpdate) {
      setUpdate(window.__necalcul8rPendingUpdate);
    }
    window.addEventListener("necalcul8r-update-available", onUpdateAvailable);
    return () => window.removeEventListener("necalcul8r-update-available", onUpdateAvailable);
  }, []);

  const applyUpdate = useCallback(async () => {
    if (applying) return;
    setApplying(true);
    if (update?.targetSha) {
      try {
        sessionStorage.setItem("necalcul8r_update_attempted_sha", JSON.stringify({
          sha: update.targetSha,
          attemptedAt: Date.now(),
        }));
      } catch {
        /* sessionStorage can be unavailable in private mode */
      }
    }
    try {
      sessionStorage.setItem("necalcul8r_update_in_progress", String(Date.now()));
    } catch {
      /* sessionStorage can be unavailable in private mode */
    }
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
  }, [applying, update]);

  useEffect(() => {
    if (!update?.required || applying) return undefined;
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches
      || window.navigator.standalone === true;
    const delay = Number.isFinite(Number(update.autoApplyAfterMs))
      ? Number(update.autoApplyAfterMs)
      : (standalone ? 100 : 800);
    const timer = window.setTimeout(() => {
      applyUpdate();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [applying, applyUpdate, update]);

  if (!update) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="necalcul8r-update-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p id="necalcul8r-update-title" className="text-sm font-bold text-foreground">Update available</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A newer version of NECalcul8r is ready. {update.required ? "It will install automatically to keep the app working correctly." : "Update to get the latest fixes."}
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
              {!update.required && (
                <button
                  type="button"
                  onClick={() => setUpdate(null)}
                  className="rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-bold px-3 py-1.5 transition-colors"
                >
                  Later
                </button>
              )}
            </div>
          </div>
          {!update.required && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setUpdate(null);
              }}
              className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              aria-label="Dismiss update"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
