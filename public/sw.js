const CACHE = "necalcul8r-shell-v8";
const SHELL_ASSETS = ["/logo.png", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => undefined)
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(clients.map((client) => {
      const url = new URL(client.url);
      if (url.searchParams.get("sw") === CACHE) {
        return client.postMessage({ type: "NECALCUL8R_SW_UPDATED", cache: CACHE });
      }
      url.searchParams.set("t", String(Date.now()));
      url.searchParams.set("sw", CACHE);
      return client.navigate(url.toString()).catch(() =>
        client.postMessage({ type: "NECALCUL8R_SW_UPDATED", cache: CACHE })
      );
    }));
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "NECALCUL8R_SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "NECALCUL8R_CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/@") || url.pathname.startsWith("/node_modules")) return;

  const isNavigation = request.mode === "navigate";
  const isAppShell = isNavigation
    || url.pathname === "/"
    || url.pathname.endsWith(".html")
    || url.pathname === "/build-version.json"
    || url.pathname === "/sw.js"
    || url.pathname === "/manifest.json";
  const isAppAsset = url.pathname.startsWith("/assets/");

  // Bypass GitHub Pages HTTP cache (max-age=600) for shell documents so installed
  // PWAs pick up new releases without delete/reinstall.
  const networkRequest = isAppShell
    ? new Request(request, { cache: "no-store" })
    : request;

  event.respondWith(
    fetch(networkRequest)
      .then((response) => {
        if (response.status === 404 && isAppAsset && url.pathname.endsWith(".js")) {
          return new Response(
            "window.location.replace('/?t=' + Date.now());\nexport default {};",
            { headers: { "Content-Type": "application/javascript; charset=utf-8" } }
          );
        }
        // Never cache HTML/app shell. Only cache immutable hashed assets offline-friendly icons.
        if (!isAppShell && !isAppAsset && response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        if (isAppShell || isNavigation) {
          // Prefer failing closed over serving a stale app shell when offline HTML is unknown.
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            "<!doctype html><title>NECalcul8r</title><p>You appear offline. Reconnect and reopen NECalcul8r.</p><script>setTimeout(function(){location.reload();},3000);</script>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
          );
        }
        const cached = await caches.match(request);
        return cached || Response.error();
      })
  );
});
