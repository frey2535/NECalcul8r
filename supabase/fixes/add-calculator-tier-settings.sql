-- Allow saved calculator tier layout settings.
-- All authenticated users can read the active layout, but only platform admins
-- can create, update, or delete CalculatorTierSettings records.

drop policy if exists "app records read scoped" on public.app_records;
create policy "app records read scoped"
  on public.app_records for select
  using (
    entity_type in ('ArticleVerification', 'CalculatorTierSettings')
    or created_by_id = auth.uid()
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
  );

drop policy if exists "app records create own" on public.app_records;
create policy "app records create own"
  on public.app_records for insert
  with check (
    created_by_id = auth.uid()
    and (entity_type <> 'CalculatorTierSettings' or public.current_is_platform_admin())
  );

drop policy if exists "app records update own" on public.app_records;
create policy "app records update own"
  on public.app_records for update
  using (
    (created_by_id = auth.uid() and entity_type <> 'CalculatorTierSettings')
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
    or (entity_type = 'CalculatorTierSettings' and public.current_is_platform_admin())
  )
  with check (
    (created_by_id = auth.uid() and entity_type <> 'CalculatorTierSettings')
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
    or (entity_type = 'CalculatorTierSettings' and public.current_is_platform_admin())
  );

drop policy if exists "app records delete own" on public.app_records;
create policy "app records delete own"
  on public.app_records for delete
  using (
    (created_by_id = auth.uid() and entity_type <> 'CalculatorTierSettings')
    or (entity_type = 'DiscrepancyReport' and public.current_is_platform_admin())
    or (entity_type = 'ArticleVerification' and public.current_can_manage_codebook())
    or (entity_type = 'CalculatorTierSettings' and public.current_is_platform_admin())
  );
