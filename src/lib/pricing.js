export const CUSTOMER_TIERS = [
  { id: "individual", label: "Individual", description: "One user account", accountType: "individual", seatLimit: 1 },
  { id: "company_0_10", label: "Company: 0-10 employees", description: "Small team access", accountType: "company", seatLimit: 10 },
  { id: "company_10_30", label: "Company: 10-30 employees", description: "Growing company access", accountType: "company", seatLimit: 30 },
  { id: "company_30_plus", label: "Company: 30+ employees", description: "Large company access", accountType: "company", seatLimit: 31 },
];

export const CALCULATOR_TIERS = [
  { id: "calc_0_5_free", label: "0-5 calculators", description: "Free starter access", calculatorLimit: 5, isFree: true },
  { id: "calc_6_15", label: "6-15 calculators", description: "Starter paid calculator access", calculatorLimit: 15 },
  { id: "calc_16_25", label: "16-25 calculators", description: "Expanded calculator access", calculatorLimit: 25 },
  { id: "calc_26_35", label: "26-35 calculators", description: "Advanced calculator access", calculatorLimit: 35 },
  { id: "calc_35_plus", label: "35+ calculators", description: "Complete suite access, including new calculators as they are added", calculatorLimit: null },
];

export const DEFAULT_CUSTOMER_TIER_ID = "individual";
export const FREE_CALCULATOR_TIER_ID = "calc_0_5_free";
export const DEFAULT_CALCULATOR_TIER_ID = "calc_35_plus";

const DEFAULT_PRICE_LABELS = {
  individual: {
    calc_0_5_free: "Free",
    calc_6_15: "$10/mo",
    calc_16_25: "$20/mo",
    calc_26_35: "$40/mo",
    calc_35_plus: "$50/mo",
  },
  company_0_10: {
    calc_0_5_free: "Free",
    calc_6_15: "$10/mo",
    calc_16_25: "$20/mo",
    calc_26_35: "$40/mo",
    calc_35_plus: "$50/mo",
  },
  company_10_30: {
    calc_0_5_free: "Free",
    calc_6_15: "$10/mo",
    calc_16_25: "$20/mo",
    calc_26_35: "$40/mo",
    calc_35_plus: "$50/mo",
  },
  company_30_plus: {
    calc_0_5_free: "Free",
    calc_6_15: "$10/mo",
    calc_16_25: "$20/mo",
    calc_26_35: "$40/mo",
    calc_35_plus: "$50/mo",
  },
};

function parseConfiguredMatrix() {
  const raw = import.meta.env?.VITE_STRIPE_PRICE_MATRIX_JSON;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.warn("VITE_STRIPE_PRICE_MATRIX_JSON is not valid JSON.");
    return {};
  }
}

const configuredMatrix = parseConfiguredMatrix();

export function getCustomerTier(customerTierId) {
  return CUSTOMER_TIERS.find((tier) => tier.id === customerTierId) || CUSTOMER_TIERS[0];
}

export function getCalculatorTier(calculatorTierId) {
  return CALCULATOR_TIERS.find((tier) => tier.id === calculatorTierId) || CALCULATOR_TIERS.find((tier) => tier.id === DEFAULT_CALCULATOR_TIER_ID) || CALCULATOR_TIERS[0];
}

export function getPricingOption(customerTierId, calculatorTierId) {
  const customerTier = getCustomerTier(customerTierId);
  const calculatorTier = getCalculatorTier(calculatorTierId);
  const key = `${customerTier.id}:${calculatorTier.id}`;
  const configured = configuredMatrix[key] || configuredMatrix[customerTier.id]?.[calculatorTier.id] || {};
  const seatLimit = Math.max(1, Number(configured.seatLimit) || customerTier.seatLimit || 1);
  const billingQuantity = Math.max(1, Number(configured.billingQuantity) || 1);

  return {
    key,
    customerTier,
    calculatorTier,
    priceId: configured.priceId || "",
    priceLabel: configured.priceLabel || DEFAULT_PRICE_LABELS[customerTier.id]?.[calculatorTier.id] || "Price configured in Stripe",
    description: configured.description || `${customerTier.label} with ${calculatorTier.label}`,
    seatLimit,
    billingQuantity,
    isFree: Boolean(calculatorTier.isFree),
  };
}

export function getPricingMatrixRows() {
  return CUSTOMER_TIERS.map((customerTier) => ({
    customerTier,
    prices: CALCULATOR_TIERS.map((calculatorTier) => getPricingOption(customerTier.id, calculatorTier.id)),
  }));
}

function hasFullCalculatorAccess(user) {
  if (!user) return false;
  if (user.is_platform_admin) return true;
  if (user.access_type === "trial" && user.access_status !== "expired" && user.access_status !== "disabled") return true;
  return user.access_type === "permanent" || user.access_type === "buildrpro_included";
}

const PAID_ACCESS_TYPES = new Set([
  "paid",
  "external_company",
  "company_seat",
  "app_store",
  "google_play",
  "apple_app_store",
]);

export function getEffectiveCalculatorTierId(user) {
  if (hasFullCalculatorAccess(user)) return DEFAULT_CALCULATOR_TIER_ID;
  if (user?.access_status === "active" && PAID_ACCESS_TYPES.has(user?.access_type)) {
    return user?.calculator_tier_id || DEFAULT_CALCULATOR_TIER_ID;
  }
  return user?.calculator_tier_id || FREE_CALCULATOR_TIER_ID;
}

export function getCalculatorAccess(categories = [], user = null) {
  const calculatorTier = getCalculatorTier(getEffectiveCalculatorTierId(user));
  const limit = calculatorTier.calculatorLimit;
  const includedCategories = limit == null ? categories : categories.slice(0, limit);
  const includedIds = new Set(includedCategories.map((category) => category.id));

  return {
    calculatorTier,
    limit,
    includedCount: includedCategories.length,
    totalCount: categories.length,
    isFullAccess: limit == null || includedCategories.length >= categories.length,
    isAllowed: (calculatorId) => includedIds.has(calculatorId),
  };
}
