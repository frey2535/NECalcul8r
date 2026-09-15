import { Capacitor, registerPlugin } from "@capacitor/core";
import { base44 } from "@/api/base44Client";
import { GOOGLE_PLAY_PRODUCT_IDS, getPlanOption } from "@/lib/pricing";

const GooglePlayBilling = registerPlugin("GooglePlayBilling");
const GOOGLE_PLAY_BASE_PLAN_ID = import.meta.env?.VITE_GOOGLE_PLAY_BASE_PLAN_ID || "monthly";
const ANDROID_PACKAGE_NAME = import.meta.env?.VITE_ANDROID_PACKAGE_NAME || "com.currentflow.necalcul8r";

export function isAndroidNativeApp() {
  return Capacitor.getPlatform?.() === "android" && Capacitor.isNativePlatform?.();
}

function unimplementedBillingMessage() {
  return "Google Play Billing is missing from this installed app build. Update NECalcul8r from the Play Store (or install a newly uploaded build), then try again.";
}

async function assertBillingPluginAvailable() {
  if (!isAndroidNativeApp()) {
    throw new Error("Google Play Billing is only available in the Android app.");
  }
  if (typeof Capacitor.isPluginAvailable === "function" && !Capacitor.isPluginAvailable("GooglePlayBilling")) {
    throw new Error(unimplementedBillingMessage());
  }
  try {
    await GooglePlayBilling.isAvailable();
  } catch (error) {
    const message = String(error?.message || error || "");
    if (/not implemented/i.test(message)) {
      throw new Error(unimplementedBillingMessage());
    }
    // Older builds may not expose isAvailable(); continue to purchase/query methods.
  }
}

function rethrowBillingError(error, fallback) {
  const message = String(error?.message || error || "");
  if (/not implemented/i.test(message)) {
    throw new Error(unimplementedBillingMessage());
  }
  throw new Error(message || fallback);
}

export async function queryGooglePlayProducts() {
  if (!isAndroidNativeApp()) return [];
  await assertBillingPluginAvailable();
  try {
    const result = await GooglePlayBilling.queryProducts({
      productIds: GOOGLE_PLAY_PRODUCT_IDS,
      basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
    });
    return result?.products || [];
  } catch (error) {
    rethrowBillingError(error, "Could not load Google Play products.");
  }
}

export async function purchaseGooglePlayPlan(plan) {
  if (!plan?.googlePlayProductId) throw new Error("This plan is not available through Google Play.");
  await assertBillingPluginAvailable();
  try {
    const result = await GooglePlayBilling.purchase({
      productId: plan.googlePlayProductId,
      basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
    });
    return verifyGooglePlayPurchases(result?.purchases || []);
  } catch (error) {
    rethrowBillingError(error, "Google Play purchase failed.");
  }
}

export async function restoreGooglePlayPurchases() {
  await assertBillingPluginAvailable();
  try {
    const result = await GooglePlayBilling.restorePurchases();
    return verifyGooglePlayPurchases(result?.purchases || []);
  } catch (error) {
    rethrowBillingError(error, "Could not restore Google Play purchases.");
  }
}

export function googlePlaySubscriptionManagementUrl(planKey) {
  const productId = getPlanOption(planKey)?.googlePlayProductId;
  const url = new URL("https://play.google.com/store/account/subscriptions");
  url.searchParams.set("package", ANDROID_PACKAGE_NAME);
  if (productId) url.searchParams.set("sku", productId);
  return url.toString();
}

export function openGooglePlaySubscriptionManagement(planKey) {
  window.location.assign(googlePlaySubscriptionManagementUrl(planKey));
}

async function verifyGooglePlayPurchases(purchases) {
  const verified = [];
  for (const purchase of purchases) {
    const productId = (purchase.products || []).find((id) => GOOGLE_PLAY_PRODUCT_IDS.includes(id));
    if (!productId || !purchase.purchaseToken) continue;
    verified.push(await base44.commerce.verifyGooglePlayPurchase({
      productId,
      basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
      purchaseToken: purchase.purchaseToken,
    }));
  }
  if (!verified.length) {
    throw new Error("No active NECalcul8r Google Play purchase was found for this signed-in account.");
  }
  return verified;
}
