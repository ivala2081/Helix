-- Phase 1 — exchange/bot integrity constraints.

-- One exchange connection per user → lets connect use an atomic upsert
-- (onConflict user_id) instead of a destructive delete-then-insert.
alter table public.exchange_connections
  add constraint exchange_connections_user_unique unique (user_id);

-- Align the DB risk_pct floor with the app clamp (0.25), so a value below 0.25
-- can't enter via any path.
alter table public.bot_settings
  drop constraint if exists bot_settings_risk_pct_check;
alter table public.bot_settings
  add constraint bot_settings_risk_pct_check
  check (risk_pct >= 0.25 and risk_pct <= 5);
