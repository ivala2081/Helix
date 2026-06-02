-- Phase 2 — privilege & subscription integrity.

-- Block role escalation at the PRIVILEGE layer (independent of RLS and the
-- guard trigger): no session role (customer or admin) may UPDATE profiles.role.
-- Role changes now go only through the service-role admin action
-- (setUserRoleAction). SECURITY DEFINER functions (handle_new_user) are
-- unaffected, and service_role retains its grant.
revoke update (role) on public.profiles from authenticated, anon;

-- Pin customer-controllable subscription columns on insert: only a pending row,
-- at the real price, with no pre-set activation/expiry.
drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and price_usd = 499
    and activated_at is null
    and expires_at is null
  );

-- One OPEN (pending or active) subscription per user — closes the duplicate /
-- TOCTOU race at the DB level so the app check is just a friendly message.
create unique index if not exists subscriptions_one_open_per_user
  on public.subscriptions (user_id)
  where status in ('pending', 'active');
