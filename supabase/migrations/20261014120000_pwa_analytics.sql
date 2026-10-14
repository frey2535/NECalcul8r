-- Authenticated PWA event tracking. No raw IP addresses or device fingerprints.
create table if not exists public.pwa_analytics_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('install_prompt_shown','install_prompt_accepted','installed','standalone_launch')),
  platform text not null check (platform in ('ios','android','desktop','other')),
  created_at timestamptz not null default now()
);
create index if not exists pwa_analytics_events_created_idx on public.pwa_analytics_events(created_at desc);
create index if not exists pwa_analytics_events_profile_idx on public.pwa_analytics_events(profile_id, created_at desc);
alter table public.pwa_analytics_events enable row level security;
create policy "pwa events insert own" on public.pwa_analytics_events for insert to authenticated
with check (profile_id = auth.uid());
create policy "pwa events platform admin read" on public.pwa_analytics_events for select to authenticated
using (public.current_is_platform_admin());
grant insert, select on public.pwa_analytics_events to authenticated;
