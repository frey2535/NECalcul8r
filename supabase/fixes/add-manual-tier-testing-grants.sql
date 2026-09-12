-- Allow platform admins to grant specific calculator/customer tiers for testing.
-- Run this in the Supabase SQL editor after merging the manual tier testing controls.

create or replace function public.grant_profile_access(
  target_profile_id uuid,
  access_updates jsonb default '{}'::jsonb,
  grant_source text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  target public.profiles;
  v_access_status text;
  v_access_type text;
  v_trial_start_date date;
  v_trial_end_date date;
  v_purchase_source text;
  v_subscription_status text;
  v_plan_key text;
  v_customer_tier_id text;
  v_calculator_tier_id text;
  v_calculator_limit integer;
  v_has_nec_tables boolean;
  v_can_export_complete_reports boolean;
  v_company_seat_limit integer;
  v_seat_limit integer;
  v_entitlement_source text;
  v_entitlement_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null then
    raise exception 'Profile not found for current user' using errcode = 'P0002';
  end if;

  select * into target from public.profiles where id = target_profile_id;
  if target.id is null then
    raise exception 'Target profile not found' using errcode = 'P0002';
  end if;

  if not actor.is_platform_admin then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if actor.id = target_profile_id and not actor.is_platform_admin then
    raise exception 'Access changes must be granted by an administrator' using errcode = '42501';
  end if;

  v_access_status := coalesce(nullif(access_updates->>'access_status', ''), target.access_status, 'trial');
  v_access_type := coalesce(nullif(access_updates->>'access_type', ''), target.access_type, 'trial');
  v_trial_start_date := coalesce(nullif(access_updates->>'trial_start_date', '')::date, target.trial_start_date);
  v_trial_end_date := coalesce(nullif(access_updates->>'trial_end_date', '')::date, target.trial_end_date);
  v_purchase_source := coalesce(nullif(access_updates->>'purchase_source', ''), nullif(grant_source, ''), target.purchase_source, 'manual');
  v_subscription_status := coalesce(nullif(access_updates->>'subscription_status', ''), target.subscription_status);
  v_plan_key := coalesce(
    nullif(access_updates->>'plan_key', ''),
    nullif(access_updates->>'calculator_tier_id', ''),
    case when v_access_type = 'permanent' then 'owner_full_access' else 'individual_36_plus' end
  );
  v_customer_tier_id := coalesce(
    nullif(access_updates->>'customer_tier_id', ''),
    case when v_plan_key like 'company_%' then v_plan_key else 'individual' end
  );
  v_calculator_tier_id := coalesce(nullif(access_updates->>'calculator_tier_id', ''), v_plan_key);

  if v_plan_key not in ('free', 'individual_6_15', 'individual_16_25', 'individual_26_35', 'individual_36_plus', 'company_0_10', 'company_11_20', 'company_unlimited', 'owner_full_access') then
    raise exception 'Invalid plan_key: %', v_plan_key using errcode = '22023';
  end if;

  v_calculator_limit := case
    when nullif(access_updates->>'calculator_limit', '') is not null then (access_updates->>'calculator_limit')::integer
    when v_plan_key = 'free' then 5
    when v_plan_key = 'individual_6_15' then 15
    when v_plan_key = 'individual_16_25' then 25
    when v_plan_key = 'individual_26_35' then 35
    else null
  end;
  v_has_nec_tables := coalesce(nullif(access_updates->>'has_nec_tables', '')::boolean, v_plan_key <> 'free');
  v_can_export_complete_reports := coalesce(nullif(access_updates->>'can_export_complete_reports', '')::boolean, v_plan_key <> 'free');
  v_company_seat_limit := case
    when nullif(access_updates->>'company_seat_limit', '') is not null then (access_updates->>'company_seat_limit')::integer
    when v_plan_key = 'company_0_10' then 10
    when v_plan_key = 'company_11_20' then 20
    else null
  end;
  v_seat_limit := case
    when nullif(access_updates->>'seat_limit', '') is not null then (access_updates->>'seat_limit')::integer
    when v_company_seat_limit is not null then v_company_seat_limit
    else 1
  end;

  if v_access_status not in ('trial', 'active', 'expired', 'disabled') then
    raise exception 'Invalid access_status: %', v_access_status using errcode = '22023';
  end if;

  if v_access_type not in ('trial', 'permanent', 'paid', 'external_company', 'company_seat', 'buildrpro_included', 'app_store', 'google_play', 'apple_app_store') then
    raise exception 'Invalid access_type: %', v_access_type using errcode = '22023';
  end if;

  if v_access_status = 'active' and v_access_type = 'trial' then
    v_access_type := 'permanent';
    if v_purchase_source = 'manual' then
      v_purchase_source := 'admin';
    end if;
  end if;

  if v_access_type in ('permanent', 'paid', 'external_company', 'company_seat', 'buildrpro_included', 'app_store', 'google_play', 'apple_app_store')
     and v_access_status = 'trial' then
    v_access_status := 'active';
  end if;

  if v_purchase_source = 'base44_payments' then
    v_purchase_source := 'manual';
  end if;

  if v_purchase_source not in ('manual', 'admin', 'stripe', 'company_external', 'buildrpro', 'google_play', 'apple_app_store', 'app_store', 'license_key') then
    v_purchase_source := 'admin';
  end if;

  update public.profiles
  set
    access_status = v_access_status,
    access_type = v_access_type,
    trial_start_date = v_trial_start_date,
    trial_end_date = v_trial_end_date,
    purchase_source = v_purchase_source,
    subscription_status = v_subscription_status,
    updated_date = now()
  where id = target_profile_id;

  if v_access_status = 'active' and v_access_type <> 'trial' then
    update public.entitlements
    set status = 'expired', updated_at = now()
    where profile_id = target_profile_id
      and status = 'active';

    v_entitlement_source := case
      when v_access_type = 'permanent' then 'owner_grant'
      when v_purchase_source = 'stripe' then 'stripe'
      when v_purchase_source = 'company_external' then 'company_external'
      when v_purchase_source = 'buildrpro' then 'buildrpro'
      when v_purchase_source = 'google_play' then 'google_play'
      when v_purchase_source = 'apple_app_store' then 'apple_app_store'
      when v_purchase_source = 'app_store' then 'app_store'
      when v_purchase_source = 'manual' then 'manual'
      else 'admin'
    end;

    if v_entitlement_source = 'owner_grant' then
      insert into public.access_grants (
        user_id,
        grant_type,
        active,
        starts_at,
        expires_at,
        reason,
        granted_by_user_id
      )
      values (
        target_profile_id,
        'owner_full_access',
        true,
        now(),
        null,
        coalesce(nullif(access_updates->>'reason', ''), nullif(access_updates->>'note', ''), 'Platform owner full-access grant.'),
        actor.id
      );
    end if;

    insert into public.entitlements (
      profile_id,
      source,
      access_type,
      status,
      subscription_status,
      seats,
      starts_at,
      expires_at,
      metadata
    )
    values (
      target_profile_id,
      v_entitlement_source,
      v_access_type,
      'active',
      coalesce(v_subscription_status, 'active'),
      coalesce(v_seat_limit, 1),
      now(),
      null,
      jsonb_build_object(
        'granted_by', actor.id,
        'grant_source', grant_source,
        'plan_key', v_plan_key,
        'customer_tier_id', v_customer_tier_id,
        'calculator_tier_id', v_calculator_tier_id,
        'calculator_limit', v_calculator_limit,
        'has_nec_tables', v_has_nec_tables,
        'can_export_complete_reports', v_can_export_complete_reports,
        'company_seat_limit', v_company_seat_limit,
        'seat_limit', v_seat_limit
      )
    );
  else
    v_entitlement_status := case when v_access_status = 'disabled' then 'disabled' else 'expired' end;
    update public.entitlements
    set status = v_entitlement_status, updated_at = now()
    where profile_id = target_profile_id
      and status = 'active';
  end if;

  return jsonb_build_object(
    'ok', true,
    'profile_id', target_profile_id,
    'access_status', v_access_status,
    'access_type', v_access_type,
    'plan_key', v_plan_key
  );
end;
$$;
