-- Per-customer strategy assignment + V5.2 forward-test tables.
--
-- The bot can run different strategy variants for different customers (e.g.
-- customer X on V5, customer Y on V5.2). We expect MANY variants over time, so:
--   * bot_settings.strategy is a free text key (NO check constraint) validated
--     in the app against the strategy registry (src/lib/engine/strategies.ts) —
--     adding a new strategy must NOT require a DB migration.
--   * each strategy has its own live forward-test tables (signal source the
--     executor mirrors). V5 = live_*; V5.2 = live_v5_2_* (added here, mirroring
--     the live_v6_2_* shape).

-- ── per-customer strategy key ──
alter table public.bot_settings
  add column if not exists strategy text not null default 'v5';

comment on column public.bot_settings.strategy is
  'Strategy registry key the bot runs for this customer (default v5). Validated app-side against src/lib/engine/strategies.ts — no DB check so new variants need no migration.';

-- ── V5.2 forward-test tables (mirror of live_* / live_v6_2_*) ──
create table if not exists live_v5_2_portfolios (
  symbol            text primary key,
  interval          text not null default '1h',
  status            text not null default 'active',
  initial_capital   numeric not null default 10000,
  equity            numeric not null,
  realized_pnl      numeric not null default 0,
  open_trade        jsonb,
  state             jsonb not null,
  last_candle_ts    bigint not null,
  bar_index         int not null default 0,
  warmup_complete   boolean not null default false,
  started_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table live_v5_2_portfolios is
  'V5.2 forward-test portfolios. Mirrors live_portfolios; runs V5_2_DEFAULTS. Signal source the executor mirrors for customers assigned strategy=v5_2.';

create table if not exists live_v5_2_trades (
  id              bigserial primary key,
  symbol          text not null references live_v5_2_portfolios(symbol),
  trade_id        int not null,
  direction       text not null,
  entry_ts        bigint not null,
  entry_price     numeric not null,
  exit_ts         bigint not null,
  exit_price      numeric not null,
  size            numeric not null,
  pnl             numeric not null,
  pnl_pct         numeric not null,
  exit_reason     text not null,
  commission      numeric not null,
  r_multiple      numeric,
  bars_held       int,
  created_at      timestamptz not null default now()
);
create index if not exists idx_live_v5_2_trades_symbol_exit
  on live_v5_2_trades (symbol, exit_ts desc);

create table if not exists live_v5_2_equity_snapshots (
  id              bigserial primary key,
  symbol          text not null references live_v5_2_portfolios(symbol),
  ts              bigint not null,
  bar_index       int not null,
  equity          numeric not null,
  drawdown_pct    numeric not null
);
create index if not exists idx_live_v5_2_equity_symbol_ts
  on live_v5_2_equity_snapshots (symbol, ts);

alter table live_v5_2_portfolios       enable row level security;
alter table live_v5_2_trades           enable row level security;
alter table live_v5_2_equity_snapshots enable row level security;

create policy "public_read_v5_2_portfolios" on live_v5_2_portfolios       for select using (true);
create policy "public_read_v5_2_trades"     on live_v5_2_trades           for select using (true);
create policy "public_read_v5_2_equity"     on live_v5_2_equity_snapshots for select using (true);
