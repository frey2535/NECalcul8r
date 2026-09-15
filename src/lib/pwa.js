const UPDATE_ATTEMPT_KEY = "necalcul8r_update_attempted_sha";
const UPDATE_ATTEMPT_RETRY_MS = 60 * 1000;
const UPDATE_IN_PROGRESS_KEY = "necalcul8r_update_in_progress";
const UPDATE_IN_PROGRESS_MAX_MS = 30 * 1000;
const STALE_ASSET_RELOADED_KEY = "necalcul8r_stale_asset_reloaded";
const MANDATORY_UPDATE_AUTO_APPLY_MS = 800;
const STANDALONE_UPDATE_AUTO_APPLY_MS = 100;

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

function autoApplyDelayMs(required = true) {
  if (!required) return 30 * 1000;
  return isStandalonePwa() ? STANDALONE_UPDATE_AUTO_APPLY_MS : MANDATORY_UPDATE_AUTO_APPLY_MS;
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  installStaleAssetRecovery();
  clearStaleUpdateLock();
  if (!("serviceWorker" in navigator)) {
    watchForBuildUpdates();
    return;
  }
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NECALCUL8R_SW_UPDATED") {
      reloadFresh();
    }
  });
  if (new URL(window.location.href).searchParams.has("t")) {
    window.setTimeout(() => {
      sessionStorage.removeItem(UPDATE_IN_PROGRESS_KEY);
      sessionStorage.removeItem(STALE_ASSET_RELOADED_KEY);
    }, 5000);
  }
  window.addEventListener("load", () => {
    // Bust GitHub Pages HTTP caching of sw.js (max-age=600) on every deploy.
    const swUrl = `/sw.js?v=${encodeURIComponent(import.meta.env.VITE_APP_BUILD_SHA || "dev")}`;
    navigator.serviceWorker.register(swUrl).then((registration) => {
      const promptUpdate = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller) return;
        dispatchUpdateAvailable({
          source: "service-worker",
          required: true,
          autoApplyAfterMs: autoApplyDelayMs(true),
          applyUpdate: () => applyServiceWorkerUpdate(registration),
        });
      };

      promptUpdate();
      registration.update().catch(() => undefined);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") window.setTimeout(promptUpdate, 0);
        });
      });

      const checkWorker = () => registration.update().catch(() => undefined);
      window.addEventListener("focus", checkWorker);
      window.addEventListener("pageshow", checkWorker);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkWorker();
      });
      window.setInterval(checkWorker, isStandalonePwa() ? 20 * 1000 : 60 * 1000);
    }).catch(() => {
      /* install prompt still works without a worker in some browsers */
    });
  });

  watchForBuildUpdates();
}

