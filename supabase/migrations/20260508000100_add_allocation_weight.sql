-- Per-symbol dynamic allocation weight (Phase 3.2 of launch plan, 2026-05-08).
-- See src/lib/engine/allocation.ts.
--
-- The cron worker recomputes weights each tick from the trailing-50-trade
-- per-symbol Sharpe and stores them on live_portfolios. Sizing reads
-- this column and scales the per-trade risk by allocation_weight relative
-- to a baseline of 1/N (where N is the symbol count). Floor 0.10, ceiling 0.40.

alter table live_portfolios
  add column if not exists allocation_weight numeric not null default 0.20;

comment on column live_portfolios.allocation_weight is
  'Dynamic capital allocation weight 0..1, recomputed by cron-tick. See src/lib/engine/allocation.ts.';
