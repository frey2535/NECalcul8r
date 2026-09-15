# Apple App Store production checklist

Use this checklist to take the Capacitor iOS app from this repo to TestFlight / App Store.

Bundle ID: `com.currentflow.necalcul8r`  
App name: `NECalcul8r`

## 1. Apple Developer + App Store Connect

1. Enroll in the Apple Developer Program.
2. In Certificates, Identifiers & Profiles, create an App ID with bundle ID `com.currentflow.necalcul8r`.
3. Enable **In-App Purchase** capability for that App ID.
4. Create the app record in App Store Connect with the same bundle ID.
5. Create a distribution certificate and App Store provisioning profile (Xcode can manage this automatically when signed in).

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

## 3. Mac build machine steps

These commands need macOS + Xcode:

```bash
npm ci
npm run ios:sync
npx cap open ios
```

In Xcode:

1. Select the **App** target → Signing & Capabilities → your Team.
2. Confirm Bundle Identifier is `com.currentflow.necalcul8r`.
3. Add capability **In-App Purchase** if Xcode did not add it automatically.
4. Product → Archive → Distribute App → App Store Connect / TestFlight.

Optional local script after sync:

```bash
npm run ios:sync
```

## 4. Supabase Apple verification

Deploy / finish:

```bash
supabase functions deploy verify-apple-purchase --project-ref <your-ref>
```

Set secrets (App Store Server API preferred):

- `APPLE_BUNDLE_ID=com.currentflow.necalcul8r`
- `APPLE_APP_STORE_CONNECT_ISSUER_ID`
- `APPLE_APP_STORE_CONNECT_KEY_ID`
- `APPLE_APP_STORE_CONNECT_PRIVATE_KEY` (`.p8` contents)
- or legacy `APPLE_APP_SHARED_SECRET` only if you still use verifyReceipt

The current function is a secure stub until those credentials and the Server API verification flow are finished. Purchases from the iOS plugin will call it with `productId`, `transactionId`, and `signedTransaction`.

## 5. App Store Connect forms

Complete:

- App Privacy / Privacy Policy URL (`/privacy`)
- Terms of Use / EULA (`/terms`, `/eula`)
- Age rating
- Screenshots for required device sizes
- App Review information + demo account (same style as Play reviewer login)
- Subscription information / paid apps agreements / banking / tax
- Export compliance answers

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

## 7. What this PR already added in the repo

- Capacitor `ios/` project
- StoreKit 2 plugin `AppleAppStoreBillingPlugin`
- JS bridge `src/lib/appleAppStoreBilling.js`
- Purchase page gates Stripe/license redemption on iOS and uses IAP for individual plans
- Matching App Store product IDs on pricing plans
- `npm run ios:sync` script

## 8. Still required outside the repo

- Apple Developer account actions above
- Xcode archive on a Mac
- Finish `verify-apple-purchase` Server API verification
- App Store Connect metadata + TestFlight review
