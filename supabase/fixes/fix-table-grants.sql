-- Fix missing table privileges for authenticated Supabase users.
-- Run this in Supabase SQL Editor for an existing project.

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
grant execute on function public.organization_by_invite(text) to authenticated;
