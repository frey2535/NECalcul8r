# NECalcul8r Supabase Edge Functions

Deploy these functions before enabling paid production access:

```bash
supabase functions deploy create-stripe-checkout
supabase functions deploy sync-stripe-checkout-session
supabase functions deploy update-stripe-subscription
supabase functions deploy create-stripe-portal-session
supabase functions deploy grant-access
supabase functions deploy delete-account
supabase functions deploy stripe-webhook
supabase functions deploy verify-google-play-purchase
supabase functions deploy google-play-rtdn
supabase functions deploy activate-license-key
supabase functions deploy generate-license-key
supabase functions deploy verify-apple-purchase
supabase functions deploy create-cursor-agent
supabase functions deploy cursor-agent-session
supabase functions deploy nec-accuracy-chat
supabase functions deploy daily-reliability-scan
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
supabase secrets set CURSOR_API_KEY=... --project-ref gqdxvctvufalunaaopyj
supabase secrets set CURSOR_REPO_URL=https://github.com/frey2535/NECalcul8r --project-ref gqdxvctvufalunaaopyj
supabase secrets set CURSOR_DEFAULT_BRANCH=main --project-ref gqdxvctvufalunaaopyj
```

`CURSOR_API_KEY` must be a Cursor API key with access to create Cloud Agents for
the repository. The key is used only inside the Supabase Edge Function and must
not be exposed as a Vite/browser environment variable. The edge function authenticates
to `https://api.cursor.com/v1/agents` with Basic auth (`API_KEY:`).

**Primary in-app assistant (recommended — no Cursor Cloud Agents billing):**

```bash
# Option A: OpenAI
supabase secrets set OPENAI_API_KEY=... --project-ref gqdxvctvufalunaaopyj
supabase secrets set OPENAI_MODEL=gpt-4o-mini --project-ref gqdxvctvufalunaaopyj

# Option B: OpenRouter (preferred for credit-free in-app chat)
# Use openrouter/free so chat works with $0 OpenRouter balance.
supabase secrets set OPENROUTER_API_KEY=... --project-ref gqdxvctvufalunaaopyj
supabase secrets set OPENAI_MODEL=openrouter/free --project-ref gqdxvctvufalunaaopyj
# Paid OpenRouter slugs need credits; the function falls back to openrouter/free on 402.

supabase functions deploy nec-accuracy-chat --project-ref gqdxvctvufalunaaopyj
```

`nec-accuracy-chat` powers the in-app Cursor Agent (`/accuracy-assistant` and the side panel).
It is included with paid upgrades (same boundary as NEC Tables) and for platform admins.
It uses OpenRouter free models (no Cursor Cloud Agents billing) and can read the public GitHub repo
with tools. Optional write/commit support:

```bash
supabase secrets set GITHUB_TOKEN=ghp_... --project-ref gqdxvctvufalunaaopyj
```

Do **not** rely on `VITE_OPENAI_API_KEY` for production chat.

`create-cursor-agent` accepts optional `missionId` (`nec_accuracy_guardian`,
`daily_full_scan`, `proactive_audit`, `fix_known`, `suggest_only`,
`calculator_hardening`, `mobile_pwa`, `commerce_access`) and wraps the operator
prompt with a server-side NEC Accuracy Guardian doctrine so agents treat baseline
failures as critical and prioritize high-confidence calculator corrections.

`daily-reliability-scan` is invoked by GitHub Actions cron (or manually by a
platform admin). It probes Edge Function deploys, accepts CI/NEC findings,
notifies platform admins, optionally emails via Resend, and can start a Cursor
agent. Required secrets: `RELIABILITY_SCAN_SECRET` (shared with GitHub Actions),
plus the Cursor secrets above. Optional: `RESEND_API_KEY`,
`PLATFORM_OWNER_NOTIFY_EMAIL`, `APP_ORIGIN`.

Apply SQL first: `supabase/fixes/add-reliability-scans.sql`.

**Required before the in-app NEC Accuracy Assistant works:** deploy `nec-accuracy-chat`
and set `OPENAI_API_KEY`. This is the default assistant path — no Cursor Cloud Agents.

`create-cursor-agent` / `cursor-agent-session` remain optional (advanced, Cursor-billed).

```bash
supabase functions deploy nec-accuracy-chat --project-ref gqdxvctvufalunaaopyj
supabase functions deploy create-cursor-agent --project-ref gqdxvctvufalunaaopyj
supabase functions deploy cursor-agent-session --project-ref gqdxvctvufalunaaopyj
supabase functions deploy daily-reliability-scan --project-ref gqdxvctvufalunaaopyj
```

Or add GitHub secret `SUPABASE_ACCESS_TOKEN` and run the
`Deploy create-cursor-agent` workflow (`.github/workflows/deploy-create-cursor-agent.yml`).
Also set GitHub `RELIABILITY_SCAN_SECRET` for `.github/workflows/daily-reliability-scan.yml`.

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
