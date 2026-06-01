-- Helix Customer Panel — auth, subscriptions, exchange connections, bot settings
-- Multi-tenant foundation. Every table is RLS-protected: a customer sees ONLY
-- their own rows; admins see all. Writes that grant access (subscription
-- activation, role changes) are restricted to admins / service_role.
--
-- Security model:
--   * profiles      1:1 with auth.users, carries role ('customer' | 'admin')
--   * is_admin()    SECURITY DEFINER so RLS policies can check role without
--                   recursing into the profiles RLS policy
--   * API secrets   stored already-encrypted (app-side AES-256-GCM); the DB
--                   never sees plaintext, and other users can never read them

-- ─── shared helpers ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Admin check. SECURITY DEFINER bypasses RLS so the profiles policy below
-- doesn't recurse when it calls is_admin().
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile row on signup (runs as definer, bypassing RLS).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent customers from escalating their own role; only admins may change it.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ─── subscriptions ──────────────────────────────────────────────────
-- One package = one row. expires_at NULL = one-time / lifetime; set a date for
-- recurring. Customers may submit a 'pending' row (with their USDT tx hash);
-- only an admin can move it to 'active'.
create table public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan            text not null default 'pro',
  status          text not null default 'pending'
                    check (status in ('pending', 'active', 'expired', 'cancelled', 'rejected')),
  price_usd       numeric not null default 499,
  payment_method  text not null default 'usdt',
  payment_tx      text,                       -- USDT transaction hash, for admin verification
  payment_network text,                       -- e.g. 'TRC20', 'ERC20'
  notes           text,                       -- admin notes
  activated_at    timestamptz,
  expires_at      timestamptz,                -- NULL = one-time / lifetime
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_subscriptions_user on public.subscriptions (user_id, created_at desc);
create index idx_subscriptions_status on public.subscriptions (status);

create trigger trg_subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ─── exchange_connections ───────────────────────────────────────────
-- API credentials are stored ENCRYPTED (app-side AES-256-GCM). Trade-only keys,
-- never withdrawal. Readable only by the owning user — admins do NOT get secrets.
create table public.exchange_connections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  exchange       text not null default 'binance' check (exchange in ('binance', 'bybit')),
  label          text,
  api_key_enc    text not null,              -- ciphertext
  api_secret_enc text not null,              -- ciphertext
  status         text not null default 'disconnected'
                   check (status in ('disconnected', 'connected', 'error')),
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_exchange_conn_user on public.exchange_connections (user_id);

create trigger trg_exchange_conn_touch
  before update on public.exchange_connections
  for each row execute function public.touch_updated_at();

-- ─── bot_settings ───────────────────────────────────────────────────
-- One row per user. The bot only trades a user's account when enabled = true
-- AND they have an active subscription (enforced in app logic, not DB).
create table public.bot_settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  enabled     boolean not null default false,
  risk_pct    numeric not null default 1 check (risk_pct > 0 and risk_pct <= 5),
  symbols     text[] not null default array['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT'],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_bot_settings_touch
  before update on public.bot_settings
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.exchange_connections enable row level security;
alter table public.bot_settings         enable row level security;

-- profiles: read own or (admin reads all); update own (role guarded by trigger).
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- subscriptions: read own/admin; customer may insert a pending row for self;
-- only admin may update (activate/reject).
create policy subscriptions_select on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
create policy subscriptions_insert on public.subscriptions
  for insert with check (user_id = auth.uid() and status = 'pending');
create policy subscriptions_update_admin on public.subscriptions
  for update using (public.is_admin());

-- exchange_connections: owner-only, full CRUD. No admin read of secrets.
create policy exchange_conn_all on public.exchange_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- bot_settings: owner-only CRUD; admin may read.
create policy bot_settings_select on public.bot_settings
  for select using (user_id = auth.uid() or public.is_admin());
create policy bot_settings_cud on public.bot_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
