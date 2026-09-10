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
supabase functions deploy google-play-rtdn
supabase functions deploy activate-license-key
supabase functions deploy generate-license-key
supabase functions deploy verify-apple-purchase
supabase functions deploy create-cursor-agent
```

Required secrets for Google Play:

```bash
supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.currentflow.necalcul8r
supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS='{...}'
supabase secrets set GOOGLE_PLAY_BASE_PLAN_ID=monthly
supabase secrets set GOOGLE_PLAY_RTDN_TOKEN=optional-shared-secret
```

Required secrets for Stripe:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Required secrets for the platform-owner Cursor Agent tool:

```bash
supabase secrets set CURSOR_API_KEY=...
supabase secrets set CURSOR_REPO_URL=https://github.com/frey2535/NECalcul8r
supabase secrets set CURSOR_DEFAULT_BRANCH=main
```

`CURSOR_API_KEY` must be a Cursor API key with access to create Cloud Agents for
the repository. The key is used only inside the Supabase Edge Function and must
not be exposed as a Vite/browser environment variable.

The frontend also needs Stripe Vite variables configured with price IDs for
every purchase package shown in the app. If you want to override the default
free and paid calculator selections per tier at build time, provide
`VITE_CALCULATOR_TIER_GROUPS_JSON`. Checkout sends the selected customer tier,
calculator tier, seat limit, and billing quantity to Stripe metadata.
`stripe-webhook` copies those values into Supabase entitlements, and
`sync-stripe-checkout-session` provides an authenticated return-from-Checkout
reconciliation path if webhook delivery is delayed or needs to be resent.

`update-stripe-subscription` updates the current active Stripe subscription item
for prorated upgrades. It uses `proration_behavior=always_invoice` so the
customer is charged the prorated upgrade difference immediately, then syncs the
new entitlement. Same-tier, downgrade, and cancellation changes should remain in
Stripe Billing Portal so paid access continues through the already-paid period.

Apple and Google purchase verification functions are intentionally fail-closed
until production store credentials and package/bundle IDs are configured.
