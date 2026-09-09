import {
  GOOGLE_PLAY_PRODUCT_IDS,
  getCalculatorAccess,
  getPlanUpgradeRank,
  getPlanOption,
  getResolvedEntitlement,
  isPlanUpgrade,
} from "../src/lib/pricing.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const categories = Array.from({ length: 40 }, (_, index) => ({ id: `calc_${index + 1}` }));

const freeUser = {
  access_type: "trial",
  access_status: "expired",
};
const freeAccess = getCalculatorAccess(categories, freeUser);
assert(freeAccess.includedCount === 5, "free tier should include 5 calculators");
assert(freeAccess.isAllowed("calc_5"), "free tier should allow the fifth calculator");
assert(!freeAccess.isAllowed("calc_6"), "free tier should lock the sixth calculator");

const starterPaid = {
  access_type: "paid",
  access_status: "active",
  plan_key: "individual_6_15",
};
const starterAccess = getCalculatorAccess(categories, starterPaid);
assert(starterAccess.includedCount === 15, "individual_6_15 should include 15 calculators");
assert(starterAccess.isAllowed("calc_15"), "individual_6_15 should allow the fifteenth calculator");
assert(!starterAccess.isAllowed("calc_16"), "individual_6_15 should lock the sixteenth calculator");
assert(getResolvedEntitlement(starterPaid).hasNecTables, "paid individual users should have NEC Tables");

const advancedPaid = {
  access_type: "paid",
  access_status: "active",
  plan_key: "individual_26_35",
};
const advancedAccess = getCalculatorAccess(categories, advancedPaid);
assert(advancedAccess.includedCount === 35, "individual_26_35 should include 35 calculators");
assert(advancedAccess.isAllowed("calc_35"), "individual_26_35 should allow the thirty-fifth calculator");
assert(!advancedAccess.isAllowed("calc_36"), "individual_26_35 should lock the thirty-sixth calculator");
assert(getPlanOption("individual_26_35").priceLabel === "$35/mo", "individual_26_35 should default to $35/month");
assert(getPlanOption("individual_26_35").billingQuantity === 35, "individual_26_35 should bill using quantity 35 for tiered Stripe prices");

const fullPaid = {
  access_type: "paid",
  access_status: "active",
  plan_key: "individual_36_plus",
};
assert(getCalculatorAccess(categories, fullPaid).isFullAccess, "individual_36_plus should allow the full calculator suite");

const trial = { access_type: "trial", access_status: "trial" };
assert(getCalculatorAccess(categories, trial).includedCount === 5, "trial/free users should receive the free 5-calculator tier");
assert(!getResolvedEntitlement(trial).hasNecTables, "free users should not have NEC Tables");

const permanent = { access_type: "permanent", access_status: "active" };
assert(getCalculatorAccess(categories, permanent).isFullAccess, "owner-granted permanent access should allow the full calculator suite");
assert(getResolvedEntitlement(permanent).hasNecTables, "owner-granted access should include NEC Tables");

const legacyPaid = { access_type: "paid", access_status: "active" };
assert(getCalculatorAccess(categories, legacyPaid).isFullAccess, "paid users without tier metadata should keep full legacy access");

const companyPackage = getPlanOption("company_0_10");
assert(companyPackage.seatLimit === 10, "company_0_10 should grant 10 seats by default");
assert(companyPackage.priceLabel === "$400/mo", "company_0_10 should default to $400/month");
assert(companyPackage.calculatorLimit === null, "company plans should have full calculator access");
assert(companyPackage.billingQuantity === 10, "company_0_10 should bill using quantity 10 for tiered Stripe prices");

const unlimitedCompany = getPlanOption("company_unlimited");
assert(unlimitedCompany.billingQuantity === 1000, "company_unlimited should have a high default billing quantity for the unlimited bracket");
assert(
  getPlanUpgradeRank("individual_6_15") < getPlanUpgradeRank("individual_16_25")
    && getPlanUpgradeRank("individual_16_25") < getPlanUpgradeRank("individual_26_35")
    && getPlanUpgradeRank("individual_26_35") < getPlanUpgradeRank("individual_36_plus"),
  "individual plan upgrade rank should increase with calculator access",
);
assert(isPlanUpgrade("individual_16_25", "individual_36_plus"), "higher individual tiers should be detected as upgrades");
assert(!isPlanUpgrade("individual_36_plus", "individual_16_25"), "lower individual tiers should not be detected as upgrades");
assert(isPlanUpgrade("individual_36_plus", "company_0_10"), "company plans should rank above individual plans");
assert(isPlanUpgrade("company_0_10", "company_unlimited"), "larger company packages should be detected as upgrades");

const freePackage = getPlanOption("free");
assert(freePackage.isFree, "0-5 calculator package should be marked free");
assert(freePackage.priceLabel === "Free", "0-5 calculator package should display Free");
assert(!freePackage.hasNecTables, "free package should not include NEC Tables");

assert(
  GOOGLE_PLAY_PRODUCT_IDS.join(",") === "individual_6_15,individual_16_25,individual_26_35,individual_36_plus",
  "Google Play product IDs should match the active individual products",
);

console.log("Pricing tier verification passed.");
