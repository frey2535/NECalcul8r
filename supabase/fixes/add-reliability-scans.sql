-- Daily reliability scans + platform-owner notifications (existing projects).
-- Run in Supabase SQL editor if you are not applying migrations automatically.

create table if not exists public.reliability_scans (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'daily_cron'
    check (source in ('daily_cron', 'manual', 'github_actions')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  summary text,
  findings jsonb not null default '[]'::jsonb,
  agent_id text,
  agent_url text,
  agent_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  category text not null default 'reliability_scan',
  scan_id uuid references public.reliability_scans(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reliability_scans_created_at_idx
  on public.reliability_scans(created_at desc);
create index if not exists platform_notifications_profile_unread_idx
  on public.platform_notifications(profile_id, created_at desc)
  where read_at is null;
create index if not exists platform_notifications_profile_created_idx
  on public.platform_notifications(profile_id, created_at desc);

alter table public.reliability_scans enable row level security;
alter table public.platform_notifications enable row level security;

drop policy if exists "reliability scans read admin" on public.reliability_scans;
create policy "reliability scans read admin"
  on public.reliability_scans for select
  using (public.current_is_platform_admin());

drop policy if exists "platform notifications read own" on public.platform_notifications;
create policy "platform notifications read own"
  on public.platform_notifications for select
  using (profile_id = auth.uid() and public.current_is_platform_admin());

drop policy if exists "platform notifications update own" on public.platform_notifications;
create policy "platform notifications update own"
  on public.platform_notifications for update
  using (profile_id = auth.uid() and public.current_is_platform_admin())
  with check (profile_id = auth.uid() and public.current_is_platform_admin());

grant select on public.reliability_scans to authenticated;
grant select, update on public.platform_notifications to authenticated;
