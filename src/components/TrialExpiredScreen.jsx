import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, LogOut, ShoppingCart, Mail, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const BLOCK_CONTENT = {
  trial_expired: {
    title: "Free Trial Ended",
    subtitle: "Your 30-day free trial has ended. Choose an option below to continue using NECalcul8r.",
    showPurchase: true,
    showRequest: true,
    showBuildrPro: true,
  },
  trial_setup_required: {
    title: "Trial Not Fully Set Up",
    subtitle: "Your trial is not fully set up yet. Please request access or contact support.",
    showPurchase: false,
    showRequest: true,
    showBuildrPro: false,
  },
  access_denied_default: {
    title: "Access Denied",
    subtitle: "Your access to NECalcul8r has been denied. Please contact support.",
    showPurchase: false,
    showRequest: true,
    showBuildrPro: false,
  },
  subscription_inactive: {
    title: "Subscription Inactive",
    subtitle: "Your subscription is no longer active. Reactivate to continue using NEC Suite.",
    showPurchase: true,
    showRequest: true,
    showBuildrPro: false,
  },
  buildrpro_inactive: {
    title: "BuildrPro Access Inactive",
    subtitle: "Your BuildrPro-included access is no longer active. Contact your BuildrPro administrator.",
    showPurchase: true,
    showRequest: false,
    showBuildrPro: true,
  },
  company_access_inactive: {
    title: "Company Access Inactive",
    subtitle: "Your company access is no longer active. Contact your company administrator or NECalcul8r support.",
    showPurchase: true,
    showRequest: true,
    showBuildrPro: false,
  },
  app_store_inactive: {
    title: "App Store Entitlement Inactive",
    subtitle: "Your App Store purchase or subscription is no longer active. Restore your purchase in the App Store.",
    showPurchase: true,
    showRequest: true,
    showBuildrPro: false,
  },
  disabled: {
    title: "Access Disabled",
    subtitle: "Your access to NEC Suite has been disabled by an administrator.",
    showPurchase: false,
    showRequest: true,
    showBuildrPro: false,
  },
};

export default function TrialExpiredScreen({ user, status, blockReason }) {
  const reason = blockReason || (status === 'disabled' ? 'disabled' : 'trial_expired');
  const content = BLOCK_CONTENT[reason] || BLOCK_CONTENT.access_denied_default || BLOCK_CONTENT.trial_expired;
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const canStartCheckout = base44.commerce?.hasIndividualCheckout;

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      await base44.commerce.startIndividualCheckout();
    } catch (error) {
      setCheckoutError(error.message || "Could not start checkout. Please contact support.");
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-5"
      >
        {/* Icon + Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{content.title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mt-2">{content.subtitle}</p>
          </div>
        </div>

        {/* Signed in as */}
        {user?.email && (
          <div className="rounded-xl bg-muted/60 border border-border/60 px-4 py-3 text-sm text-muted-foreground text-center">
            Signed in as <span className="font-semibold text-foreground">{user.email}</span>
          </div>
        )}

        {/* Action cards */}
        <div className="space-y-3">
          {content.showPurchase && (
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 p-4 text-white shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Purchase NEC Suite</p>
                  <p className="text-xs text-blue-100 mt-0.5">Get full access with a one-time purchase or subscription.</p>
                  {canStartCheckout ? (
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="inline-block mt-2 text-xs font-bold bg-white/20 hover:bg-white/30 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {checkoutLoading ? "Opening checkout..." : "Subscribe online →"}
                    </button>
                  ) : (
                    <a
                      href="mailto:sales@nec-suite.com?subject=NEC Suite Purchase"
                      className="inline-block mt-2 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Contact Sales →
                    </a>
                  )}
                  {checkoutError && <p className="text-xs text-red-100 mt-2">{checkoutError}</p>}
                </div>
              </div>
            </div>
          )}

          {content.showBuildrPro && (
            <div className="rounded-xl bg-card border border-border/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">BuildrPro Member?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">NEC Suite may be included with your BuildrPro company account. Contact your BuildrPro administrator to verify and enable access.</p>
                </div>
              </div>
            </div>
          )}

          {content.showRequest && (
            <div className="rounded-xl bg-card border border-border/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">Request Access</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send a request to the NEC Suite team to review your account.</p>
                  <a
                    href={`mailto:support@nec-suite.com?subject=Access Request&body=Email: ${user?.email || ''}`}
                    className="inline-block mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Send Request →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <Button variant="outline" className="w-full gap-2" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}