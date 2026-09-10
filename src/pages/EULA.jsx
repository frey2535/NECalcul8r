import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";

export default function EULA() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to NECalcul8r
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">End User License Agreement</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 10, 2026</p>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. License grant</h2>
            <p className="text-muted-foreground">
              Current Flow Consulting grants you a personal, non-exclusive, non-transferable license
              to use NECalcul8r on devices you own or control, subject to these terms and our{" "}
              <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Google Play purchases</h2>
            <p className="text-muted-foreground">
              Individual subscriptions purchased through the Android app are billed by Google Play.
              Manage, cancel, or request refunds through Google Play account settings according to
              Google&apos;s policies. Company plans and license keys sold outside Google Play are
              billed separately (for example via Stripe on the website).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Restrictions</h2>
            <p className="text-muted-foreground">
              You may not reverse engineer, redistribute, rent, or sublicense the app, or use it to
              provide a competing hosted service, except as allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Professional use disclaimer</h2>
            <p className="text-muted-foreground">
              NECalcul8r assists with NEC-related calculations but is not a substitute for the
              official codebook, local amendments, or licensed professional judgment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Contact</h2>
            <p className="text-muted-foreground">
              Questions:{" "}
              <a className="underline underline-offset-2" href="mailto:support@currentflowconsulting.org">
                support@currentflowconsulting.org
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
