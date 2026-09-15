import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsPath = path.join(root, "android/app/src/main/assets/capacitor.plugins.json");
const mainActivityPath = path.join(
  root,
  "android/app/src/main/java/com/currentflow/necalcul8r/MainActivity.java",
);
const pluginClassPath = "com.currentflow.necalcul8r.GooglePlayBillingPlugin";

function fail(message) {
  console.error(`ensure-android-billing-plugin: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(mainActivityPath)) {
  fail(`Missing MainActivity at ${mainActivityPath}`);
}

const mainActivity = fs.readFileSync(mainActivityPath, "utf8");
if (!mainActivity.includes("registerPlugin(GooglePlayBillingPlugin.class)")) {
  fail("MainActivity.java must call registerPlugin(GooglePlayBillingPlugin.class) before super.onCreate().");
}

fs.mkdirSync(path.dirname(pluginsPath), { recursive: true });

let plugins = [];
if (fs.existsSync(pluginsPath)) {
  try {
    plugins = JSON.parse(fs.readFileSync(pluginsPath, "utf8"));
    if (!Array.isArray(plugins)) plugins = [];
  } catch {
    plugins = [];
  }
}

if (!plugins.some((plugin) => plugin?.classpath === pluginClassPath)) {
  plugins.push({
    pkg: "necalcul8r-local-google-play-billing",
    classpath: pluginClassPath,
  });
}

fs.writeFileSync(pluginsPath, `${JSON.stringify(plugins, null, 2)}\n`);
console.log(`ensure-android-billing-plugin: ensured ${pluginClassPath} in capacitor.plugins.json`);
