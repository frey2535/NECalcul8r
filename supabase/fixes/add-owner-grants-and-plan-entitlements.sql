-- Add owner-grant audit records and final plan entitlement support.
-- Run this in Supabase SQL Editor for an existing NECalcul8r project before
-- deploying code that writes source = 'owner_grant'.

alter table public.entitlements
  drop constraint if exists entitlements_source_check;

alter table public.entitlements
  add constraint entitlements_source_check
  check (source in (
    'manual',
    'admin',
    'stripe',
    'company_external',
    'buildrpro',
    'google_play',
    'apple_app_store',
    'app_store',
    'owner_grant'
  ));

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  grant_type text not null check (grant_type in ('owner_full_access')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  reason text not null,
  granted_by_user_id uuid not null references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_play_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_name text not null,
  product_id text not null,
  base_plan_id text not null,
  purchase_token text not null,
  purchase_state text not null,
  acknowledgement_state text,
  auto_renewing boolean,
  started_at timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz,
  raw_status jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (package_name, purchase_token)
);

create index if not exists access_grants_user_id_idx on public.access_grants(user_id);
create index if not exists access_grants_active_idx on public.access_grants(active);
create index if not exists google_play_purchases_user_id_idx on public.google_play_purchases(user_id);
create index if not exists google_play_purchases_product_id_idx on public.google_play_purchases(product_id);

alter table public.access_grants enable row level security;
alter table public.google_play_purchases enable row level security;

drop policy if exists "access grants read platform admin or own" on public.access_grants;
create policy "access grants read platform admin or own"
  on public.access_grants for select
  using (
    public.current_is_platform_admin()
    or user_id = auth.uid()
  );

grant select on public.access_grants to authenticated;

drop policy if exists "google play purchases read platform admin or own" on public.google_play_purchases;
create policy "google play purchases read platform admin or own"
  on public.google_play_purchases for select
  using (
    public.current_is_platform_admin()
    or user_id = auth.uid()
  );

grant select on public.google_play_purchases to authenticated;
