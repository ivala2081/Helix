-- Reposition to monthly subscription ($99/mo) + 15% profit-share.

alter table public.subscriptions alter column price_usd set default 99;
alter table public.subscriptions
  add column if not exists profit_share_pct numeric not null default 15;

-- Re-pin the customer insert policy to the new monthly base price.
drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and price_usd = 99
    and activated_at is null
    and expires_at is null
  );
