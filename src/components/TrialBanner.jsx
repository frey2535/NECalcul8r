import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function TrialBanner({ daysLeft }) {
  const [loading, setLoading] = useState(false);
  if (daysLeft === Infinity || daysLeft < 0) return null;

  const urgent = daysLeft <= 5;
  const warning = daysLeft <= 14;
  const canStartCheckout = base44.commerce?.hasIndividualCheckout;

  const handleSubscribe = async () => {
    if (!canStartCheckout) return;
    setLoading(true);
    try {
      await base44.commerce.startIndividualCheckout();
    } catch {
      setLoading(false);
      window.location.href = "mailto:sales@nec-suite.com?subject=NECalcul8r Purchase";
    }
  };

  return (
    <div className={cn(
      "w-full py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 flex-wrap",
      urgent
        ? "bg-red-600 text-white"
        : warning
        ? "bg-amber-500 text-white"
        : "bg-blue-600 text-white"
    )}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      {daysLeft === 0
        ? "Your trial expires today!"
        : `Free trial: ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
      {canStartCheckout ? (
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          className="rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-60 px-2.5 py-0.5 font-bold transition-colors"
        >
          {loading ? "Opening..." : "Subscribe"}
        </button>
      ) : (
        <a
          href="mailto:sales@nec-suite.com?subject=NECalcul8r Purchase"
          className="rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-0.5 font-bold transition-colors"
        >
          Contact Sales
        </a>
      )}
    </div>
  );
}