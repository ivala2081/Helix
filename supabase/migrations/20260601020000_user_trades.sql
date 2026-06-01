-- Per-customer trades executed by the bot on their connected exchange account.
-- Empty until the execution engine (module 4) starts trading. The customer
-- dashboard reads from here; the bot (service_role) writes here.

create table public.user_trades (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  exchange     text,
  symbol       text not null,
  direction    text not null check (direction in ('LONG', 'SHORT')),
  status       text not null default 'open' check (status in ('open', 'closed')),
  entry_price  numeric,
  exit_price   numeric,
  size         numeric,
  pnl          numeric,
  pnl_pct      numeric,
  exit_reason  text,
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz
);
create index idx_user_trades_user on public.user_trades (user_id, opened_at desc);

alter table public.user_trades enable row level security;

-- Customer reads own trades; admin reads all. Writes come from the bot via
-- service_role, which bypasses RLS.
create policy user_trades_select on public.user_trades
  for select using (user_id = auth.uid() or public.is_admin());
