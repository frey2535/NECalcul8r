# NECalcul8r

Self-hosted NEC electrical code calculator. This is the Base44 export running independently — same calculators, tables, and UI, without Base44.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5176](http://localhost:5176)

On a phone on the same Wi-Fi, use the LAN URL Vite prints (for example `http://192.168.x.x:5176`). An **Install app** popup appears on first open. On iPhone use Safari → Share → Add to Home Screen. On Android Chrome tap **Install app**. Port **5174** is reserved for The Truth.

1. Create an account on `/register`. Enter a **company name** to start a workspace (you become the team admin), or paste a teammate’s **invite code** to join theirs.
2. Each sign-in is private: saved analyses, projects, and reports belong to that user. Admins manage access for their company only — they cannot open another user’s calculations.
3. Later users who join with an invite code get a 30-day trial, which an admin can convert to permanent from **User Management**.
4. On any calculator, tap **Save** and name the job under a **project** (for example “Smith residence”). Open **Projects** to review, rename, delete, or load a saved calculation.

Email verification and password reset run locally (no email server). The app shows the OTP / reset link on screen.

## Optional AI features

Blueprint analysis and codebook AI review need an OpenAI key:

```bash
cp .env.example .env.local
# set VITE_OPENAI_API_KEY
```

Without a key, all 41 NEC calculators, tables, history, and admin tools still work. AI blueprint analysis stays disabled.

## Commercial access mode

The app runs in local demo mode by default. Accounts, users, saved projects, and access state are stored in the browser so the GitHub Pages demo works without a backend.

For paid web/app-store distribution, configure Supabase:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_INDIVIDUAL_PRICE_ID=
VITE_STRIPE_COMPANY_PRICE_ID=
```

When Supabase env vars are present, the API facade switches to centralized Supabase auth, profiles, organizations, subscriptions, entitlements, and app records. Stripe and app-store purchase verification should be handled by Supabase Edge Functions so secret keys never ship to the browser.

See [`docs/commercial-access.md`](docs/commercial-access.md) and [`supabase/schema.sql`](supabase/schema.sql).

## What changed vs Base44

- Removed `@base44/sdk` and `@base44/vite-plugin`
- Auth, users, analyses, discrepancy reports, and article verifications persist in the browser (`localStorage`)
- File uploads are stored locally as data URLs
- Google sign-in is not wired (use email/password)

To move to a real backend later (Supabase, Postgres, etc.), replace `src/api/local*.js` — page components already talk to a `base44` facade.

## Scripts

```bash
npm run build
npm run verify:dwelling-optional
```
