export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      reloadFresh();
    });

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      const promptUpdate = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller) return;
        window.dispatchEvent(new CustomEvent("necalcul8r-update-available", {
          detail: {
            source: "service-worker",
            applyUpdate: () => registration.waiting?.postMessage({ type: "NECALCUL8R_SKIP_WAITING" }),
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

function watchForBuildUpdates() {
  const currentSha = import.meta.env.VITE_APP_BUILD_SHA || "";
  if (!currentSha || currentSha === "local") return;

  let promptedSha = "";
  const check = async () => {
    try {
      const response = await fetch(`/build-version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json();
      if (!next?.sha || next.sha === currentSha || next.sha === promptedSha) return;
      promptedSha = next.sha;
      window.dispatchEvent(new CustomEvent("necalcul8r-update-available", {
        detail: {
          source: "build-version",
          applyUpdate: reloadFresh,
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

function reloadFresh() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "NECALCUL8R_CLEAR_CACHES" });
  } catch {
    /* cache clearing is best-effort */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("app-update", String(Date.now()));
  window.location.replace(url.toString());
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
