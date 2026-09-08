import {
  getCalculatorAccess,
  getPricingOption,
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
  calculator_tier_id: "calc_6_15",
};
const starterAccess = getCalculatorAccess(categories, starterPaid);
assert(starterAccess.includedCount === 15, "calc_6_15 should include 15 calculators");
assert(starterAccess.isAllowed("calc_15"), "calc_6_15 should allow the fifteenth calculator");
assert(!starterAccess.isAllowed("calc_16"), "calc_6_15 should lock the sixteenth calculator");

const advancedPaid = {
  access_type: "paid",
  access_status: "active",
  calculator_tier_id: "calc_26_35",
};
const advancedAccess = getCalculatorAccess(categories, advancedPaid);
assert(advancedAccess.includedCount === 35, "calc_26_35 should include 35 calculators");
assert(advancedAccess.isAllowed("calc_35"), "calc_26_35 should allow the thirty-fifth calculator");
assert(!advancedAccess.isAllowed("calc_36"), "calc_26_35 should lock the thirty-sixth calculator");

const fullPaid = {
  access_type: "paid",
  access_status: "active",
  calculator_tier_id: "calc_35_plus",
};
assert(getCalculatorAccess(categories, fullPaid).isFullAccess, "calc_35_plus should allow the full calculator suite");

const trial = { access_type: "trial", access_status: "trial" };
assert(getCalculatorAccess(categories, trial).isFullAccess, "active trials should allow the full calculator suite");

const permanent = { access_type: "permanent", access_status: "active" };
assert(getCalculatorAccess(categories, permanent).isFullAccess, "permanent access should allow the full calculator suite");

const legacyPaid = { access_type: "paid", access_status: "active" };
assert(getCalculatorAccess(categories, legacyPaid).isFullAccess, "paid users without tier metadata should keep full legacy access");

const companyPackage = getPricingOption("company_0_10", "calc_35_plus");
assert(companyPackage.seatLimit === 10, "company_0_10 should grant 10 seats by default");
assert(companyPackage.billingQuantity === 1, "company packages should bill once by default");
assert(companyPackage.priceLabel === "$50/mo", "full calculator tier should default to $50/month");

const freePackage = getPricingOption("individual", "calc_0_5_free");
assert(freePackage.isFree, "0-5 calculator package should be marked free");
assert(freePackage.priceLabel === "Free", "0-5 calculator package should display Free");

console.log("Pricing tier verification passed.");
