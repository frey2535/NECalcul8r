# NECalcul8r Supabase Edge Functions

Deploy these functions before enabling paid production access:

```bash
supabase functions deploy create-stripe-checkout
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
price IDs for every purchase package shown in the app.

Apple and Google purchase verification functions are intentionally fail-closed
until production store credentials and package/bundle IDs are configured.
