const CACHE = "necalcul8r-shell-v4";
const SHELL_ASSETS = ["/logo.png", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => undefined)
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const oldCaches = keys.filter((key) => key !== CACHE);
      await Promise.all(oldCaches.map((key) => caches.delete(key)));
      await self.clients.claim();
      if (oldCaches.length === 0) return;
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(clients.map((client) => {
        const url = new URL(client.url);
        if (url.searchParams.get("sw") === CACHE) return client.postMessage({ type: "NECALCUL8R_SW_UPDATED", cache: CACHE });
        url.searchParams.set("t", String(Date.now()));
        url.searchParams.set("sw", CACHE);
        return client.navigate(url.toString()).catch(() => client.postMessage({ type: "NECALCUL8R_SW_UPDATED", cache: CACHE }));
      }));
    })
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
