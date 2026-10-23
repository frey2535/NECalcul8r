import React from "react";

export default function AppleSubscriptionDisclosure({ planLabel, priceLabel }) {
  return (
    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">{planLabel}</span>
        {" "}is an auto-renewable subscription. Length: 1 month. Price: {priceLabel} per month, billed to your Apple ID.
      </p>
      <p>
        Payment is charged to your Apple ID at confirmation. The subscription renews each month unless you cancel at least 24 hours before the period ends. Apple charges the renewal within 24 hours before the period ends. Manage or cancel anytime in Settings → Apple ID → Subscriptions. Deleting your NECalcul8r account does not cancel the App Store subscription.
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <a href="/privacy" className="underline underline-offset-2 font-semibold text-foreground">
          Privacy Policy
        </a>
        <span aria-hidden="true">·</span>
        <a href="/terms" className="underline underline-offset-2 font-semibold text-foreground">
          Terms of Use
        </a>
        <span aria-hidden="true">·</span>
        <a href="/eula" className="underline underline-offset-2 font-semibold text-foreground">
          EULA
        </a>
      </p>
    </div>
  );
}