function clearStaleUpdateLock() {
  try {
    const raw = sessionStorage.getItem(UPDATE_IN_PROGRESS_KEY);
    if (!raw) return;
    if (raw === "1") {
      sessionStorage.removeItem(UPDATE_IN_PROGRESS_KEY);
      return;
    }
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > UPDATE_IN_PROGRESS_MAX_MS) {
      sessionStorage.removeItem(UPDATE_IN_PROGRESS_KEY);
    }
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
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
  try {
    if (sessionStorage.getItem(STALE_ASSET_RELOADED_KEY) === "1") return;
    sessionStorage.setItem(STALE_ASSET_RELOADED_KEY, "1");
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
  reloadFresh();
}

function readUpdateAttempt() {
  try {
    const raw = sessionStorage.getItem(UPDATE_ATTEMPT_KEY);
    if (!raw) return null;
    if (!raw.startsWith("{")) return { sha: raw, attemptedAt: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed?.sha) return null;
    return { sha: parsed.sha, attemptedAt: Number(parsed.attemptedAt) || 0 };
  } catch {
    return null;
  }
}

function rememberUpdateAttempt(targetSha) {
  if (!targetSha) return;
  try {
    sessionStorage.setItem(UPDATE_ATTEMPT_KEY, JSON.stringify({
      sha: targetSha,
      attemptedAt: Date.now(),
    }));
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
}

function watchForBuildUpdates() {
  const currentSha = import.meta.env.VITE_APP_BUILD_SHA || window.__NECALCUL8R_BUILD_SHA__ || "";
  if (!currentSha || currentSha === "local") return;

  const attemptedAtBoot = readUpdateAttempt();
  if (attemptedAtBoot?.sha === currentSha) {
    try {
      sessionStorage.removeItem(UPDATE_ATTEMPT_KEY);
    } catch {
      /* sessionStorage can be unavailable in private mode */
    }
  }

  let promptedSha = "";
  const check = async () => {
    try {
      clearStaleUpdateLock();
      const inProgress = sessionStorage.getItem(UPDATE_IN_PROGRESS_KEY);
      if (inProgress && inProgress !== "1") {
        const startedAt = Number(inProgress);
        if (Number.isFinite(startedAt) && Date.now() - startedAt < UPDATE_IN_PROGRESS_MAX_MS) return;
        sessionStorage.removeItem(UPDATE_IN_PROGRESS_KEY);
      } else if (inProgress === "1") {
        sessionStorage.removeItem(UPDATE_IN_PROGRESS_KEY);
      }
      const response = await fetch(`/build-version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json();
      if (!next?.sha || next.sha === currentSha || next.sha === promptedSha) return;
      const attempted = readUpdateAttempt();
      if (
        attempted?.sha === next.sha &&
        Date.now() - attempted.attemptedAt < UPDATE_ATTEMPT_RETRY_MS
      ) {
        return;
      }
      promptedSha = next.sha;
      dispatchUpdateAvailable({
        source: "build-version",
        targetSha: next.sha,
        required: true,
        autoApplyAfterMs: autoApplyDelayMs(true),
        applyUpdate: () => reloadFresh(next.sha),
      });
    } catch {
      /* update checks should never interrupt app usage */
    }
  };

  window.setTimeout(check, 250);
  window.setTimeout(check, 2 * 1000);
  window.setTimeout(check, 10 * 1000);
  window.setInterval(check, isStandalonePwa() ? 20 * 1000 : 60 * 1000);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}

function dispatchUpdateAvailable(detail) {
  window.__necalcul8rPendingUpdate = detail;
  window.dispatchEvent(new CustomEvent("necalcul8r-update-available", { detail }));
}

async function applyServiceWorkerUpdate(registration) {
  try {
    sessionStorage.setItem(UPDATE_IN_PROGRESS_KEY, String(Date.now()));
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
  try {
    registration.waiting?.postMessage({ type: "NECALCUL8R_SKIP_WAITING" });
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  } catch {
    /* skipWaiting is best-effort; the network reload below still fetches the newest app shell */
  }
  await reloadFresh();
}

export async function refreshApp(targetSha) {
  clearAppErrorState();
  const pendingUpdate = window.__necalcul8rPendingUpdate;
  const nextTargetSha = targetSha || pendingUpdate?.targetSha;
  if (typeof pendingUpdate?.applyUpdate === "function") {
    try {
      await pendingUpdate.applyUpdate();
      return;
    } catch {
      /* fall back to the cache-clearing reload below */
    }
  }
  await reloadFresh(nextTargetSha);
}

export function clearAppErrorState() {
  try {
    sessionStorage.removeItem(UPDATE_ATTEMPT_KEY);
    sessionStorage.removeItem(UPDATE_IN_PROGRESS_KEY);
    sessionStorage.removeItem(STALE_ASSET_RELOADED_KEY);
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent("necalcul8r-clear-errors"));
  } catch {
    /* event dispatch is best-effort before the reload */
  }
}

async function reloadFresh(targetSha) {
  try {
    sessionStorage.setItem(UPDATE_IN_PROGRESS_KEY, String(Date.now()));
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
  rememberUpdateAttempt(targetSha);
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
  return isStandalonePwa();
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
