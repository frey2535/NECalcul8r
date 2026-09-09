# Google Play production submission checklist

Use this checklist after the latest `main` branch is deployed and the Android
subscription products are active in Play Console.

## 1. Supabase production functions and secrets

Deploy or confirm these functions:

```bash
supabase functions deploy verify-google-play-purchase --project-ref gqdxvctvufalunaaopyj
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
- Stripe live secrets used by the web purchase flow

## 2. Google Play subscriptions

Create and activate these subscription products in Play Console:

- `individual_6_15`
- `individual_16_25`
- `individual_26_35`
- `individual_36_plus`

Each product should have an active `monthly` base plan. The Android app queries
these exact product IDs and base plan ID.

## 3. GitHub Actions secrets

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

## 4. Build and upload the AAB

Run GitHub Actions workflow **Build Android App Bundle**.

For a build artifact only:

- `upload_to_play`: `false`

For a draft upload to Google Play:

- `upload_to_play`: `true`
- `play_track`: `internal`

The workflow uploads `release/NECalcul8r-1.0.0.aab` as an artifact and, when
enabled, uploads the same AAB to the selected Play track as a draft release.

## 5. Required Play Console forms

Complete:

- Store listing
- App icon, feature graphic, phone screenshots
- Privacy Policy URL
- Data Safety
- Content rating
- Target audience
- App access instructions/test credentials
- Subscription declarations and pricing

## 6. Device test before production

Install from the Play internal testing track on a real Android device and verify:

- New user registration/login
- Free calculator access
- Locked calculator opens purchase flow
- Google Play subscription purchase unlocks the selected tier
- Restore purchases works
- Cancelled subscription remains active through the paid period
- Expired subscription removes paid access after expiration

## 7. Production access

If this is a newer personal Play developer account, complete Google's closed
testing requirement before production access:

- At least 12 testers
- Opted in continuously for 14 days
- Submit the production access questionnaire with actual tester feedback
