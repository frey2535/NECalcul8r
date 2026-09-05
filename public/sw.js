const CACHE = "necalcul8r-shell-v3";
const SHELL_ASSETS = ["/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => undefined)
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
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
  if (url.pathname.startsWith("/@") || url.pathname.startsWith("/node_modules") || url.search.includes("t=")) return;
  const isAppShell = request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname === "/build-version.json";
  const isAppAsset = url.pathname.startsWith("/assets/");

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 404 && isAppAsset && url.pathname.endsWith(".js")) {
          return new Response(
            "window.location.replace('/?t=' + Date.now());\nexport default {};",
            { headers: { "Content-Type": "application/javascript; charset=utf-8" } }
          );
        }
        if (!isAppShell && !isAppAsset && response && response.ok && request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("/");
        return Response.error();
      })
  );
});
