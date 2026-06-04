-- Phase C concurrency hardening — single-flight lock for the live executor tick.
--
-- The executor (scripts/executor-tick.ts) reconciles each customer's real Binance
-- position toward the shared V5 signal. Two OVERLAPPING ticks (a slow tick still
-- running when cron fires the next; the admin test button while a tick runs; a
-- manual run alongside the timer) would each read "no open position", both pass
-- the idempotency check, and both fire a market OPEN — double-filling the
-- customer. The unique partial index on open trades rejects the second INSERT,
-- but only AFTER the duplicate order already executed on the exchange. So we need
-- mutual exclusion BEFORE any order is placed.
--
-- A Postgres *session* advisory lock can't span a tick over PostgREST (each REST
-- call is its own pooled connection/transaction, so the lock would release
-- between calls). Instead this is a lease-based mutex: a single row holds the
-- current holder + an expiry. Acquiring is one conditional UPDATE
-- (WHERE locked_until <= now()), which is atomic under READ COMMITTED — if two
-- ticks race, the second re-checks the predicate after the first commits and
-- updates 0 rows. The lease TTL means a crashed holder auto-frees; the next
-- scheduled tick recovers on its own. See src/lib/exchange/tick-lock.ts.

create table if not exists public.executor_locks (
  name         text primary key,
  -- Opaque token of the current holder (a per-process UUID). Release only clears
  -- the row when this still matches, so a tick whose lease already expired and
  -- was taken over can't clobber the new holder.
  holder       text,
  -- Lease expiry. <= now() ⇒ free to acquire. Defaults/releases to the epoch
  -- ("free") rather than NULL, so acquire is a single `locked_until <= now()`
  -- predicate (no NULL-handling in the hot path).
  locked_until timestamptz not null default to_timestamp(0),
  updated_at   timestamptz not null default now()
);

-- Pre-seed the singleton lock row so acquiring is always a conditional UPDATE
-- (no INSERT race between two cold-starting ticks). Seeded free (epoch).
insert into public.executor_locks (name, holder, locked_until)
  values ('executor-tick', null, to_timestamp(0))
  on conflict (name) do nothing;

-- Service-role only: the executor runs with the service key (bypasses RLS).
-- Enabling RLS with NO policy denies anon/authenticated entirely — customers
-- never see or touch the lock.
alter table public.executor_locks enable row level security;
