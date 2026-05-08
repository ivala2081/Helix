-- Kill-switch state for live evaluation window.
-- See docs/launch-gates.md and src/lib/engine/kill-switch.ts.
--
-- Adds a JSONB column to live_portfolios that tracks whether a portfolio
-- has been paused by the kill-switch and why. The status='paused_kill_switch'
-- value is checked at the start of every cron-tick; trades are not opened
-- while paused. Resume is either automatic (resume_at <= now()) or manual
-- (operator sets status back to 'active').

alter table live_portfolios
  add column if not exists kill_switch_state jsonb;

-- Document expected shape (Postgres has no JSON Schema, so this is a comment):
-- {
--   "triggered": boolean,
--   "rule":      "K1_rolling_dd" | "K2_consecutive_sl" | "K3_daily_loss" | "K4_parity_fail",
--   "triggered_at": <ms epoch>,
--   "resume_at":    <ms epoch | null>,   -- null means manual resume required
--   "details": {                          -- rule-specific payload, free-form
--     "metric_value": number,
--     "threshold":    number
--   }
-- }

comment on column live_portfolios.kill_switch_state is
  'Kill-switch state: triggered flag, rule identifier, resume_at, and rule-specific details. See src/lib/engine/kill-switch.ts.';
