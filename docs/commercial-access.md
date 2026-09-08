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
VITE_STRIPE_PRICE_MATRIX_JSON=
```

Do not expose Stripe secret keys, Supabase service-role keys, Google service-account credentials, or Apple shared secrets in Vite env vars. Those belong only in Supabase Edge Function secrets.

`VITE_STRIPE_PRICE_MATRIX_JSON` maps every visible purchase package to a Stripe price ID. Each price should be the full package price shown to the customer. Use `seatLimit` for the number of users granted by the entitlement and keep `billingQuantity` at `1` unless you intentionally configure the Stripe price as a per-seat price:

```json
{
  "individual:calc_0_10": { "priceId": "price_...", "priceLabel": "$9/mo", "seatLimit": 1, "billingQuantity": 1 },
  "individual:calc_11_20": { "priceId": "price_...", "priceLabel": "$19/mo", "seatLimit": 1, "billingQuantity": 1 },
  "individual:calc_21_30": { "priceId": "price_...", "priceLabel": "$29/mo", "seatLimit": 1, "billingQuantity": 1 },
  "individual:calc_31_plus": { "priceId": "price_...", "priceLabel": "$39/mo", "seatLimit": 1, "billingQuantity": 1 },
  "company_0_10:calc_0_10": { "priceId": "price_...", "priceLabel": "$49/mo", "seatLimit": 10, "billingQuantity": 1 },
  "company_0_10:calc_11_20": { "priceId": "price_...", "priceLabel": "$99/mo", "seatLimit": 10, "billingQuantity": 1 },
  "company_0_10:calc_21_30": { "priceId": "price_...", "priceLabel": "$149/mo", "seatLimit": 10, "billingQuantity": 1 },
  "company_0_10:calc_31_plus": { "priceId": "price_...", "priceLabel": "$199/mo", "seatLimit": 10, "billingQuantity": 1 },
  "company_10_30:calc_0_10": { "priceId": "price_...", "priceLabel": "$129/mo", "seatLimit": 30, "billingQuantity": 1 },
  "company_10_30:calc_11_20": { "priceId": "price_...", "priceLabel": "$249/mo", "seatLimit": 30, "billingQuantity": 1 },
  "company_10_30:calc_21_30": { "priceId": "price_...", "priceLabel": "$369/mo", "seatLimit": 30, "billingQuantity": 1 },
  "company_10_30:calc_31_plus": { "priceId": "price_...", "priceLabel": "$499/mo", "seatLimit": 30, "billingQuantity": 1 },
  "company_30_plus:calc_0_10": { "priceId": "price_...", "priceLabel": "$299/mo", "seatLimit": 31, "billingQuantity": 1 },
  "company_30_plus:calc_11_20": { "priceId": "price_...", "priceLabel": "$549/mo", "seatLimit": 31, "billingQuantity": 1 },
  "company_30_plus:calc_21_30": { "priceId": "price_...", "priceLabel": "$799/mo", "seatLimit": 31, "billingQuantity": 1 },
  "company_30_plus:calc_31_plus": { "priceId": "price_...", "priceLabel": "$999/mo", "seatLimit": 31, "billingQuantity": 1 }
}
```

Calculator package IDs:

- `calc_0_10`: unlocks the first 10 calculators in the app suite.
- `calc_11_20`: unlocks the first 20 calculators in the app suite.
- `calc_21_30`: unlocks the first 30 calculators in the app suite.
- `calc_31_plus`: unlocks the full calculator suite.

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
   - `entitlements.metadata.customer_tier_id`
   - `entitlements.metadata.calculator_tier_id`
   - `entitlements.metadata.calculator_limit`
   - `entitlements.metadata.seat_limit`
5. The app reads the entitlement from Supabase and unlocks access.

### Company purchased outside app stores

1. Company pays by invoice, Stripe, direct contract, or other outside sale.
2. The buyer must have an account connected to an organization. If they selected a company name at registration, NECalcul8r creates that organization and shows its invite code to the company owner.
3. Platform admin/Edge Function creates or updates `organizations`.
4. Grant access by writing an organization entitlement:
   - `entitlements.org_id = <company id>`
   - `entitlements.source = 'company_external'`
   - `entitlements.access_type = 'external_company'`
   - `entitlements.seats = <seat count>`
   - `entitlements.status = 'active'`
   - `entitlements.metadata.customer_tier_id = <customer tier id>`
   - `entitlements.metadata.calculator_tier_id = <calculator tier id>`
5. Company users join with the company invite code.
6. Members inherit access from the organization entitlement.

### Android Play Store purchase

The Android build includes the Google Play Billing Library so Google Play Console can unlock subscription
product setup. The in-app purchase UI, native purchase bridge, and server-side Google Play Developer API
verification must still be completed before Android users can buy digital access inside the app.

Target flow:

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
  "customerTierId": "individual",
  "calculatorTierId": "calc_31_plus",
  "priceId": "price_...",
  "quantity": 1,
  "seats": 1,
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

### `grant_profile_access` RPC / `grant-access`

Manual admin grants use the `grant_profile_access` Supabase RPC when it is installed from
`supabase/schema.sql` or `supabase/fixes/fix-admin-access-grants.sql`. The RPC verifies that the
caller is a platform admin or an owner of the target user's organization, updates the profile access
fields, and records the active entitlement. Existing deployments may also provide the equivalent
`grant-access` Edge Function; the app falls back to that function only when the RPC is not installed.

Input:

```json
{
  "orgId": "uuid",
  "profileId": "uuid",
  "seats": 10,
  "customerTierId": "company_0_10",
  "calculatorTierId": "calc_31_plus",
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
  "productId": "necalcul8r_pro",
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
- Android users can subscribe in-app through Google Play Billing after the native purchase flow and Google Play verification function are completed.
- iOS users can subscribe in-app through Apple In-App Purchase.

Avoid:

- Stripe checkout links/buttons inside Android or iOS for digital app access.
- Text inside the mobile app telling users to go around app-store billing.
