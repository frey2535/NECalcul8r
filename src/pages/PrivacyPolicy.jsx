import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
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
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-2">Last updated: August 10, 2026</p>
        <p className="text-sm text-muted-foreground mb-8">
          This Privacy Policy describes how NECalcul8r ("we", "us", "the app") collects, uses, shares,
          safeguards, and handles your information when you use our mobile application and related
          services. By downloading and using NECalcul8r, you agree to the practices described in this
          policy.
        </p>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground">
              NECalcul8r is a professional electrical code calculation and reference tool built on the
              Base44 platform. It helps engineers, electricians, inspectors, and students perform and
              verify electrical calculations based on NEC (National Electrical Code) standards. This
              policy explains what data we collect, why we collect it, how it is stored, and how you
              can manage or delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect the following categories of information:</p>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>
                <strong className="text-foreground">Account information:</strong> Your email address,
                full name, and assigned role (admin or user) when you register or sign in with email
                or Google. This is required to create and manage your account.
              </li>
              <li>
                <strong className="text-foreground">Calculator inputs and outputs:</strong> When you
                submit a "Report Calculation Issue," a snapshot of the calculator's input values and
                calculated results is stored with your report so we can investigate the discrepancy.
              </li>
              <li>
                <strong className="text-foreground">Uploaded files:</strong> If you upload blueprints
                for code-compliance analysis or attach screenshots to a discrepancy report, those
                files are stored securely and linked to your account.
              </li>
              <li>
                <strong className="text-foreground">Optional contact email:</strong> When filing a
                discrepancy report, you may optionally provide a contact email for follow-up.
              </li>
              <li>
                <strong className="text-foreground">Usage analytics:</strong> We track anonymous usage
                events (such as which calculator was opened) to improve the app. These events do not
                include personally identifiable information.
              </li>
              <li>
                <strong className="text-foreground">Device and technical data:</strong> Limited
                technical information such as app version and platform may be collected for
                compatibility and diagnostic purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Authentication</h2>
            <p className="text-muted-foreground">
              Authentication is managed by the Base44 platform. You may register with an email and
              password or sign in with Google. Passwords are hashed and never stored in plain text.
              Authentication tokens are issued per session and expire automatically. We do not store
              your Google password — Google handles authentication through its secure OAuth flow.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. How We Use Your Information</h2>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>To provide, operate, and maintain the calculator and analysis features.</li>
              <li>To create and manage your account and authenticate your sessions.</li>
              <li>To investigate and resolve reported calculation discrepancies.</li>
              <li>To improve calculator accuracy, coverage, and overall user experience.</li>
              <li>To administer your account and enforce subscription or trial terms.</li>
              <li>To respond to your support requests and communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Sharing and Third Parties</h2>
            <p className="text-muted-foreground mb-3">
              We do <strong className="text-foreground">not</strong> sell, rent, or trade your personal
              information to third parties. We share information only with the service providers that
              make the app possible:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>
                <strong className="text-foreground">Base44:</strong> Hosting, database, authentication,
                file storage, and backend infrastructure. Your data is stored on Base44's secure
                servers.
              </li>
              <li>
                <strong className="text-foreground">Google:</strong> Optional sign-in via Google OAuth,
                subject to Google's Privacy Policy. We receive your email and name from Google — we do
                not access your Google password or other Google account data.
              </li>
              <li>
                <strong className="text-foreground">Payment provider (Stripe / Wix Payments):</strong>{" "}
                Processes subscription payments. Card data is handled entirely by the payment provider
                and is never stored or accessible to the app.
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We may disclose information when required by law, court order, or to protect the rights,
              property, or safety of our users or others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Your data is stored for your signed-in account only. Saved analyses, project calculations, and reports are
              private to that user. Teammates in the same company workspace cannot open each other’s
              calculations. Organization admins can manage account access, but not view another
              user’s calculation history.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground">
              Your data is retained while your account is active. Discrepancy reports and uploaded
              analysis files are retained for the life of your account so you can access your history.
              Anonymous usage analytics may be retained indefinitely. If you delete your account, your
              personal data is removed as described in Section 8.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Data Deletion and Your Rights</h2>
            <p className="text-muted-foreground mb-3">
              You have the right to access, correct, export, or delete your personal data at any time.
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>
                <strong className="text-foreground">Account deletion:</strong> You can request deletion
                of your account and all associated personal data (analyses, reports, uploaded files,
                and account information) by contacting us as described in Section 11. We will process
                your deletion request within 30 days.
              </li>
              <li>
                <strong className="text-foreground">In-app deletion:</strong> Where available, you can
                delete individual analyses and reports directly from your history within the app.
              </li>
              <li>
                <strong className="text-foreground">Data export:</strong> You may request an export of
                your analysis history and account data in a portable format.
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              After account deletion, anonymized or aggregated data that no longer identifies you may be
              retained for product improvement. Discrepancy reports may be retained with all personally
              identifiable information removed to improve calculator accuracy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground">
              The app is a professional tool intended for electricians, engineers, inspectors, and
              code officials. It is not directed to children under 13 (or the applicable age in your
              jurisdiction), and we do not knowingly collect personal information from children. If you
              believe a child has provided us with personal information, please contact us and we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. International Users</h2>
            <p className="text-muted-foreground">
              The app and its data are hosted in the United States. If you access the app from outside
              the United States, your information will be transferred to and processed in the United
              States. By using the app, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground mb-3">
              If you have any questions about this Privacy Policy, your data, or to exercise your data
              rights (including account deletion requests), please contact us:
            </p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-5">
              <li>Through the contact information listed on the NECalcul8r Google Play Store listing.</li>
              <li>Through the Base44 platform support channel.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We will respond to your request within a reasonable timeframe, and no later than 30 days
              for data deletion or access requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Material changes will be reflected by
              updating the "Last updated" date at the top of this page. We encourage you to review this
              policy periodically. Continued use of the app after changes constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Consent</h2>
            <p className="text-muted-foreground">
              By downloading and using NECalcul8r, you confirm that you have read and understood this
              Privacy Policy and consent to the collection, use, and sharing of your information as
              described herein.
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