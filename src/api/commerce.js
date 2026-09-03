import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";

const individualPriceId = import.meta.env.VITE_STRIPE_INDIVIDUAL_PRICE_ID || "";
const companyPriceId = import.meta.env.VITE_STRIPE_COMPANY_PRICE_ID || "";

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

export const commerce = {
  isConfigured: isSupabaseConfigured,
  hasIndividualCheckout: isSupabaseConfigured && Boolean(individualPriceId),
  hasCompanyCheckout: isSupabaseConfigured && Boolean(companyPriceId),

  /**
   * @param {{ successUrl?: string, cancelUrl?: string }} options
   */
  async startIndividualCheckout(options = {}) {
    const { successUrl, cancelUrl } = options;
    return redirectToCheckout({
      mode: "subscription",
      accountType: "individual",
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
    return redirectToCheckout({
      mode: "subscription",
      accountType: "company",
      priceId: companyPriceId,
      quantity: seats,
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
   * @param {{ orgId?: string, seats?: number, expiresAt?: string, accessType?: string, note?: string }} options
   */
  async grantExternalCompanyAccess(options = {}) {
    const { orgId, seats, expiresAt, accessType = "external_company", note } = options;
    return invokeCommerceFunction("grant-access", {
      orgId,
      seats,
      expiresAt,
      accessType,
      source: "company_external",
      note,
    });
  },

  /**
   * @param {{ productId?: string, purchaseToken?: string }} options
   */
  async verifyGooglePlayPurchase(options = {}) {
    const { productId, purchaseToken } = options;
    return invokeCommerceFunction("verify-google-play-purchase", {
      productId,
      purchaseToken,
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
