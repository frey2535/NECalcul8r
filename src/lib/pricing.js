import {
  buildCalculatorTierSections,
  getIncludedCalculatorIdsForPlan,
  hasConfiguredCalculatorTierMatches,
} from "./calculatorTierGroups.js";

export const FREE_PLAN_KEY = "free";
export const OWNER_FULL_ACCESS_PLAN_KEY = "owner_full_access";
export const DEFAULT_PAID_PLAN_KEY = "individual_36_plus";

export const INDIVIDUAL_PLANS = [
  {
    planKey: FREE_PLAN_KEY,
    label: "Free",
    description: "Use up to 5 calculators at no cost.",
    accountType: "individual",
    calculatorLimit: 5,
    hasNecTables: false,
    canExportCompleteReports: false,
    companySeatLimit: null,
    priceLabel: "Free",
    monthlyTarget: 0,
    billingQuantity: 1,
    googlePlayProductId: null,
    googlePlayBasePlanId: null,
    googlePlayDisplayPrice: "Free",
    isFree: true,
  },
  {
    planKey: "individual_6_15",
    label: "Individual 6-15",
    description: "Up to 15 calculators, NEC Tables, and complete report export/printing.",
    accountType: "individual",
    calculatorLimit: 15,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: null,
    priceLabel: "$10/mo",
    monthlyTarget: 10,
    billingQuantity: 15,
    googlePlayProductId: "individual_6_15",
    googlePlayBasePlanId: "monthly",
    googlePlayDisplayPrice: "$9.99",
  },
  {
    planKey: "individual_16_25",
    label: "Individual 16-25",
    description: "Up to 25 calculators, NEC Tables, and complete report export/printing.",
    accountType: "individual",
    calculatorLimit: 25,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: null,
    priceLabel: "$20/mo",
    monthlyTarget: 20,
    billingQuantity: 25,
    googlePlayProductId: "individual_16_25",
    googlePlayBasePlanId: "monthly",
    googlePlayDisplayPrice: "$19.99",
  },
  {
    planKey: "individual_26_35",
    label: "Individual 26-35",
    description: "Up to 35 calculators, NEC Tables, and complete report export/printing.",
    accountType: "individual",
    calculatorLimit: 35,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: null,
    priceLabel: "$35/mo",
    monthlyTarget: 35,
    billingQuantity: 35,
    googlePlayProductId: "individual_26_35",
    googlePlayBasePlanId: "monthly",
    googlePlayDisplayPrice: "$34.99",
  },
  {
    planKey: "individual_36_plus",
    label: "Individual 36+",
    description: "All calculators, including new calculators as they are developed.",
    accountType: "individual",
    calculatorLimit: null,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: null,
    priceLabel: "$50/mo",
    monthlyTarget: 50,
    billingQuantity: 36,
    googlePlayProductId: "individual_36_plus",
    googlePlayBasePlanId: "monthly",
    googlePlayDisplayPrice: "$49.99",
  },
];

export const COMPANY_PLANS = [
  {
    planKey: "company_0_10",
    label: "Company 0-10",
    description: "Full access for up to 10 employees.",
    accountType: "company",
    calculatorLimit: null,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: 10,
    priceLabel: "$400/mo",
    monthlyTarget: 400,
    billingQuantity: 10,
  },
  {
    planKey: "company_11_20",
    label: "Company 11-20",
    description: "Full access for up to 20 employees.",
    accountType: "company",
    calculatorLimit: null,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: 20,
    priceLabel: "$800/mo",
    monthlyTarget: 800,
    billingQuantity: 20,
  },
  {
    planKey: "company_unlimited",
    label: "Company Unlimited",
    description: "Full access for unlimited employees.",
    accountType: "company",
    calculatorLimit: null,
    hasNecTables: true,
    canExportCompleteReports: true,
    companySeatLimit: null,
    priceLabel: "$1,500/mo",
    monthlyTarget: 1500,
    billingQuantity: 1000,
  },
];

const OWNER_FULL_ACCESS_PLAN = {
  planKey: OWNER_FULL_ACCESS_PLAN_KEY,
  label: "Owner full access",
  description: "Owner-granted full access.",
  accountType: "owner",
  calculatorLimit: null,
  hasNecTables: true,
  canExportCompleteReports: true,
  companySeatLimit: null,
  priceLabel: "Owner grant",
  monthlyTarget: 0,
    billingQuantity: 1,
};

export const PLAN_CATALOG = [
  ...INDIVIDUAL_PLANS,
  ...COMPANY_PLANS,
  OWNER_FULL_ACCESS_PLAN,
];

