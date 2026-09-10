# Google Play production submission checklist

Use this checklist after the latest `main` branch is deployed and the Android
subscription products are active in Play Console.

## 1. Supabase production functions and secrets

Deploy or confirm these functions:

```bash
supabase functions deploy verify-google-play-purchase --project-ref gqdxvctvufalunaaopyj
supabase functions deploy google-play-rtdn --project-ref gqdxvctvufalunaaopyj
supabase functions deploy activate-license-key --project-ref gqdxvctvufalunaaopyj
supabase functions deploy generate-license-key --project-ref gqdxvctvufalunaaopyj
supabase functions deploy create-stripe-checkout --project-ref gqdxvctvufalunaaopyj
supabase functions deploy stripe-webhook --project-ref gqdxvctvufalunaaopyj
supabase functions deploy sync-stripe-checkout-session --project-ref gqdxvctvufalunaaopyj
supabase functions deploy update-stripe-subscription --project-ref gqdxvctvufalunaaopyj
supabase functions deploy create-stripe-portal-session --project-ref gqdxvctvufalunaaopyj
```

Confirm these Supabase secrets are set:

- `GOOGLE_PLAY_PACKAGE_NAME=com.currentflow.necalcul8r`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS`
- `GOOGLE_PLAY_BASE_PLAN_ID=monthly`
- `GOOGLE_PLAY_RTDN_TOKEN` (optional shared secret for the RTDN endpoint)
- Stripe live secrets used by the web purchase flow

## 2. Google Play subscriptions

Create and activate these subscription products in Play Console:

- `individual_6_15`
- `individual_16_25`
- `individual_26_35`
- `individual_36_plus`

Each product should have an active `monthly` base plan. The Android app queries
these exact product IDs and base plan ID.

## 3. Real-time developer notifications (RTDN)

1. Create a Google Cloud Pub/Sub topic (for example `necalcul8r-play-rtdn`).
2. Add a push subscription to:
   `https://gqdxvctvufalunaaopyj.supabase.co/functions/v1/google-play-rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>`
3. In Play Console → Monetization setup → Real-time developer notifications, connect that topic.
4. Send a test notification and confirm the function returns `{ ok: true }`.

RTDN keeps cancelled / expired subscriptions in sync without waiting for the next app open.

## 4. GitHub Actions secrets

The signed AAB workflow requires:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_UPLOAD_STORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASSWORD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_PLAY_BASE_PLAN_ID`

To upload directly to Google Play from GitHub Actions, also add:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

Use the same service account that has Android Publisher API access for the app.

## 5. Build and upload the AAB

Run GitHub Actions workflow **Build Android App Bundle**.

For a build artifact only:

- `upload_to_play`: `false`

For a draft upload to Google Play:

- `upload_to_play`: `true`
- `play_track`: `internal`

The workflow uploads the versioned `release/NECalcul8r-<package-version>.aab`
artifact and, when enabled, uploads the same AAB to the selected Play track as a
draft release.

You can also upload the latest local AAB from Downloads
(`NECalcul8r-1.0.0.aab`) manually in Play Console → Production / Testing.

## 6. Required Play Console forms

Complete:

- Store listing (title, short/full description)
- App icon, feature graphic, phone screenshots
- Privacy Policy URL: `https://necalcul8r.currentflowconsulting.org/privacy`
- Terms URL: `https://necalcul8r.currentflowconsulting.org/terms`
- EULA URL (optional): `https://necalcul8r.currentflowconsulting.org/eula`
- Data Safety
- Content rating
- Target audience
- App access instructions / test credentials
- Subscription declarations and pricing
- Confirm individual in-app purchases use Play Billing only (no Stripe Checkout for digital goods inside the Android app)

## 7. Device test before production

Install from the Play internal testing track on a real Android device and verify:

- New user registration/login
- Free calculator access
- Locked calculator opens purchase flow
- Google Play subscription purchase unlocks the selected tier
- Restore purchases works
- Cancelled subscription remains active through the paid period
- Expired subscription removes paid access after expiration (RTDN or next verify)
- Company plan CTA does **not** open Stripe Checkout inside the Android app

## 8. Production access

If this is a newer personal Play developer account, complete Google's closed
testing requirement before production access:

- At least 12 testers
- Opted in continuously for 14 days
- Submit the production access questionnaire with actual tester feedback

## 9. Selling outside Play

See [direct-sales.md](./direct-sales.md) for Stripe website checkout and license keys.
