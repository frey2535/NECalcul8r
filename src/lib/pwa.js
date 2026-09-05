export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  installStaleAssetRecovery();
  if (!("serviceWorker" in navigator)) {
    watchForBuildUpdates();
    return;
  }
  if (new URL(window.location.href).searchParams.has("t")) {
    window.setTimeout(() => {
      sessionStorage.removeItem("necalcul8r_update_in_progress");
      sessionStorage.removeItem("necalcul8r_stale_asset_reloaded");
    }, 5000);
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      const promptUpdate = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller) return;
        window.dispatchEvent(new CustomEvent("necalcul8r-update-available", {
          detail: {
            source: "service-worker",
            applyUpdate: () => applyServiceWorkerUpdate(registration),
          },
        }));
      };

      promptUpdate();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") promptUpdate();
        });
      });

      window.addEventListener("focus", () => registration.update().catch(() => undefined));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => undefined);
      });
      window.setInterval(() => registration.update().catch(() => undefined), 60 * 1000);
    }).catch(() => {
      /* install prompt still works without a worker in some browsers */
    });
  });

  watchForBuildUpdates();
}

function installStaleAssetRecovery() {
  const recover = (error) => {
    const message = String(error?.message || error || "");
    if (!/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)) return;
    reloadFreshOnce();
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadFreshOnce();
  });
  window.addEventListener("unhandledrejection", (event) => recover(event.reason));
  window.addEventListener("error", (event) => recover(event.error || event.message));
}

function reloadFreshOnce() {
  const key = "necalcul8r_stale_asset_reloaded";
  try {
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
  reloadFresh();
}

function watchForBuildUpdates() {
  const currentSha = import.meta.env.VITE_APP_BUILD_SHA || "";
  if (!currentSha || currentSha === "local") return;

  let promptedSha = "";
  const check = async () => {
    try {
      if (sessionStorage.getItem("necalcul8r_update_in_progress") === "1") return;
      const response = await fetch(`/build-version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json();
      if (!next?.sha || next.sha === currentSha || next.sha === promptedSha) return;
      if (next.sha === sessionStorage.getItem("necalcul8r_update_attempted_sha")) return;
      promptedSha = next.sha;
      window.dispatchEvent(new CustomEvent("necalcul8r-update-available", {
        detail: {
          source: "build-version",
          targetSha: next.sha,
          applyUpdate: () => reloadFresh(next.sha),
        },
      }));
    } catch {
      /* update checks should never interrupt app usage */
    }
  };

  window.setTimeout(check, 10 * 1000);
  window.setInterval(check, 60 * 1000);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}

async function applyServiceWorkerUpdate(registration) {
  sessionStorage.setItem("necalcul8r_update_in_progress", "1");
  try {
    registration.waiting?.postMessage({ type: "NECALCUL8R_SKIP_WAITING" });
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  } catch {
    /* skipWaiting is best-effort; the network reload below still fetches the newest app shell */
  }
  await reloadFresh();
}

export async function refreshApp(targetSha) {
  await reloadFresh(targetSha);
}

async function reloadFresh(targetSha) {
  sessionStorage.setItem("necalcul8r_update_in_progress", "1");
  if (targetSha) sessionStorage.setItem("necalcul8r_update_attempted_sha", targetSha);
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "NECALCUL8R_CLEAR_CACHES" });
  } catch {
    /* cache clearing is best-effort */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* cache clearing is best-effort */
  }
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("t", String(Date.now()));
  if (targetSha) nextUrl.searchParams.set("build", targetSha);
  window.location.replace(nextUrl.toString());
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export function getInstallPlatform() {
  if (typeof navigator === "undefined") {
    return { isIOS: false, isAndroid: false, isMobile: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  return {
    isIOS,
    isAndroid,
    isMobile: isIOS || isAndroid || window.matchMedia("(max-width: 768px)").matches,
  };
}