export const GOOGLE_PLAY_PRODUCT_IDS = INDIVIDUAL_PLANS
  .map((plan) => plan.googlePlayProductId)
  .filter(Boolean);

// Compatibility exports for older code paths that still discuss customer or calculator tiers.
export const CUSTOMER_TIERS = [
  { id: "individual", label: "Individual", description: "One user account", accountType: "individual", seatLimit: 1 },
  { id: "company_0_10", label: "Company 0-10 employees", description: "Full company access", accountType: "company", seatLimit: 10 },
  { id: "company_11_20", label: "Company 11-20 employees", description: "Full company access", accountType: "company", seatLimit: 20 },
  { id: "company_unlimited", label: "Company Unlimited", description: "Full company access", accountType: "company", seatLimit: null },
];

export const CALCULATOR_TIERS = INDIVIDUAL_PLANS.map((plan) => ({
  id: plan.planKey,
  label: plan.planKey === FREE_PLAN_KEY ? "0-5 calculators" : plan.label.replace("Individual ", ""),
  description: plan.description,
  calculatorLimit: plan.calculatorLimit,
  isFree: plan.isFree,
}));

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

function envPriceIdForPlan(planKey) {
  const env = import.meta.env || {};
  const map = {
    individual_6_15: env.VITE_STRIPE_PRICE_INDIVIDUAL_6_15,
    individual_16_25: env.VITE_STRIPE_PRICE_INDIVIDUAL_16_25,
    individual_26_35: env.VITE_STRIPE_PRICE_INDIVIDUAL_26_35,
    individual_36_plus: env.VITE_STRIPE_PRICE_INDIVIDUAL_36_PLUS,
    company_0_10: env.VITE_STRIPE_PRICE_COMPANY_0_10,
    company_11_20: env.VITE_STRIPE_PRICE_COMPANY_11_20,
    company_unlimited: env.VITE_STRIPE_PRICE_COMPANY_UNLIMITED,
  };
  if (map[planKey]) return map[planKey];
  if (planKey.startsWith("individual_")) {
    return env.VITE_STRIPE_INDIVIDUAL_TIERED_PRICE_ID || env.VITE_STRIPE_TIERED_PRICE_ID || "";
  }
  if (planKey.startsWith("company_")) {
    return env.VITE_STRIPE_COMPANY_TIERED_PRICE_ID || env.VITE_STRIPE_TIERED_PRICE_ID || "";
  }
  return env.VITE_STRIPE_TIERED_PRICE_ID || "";
}

function configuredPlan(planKey) {
  return configuredMatrix[planKey] || configuredMatrix.plans?.[planKey] || {};
}

export function getPlan(planKey) {
  return PLAN_CATALOG.find((plan) => plan.planKey === planKey) || PLAN_CATALOG.find((plan) => plan.planKey === FREE_PLAN_KEY);
}

export function getPlanOption(planKey) {
  const plan = getPlan(planKey);
  const configured = configuredPlan(plan.planKey);
  const billingQuantity = Math.max(1, Number(configured.billingQuantity) || plan.billingQuantity || 1);
  const configuredSeatLimit = configured.seatLimit === undefined || configured.seatLimit === null || configured.seatLimit === ""
    ? undefined
    : Number(configured.seatLimit);
  return {
    ...plan,
    priceId: configured.priceId || envPriceIdForPlan(plan.planKey),
    priceLabel: configured.priceLabel || plan.priceLabel,
    billingQuantity,
    seatLimit: Number.isFinite(configuredSeatLimit)
      ? configuredSeatLimit
      : plan.companySeatLimit,
    isFree: Boolean(plan.isFree),
  };
}

export function getPlanUpgradeRank(planKey) {
  const plan = getPlan(planKey);
  if (!plan || plan.isFree) return 0;
  if (plan.accountType === "company") {
    return 2000 + (plan.companySeatLimit == null ? 1000 : plan.companySeatLimit);
  }
  return plan.calculatorLimit == null ? 1000 : plan.calculatorLimit;
}

export function isPlanUpgrade(currentPlanKey, nextPlanKey) {
  return getPlanUpgradeRank(nextPlanKey) > getPlanUpgradeRank(currentPlanKey);
}

export function getCustomerTier(customerTierId) {
  return CUSTOMER_TIERS.find((tier) => tier.id === customerTierId) || CUSTOMER_TIERS[0];
}

export function getCalculatorTier(calculatorTierId) {
  return CALCULATOR_TIERS.find((tier) => tier.id === calculatorTierId) || CALCULATOR_TIERS[0];
}

