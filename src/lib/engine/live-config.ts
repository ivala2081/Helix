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
