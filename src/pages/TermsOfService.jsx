import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
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
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 19, 2026</p>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By creating an account or using NECalcul8r ("the app"), you agree to these Terms of
              Service. If you do not agree, do not use the app. These terms apply to all users
              regardless of subscription tier.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Educational and Professional Assistance Disclaimer</h2>
            <p className="text-muted-foreground">
              NECalcul8r is a calculation assistance tool designed to help electrical professionals
              apply National Electrical Code (NEC) formulas. The app is <strong className="text-foreground">not</strong> a
              substitute for the official NEC codebook, professional engineering judgment, or
              review by a licensed electrician, engineer, or authority having jurisdiction (AHJ).
            </p>
            <p className="text-muted-foreground mt-2">
              NEC references (article numbers, table values, and demand factors) are provided for
              educational and productivity purposes. Local jurisdictions may adopt amendments that
              override NEC values. You are responsible for confirming all results against the
              applicable code edition and any local amendments before relying on them for design,
              installation, or inspection.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. User Responsibility</h2>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>You are responsible for the accuracy of all input values you enter.</li>
              <li>You are responsible for verifying that the selected NEC edition matches your jurisdiction's adopted code.</li>
              <li>You are responsible for interpreting results in the context of the specific installation.</li>
              <li>You are responsible for compliance with all applicable local, state, and national codes and regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              The app is provided "as is" and "as available" without warranties of any kind, whether
              express or implied, including but not limited to warranties of merchantability,
              fitness for a particular purpose, or non-infringement. To the maximum extent permitted
              by law, the developers and operators of NECalcul8r shall not be liable for any
              direct, indirect, incidental, consequential, or special damages arising from the use
              of or inability to use the app, including but not limited to electrical design errors,
              code compliance violations, property damage, or personal injury.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The NEC, National Electrical Code, and related marks are registered trademarks of
              the National Fire Protection Association (NFPA). NECalcul8r is not affiliated with,
              endorsed by, or sponsored by the NFPA. References to NEC articles and tables are for
              educational and productivity purposes only.
            </p>
            <p className="text-muted-foreground mt-2">
              The NECalcul8r application software, interface design, and calculation logic are the
              intellectual property of the app developer. You may not copy, modify, distribute, or
              reverse-engineer the app or any portion of it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Acceptable Use</h2>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>You will not use the app for any unlawful purpose.</li>
              <li>You will not attempt to access another user's data without authorization.</li>
              <li>You will not abuse, overload, or disrupt the app's servers or infrastructure.</li>
              <li>You will not use automated tools to scrape or extract data from the app.</li>
              <li>You are responsible for keeping your account credentials secure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Subscription and Payment Terms</h2>
            <p className="text-muted-foreground">
              NECalcul8r may offer a free trial followed by a paid subscription. Subscription fees
              are billed through the app's payment provider (Stripe or the platform payment
              service). By subscribing, you authorize recurring billing at the displayed rate until
              you cancel. You may cancel at any time; access continues until the end of the current
              billing period. Refunds are handled per the payment provider's policies and applicable
              law. Prices may change with reasonable notice; existing subscriptions are unaffected
              until renewal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Account Termination</h2>
            <p className="text-muted-foreground">
              You may delete your account at any time. We may suspend or terminate your access if
              you violate these Terms, if your account is inactive for an extended period, or to
              protect the security or integrity of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Discrepancy Reports</h2>
            <p className="text-muted-foreground">
              You may submit discrepancy reports to help improve calculator accuracy. Submitted
              reports, including input values, calculated outputs, and any attached files, become
              the property of the app developer for the purpose of investigating and resolving
              reported issues and improving the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the jurisdiction in which the app developer
              operates, without regard to conflict-of-law principles. Any disputes shall be
              resolved in the courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. Material changes will be reflected by
              updating the "Last updated" date above. Continued use of the app after changes
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Support</h2>
            <p className="text-muted-foreground">
              For support questions or to report an issue, use the "Report Calculation Issue"
              feature within the app, or contact the developer through the support channel listed
              on the App Store or Google Play listing for NECalcul8r.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          NECalcul8r — NEC Electrical Code Calculator · Version 1.0.0
        </div>
      </div>
    </div>
  );
}