export function getPricingOption(customerTierId, calculatorTierId) {
  const customerTier = getCustomerTier(customerTierId);
  const calculatorTier = getCalculatorTier(calculatorTierId);
  const key = `${customerTier.id}:${calculatorTier.id}`;
  const configured = configuredMatrix[key] || configuredMatrix[customerTier.id]?.[calculatorTier.id] || {};
  const planKey = customerTier.accountType === "company" ? customerTier.id : calculatorTier.id;
  const plan = getPlanOption(planKey);
  const seatLimit = Math.max(1, Number(configured.seatLimit) || customerTier.seatLimit || plan.seatLimit || 1);
  const billingQuantity = Math.max(1, Number(configured.billingQuantity) || 1);

  return {
    key,
    customerTier,
    calculatorTier,
    planKey: plan.planKey,
    priceId: configured.priceId || plan.priceId,
    priceLabel: configured.priceLabel || plan.priceLabel,
    description: configured.description || plan.description,
    seatLimit,
    billingQuantity,
    isFree: Boolean(plan.isFree),
  };
}

export function getPricingMatrixRows() {
  return CUSTOMER_TIERS.map((customerTier) => ({
    customerTier,
    prices: CALCULATOR_TIERS.map((calculatorTier) => getPricingOption(customerTier.id, calculatorTier.id)),
  }));
}

function hasOwnerFullAccess(user) {
  if (!user) return false;
  if (user.is_platform_admin) return true;
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
  return getResolvedEntitlement(user).planKey;
}

export function getResolvedEntitlement(user) {
  if (!user || user.access_status === "disabled") {
    return normalizedEntitlement(getPlan(FREE_PLAN_KEY), { active: false });
  }

  if (user.is_platform_admin || hasOwnerFullAccess(user) || user.plan_key === OWNER_FULL_ACCESS_PLAN_KEY) {
    return normalizedEntitlement(OWNER_FULL_ACCESS_PLAN, { source: "owner_grant" });
  }

  const planKey = user.plan_key
    || user.calculator_tier_id
    || (user.access_status === "active" && PAID_ACCESS_TYPES.has(user.access_type) ? DEFAULT_PAID_PLAN_KEY : FREE_PLAN_KEY);
  const plan = getPlan(planKey);
  if (user.access_status === "active" && PAID_ACCESS_TYPES.has(user.access_type)) {
    return normalizedEntitlement(plan, {
      source: sourceForUser(user, plan),
      validUntil: user.trial_end_date || null,
    });
  }

  return normalizedEntitlement(getPlan(FREE_PLAN_KEY));
}

function sourceForUser(user, plan) {
  if (user.purchase_source === "google_play" || user.access_type === "google_play") return "google_play";
  if (user.purchase_source === "apple_app_store" || user.access_type === "apple_app_store" || user.access_type === "app_store") return "stripe";
  if (plan.planKey === OWNER_FULL_ACCESS_PLAN_KEY || user.access_type === "permanent") return "owner_grant";
  return "stripe";
}

function normalizedEntitlement(plan, overrides = {}) {
  return {
    source: overrides.source || (plan.planKey === FREE_PLAN_KEY ? "free" : "stripe"),
    planKey: plan.planKey,
    calculatorLimit: plan.calculatorLimit,
    hasNecTables: Boolean(plan.hasNecTables),
    canExportCompleteReports: Boolean(plan.canExportCompleteReports),
    companySeatLimit: plan.companySeatLimit ?? null,
    active: overrides.active ?? true,
    validUntil: overrides.validUntil ?? null,
    label: plan.label,
    priceLabel: plan.priceLabel,
  };
}

export function getCalculatorAccess(categories = [], user = null, calculatorTierGroups = null) {
  const entitlement = getResolvedEntitlement(user);
  const calculatorTier = getCalculatorTier(entitlement.planKey);
  const limit = entitlement.calculatorLimit;
  const tierSections = buildCalculatorTierSections(categories, calculatorTierGroups);
  const hasTierMatches = hasConfiguredCalculatorTierMatches(categories, calculatorTierGroups);
  const configuredIds = limit == null
    ? new Set(categories.map((category) => category.id))
    : getIncludedCalculatorIdsForPlan(categories, entitlement.planKey, calculatorTierGroups);
  const includedCategories = limit == null
    ? categories
    : hasTierMatches
      ? categories.filter((category) => configuredIds.has(category.id))
      : categories.slice(0, limit);
  const includedIds = new Set(includedCategories.map((category) => category.id));

  return {
    entitlement,
    calculatorTier,
    tierSections,
    limit,
    includedCount: includedCategories.length,
    totalCount: categories.length,
    isFullAccess: limit == null || includedCategories.length >= categories.length,
    isAllowed: (calculatorId) => includedIds.has(calculatorId),
  };
}
