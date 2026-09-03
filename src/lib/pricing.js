export const CUSTOMER_TIERS = [
  { id: "individual", label: "Individual", description: "One user account", accountType: "individual", quantity: 1 },
  { id: "company_0_10", label: "Company: 0-10 employees", description: "Small team access", accountType: "company", quantity: 10 },
  { id: "company_10_30", label: "Company: 10-30 employees", description: "Growing company access", accountType: "company", quantity: 30 },
  { id: "company_30_plus", label: "Company: 30+ employees", description: "Large company access", accountType: "company", quantity: 31 },
];

export const CALCULATOR_TIERS = [
  { id: "calc_0_10", label: "0-10 calculators", description: "Starter calculator access", calculatorLimit: 10 },
  { id: "calc_11_20", label: "11-20 calculators", description: "Expanded calculator access", calculatorLimit: 20 },
  { id: "calc_21_30", label: "21-30 calculators", description: "Advanced calculator access", calculatorLimit: 30 },
  { id: "calc_31_plus", label: "31+ calculators", description: "Complete calculator access", calculatorLimit: null },
];

const DEFAULT_PRICE_LABELS = {
  individual: {
    calc_0_10: "$9/mo",
    calc_11_20: "$19/mo",
    calc_21_30: "$29/mo",
    calc_31_plus: "$39/mo",
  },
  company_0_10: {
    calc_0_10: "$49/mo",
    calc_11_20: "$99/mo",
    calc_21_30: "$149/mo",
    calc_31_plus: "$199/mo",
  },
  company_10_30: {
    calc_0_10: "$129/mo",
    calc_11_20: "$249/mo",
    calc_21_30: "$369/mo",
    calc_31_plus: "$499/mo",
  },
  company_30_plus: {
    calc_0_10: "$299/mo",
    calc_11_20: "$549/mo",
    calc_21_30: "$799/mo",
    calc_31_plus: "$999/mo",
  },
};

function parseConfiguredMatrix() {
  const raw = import.meta.env.VITE_STRIPE_PRICE_MATRIX_JSON;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.warn("VITE_STRIPE_PRICE_MATRIX_JSON is not valid JSON.");
    return {};
  }
}

const configuredMatrix = parseConfiguredMatrix();

export function getPricingOption(customerTierId, calculatorTierId) {
  const customerTier = CUSTOMER_TIERS.find((tier) => tier.id === customerTierId) || CUSTOMER_TIERS[0];
  const calculatorTier = CALCULATOR_TIERS.find((tier) => tier.id === calculatorTierId) || CALCULATOR_TIERS[0];
  const key = `${customerTier.id}:${calculatorTier.id}`;
  const configured = configuredMatrix[key] || configuredMatrix[customerTier.id]?.[calculatorTier.id] || {};

  return {
    key,
    customerTier,
    calculatorTier,
    priceId: configured.priceId || "",
    priceLabel: configured.priceLabel || DEFAULT_PRICE_LABELS[customerTier.id]?.[calculatorTier.id] || "Price configured in Stripe",
    description: configured.description || `${customerTier.label} with ${calculatorTier.label}`,
  };
}

export function getPricingMatrixRows() {
  return CUSTOMER_TIERS.map((customerTier) => ({
    customerTier,
    prices: CALCULATOR_TIERS.map((calculatorTier) => getPricingOption(customerTier.id, calculatorTier.id)),
  }));
}
