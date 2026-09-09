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
VITE_GOOGLE_PLAY_BASE_PLAN_ID=monthly
VITE_STRIPE_INDIVIDUAL_TIERED_PRICE_ID=
VITE_STRIPE_COMPANY_TIERED_PRICE_ID=
VITE_STRIPE_TIERED_PRICE_ID=
VITE_STRIPE_PRICE_INDIVIDUAL_6_15=
VITE_STRIPE_PRICE_INDIVIDUAL_16_25=
VITE_STRIPE_PRICE_INDIVIDUAL_26_35=
VITE_STRIPE_PRICE_INDIVIDUAL_36_PLUS=
VITE_STRIPE_PRICE_COMPANY_0_10=
VITE_STRIPE_PRICE_COMPANY_11_20=
VITE_STRIPE_PRICE_COMPANY_UNLIMITED=
VITE_STRIPE_PRICE_MATRIX_JSON=
```

Do not expose Stripe secret keys, Supabase service-role keys, Google service-account credentials, or Apple shared secrets in Vite env vars. Those belong only in Supabase Edge Function secrets.

Stripe can be configured in two supported ways.

Preferred for the current setup: use one active monthly volume-tiered Stripe Price for individual tiers and one active monthly volume-tiered Stripe Price for company tiers:

```bash
VITE_STRIPE_INDIVIDUAL_TIERED_PRICE_ID=price_...
VITE_STRIPE_COMPANY_TIERED_PRICE_ID=price_...
```

The app sends these subscription-item quantities to select the matching volume bracket:

| Plan | Quantity sent to Stripe |
| --- | ---: |
| `individual_6_15` | 15 |
| `individual_16_25` | 25 |
| `individual_26_35` | 35 |
| `individual_36_plus` | 36 |
| `company_0_10` | 10 |
| `company_11_20` | 20 |
| `company_unlimited` | 1000 |

The individual tiered Price should contain the individual calculator-count brackets. The company tiered Price should contain the company employee-seat brackets.

`VITE_STRIPE_TIERED_PRICE_ID` is only a backward-compatible fallback if both plan families intentionally share one tiered Price.

Use Stripe **volume pricing** when the selected bracket should determine the single monthly total. Stripe **graduated pricing** calculates each bracket incrementally and should only be used if that is intentional.

Suggested individual volume tiers:

| Quantity bracket | Monthly total |
| --- | ---: |
| 6-15 | $10 |
| 16-25 | $20 |
| 26-35 | $35 |
| 36+ | $50 |

Suggested company volume tiers:

| Quantity bracket | Monthly total |
| --- | ---: |
| 1-10 seats | $400 |
| 11-20 seats | $800 |
| 21+ seats | $1,500 |

Alternative: if you later split plans into separate fixed Stripe Prices, provide per-plan variables above or use `VITE_STRIPE_PRICE_MATRIX_JSON`. The JSON maps each final plan key to a Stripe recurring price ID. Free access does not need a Stripe price:

```json
{
  "individual_6_15": { "priceId": "price_...", "priceLabel": "$10/mo" },
  "individual_16_25": { "priceId": "price_...", "priceLabel": "$20/mo" },
  "individual_26_35": { "priceId": "price_...", "priceLabel": "$35/mo" },
  "individual_36_plus": { "priceId": "price_...", "priceLabel": "$50/mo" },
  "company_0_10": { "priceId": "price_...", "priceLabel": "$400/mo" },
  "company_11_20": { "priceId": "price_...", "priceLabel": "$800/mo" },
  "company_unlimited": { "priceId": "price_...", "priceLabel": "$1,500/mo" }
}
```

Final plan keys:

- `free`: unlocks the first 5 calculators. NEC Tables and complete export/printing remain locked.
- `individual_6_15`: unlocks up to 15 calculators, NEC Tables, and complete export/printing.
- `individual_16_25`: unlocks up to 25 calculators, NEC Tables, and complete export/printing.
- `individual_26_35`: unlocks up to 35 calculators, NEC Tables, and complete export/printing.
- `individual_36_plus`: unlocks all calculators, including new calculators as they are developed.
- `company_0_10`, `company_11_20`, `company_unlimited`: full-access company plans for all seats in the plan.

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
   - `entitlements.source = 'google_play'`
   - `entitlements.access_type = 'google_play'`
   - `entitlements.status = 'active'`
   - `entitlements.metadata.plan_key`
   - `google_play_purchases` audit record

Active Google Play product IDs:

- `individual_6_15`
- `individual_16_25`
- `individual_26_35`
- `individual_36_plus`

All use base plan ID `monthly`. The legacy product ID `necalcul8r` has no active base plan and must not be referenced in new purchase flows.

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
  "planKey": "individual_36_plus",
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

### `sync-stripe-checkout-session`

The app calls this after Stripe redirects back with
`stripe_checkout_session_id={CHECKOUT_SESSION_ID}`. It verifies the Checkout
Session belongs to the signed-in profile or organization, fetches the Stripe
subscription, and writes the same subscription/entitlement records as the
webhook.

Input:

```json
{ "sessionId": "cs_test_..." }
```

Output:

```json
{
  "ok": true,
  "accessStatus": "active",
  "subscriptionStatus": "active",
  "planKey": "company_0_10"
}
```

### `update-stripe-subscription`

Active Stripe subscribers use this for upgrades instead of creating a second
subscription. The function finds the current active subscription for the signed-in
profile or organization, updates the subscription item to the higher tier, uses
`proration_behavior=always_invoice`, and syncs the upgraded entitlement after
Stripe accepts the update.

Input:

```json
{
  "accountType": "individual",
  "planKey": "individual_36_plus",
  "priceId": "price_...",
  "quantity": 36,
  "seats": 1
}
```

Output:

```json
{
  "ok": true,
  "proration": "always_invoice",
  "accessStatus": "active",
  "subscriptionStatus": "active",
  "planKey": "individual_36_plus"
}
```

Same-tier, downgrade, and cancellation changes should stay in Stripe Billing
Portal so users keep access through the billing period they already paid for.

### `grant_profile_access` RPC / `grant-access`

Manual owner grants use the `grant_profile_access` Supabase RPC when it is installed from
`supabase/schema.sql` or `supabase/fixes/fix-admin-access-grants.sql`. The RPC verifies that the
caller is a platform admin, updates the profile access fields, records the active entitlement, and writes an `access_grants` audit record. Existing deployments may also provide the equivalent
`grant-access` Edge Function; the app falls back to that function only when the RPC is not installed.

Input:

```json
{
  "orgId": "uuid",
  "profileId": "uuid",
  "seats": 10,
  "customerTierId": "company_0_10",
  "planKey": "owner_full_access",
  "expiresAt": null,
  "accessType": "permanent",
  "source": "owner_grant",
  "reason": "Owner-approved full access",
  "updates": {
    "access_status": "active",
    "access_type": "permanent"
  },
  "note": "Owner-approved full access"
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
  "productId": "individual_36_plus",
  "basePlanId": "monthly",
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
- Android users can subscribe in-app through Google Play Billing for the four active individual products.
- iOS users can subscribe in-app through Apple In-App Purchase.

Avoid:

- Stripe checkout links/buttons inside Android or iOS for digital app access.
- Text inside the mobile app telling users to go around app-store billing.
