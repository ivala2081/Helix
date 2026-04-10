-- Helix Paper Trading — initial schema
-- Public single-account dashboard: 5 coins, 1h, V5 defaults
-- Public read via anon key, writes via service_role only

-- ─── live_portfolios ────────────────────────────────────────────────
-- One row per coin. PK = symbol. Carries all rolling indicator state.
create table live_portfolios (
  symbol            text primary key,            -- e.g. 'BTCUSDT'
  interval          text not null default '1h',
  status            text not null default 'active',  -- active | paused
  initial_capital   numeric not null default 10000,
  equity            numeric not null,
  realized_pnl      numeric not null default 0,
  open_trade        jsonb,                       -- nullable; current open position
  state             jsonb not null,              -- ATR buffer, swing state, FVGs
  last_candle_ts    bigint not null,             -- idempotency cursor (ms epoch)
  bar_index         int not null default 0,
  warmup_complete   boolean not null default false,
  started_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── live_trades ────────────────────────────────────────────────────
-- Closed trades only (open trade lives in live_portfolios.open_trade).
create table live_trades (
  id              bigserial primary key,
  symbol          text not null references live_portfolios(symbol),
  trade_id        int not null,                  -- per-portfolio sequence
  direction       text not null,                 -- LONG | SHORT
  entry_ts        bigint not null,
  entry_price     numeric not null,
  exit_ts         bigint not null,
  exit_price      numeric not null,
  size            numeric not null,
  pnl             numeric not null,
  pnl_pct         numeric not null,
  exit_reason     text not null,                 -- TP1/TP2/TP3/Stop Loss/Hard Stop/End of data
  commission      numeric not null,
  created_at      timestamptz not null default now()
);
create index idx_live_trades_symbol_exit on live_trades (symbol, exit_ts desc);

-- ─── live_equity_snapshots ──────────────────────────────────────────
-- Sparse equity curve: 1 row per hour per coin (~44K rows/year for 5 coins).
create table live_equity_snapshots (
  id              bigserial primary key,
  symbol          text not null references live_portfolios(symbol),
  ts              bigint not null,               -- candle timestamp (ms epoch)
  bar_index       int not null,
  equity          numeric not null,
  drawdown_pct    numeric not null
);
create index idx_live_equity_symbol_ts on live_equity_snapshots (symbol, ts);

-- ─── Row Level Security ─────────────────────────────────────────────
-- Public SELECT on all tables. No INSERT/UPDATE/DELETE policies —
-- only service_role (which bypasses RLS) can write.
alter table live_portfolios enable row level security;
alter table live_trades enable row level security;
alter table live_equity_snapshots enable row level security;

create policy "public_read_portfolios" on live_portfolios for select using (true);
create policy "public_read_trades"     on live_trades      for select using (true);
create policy "public_read_equity"     on live_equity_snapshots for select using (true);
