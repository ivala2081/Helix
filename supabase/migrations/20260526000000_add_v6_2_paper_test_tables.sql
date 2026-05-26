-- V6.2 paper-test tables (2026-05-26).
-- Mirror of live_* schema but isolated so the V6.2 paper-test does not
-- pollute the V5 public dashboard. Same column shapes for code reuse.
-- See docs/v6-iteration-summary.md for the V6.2 strategy definition and
-- defaults_v6_2.ts for the param set.
--
-- Public SELECT for the /research/v6 dashboard; only service_role writes.

-- ─── live_v6_2_portfolios ──────────────────────────────────────────
create table if not exists live_v6_2_portfolios (
  symbol            text primary key,
  interval          text not null default '1h',
  status            text not null default 'active',  -- active | paused
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

comment on table live_v6_2_portfolios is
  'V6.2 paper-test portfolios. Mirrors live_portfolios shape but runs V6_2_DEFAULTS. Paper-test only — no capital allocation.';

-- ─── live_v6_2_trades ──────────────────────────────────────────────
create table if not exists live_v6_2_trades (
  id              bigserial primary key,
  symbol          text not null references live_v6_2_portfolios(symbol),
  trade_id        int not null,
  direction       text not null,
  entry_ts        bigint not null,
  entry_price     numeric not null,
  exit_ts         bigint not null,
  exit_price      numeric not null,
  size            numeric not null,
  pnl             numeric not null,
  pnl_pct         numeric not null,
  exit_reason     text not null,  -- TP1 / Trailing Stop / Stop Loss / Hard Stop / End of data
  commission      numeric not null,
  r_multiple      numeric,
  bars_held       int,
  created_at      timestamptz not null default now()
);
create index if not exists idx_live_v6_2_trades_symbol_exit
  on live_v6_2_trades (symbol, exit_ts desc);

-- ─── live_v6_2_equity_snapshots ────────────────────────────────────
create table if not exists live_v6_2_equity_snapshots (
  id              bigserial primary key,
  symbol          text not null references live_v6_2_portfolios(symbol),
  ts              bigint not null,
  bar_index       int not null,
  equity          numeric not null,
  drawdown_pct    numeric not null
);
create index if not exists idx_live_v6_2_equity_symbol_ts
  on live_v6_2_equity_snapshots (symbol, ts);

-- ─── Row Level Security ────────────────────────────────────────────
alter table live_v6_2_portfolios       enable row level security;
alter table live_v6_2_trades           enable row level security;
alter table live_v6_2_equity_snapshots enable row level security;

create policy "public_read_v6_2_portfolios" on live_v6_2_portfolios       for select using (true);
create policy "public_read_v6_2_trades"     on live_v6_2_trades           for select using (true);
create policy "public_read_v6_2_equity"     on live_v6_2_equity_snapshots for select using (true);
