# Apple App Store production checklist

Use this checklist to take the Capacitor iOS app from this repo to TestFlight / App Store.

Bundle ID: `com.currentflow.necalcul8r`  
App name: `NECalcul8r`  
Marketing version: `1.0.6` (matches Android)  
iOS build: `9`

## 1. Apple Developer + App Store Connect

1. Enroll in the Apple Developer Program.
2. In Certificates, Identifiers & Profiles, create an App ID with bundle ID `com.currentflow.necalcul8r`.
3. Enable **In-App Purchase** capability for that App ID.
4. Create the app record in App Store Connect with the same bundle ID.
5. Create a distribution certificate and App Store provisioning profile (Xcode can manage this automatically when signed in).
6. In Users and Access → Integrations → App Store Connect API, create an **In-App Purchase** key (`.p8`). Note Issuer ID and Key ID for Supabase secrets.

## 2. Subscription products

Create auto-renewable subscriptions that match the Android product IDs:

| Plan | Product ID |
|------|------------|
| Individual 6-15 | `individual_6_15` |
| Individual 16-25 | `individual_16_25` |
| Individual 26-35 | `individual_26_35` |
| Individual 36+ | `individual_36_plus` |

Put them in one subscription group (for example `necalcul8r_individual`).  
Use monthly pricing that matches the web/Play tiers.

Company plans stay on the website (Stripe / license keys). Do **not** sell company digital access through iOS IAP, and do **not** open Stripe Checkout for individual digital goods inside the iOS app.

## 3. Supabase Apple verification

Apply the purchase ledger migration if not already applied:

```bash
# SQL editor or psql — contents of:
# supabase/fixes/add-apple-app-store-purchases.sql
```

Deploy the verifier:

```bash
supabase functions deploy verify-apple-purchase --project-ref gqdxvctvufalunaaopyj
```

Set App Store Server API secrets (required — fail-closed without them):

```bash
supabase secrets set APPLE_BUNDLE_ID=com.currentflow.necalcul8r --project-ref gqdxvctvufalunaaopyj
supabase secrets set APPLE_APP_STORE_CONNECT_ISSUER_ID=<issuer-id> --project-ref gqdxvctvufalunaaopyj
supabase secrets set APPLE_APP_STORE_CONNECT_KEY_ID=<key-id> --project-ref gqdxvctvufalunaaopyj
supabase secrets set APPLE_APP_STORE_CONNECT_PRIVATE_KEY="$(cat AuthKey_XXXXX.p8)" --project-ref gqdxvctvufalunaaopyj
```

The iOS StoreKit plugin sends `productId`, `transactionId`, `originalTransactionId`, and `signedTransaction` (JWS). The edge function looks up the transaction via the App Store Server API and writes `apple_app_store_purchases` + entitlements.

## 4. Mac build machine steps

These commands need macOS + Xcode:

```bash
npm ci
npm run ios:sync
npx cap open ios
```

In Xcode:

1. Select the **App** target → Signing & Capabilities → your Team.
2. Confirm Bundle Identifier is `com.currentflow.necalcul8r`.
3. Confirm **In-App Purchase** capability is present (entitlements file is wired).
4. Confirm Marketing Version `1.0.6` and Build `9` (or bump build for each upload).
5. Product → Archive → Distribute App → App Store Connect / TestFlight.

Optional local script after sync:

```bash
npm run ios:sync
```

## 5. App Store Connect forms

Complete:

- App Privacy / Privacy Policy URL (`https://<your-domain>/privacy`) — matches `PrivacyInfo.xcprivacy`
- Terms of Use / EULA (`/terms`, `/eula`)
- Age rating
- Screenshots for required device sizes (6.7", 6.5", 5.5" iPhone; 12.9" iPad if you keep iPad support)
- App Review information + demo account (same style as Play reviewer login)
- Subscription information / paid apps agreements / banking / tax
- Export compliance — repo sets `ITSAppUsesNonExemptEncryption=false` (standard HTTPS only)

Suggested App Review notes:

```text
Sign in with email and password (not Sign in with Apple unless enabled).

Email: googleplayreview@currentflowconsulting.org
Password: <current reviewer password>

Individual upgrades use Apple In-App Purchase only.
Company plans are sold on the website, not inside the iOS app.
```

## 6. Device test before release

Install from TestFlight and verify:

- Login / registration
- Free calculators
- Locked calculator opens App Store purchase sheet
- Successful purchase unlocks the selected tier
- Restore purchases
- Cancelled subscription remains active through the paid period
- Company CTA does **not** open Stripe Checkout in-app
- Account deletion still works
- Privacy / Terms / EULA open

## 7. What this repo already includes

- Capacitor `ios/` project (`com.currentflow.necalcul8r`)
- StoreKit 2 plugin `AppleAppStoreBillingPlugin` (sends JWS `signedTransaction`)
- JS bridge `src/lib/appleAppStoreBilling.js`
- Purchase page gates Stripe/license redemption on iOS and uses IAP for individual plans
- Matching App Store product IDs on pricing plans
- `verify-apple-purchase` Edge Function + `_shared/apple-app-store.ts` (Server API)
- `apple_app_store_purchases` table (schema + `supabase/fixes/add-apple-app-store-purchases.sql`)
- `App.entitlements`, `PrivacyInfo.xcprivacy`, export-compliance plist flag
- `npm run ios:sync` script

## 8. Still required outside the repo

- Apple Developer account + App Store Connect app record
- Create the four auto-renewable subscription products
- Create App Store Connect API key and set Supabase secrets
- Apply SQL migration + deploy `verify-apple-purchase`
- Xcode archive on a Mac → TestFlight → App Review
