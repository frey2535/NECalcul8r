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
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 17, 2026</p>

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
            <h2 className="text-lg font-semibold mb-3">2. Store purchases</h2>
            <p className="text-muted-foreground">
              Individual subscriptions purchased through the Android app are billed by Google Play.
              Manage, cancel, or request refunds through Google Play account settings according to
              Google&apos;s policies.
            </p>
            <p className="text-muted-foreground mt-2">
              Individual subscriptions purchased through the iOS app are auto-renewable monthly
              subscriptions billed by Apple. The subscription title, one-month length, and price are
              shown in the app before purchase. Manage or cancel in Settings → Apple ID →
              Subscriptions. Deleting your NECalcul8r account does not cancel an App Store
              subscription. Refunds follow Apple&apos;s policies. Company plans and license keys are
              sold on the website and are not purchased inside the iOS app.
            </p>
            <p className="text-muted-foreground mt-2">
              These store terms are in addition to Apple&apos;s Licensed Application End User License
              Agreement at{" "}
              <a
                className="underline underline-offset-2"
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noreferrer"
              >
                apple.com/legal/internet-services/itunes/dev/stdeula
              </a>
              .
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
