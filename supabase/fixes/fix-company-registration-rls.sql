-- Allow authenticated users to create an organization during registration.
-- This does not grant product/admin access; it only permits inserting the
-- organization row needed for company-owner account setup.

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.organizations to authenticated;

drop policy if exists "organizations create" on public.organizations;
create policy "organizations create"
  on public.organizations for insert
  with check (auth.uid() is not null);

drop policy if exists "organizations read own" on public.organizations;
create policy "organizations read own"
  on public.organizations for select
  using (
    public.current_is_platform_admin()
    or id = public.current_profile_org_id()
  );

drop policy if exists "organizations update platform admin" on public.organizations;
create policy "organizations update platform admin"
  on public.organizations for update
  using (
    public.current_is_platform_admin()
  )
  with check (
    public.current_is_platform_admin()
  );
