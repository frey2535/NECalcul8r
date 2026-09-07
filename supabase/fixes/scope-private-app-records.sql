-- Tighten app_records privacy for existing Supabase deployments.
-- Private app data such as projects, saved calculations, and analyses stays
-- scoped to the creating user. Only ArticleVerification records and submitted
-- DiscrepancyReport records remain intentionally shared with platform admins.

drop policy if exists "app records read scoped" on public.app_records;
create policy "app records read scoped"
  on public.app_records for select
  using (
    entity_type = 'ArticleVerification'
    or created_by_id = auth.uid()
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
  );

drop policy if exists "app records update own" on public.app_records;
create policy "app records update own"
  on public.app_records for update
  using (
    created_by_id = auth.uid()
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
  )
  with check (
    created_by_id = auth.uid()
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
  );

drop policy if exists "app records delete own" on public.app_records;
create policy "app records delete own"
  on public.app_records for delete
  using (
    created_by_id = auth.uid()
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
  );
