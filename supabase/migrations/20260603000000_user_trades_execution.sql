-- Phase B — execution bookkeeping for the live customer executor.
--
-- user_trades was created empty (20260601020000) as the customer-dashboard read
-- model. The executor (scripts/executor-tick.ts) now WRITES here as it mirrors
-- the shared V5 signal (live_portfolios.open_trade) onto each customer's Binance
-- USDT-M futures account via target-state reconciliation.
--
-- All columns are nullable / defaulted so the existing dashboard SELECT and RLS
-- policy keep working unchanged. service_role (the executor) bypasses RLS.

alter table public.user_trades
  -- Which shared V5 trade this row mirrors. Idempotency + late-join guard: the
  -- executor only OPENS a customer into an engine trade id it hasn't entered
  -- yet, and never chases a trade that is already past TP1.
  add column if not exists engine_trade_id bigint,
  -- Quantity locked at entry from the customer's OWN futures balance × risk%.
  -- Base-asset units. Partial closes (TP ladder) are computed against this.
  add column if not exists entry_qty       numeric,
  -- Updated as TP1/TP2 partials fill: remaining base-asset units still open.
  add column if not exists remaining_qty   numeric,
  -- Highest TP level executed so far (0 = none, 1/2/3 = TP1/TP2/TP3). Lets the
  -- reconciler tell a fresh partial from an already-applied one.
  add column if not exists tp_stage        smallint not null default 0,
  -- Audit / future billing: entry notional ($) and the risk% actually used.
  add column if not exists notional        numeric,
  add column if not exists risk_pct_used   numeric,
  add column if not exists fees            numeric not null default 0,
  -- Binance order ids for the entry and the final close (debugging / support).
  add column if not exists entry_order_id  text,
  add column if not exists exit_order_id   text,
  -- testnet during Phase B development; 'live' only once the VPS + real-money
  -- gates open (Phase C). The executor refuses 'live' without EXECUTOR_LIVE=1.
  add column if not exists env             text not null default 'testnet'
    check (env in ('testnet', 'live')),
  add column if not exists updated_at      timestamptz not null default now();

-- One open position per (user, symbol) — the reconciler assumes a single open
-- trade per symbol per customer. Partial unique index so closed rows don't clash.
create unique index if not exists uq_user_trades_open_per_symbol
  on public.user_trades (user_id, symbol)
  where status = 'open';

-- Fast lookup of a customer's open trade for a symbol during reconciliation.
create index if not exists idx_user_trades_open_lookup
  on public.user_trades (user_id, symbol, status);

-- Keep updated_at fresh (touch_updated_at defined in the customer-panel schema).
drop trigger if exists trg_user_trades_touch on public.user_trades;
create trigger trg_user_trades_touch
  before update on public.user_trades
  for each row execute function public.touch_updated_at();
