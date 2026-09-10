# Sell NECalcul8r outside Google Play

Three supported channels:

| Channel | Who | How |
| --- | --- | --- |
| **Stripe Checkout (website)** | Individuals & companies | `/purchase` on https://necalcul8r.currentflowconsulting.org |
| **License keys** | Invoices, Payment Links, resellers | Admin generates key → customer redeems on `/purchase` |
| **Admin grant** | Manual / BuildrPro / comps | User Management → set access |

## Website Stripe (already built)

1. Set live Stripe secrets in Supabase + `VITE_STRIPE_PRICE_MATRIX_JSON` (or per-plan env vars).
2. Deploy Stripe webhook + checkout functions.
3. Customer opens `/purchase` in a browser (not required inside the Play app for company plans).

## License keys (direct / offline sales)

### 1. Apply DB migration

Run `supabase/migrations/20260910120000_license_keys.sql` in the Supabase SQL editor (or `supabase db push`).

### 2. Deploy functions

```bash
supabase functions deploy activate-license-key --project-ref gqdxvctvufalunaaopyj
supabase functions deploy generate-license-key --project-ref gqdxvctvufalunaaopyj
```

### 3. Generate keys (platform admin)

From a signed-in admin session (browser console or a small admin tool):

```js
await base44.commerce.generateLicenseKeys({
  planKey: "individual_36_plus", // or company_0_10, etc.
  seats: 1,
  maxRedemptions: 1,
  count: 5,
  note: "Invoice #1234",
});
```

Or invoke the Edge Function with the admin JWT.

### 4. Customer redeems

Customer signs in → **Purchase** → **Redeem license key** → enters `NEC-XXXX-XXXX-XXXX`.

## Stripe Payment Links workflow

1. Create a Payment Link in Stripe Dashboard for the matching price.
2. After payment, either:
   - Auto-grant via Stripe webhook metadata `plan_key` (if configured), or
   - Generate a license key and email it with the invoice, or
   - Manually grant in User Management.

## What not to do

- Do **not** sell the same individual Android digital subscription through an in-app Stripe Checkout button (Play policy). Individual Android buys use Google Play Billing.
- Prefer PWA + Play Store for Android distribution; sideloading APKs is optional and confusing for customers.
