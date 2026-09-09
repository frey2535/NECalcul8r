import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";

const individualPriceId = import.meta.env?.VITE_STRIPE_PRICE_INDIVIDUAL_36_PLUS
  || import.meta.env?.VITE_STRIPE_INDIVIDUAL_PRICE_ID
  || "";
const companyPriceId = import.meta.env?.VITE_STRIPE_PRICE_COMPANY_0_10
  || import.meta.env?.VITE_STRIPE_COMPANY_PRICE_ID
  || "";

async function invokeCommerceFunction(functionName, payload) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke(functionName, { body: payload });
  if (error) throw error;
  return data;
}

async function redirectToCheckout(payload) {
  const data = await invokeCommerceFunction("create-stripe-checkout", payload);
  if (!data?.url) throw new Error("Checkout did not return a redirect URL.");
  window.location.assign(data.url);
}

function companyTierForSeats(seats) {
  const count = Math.max(1, Number(seats) || 1);
  if (count <= 10) return "company_0_10";
  if (count <= 20) return "company_11_20";
  return "company_unlimited";
}

export const commerce = {
  isConfigured: isSupabaseConfigured,
  hasIndividualCheckout: isSupabaseConfigured && Boolean(individualPriceId),
  hasCompanyCheckout: isSupabaseConfigured && Boolean(companyPriceId),

  /**
   * @param {{
   *   accountType?: string,
 *   planKey?: string,
   *   customerTierId?: string,
   *   calculatorTierId?: string,
   *   priceId?: string,
   *   quantity?: number,
 *   seats?: number,
   *   successUrl?: string,
   *   cancelUrl?: string
   * }} options
   */
  async startCheckout(options = {}) {
    const {
      accountType = "individual",
      planKey,
      customerTierId,
      calculatorTierId,
      priceId,
      quantity = 1,
      seats = 1,
      successUrl,
      cancelUrl,
    } = options;
    return redirectToCheckout({
      mode: "subscription",
      accountType,
      planKey,
      customerTierId,
      calculatorTierId,
      priceId,
      quantity,
      seats,
      successUrl: successUrl || `${window.location.origin}/`,
      cancelUrl: cancelUrl || `${window.location.origin}/purchase`,
    });
  },

  /**
   * @param {{ successUrl?: string, cancelUrl?: string }} options
   */
  async startIndividualCheckout(options = {}) {
    const { successUrl, cancelUrl } = options;
    return this.startCheckout({
      accountType: "individual",
      planKey: "individual_36_plus",
      priceId: individualPriceId,
      successUrl: successUrl || `${window.location.origin}/`,
      cancelUrl: cancelUrl || window.location.href,
    });
  },

  /**
   * @param {{ seats?: number, successUrl?: string, cancelUrl?: string }} options
   */
  async startCompanyCheckout(options = {}) {
    const { seats = 1, successUrl, cancelUrl } = options;
    return this.startCheckout({
      accountType: "company",
      customerTierId: companyTierForSeats(seats),
      planKey: companyTierForSeats(seats),
      priceId: companyPriceId,
      quantity: 1,
      seats,
      successUrl: successUrl || `${window.location.origin}/admin/users`,
      cancelUrl: cancelUrl || window.location.href,
    });
  },

  /**
   * @param {{ returnUrl?: string }} options
   */
  async openBillingPortal(options = {}) {
    const { returnUrl } = options;
    const data = await invokeCommerceFunction("create-stripe-portal-session", {
      returnUrl: returnUrl || window.location.href,
    });
    if (!data?.url) throw new Error("Billing portal did not return a redirect URL.");
    window.location.assign(data.url);
  },

  /**
   * @param {{ sessionId?: string }} options
   */
  async syncStripeCheckoutSession(options = {}) {
    const { sessionId } = options;
    return invokeCommerceFunction("sync-stripe-checkout-session", { sessionId });
  },

  /**
 * @param {{ orgId?: string, seats?: number, expiresAt?: string, accessType?: string, planKey?: string, customerTierId?: string, calculatorTierId?: string, note?: string }} options
   */
  async grantExternalCompanyAccess(options = {}) {
  const { orgId, seats, expiresAt, accessType = "external_company", planKey, customerTierId, calculatorTierId, note } = options;
    return invokeCommerceFunction("grant-access", {
      orgId,
      seats,
      expiresAt,
      accessType,
    planKey,
    customerTierId,
    calculatorTierId,
      source: "company_external",
      note,
    });
  },

  /**
 * @param {{ productId?: string, purchaseToken?: string, basePlanId?: string }} options
   */
  async verifyGooglePlayPurchase(options = {}) {
  const { productId, purchaseToken, basePlanId } = options;
    return invokeCommerceFunction("verify-google-play-purchase", {
      productId,
      purchaseToken,
    basePlanId,
      source: "google_play",
    });
  },

  /**
   * @param {{ receiptData?: string, transactionId?: string }} options
   */
  async verifyApplePurchase(options = {}) {
    const { receiptData, transactionId } = options;
    return invokeCommerceFunction("verify-apple-purchase", {
      receiptData,
      transactionId,
      source: "apple_app_store",
    });
  },
};
