-- Recompute live_trades.pnl_pct with the notional-return formula.
-- Previous formula was (pnl / risk_amount) * 100 — effectively R-multiple × 100
-- displayed under a misleading "PnL %" label. New formula matches trade-log
-- convention used by brokers/exchanges: (pnl / (entry_price × size)) × 100.

-- Snapshot old values so a rollback is a single UPDATE.
CREATE TABLE IF NOT EXISTS live_trades_backup_20260415 AS
  SELECT id, pnl_pct FROM live_trades;

UPDATE live_trades
SET pnl_pct = CASE
  WHEN entry_price > 0 AND size > 0
    THEN (pnl / (entry_price * size)) * 100
  ELSE 0
END;
