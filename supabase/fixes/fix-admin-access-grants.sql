-- Fix admin/manual access grants for existing Supabase projects.
-- Run this in the Supabase SQL Editor after the base schema has been installed.

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

  if not (
    actor.is_platform_admin
    or (actor.org_role = 'owner' and actor.org_id is not null and actor.org_id = target.org_id)
  ) then
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

  if v_purchase_source not in ('manual', 'admin', 'stripe', 'company_external', 'buildrpro', 'google_play', 'apple_app_store', 'app_store') then
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

    v_entitlement_source := case v_purchase_source
      when 'stripe' then 'stripe'
      when 'company_external' then 'company_external'
      when 'buildrpro' then 'buildrpro'
      when 'google_play' then 'google_play'
      when 'apple_app_store' then 'apple_app_store'
      when 'app_store' then 'app_store'
      when 'manual' then 'manual'
      else 'admin'
    end;

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
      1,
      now(),
      null,
      jsonb_build_object('granted_by', actor.id, 'grant_source', grant_source)
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
    'access_type', v_access_type
  );
end;
$$;

grant execute on function public.grant_profile_access(uuid, jsonb, text) to authenticated;
