-- Create a security-definer registration helper that can create the user's
-- profile and optional organization after Supabase Auth signup.

create or replace function public.complete_registration_profile(
  organization_name text default null,
  invite_code text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user auth.users;
  normalized_invite text;
  org_name text;
  target_org public.organizations;
  created_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into auth_user from auth.users where id = auth.uid();
  if auth_user.id is null then
    raise exception 'Authenticated user not found' using errcode = 'P0002';
  end if;

  normalized_invite := upper(nullif(trim(coalesce(invite_code, '')), ''));
  org_name := nullif(trim(coalesce(organization_name, '')), '');

  if normalized_invite is not null then
    select * into target_org
    from public.organizations
    where upper(invite_code) = normalized_invite
    limit 1;

    if target_org.id is null then
      raise exception 'Invalid invite code' using errcode = 'P0002';
    end if;
  elsif org_name is not null then
    insert into public.organizations (
      name,
      invite_code,
      access_status,
      purchase_source,
      seat_limit
    )
    values (
      org_name,
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      'trial',
      'manual',
      1
    )
    returning * into target_org;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    org_id,
    org_role,
    role,
    access_type,
    access_status,
    trial_start_date,
    trial_end_date,
    purchase_source,
    subscription_status
  )
  values (
    auth_user.id,
    lower(auth_user.email),
    coalesce(nullif(auth_user.raw_user_meta_data->>'full_name', ''), split_part(lower(auth_user.email), '@', 1)),
    target_org.id,
    case when target_org.id is null then 'individual' when normalized_invite is null then 'owner' else 'member' end,
    'user',
    'trial',
    'trial',
    current_date,
    current_date + 30,
    'manual',
    null
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    org_id = coalesce(public.profiles.org_id, excluded.org_id),
    org_role = case
      when public.profiles.org_id is null then excluded.org_role
      else public.profiles.org_role
    end,
    updated_date = now()
  returning * into created_profile;

  return created_profile;
end;
$$;

grant execute on function public.complete_registration_profile(text, text) to authenticated;
