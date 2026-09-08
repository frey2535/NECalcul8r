import {
  getCalculatorAccess,
  getPricingOption,
} from "../src/lib/pricing.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const categories = Array.from({ length: 32 }, (_, index) => ({ id: `calc_${index + 1}` }));

const starterPaid = {
  access_type: "paid",
  access_status: "active",
  calculator_tier_id: "calc_0_10",
};
const starterAccess = getCalculatorAccess(categories, starterPaid);
assert(starterAccess.includedCount === 10, "calc_0_10 should include 10 calculators");
assert(starterAccess.isAllowed("calc_10"), "calc_0_10 should allow the tenth calculator");
assert(!starterAccess.isAllowed("calc_11"), "calc_0_10 should lock the eleventh calculator");

const advancedPaid = {
  access_type: "paid",
  access_status: "active",
  calculator_tier_id: "calc_21_30",
};
const advancedAccess = getCalculatorAccess(categories, advancedPaid);
assert(advancedAccess.includedCount === 30, "calc_21_30 should include 30 calculators");
assert(advancedAccess.isAllowed("calc_30"), "calc_21_30 should allow the thirtieth calculator");
assert(!advancedAccess.isAllowed("calc_31"), "calc_21_30 should lock the thirty-first calculator");

const fullPaid = {
  access_type: "paid",
  access_status: "active",
  calculator_tier_id: "calc_31_plus",
};
assert(getCalculatorAccess(categories, fullPaid).isFullAccess, "calc_31_plus should allow the full calculator suite");

const trial = { access_type: "trial", access_status: "trial" };
assert(getCalculatorAccess(categories, trial).isFullAccess, "active trials should allow the full calculator suite");

const permanent = { access_type: "permanent", access_status: "active" };
assert(getCalculatorAccess(categories, permanent).isFullAccess, "permanent access should allow the full calculator suite");

const legacyPaid = { access_type: "paid", access_status: "active" };
assert(getCalculatorAccess(categories, legacyPaid).isFullAccess, "paid users without tier metadata should keep full legacy access");

const companyPackage = getPricingOption("company_0_10", "calc_31_plus");
assert(companyPackage.seatLimit === 10, "company_0_10 should grant 10 seats by default");
assert(companyPackage.billingQuantity === 1, "company packages should bill once by default");

console.log("Pricing tier verification passed.");
