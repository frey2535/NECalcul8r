-- NECalcul8r commercial access foundation.
-- Run this in Supabase SQL editor before enabling VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  seat_limit integer not null default 1 check (seat_limit >= 0),
  access_status text not null default 'trial' check (access_status in ('trial', 'active', 'expired', 'disabled')),
  purchase_source text not null default 'manual' check (purchase_source in ('manual', 'admin', 'stripe', 'company_external', 'buildrpro')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_platform_admin boolean not null default false,
  org_id uuid references public.organizations(id) on delete set null,
  org_role text not null default 'individual' check (org_role in ('individual', 'owner', 'member')),
  access_type text not null default 'trial' check (
    access_type in ('trial', 'permanent', 'paid', 'external_company', 'company_seat', 'buildrpro_included', 'app_store', 'google_play', 'apple_app_store')
  ),
  access_status text not null default 'trial' check (access_status in ('trial', 'active', 'expired', 'disabled')),
  trial_start_date date,
  trial_end_date date,
  purchase_source text not null default 'manual' check (
    purchase_source in ('manual', 'admin', 'stripe', 'company_external', 'buildrpro', 'google_play', 'apple_app_store', 'app_store')
  ),
  subscription_status text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  org_role text not null default 'member' check (org_role in ('owner', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (org_id, profile_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'google_play', 'apple_app_store', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  provider_product_id text,
  provider_price_id text,
  status text not null,
  seats integer not null default 1 check (seats >= 0),
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profile_id is not null or org_id is not null)
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  source text not null check (source in ('manual', 'admin', 'stripe', 'company_external', 'buildrpro', 'google_play', 'apple_app_store', 'app_store')),
  access_type text not null check (
    access_type in ('permanent', 'paid', 'external_company', 'company_seat', 'buildrpro_included', 'app_store', 'google_play', 'apple_app_store')
  ),
  status text not null default 'active' check (status in ('active', 'expired', 'disabled')),
  subscription_status text,
  seats integer not null default 1 check (seats >= 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profile_id is not null or org_id is not null)
);

create table if not exists public.purchase_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  provider text not null check (provider in ('stripe', 'google_play', 'apple_app_store', 'manual')),
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  org_id uuid references public.organizations(id) on delete set null,
  created_by_id uuid not null references public.profiles(id) on delete cascade,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists profiles_org_id_idx on public.profiles(org_id);
create index if not exists entitlements_profile_id_idx on public.entitlements(profile_id);
create index if not exists entitlements_org_id_idx on public.entitlements(org_id);
create index if not exists app_records_entity_type_idx on public.app_records(entity_type);
create index if not exists app_records_created_by_id_idx on public.app_records(created_by_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchase_events enable row level security;
alter table public.app_records enable row level security;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.current_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.current_profile_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_org_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select org_role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_can_manage_codebook()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_is_platform_admin() or coalesce(public.current_profile_role(), '') = 'admin';
$$;

create or replace function public.organization_by_invite(code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  seat_limit integer,
  access_status text,
  purchase_source text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.invite_code, o.seat_limit, o.access_status, o.purchase_source
  from public.organizations o
  where o.invite_code = upper(trim(code))
  limit 1;
$$;

create policy "profiles read own org"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_is_platform_admin()
    or (public.current_profile_org_role() = 'owner' and org_id = public.current_profile_org_id())
  );

create policy "profiles insert own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles update own or org owner"
  on public.profiles for update
  using (
    id = auth.uid()
    or public.current_is_platform_admin()
    or (public.current_profile_org_role() = 'owner' and org_id = public.current_profile_org_id())
  )
  with check (
    id = auth.uid()
    or public.current_is_platform_admin()
    or (public.current_profile_org_role() = 'owner' and org_id = public.current_profile_org_id())
  );

create policy "organizations read own"
  on public.organizations for select
  using (
    public.current_is_platform_admin()
    or id = public.current_profile_org_id()
  );

create policy "organizations create"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "organizations update owner"
  on public.organizations for update
  using (
    public.current_is_platform_admin()
    or (public.current_profile_org_role() = 'owner' and id = public.current_profile_org_id())
  );

create policy "entitlements read assigned"
  on public.entitlements for select
  using (
    public.current_is_platform_admin()
    or profile_id = auth.uid()
    or org_id = public.current_profile_org_id()
  );

create policy "subscriptions read assigned"
  on public.subscriptions for select
  using (
    public.current_is_platform_admin()
    or profile_id = auth.uid()
    or org_id = public.current_profile_org_id()
  );

create policy "memberships read own org"
  on public.organization_memberships for select
  using (
    public.current_is_platform_admin()
    or profile_id = auth.uid()
    or org_id = public.current_profile_org_id()
  );

create policy "app records read scoped"
  on public.app_records for select
  using (
    entity_type = 'ArticleVerification'
    or created_by_id = auth.uid()
    or public.current_is_platform_admin()
  );

create policy "app records create own"
  on public.app_records for insert
  with check (created_by_id = auth.uid());

create policy "app records update own"
  on public.app_records for update
  using (
    created_by_id = auth.uid()
    or public.current_is_platform_admin()
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
  )
  with check (
    created_by_id = auth.uid()
    or public.current_is_platform_admin()
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
  );

create policy "app records delete own"
  on public.app_records for delete
  using (
    created_by_id = auth.uid()
    or public.current_is_platform_admin()
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
  );

-- Writes to subscriptions, entitlements, and purchase_events should be performed
-- by Supabase Edge Functions using the service role key after verifying Stripe,
-- Google Play, or Apple receipt/webhook signatures.
--
-- Keep direct profile access grants server-side. Browser clients may update
-- basic profile fields, but payment/access fields should be changed through
-- `grant-access` or verified purchase/webhook functions using the service role.
grant usage on schema public to anon, authenticated;

grant select, insert on public.profiles to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, updated_date) on public.profiles to authenticated;

grant select, insert, update on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;
grant select, insert on public.purchase_events to authenticated;
grant select, insert, update, delete on public.app_records to authenticated;

grant execute on function public.current_is_platform_admin() to authenticated;
grant execute on function public.current_profile_org_id() to authenticated;
grant execute on function public.current_profile_org_role() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_can_manage_codebook() to authenticated;
grant execute on function public.organization_by_invite(text) to authenticated;
