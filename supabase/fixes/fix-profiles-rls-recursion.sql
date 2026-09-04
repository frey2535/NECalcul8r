-- Fix recursive RLS policies involving public.profiles.
-- Run this in Supabase SQL Editor for an existing project.

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

drop policy if exists "profiles read own org" on public.profiles;
drop policy if exists "profiles update own or org owner" on public.profiles;
drop policy if exists "organizations read own" on public.organizations;
drop policy if exists "organizations update owner" on public.organizations;
drop policy if exists "entitlements read assigned" on public.entitlements;
drop policy if exists "subscriptions read assigned" on public.subscriptions;
drop policy if exists "memberships read own org" on public.organization_memberships;

create policy "profiles read own org"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_is_platform_admin()
    or (public.current_profile_org_role() = 'owner' and org_id = public.current_profile_org_id())
  );

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
