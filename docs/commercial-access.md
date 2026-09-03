# Commercial access setup

NECalcul8r now supports two runtime modes:

1. Local demo mode, used when Supabase env vars are missing.
2. Supabase commercial mode, used when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

Commercial mode uses Supabase as the source of truth for users, companies, subscriptions, and entitlements. Stripe, Google Play, Apple, and manual grants should all write to the same entitlement tables.

## Required services

- Supabase Auth and Postgres
- Stripe for web/company purchases
- Google Play Billing for Android in-app purchases
- Apple In-App Purchase for iOS in-app purchases

## Environment variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_INDIVIDUAL_PRICE_ID=
VITE_STRIPE_COMPANY_PRICE_ID=
```

Do not expose Stripe secret keys, Supabase service-role keys, Google service-account credentials, or Apple shared secrets in Vite env vars. Those belong only in Supabase Edge Function secrets.

## Supabase database

Run `supabase/schema.sql` in the Supabase SQL editor.

Important tables:

- `profiles`: one row per authenticated user.
- `organizations`: company/workspace accounts.
- `organization_memberships`: company membership records.
- `subscriptions`: Stripe, Google Play, Apple, or manual subscription records.
- `entitlements`: active access grants consumed by the app.
- `purchase_events`: webhook/purchase audit log.
- `app_records`: generic app data for projects, saved calculations, reports, and verification records.

## Access model

### Individual web customer

1. User creates an individual account.
2. User starts Stripe Checkout from the blocked-access screen.
3. Stripe webhook verifies payment.
4. Edge Function writes:
   - `subscriptions.provider = 'stripe'`
   - `entitlements.source = 'stripe'`
   - `entitlements.access_type = 'paid'`
   - `entitlements.status = 'active'`
5. The app reads the entitlement from Supabase and unlocks access.

### Company purchased outside app stores

1. Company pays by invoice, Stripe, direct contract, or other outside sale.
2. Platform admin/Edge Function creates or updates `organizations`.
3. Grant access by writing an organization entitlement:
   - `entitlements.org_id = <company id>`
   - `entitlements.source = 'company_external'`
   - `entitlements.access_type = 'external_company'`
   - `entitlements.seats = <seat count>`
   - `entitlements.status = 'active'`
4. Company users join with the company invite code.
5. Members inherit access from the organization entitlement.

### Android Play Store purchase

1. User buys inside the Android app with Google Play Billing.
2. Android app sends the purchase token to a Supabase Edge Function.
3. Edge Function verifies the purchase with the Google Play Developer API.
4. Edge Function writes:
   - `subscriptions.provider = 'google_play'`
   - `entitlements.source = 'google_play'`
   - `entitlements.access_type = 'google_play'`
   - `entitlements.status = 'active'`

Do not route Android in-app digital purchases through Stripe.

### iOS App Store purchase

1. User buys inside the iOS app with Apple In-App Purchase.
2. iOS app sends receipt/transaction data to a Supabase Edge Function.
3. Edge Function verifies it with Apple.
4. Edge Function writes:
   - `subscriptions.provider = 'apple_app_store'`
   - `entitlements.source = 'apple_app_store'`
   - `entitlements.access_type = 'apple_app_store'`
   - `entitlements.status = 'active'`

Do not route iOS in-app digital purchases through Stripe.

## Edge Function contracts

The frontend expects these Supabase Edge Functions:

### `create-stripe-checkout`

Input:

```json
{
  "mode": "subscription",
  "accountType": "individual",
  "priceId": "price_...",
  "quantity": 1,
  "successUrl": "https://necalcul8r.currentflowconsulting.org/",
  "cancelUrl": "https://necalcul8r.currentflowconsulting.org/"
}
```

Output:

```json
{ "url": "https://checkout.stripe.com/..." }
```

### `create-stripe-portal-session`

Input:

```json
{ "returnUrl": "https://necalcul8r.currentflowconsulting.org/profile" }
```

Output:

```json
{ "url": "https://billing.stripe.com/..." }
```

### `grant-access`

Input:

```json
{
  "orgId": "uuid",
  "profileId": "uuid",
  "seats": 10,
  "expiresAt": null,
  "accessType": "external_company",
  "source": "company_external",
  "updates": {
    "access_status": "active",
    "access_type": "external_company"
  },
  "note": "Invoice paid outside app store"
}
```

Output:

```json
{ "ok": true }
```

### `verify-google-play-purchase`

Input:

```json
{
  "productId": "necalcul8r_monthly",
  "purchaseToken": "token-from-google-play",
  "source": "google_play"
}
```

Output:

```json
{ "ok": true, "access_status": "active" }
```

### `verify-apple-purchase`

Input:

```json
{
  "receiptData": "base64-receipt",
  "transactionId": "apple-transaction-id",
  "source": "apple_app_store"
}
```

Output:

```json
{ "ok": true, "access_status": "active" }
```

## App-store policy shape

Use a free-to-download mobile app with login.

Allowed flows:

- Company users sign in with accounts purchased outside the app stores.
- Individual users can subscribe on the website with Stripe.
- Android users can subscribe in-app through Google Play Billing.
- iOS users can subscribe in-app through Apple In-App Purchase.

Avoid:

- Stripe checkout links/buttons inside Android or iOS for digital app access.
- Text inside the mobile app telling users to go around app-store billing.
