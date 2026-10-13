import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShoppingCart } from "lucide-react";

const INTERACTIVE_SELECTOR =
  "input, select, textarea, button, a, label, [role='button'], [role='checkbox'], [role='radio'], [role='switch'], [contenteditable='true']";

function isAllowedViewControl(target) {
  return Boolean(target.closest("[data-view-only-allow='true']"));
}

/**
 * Lets users browse a subscription calculator visually.
 * Any click / focus / change inside interactive controls goes to Purchase.
 */
export default function ViewOnlyCalculatorShield({
  children,
  planLabel,
  requiredTierLabel,
}) {
  const navigate = useNavigate();

  const goPurchase = useCallback(() => {
    navigate("/purchase");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

  const intercept = useCallback(
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(INTERACTIVE_SELECTOR)) return;
      if (isAllowedViewControl(target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      // Blur focused controls so typing cannot continue.
      if (typeof target.blur === "function") target.blur();
      goPurchase();
    },
    [goPurchase],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
            <Lock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              View only — included with a higher plan
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-0.5">
              Your plan is {planLabel}. Browse this calculator freely; tapping any field or button opens purchase
              {requiredTierLabel ? ` (${requiredTierLabel})` : ""}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={goPurchase}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          View purchase options
        </button>
      </div>

      <div
        className="relative rounded-2xl"
        onClickCapture={intercept}
        onPointerDownCapture={intercept}
        onFocusCapture={intercept}
        onChangeCapture={intercept}
        onInputCapture={intercept}
        onKeyDownCapture={(event) => {
          // Allow Escape; block typing / activation of controls.
          if (event.key === "Escape") return;
          intercept(event);
        }}
      >
        <div aria-disabled="true" className="select-none [&_input]:caret-transparent">
          {children}
        </div>
      </div>
    </div>
  );
}
