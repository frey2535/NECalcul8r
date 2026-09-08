import { Capacitor, registerPlugin } from "@capacitor/core";
import { base44 } from "@/api/base44Client";
import { GOOGLE_PLAY_PRODUCT_IDS } from "@/lib/pricing";

const GooglePlayBilling = registerPlugin("GooglePlayBilling");
const GOOGLE_PLAY_BASE_PLAN_ID = import.meta.env?.VITE_GOOGLE_PLAY_BASE_PLAN_ID || "monthly";

export function isAndroidNativeApp() {
  return Capacitor.getPlatform?.() === "android" && Capacitor.isNativePlatform?.();
}

export async function queryGooglePlayProducts() {
  if (!isAndroidNativeApp()) return [];
  const result = await GooglePlayBilling.queryProducts({
    productIds: GOOGLE_PLAY_PRODUCT_IDS,
    basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
  });
  return result?.products || [];
}

export async function purchaseGooglePlayPlan(plan) {
  if (!plan?.googlePlayProductId) throw new Error("This plan is not available through Google Play.");
  const result = await GooglePlayBilling.purchase({
    productId: plan.googlePlayProductId,
    basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
  });
  return verifyGooglePlayPurchases(result?.purchases || []);
}

export async function restoreGooglePlayPurchases() {
  const result = await GooglePlayBilling.restorePurchases();
  return verifyGooglePlayPurchases(result?.purchases || []);
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
