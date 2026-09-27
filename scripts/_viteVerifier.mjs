import { createServer } from "vite";

export function createVerifierServer(options = {}) {
  return createServer({
    ...options,
    appType: options.appType ?? "custom",
    logLevel: options.logLevel ?? "error",
    optimizeDeps: {
      noDiscovery: true,
      ...(options.optimizeDeps ?? {}),
    },
    server: {
      middlewareMode: true,
      ...(options.server ?? {}),
    },
  });
}
