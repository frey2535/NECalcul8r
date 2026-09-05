-- Allow app admins to manage ArticleVerification rows in existing Supabase projects.
-- Run this in the Supabase SQL Editor after the base schema has been installed.

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

drop policy if exists "app records update own" on public.app_records;
drop policy if exists "app records delete own" on public.app_records;

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

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_can_manage_codebook() to authenticated;
grant select, insert, update, delete on public.app_records to authenticated;
