-- Cron health tracking: one row per tick execution.
-- Used by /api/live to show "last updated" and surface silent failures.

create table live_cron_runs (
  id              bigserial primary key,
  ran_at          timestamptz not null default now(),
  duration_ms     int not null,
  portfolios_processed int not null default 0,
  candles_processed int not null default 0,
  trades_closed   int not null default 0,
  status          text not null default 'ok',     -- ok | partial | error
  errors          jsonb                            -- array of {symbol, message}
);
create index idx_live_cron_runs_ran_at on live_cron_runs (ran_at desc);

-- Public read (for dashboard health indicator)
alter table live_cron_runs enable row level security;
create policy "public_read_cron_runs" on live_cron_runs for select using (true);
