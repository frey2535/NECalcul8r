import { Capacitor, registerPlugin } from "@capacitor/core";
import { base44 } from "@/api/base44Client";
import { APPLE_APP_STORE_PRODUCT_IDS } from "@/lib/pricing";

const AppleAppStoreBilling = registerPlugin("AppleAppStoreBilling");
const IOS_BUNDLE_ID = import.meta.env?.VITE_IOS_BUNDLE_ID || "com.currentflow.necalcul8r";

export function isIosNativeApp() {
  return Capacitor.getPlatform?.() === "ios" && Capacitor.isNativePlatform?.();
}

function unimplementedBillingMessage() {
  return "Apple In-App Purchase is missing from this installed app build. Install a TestFlight or App Store build that includes StoreKit billing, then try again.";
}

async function assertBillingPluginAvailable() {
  if (!isIosNativeApp()) {
    throw new Error("Apple In-App Purchase is only available in the iOS app.");
  }
  if (typeof Capacitor.isPluginAvailable === "function" && !Capacitor.isPluginAvailable("AppleAppStoreBilling")) {
    throw new Error(unimplementedBillingMessage());
  }
  try {
    await AppleAppStoreBilling.isAvailable();
  } catch (error) {
    const message = String(error?.message || error || "");
    if (/not implemented/i.test(message)) {
      throw new Error(unimplementedBillingMessage());
    }
  }
}

function rethrowBillingError(error, fallback) {
  const message = String(error?.message || error || "");
  if (/not implemented/i.test(message)) {
    throw new Error(unimplementedBillingMessage());
  }
  throw new Error(message || fallback);
}

export async function queryAppleAppStoreProducts() {
  if (!isIosNativeApp()) return [];
  await assertBillingPluginAvailable();
  try {
    const result = await AppleAppStoreBilling.queryProducts({
      productIds: APPLE_APP_STORE_PRODUCT_IDS,
    });
    return result?.products || [];
  } catch (error) {
    rethrowBillingError(error, "Could not load App Store products.");
  }
}

export async function purchaseAppleAppStorePlan(plan) {
  if (!plan?.appleAppStoreProductId) {
    throw new Error("This plan is not available through the App Store.");
  }
  await assertBillingPluginAvailable();
  try {
    const result = await AppleAppStoreBilling.purchase({
      productId: plan.appleAppStoreProductId,
    });
    return verifyApplePurchases(result?.purchases || []);
  } catch (error) {
    rethrowBillingError(error, "App Store purchase failed.");
  }
}

export async function restoreAppleAppStorePurchases() {
  await assertBillingPluginAvailable();
  try {
    const result = await AppleAppStoreBilling.restorePurchases();
    return verifyApplePurchases(result?.purchases || []);
  } catch (error) {
    rethrowBillingError(error, "Could not restore App Store purchases.");
  }
}

export function appleAppStoreSubscriptionManagementUrl() {
  return "https://apps.apple.com/account/subscriptions";
}

export function openAppleAppStoreSubscriptionManagement() {
  window.location.assign(appleAppStoreSubscriptionManagementUrl());
}

export function appleAppStoreBundleId() {
  return IOS_BUNDLE_ID;
}

async function verifyApplePurchases(purchases) {
  const verified = [];
  for (const purchase of purchases) {
    const productId = purchase.productId || (purchase.products || []).find((id) => APPLE_APP_STORE_PRODUCT_IDS.includes(id));
    if (!productId || !APPLE_APP_STORE_PRODUCT_IDS.includes(productId)) continue;
    if (!purchase.transactionId && !purchase.signedTransaction) continue;
    verified.push(await base44.commerce.verifyApplePurchase({
      productId,
      transactionId: purchase.transactionId,
      signedTransaction: purchase.signedTransaction,
      receiptData: purchase.receiptData,
      source: "apple_app_store",
    }));
  }
  if (!verified.length) {
    throw new Error("No active NECalcul8r App Store purchase was found for this signed-in account.");
  }
  return verified;
}
