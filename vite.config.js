import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const buildSha = [
  process.env.VITE_APP_BUILD_SHA,
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.GITHUB_SHA,
  process.env.VERCEL_GIT_COMMIT_SHA,
  process.env.COMMIT_SHA,
].find((value) => typeof value === "string" && value.trim())?.trim() || "local";

const builtAt = buildSha === "local"
  ? "local"
  : (process.env.VITE_APP_BUILT_AT || process.env.BUILD_TIME || new Date().toISOString());

function buildVersionPlugin() {
  return {
    name: "necalcul8r-build-version",
    apply: "build",
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir
        ? path.resolve(rootDir, outputOptions.dir)
        : path.resolve(rootDir, "dist");

      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, "build-version.json"),
        `${JSON.stringify({ sha: buildSha, builtAt })}\n`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
  define: {
    "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(buildSha),
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    port: 5176,
    host: true,
  },
});
