// Central config for the Forward Test initiative.
// Used by cron worker, warmup script, and the /live dashboard.

export const FORWARD_TEST_COINS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "BNBUSDT",
] as const;

export const FORWARD_TEST_INTERVAL = "1h" as const;
export const FORWARD_TEST_INTERVAL_MS = 3_600_000;
export const FORWARD_TEST_INITIAL_CAPITAL = 10_000;
export const FORWARD_TEST_WARMUP_CANDLES = 150;

// Live evaluation-window risk override (see docs/launch-gates.md).
// During the 2026-05-08 → 2026-06-15 evaluation window the live cron
// halves position risk. Backtest still uses V5_DEFAULTS.riskPct (3%);
// only forward-test trade sizing is reduced. Revert to V5_DEFAULTS.riskPct
// when launch gates pass and capital staging T1 begins.
export const LIVE_RISK_PCT_OVERRIDE = 0.015;
