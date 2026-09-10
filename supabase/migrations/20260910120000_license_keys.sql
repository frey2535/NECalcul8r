-- License keys for selling NECalcul8r outside Google Play (web / invoice / reseller).
-- Also extends purchase_source to include license_key.

alter table public.profiles
  drop constraint if exists profiles_purchase_source_check;

alter table public.profiles
  add constraint profiles_purchase_source_check
  check (
    purchase_source is null
    or purchase_source in (
      'manual', 'admin', 'stripe', 'company_external', 'buildrpro',
      'google_play', 'apple_app_store', 'app_store', 'license_key'
    )
  );

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan_key text not null,
  seats integer not null default 1,
  max_redemptions integer not null default 1,
  redemption_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'exhausted', 'revoked')),
  note text,
  org_id uuid references public.organizations(id) on delete set null,
  expires_at timestamptz,
  access_expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  last_redeemed_by uuid references public.profiles(id) on delete set null,
  last_redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists license_keys_code_idx on public.license_keys(code);
create index if not exists license_keys_status_idx on public.license_keys(status);

alter table public.license_keys enable row level security;

drop policy if exists "license keys admin read" on public.license_keys;
create policy "license keys admin read"
  on public.license_keys for select
  using (
    coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
  );
