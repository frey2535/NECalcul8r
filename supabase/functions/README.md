# NECalcul8r Supabase Edge Functions

Deploy these functions before enabling paid production access:

```bash
supabase functions deploy create-stripe-checkout
supabase functions deploy sync-stripe-checkout-session
supabase functions deploy update-stripe-subscription
supabase functions deploy create-stripe-portal-session
supabase functions deploy grant-access
supabase functions deploy stripe-webhook
supabase functions deploy verify-google-play-purchase
supabase functions deploy verify-apple-purchase
```

Required secrets for Stripe:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

The frontend also needs `VITE_STRIPE_PRICE_MATRIX_JSON` configured with Stripe
price IDs for every purchase package shown in the app. Checkout sends the
selected customer tier, calculator tier, seat limit, and billing quantity to
Stripe metadata. `stripe-webhook` copies those values into Supabase
entitlements, and `sync-stripe-checkout-session` provides an authenticated
return-from-Checkout reconciliation path if webhook delivery is delayed or needs
to be resent.

`update-stripe-subscription` updates the current active Stripe subscription item
for prorated upgrades. It uses `proration_behavior=always_invoice` so the
customer is charged the prorated upgrade difference immediately, then syncs the
new entitlement. Same-tier, downgrade, and cancellation changes should remain in
Stripe Billing Portal so paid access continues through the already-paid period.

Apple and Google purchase verification functions are intentionally fail-closed
until production store credentials and package/bundle IDs are configured.
