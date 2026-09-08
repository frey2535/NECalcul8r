-- Fix registration failures where an old auth.users trigger tries to insert
-- public.profiles without the privileges/RLS context required by the hardened
-- access-control schema.
--
-- NECalcul8r creates the profile from the authenticated client after signup,
-- so the old trigger should be removed for existing Supabase projects.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select, insert on public.profiles to authenticated;

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles update platform admin" on public.profiles;
create policy "profiles update platform admin"
  on public.profiles for update
  using (
    id = auth.uid()
    or public.current_is_platform_admin()
  )
  with check (
    id = auth.uid()
    or public.current_is_platform_admin()
  );

revoke update on public.profiles from anon, authenticated;
grant update (full_name, updated_date) on public.profiles to authenticated;
