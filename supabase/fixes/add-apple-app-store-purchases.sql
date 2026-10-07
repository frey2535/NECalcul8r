-- Apple App Store purchase ledger (parity with google_play_purchases)
create table if not exists public.apple_app_store_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bundle_id text not null,
  product_id text not null,
  transaction_id text not null,
  original_transaction_id text not null,
  environment text,
  purchase_state text not null,
  started_at timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz,
  raw_status jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bundle_id, original_transaction_id)
);

create index if not exists apple_app_store_purchases_user_id_idx
  on public.apple_app_store_purchases(user_id);
create index if not exists apple_app_store_purchases_product_id_idx
  on public.apple_app_store_purchases(product_id);
create index if not exists apple_app_store_purchases_transaction_id_idx
  on public.apple_app_store_purchases(transaction_id);

alter table public.apple_app_store_purchases enable row level security;

drop policy if exists "apple purchases read platform admin or own" on public.apple_app_store_purchases;
create policy "apple purchases read platform admin or own"
  on public.apple_app_store_purchases for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_platform_admin is true
    )
  );

grant select on public.apple_app_store_purchases to authenticated;
