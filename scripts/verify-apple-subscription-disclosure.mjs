import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "esbuild";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(new URL("../src/components/billing/AppleSubscriptionDisclosure.jsx", import.meta.url), "utf8");
const purchase = fs.readFileSync(new URL("../src/pages/Purchase.jsx", import.meta.url), "utf8");
const profile = fs.readFileSync(new URL("../src/pages/Profile.jsx", import.meta.url), "utf8");
const transformed = transformSync(source, { loader: "jsx", format: "cjs", jsx: "transform" });
const module = { exports: {} };
const localRequire = (id) => {
  if (id === "react") return React;
  throw new Error(`Unexpected import: ${id}`);
};
const factory = new Function("require", "module", "exports", "React", transformed.code);
factory(localRequire, module, module.exports, React);
const AppleSubscriptionDisclosure = module.exports.default;

const html = renderToStaticMarkup(
  React.createElement(AppleSubscriptionDisclosure, {
    planLabel: "Individual 36+",
    priceLabel: "$49.99",
  }),
);

assert(html.includes("Individual 36+"), "disclosure should name the selected subscription");
assert(html.includes("auto-renewable subscription"), "disclosure should state that the plan auto-renews");
assert(html.includes("Length: 1 month"), "disclosure should state the one-month length");
assert(html.includes("Price: $49.99 per month"), "disclosure should show the price and monthly unit");
assert(html.includes('href="/privacy"'), "disclosure should link to the privacy policy");
assert(html.includes('href="/terms"'), "disclosure should link to the terms of use");
assert(html.includes('href="/eula"'), "disclosure should link to the EULA");
assert(html.includes("Settings → Apple ID → Subscriptions"), "disclosure should explain how to cancel");
assert(purchase.includes("usesAppleIap &&"), "purchase screen should show the disclosure for App Store purchases");
assert(purchase.includes("<AppleSubscriptionDisclosure"), "purchase screen should render the App Store disclosure");
assert(profile.includes("openAppleAppStoreSubscriptionManagement"), "profile should open App Store subscription management");
assert(profile.includes("does not cancel your App Store subscription"), "account deletion should warn that App Store billing continues");
assert(profile.includes("if (isAppleBillingUser || isIosNative)"), "iOS profile should manage App Store subscriptions before Stripe");

console.log("Apple subscription disclosure verification passed.");
