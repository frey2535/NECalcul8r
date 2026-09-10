import React, { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, KeyRound, Loader2, RefreshCw, ShoppingCart, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COMPANY_PLANS, DEFAULT_PAID_PLAN_KEY, INDIVIDUAL_PLANS, getPlanOption, isPlanUpgrade } from "@/lib/pricing";
import { isAndroidNativeApp, purchaseGooglePlayPlan, queryGooglePlayProducts, restoreGooglePlayPurchases } from "@/lib/googlePlayBilling";
import { cn } from "@/lib/utils";

const WEB_PURCHASE_URL = "https://necalcul8r.currentflowconsulting.org/purchase";

function TierButton({ active, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-2xl border p-4 transition-all",
        active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
          : "border-border/60 bg-card hover:bg-muted"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {active && (
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}

function checkoutReturnUrl() {
  const url = new URL(window.location.href);
  if (url.pathname.endsWith("/purchase")) {
    const basePath = url.pathname.slice(0, -"/purchase".length) || "/";
    url.pathname = basePath.endsWith("/") ? basePath : `${basePath}/`;
  }
  url.search = "";
  url.searchParams.set("stripe_checkout_session_id", "{CHECKOUT_SESSION_ID}");
  url.hash = "";
  return url.toString();
}

export default function Purchase() {
  const { user, checkAppState } = useAuth();
  const [selectedPlanKey, setSelectedPlanKey] = useState(DEFAULT_PAID_PLAN_KEY);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [licenseCode, setLicenseCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [playProducts, setPlayProducts] = useState({});
  const isAndroidNative = isAndroidNativeApp();

  const selected = useMemo(
    () => getPlanOption(selectedPlanKey),
    [selectedPlanKey]
  );
  const selectedRequiresCompany = selected.accountType === "company" && !user?.org_id;
  const usesGooglePlay = isAndroidNative && selected.accountType === "individual" && !selected.isFree;
  // Google Play policy: digital goods on Android must use Play Billing — do not open Stripe Checkout in-app.
  const companyOnAndroid = isAndroidNative && selected.accountType === "company" && !selected.isFree;
  const isActiveStripeSubscriber = user?.access_type === "paid"
    && user?.purchase_source === "stripe"
    && (user?.subscription_status === "active" || user?.subscription_status === "trialing")
    && !selected.isFree;
  const currentPlanKey = user?.plan_key || user?.calculator_tier_id || (isActiveStripeSubscriber ? DEFAULT_PAID_PLAN_KEY : "free");
  const upgradesExistingSubscription = isActiveStripeSubscriber && isPlanUpgrade(currentPlanKey, selected.planKey);
  const managesExistingSubscription = isActiveStripeSubscriber && !upgradesExistingSubscription;
  const checkoutReady = selected.isFree
    || companyOnAndroid
    || (usesGooglePlay && Boolean(playProducts[selected.googlePlayProductId]))
    || (base44.commerce?.isConfigured && selected.priceId && !selectedRequiresCompany);

  useEffect(() => {
    if (!isAndroidNative) return undefined;
    let cancelled = false;
    queryGooglePlayProducts()
      .then((products) => {
        if (cancelled) return;
        setPlayProducts(Object.fromEntries(products.map((product) => [product.productId, product])));
      })
      .catch((playError) => {
        if (!cancelled) setError(playError.message || "Could not load Google Play products.");
      });
    return () => {
      cancelled = true;
    };
  }, [isAndroidNative]);

  const displayPrice = (plan) => {
    const option = getPlanOption(plan.planKey);
    return playProducts[plan.googlePlayProductId]?.formattedPrice || option.priceLabel;
  };

  const handlePurchase = async () => {
    setError("");
    setSuccess("");
    if (selectedRequiresCompany) {
      setError("Company packages require an account connected to a company. Register with a company name or join a company invite before buying a company package.");
      return;
    }
    if (selected.isFree) {
      window.location.assign("/");
      return;
    }
    if (companyOnAndroid) {
      setSuccess(`Company plans are sold on the web (not through Google Play). Open ${WEB_PURCHASE_URL} in a browser, or redeem a company license key below.`);
      return;
    }
    if (!checkoutReady) {
      setError("Checkout is not configured for this package yet. Add its Stripe price ID to VITE_STRIPE_PRICE_MATRIX_JSON.");
      return;
    }
    setLoading(true);
    try {
      if (usesGooglePlay) {
        await purchaseGooglePlayPlan(selected);
        window.location.assign("/");
      } else if (upgradesExistingSubscription) {
        await base44.commerce.updateStripeSubscription({
          accountType: selected.accountType,
          planKey: selected.planKey,
          priceId: selected.priceId,
          quantity: selected.billingQuantity,
          seats: selected.seatLimit,
        });
        await checkAppState();
        setSuccess(`Subscription upgraded to ${selected.label}. You were only charged the prorated difference for the current month; the full ${selected.priceLabel} starts on your next monthly payment.`);
        setLoading(false);
      } else if (managesExistingSubscription) {
        await base44.commerce.openBillingPortal({ returnUrl: window.location.href });
      } else {
        await base44.commerce.startCheckout({
          accountType: selected.accountType,
          planKey: selected.planKey,
          priceId: selected.priceId,
          quantity: selected.billingQuantity,
          seats: selected.seatLimit,
          successUrl: checkoutReturnUrl(),
          cancelUrl: window.location.href,
        });
      }
    } catch (purchaseError) {
      setError(purchaseError.message || "Could not start checkout.");
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setError("");
    setRestoring(true);
    try {
      await restoreGooglePlayPurchases();
      window.location.assign("/");
    } catch (restoreError) {
      setError(restoreError.message || "Could not restore Google Play purchases for this account.");
      setRestoring(false);
    }
  };

  const handleRedeemLicense = async () => {
    setError("");
    setSuccess("");
    setRedeeming(true);
    try {
      const result = await base44.commerce.activateLicenseKey({ code: licenseCode });
      await checkAppState();
      setSuccess(`License activated${result?.plan_key ? ` (${result.plan_key})` : ""}. Your paid access is ready.`);
      setLicenseCode("");
      setTimeout(() => window.location.assign("/"), 800);
    } catch (redeemError) {
      setError(redeemError.message || "Could not redeem license key.");
      setRedeeming(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-violet-700 text-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Purchase NECalcul8r</h1>
            <p className="text-sm text-blue-100 mt-1 max-w-2xl">
              {isAndroidNative
                ? "Individual subscriptions use Google Play Billing. Company plans and license keys are sold on the web."
                : "Choose free starter access, an individual subscription (Stripe), a company plan, or redeem a license key."}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-extrabold text-foreground">Individual access</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {INDIVIDUAL_PLANS.map((plan) => {
            return (
            <TierButton
              key={plan.planKey}
              active={selectedPlanKey === plan.planKey}
              title={`${plan.label} · ${displayPrice(plan)}`}
              subtitle={plan.description}
              onClick={() => setSelectedPlanKey(plan.planKey)}
            />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-extrabold text-foreground">Company full-access plans</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMPANY_PLANS.map((plan) => {
            const option = getPlanOption(plan.planKey);
            return (
              <TierButton
                key={plan.planKey}
                active={selectedPlanKey === plan.planKey}
                title={`${plan.label} · ${option.priceLabel}`}
                subtitle={plan.description}
                onClick={() => setSelectedPlanKey(plan.planKey)}
              />
            );
          })}
        </div>
        {isAndroidNative && (
          <p className="text-xs text-muted-foreground">
            Company subscriptions are purchased on the website ({WEB_PURCHASE_URL}) or with a license key — not through Google Play.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Selected package</p>
            <h2 className="text-xl font-extrabold text-foreground mt-1">{selected.description}</h2>
            <p className="text-3xl font-black text-foreground mt-2">{displayPrice(selected)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Includes {selected.calculatorLimit == null ? "all calculators" : `up to ${selected.calculatorLimit} calculators`}
              {selected.hasNecTables ? ", NEC Tables" : ""}{selected.canExportCompleteReports ? ", and complete export/printing" : ""}.
              {selected.accountType === "company" && (
                <> Seat limit: {selected.companySeatLimit == null ? "unlimited" : selected.companySeatLimit}.</>
              )}
            </p>
            {!checkoutReady && (
              <p className="text-xs text-amber-600 mt-2">
                {selectedRequiresCompany
                  ? "Company packages require an account connected to a company."
                  : usesGooglePlay
                    ? "Google Play product details are still loading or unavailable."
                    : "Stripe price ID needed for this exact package before checkout can open."}
              </p>
            )}
            {usesGooglePlay && (
              <p className="text-xs text-muted-foreground mt-2">
                Android individual purchases use Google Play Billing. Manage or cancel in Google Play → Subscriptions.
              </p>
            )}
            {companyOnAndroid && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                This package is sold on the web. Tap the button for the website link, or redeem a license key below.
              </p>
            )}
            {upgradesExistingSubscription && (
              <p className="text-xs text-blue-600 mt-2">
                Upgrade today and pay only the prorated difference for the rest of your current month. The full {selected.priceLabel} starts on your next monthly payment.
              </p>
            )}
            {managesExistingSubscription && (
              <p className="text-xs text-muted-foreground mt-2">
                You already have an active Stripe subscription. Use Manage Billing for same-tier, downgrade, or cancellation changes.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handlePurchase}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold px-6 py-3 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            {loading
              ? (upgradesExistingSubscription ? "Upgrading..." : "Opening billing...")
              : selected.isFree
                ? "Continue with free tier"
                : companyOnAndroid
                  ? "How to buy on web"
                  : upgradesExistingSubscription
                    ? "Upgrade now"
                    : managesExistingSubscription
                      ? "Manage current plan"
                      : "Purchase now"}
          </button>
        </div>
        {isAndroidNative && (
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
          >
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Restore purchases
          </button>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-sm px-4 py-3">
            {success}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-dashed border-border/80 bg-muted/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-extrabold text-foreground">Redeem license key</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Use a key from an invoice, Stripe Payment Link, or reseller purchase sold outside Google Play.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={licenseCode}
            onChange={(e) => setLicenseCode(e.target.value)}
            placeholder="NEC-XXXX-XXXX-XXXX"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono tracking-wide uppercase"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleRedeemLicense}
            disabled={redeeming || !licenseCode.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-bold px-5 py-2.5 disabled:opacity-50"
          >
            {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Activate
          </button>
        </div>
      </section>
    </div>
  );
}
