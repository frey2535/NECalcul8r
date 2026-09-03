import React, { useMemo, useState } from "react";
import { Check, CreditCard, Loader2, ShoppingCart, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { CALCULATOR_TIERS, CUSTOMER_TIERS, getPricingOption } from "@/lib/pricing";
import { cn } from "@/lib/utils";

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

export default function Purchase() {
  const [customerTierId, setCustomerTierId] = useState("individual");
  const [calculatorTierId, setCalculatorTierId] = useState("calc_31_plus");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => getPricingOption(customerTierId, calculatorTierId),
    [customerTierId, calculatorTierId]
  );
  const checkoutReady = base44.commerce?.isConfigured && selected.priceId;

  const handlePurchase = async () => {
    setError("");
    if (!checkoutReady) {
      setError("Checkout is not configured for this package yet. Add its Stripe price ID to VITE_STRIPE_PRICE_MATRIX_JSON.");
      return;
    }
    setLoading(true);
    try {
      await base44.commerce.startCheckout({
        accountType: selected.customerTier.accountType,
        customerTierId: selected.customerTier.id,
        calculatorTierId: selected.calculatorTier.id,
        priceId: selected.priceId,
        quantity: selected.customerTier.quantity,
        successUrl: `${window.location.origin}/`,
        cancelUrl: `${window.location.origin}/purchase`,
      });
    } catch (purchaseError) {
      setError(purchaseError.message || "Could not start checkout.");
      setLoading(false);
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
              Choose individual or company access, select how many calculator groups you need, and purchase instantly.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-extrabold text-foreground">Who is buying?</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_TIERS.map((tier) => (
            <TierButton
              key={tier.id}
              active={customerTierId === tier.id}
              title={tier.label}
              subtitle={tier.description}
              onClick={() => setCustomerTierId(tier.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-extrabold text-foreground">Calculator access tier</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CALCULATOR_TIERS.map((tier) => {
            const option = getPricingOption(customerTierId, tier.id);
            return (
              <TierButton
                key={tier.id}
                active={calculatorTierId === tier.id}
                title={`${tier.label} · ${option.priceLabel}`}
                subtitle={tier.description}
                onClick={() => setCalculatorTierId(tier.id)}
              />
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Selected package</p>
            <h2 className="text-xl font-extrabold text-foreground mt-1">{selected.description}</h2>
            <p className="text-3xl font-black text-foreground mt-2">{selected.priceLabel}</p>
            {!checkoutReady && (
              <p className="text-xs text-amber-600 mt-2">
                Stripe price ID needed for this exact package before checkout can open.
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
            {loading ? "Opening checkout..." : "Purchase now"}
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
