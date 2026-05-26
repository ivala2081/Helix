// V6.2 STRATEGY_PARAMS — TS port of strategy_v6_2.py.
//
// V6.2 = V5_DEFAULTS + two changes derived from the V6/V6.1/V6.2 ablation
// trajectory (see docs/v6-iteration-summary.md):
//
//   1) trail-after-TP1 (10% locked at 1×ATR, remaining 90% rides 2×ATR
//      trailing stop). Replaces V5's TP1/TP2/TP3 mix.
//   2) Stricter realism (slippage 0.08 / spread 0.05 / hard-stop 6× /
//      2-bar TP close-confirm). Compensates for the V5 backtest-vs-live
//      gap that the 2026-05-08 realism patches did not fully close.
//
// All V6 adaptation layers (MTF agreement, percentile regime filter,
// absolute regime filter, adaptive sizing) were tried and removed in
// the V6→V6.1→V6.2 iteration. Each ablation showed they cut edge in this
// data set; V6.2 wins by being closer to V5 than further.
//
// In-sample (BTC/ETH/SOL concurrent BT, 2024-01-01 → 2025-12-31):
//   n=364, +109.12%, PF 1.63, Sharpe 1.95, Max DD 15.83%, R/day +0.541
// OOS (2026-Q1 held-back, never seen during dev):
//   n=51, +15.89%, PF 2.03, Sharpe 2.56, Max DD 3.97%, R/day +0.277
// Stress (4/4 positive): low_vol +30R, bull +20R, chop +60R, drift +37R.

import type { BacktestParams } from "./types";
import { V5_DEFAULTS } from "./defaults";

export const V6_2_DEFAULTS: BacktestParams = {
  ...V5_DEFAULTS,

  // Trail-after-TP1 (the structural strategy change)
  tp1ClosePct: 0.10, // V5 was 0.05
  tp2ClosePct: 0.00, // unused in V6.2 (trail fires)
  tp3ClosePct: 0.00, // unused in V6.2 (trail fires)
  trailAfterTp1: true,
  trailAfterTp1Atr: 2.0,

  // Stricter realism (engine assumptions, no parameter tuning)
  slippageAtrFrac: 0.08, // V5 was 0.05
  spreadAtrFrac: 0.05, // V5 was 0.03
  hardStopAtrMult: 6.0, // V5 was 8.0
  tpRequireCloseBars: 2, // V5 was 1 (implicit)
};

export const V6_2_REFERENCE_RESULTS = {
  symbol_set: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  interval: "1h",
  in_sample: {
    range: "2024-01-01 -> 2025-12-31",
    n_trades: 364,
    totalReturnPct: 109.12,
    profitFactor: 1.63,
    sharpeRatio: 1.95,
    maxDrawdownPct: 15.83,
    rPerDay: 0.541,
  },
  oos_2026_q1: {
    range: "2026-01-01 -> 2026-04-13",
    n_trades: 51,
    totalReturnPct: 15.89,
    profitFactor: 2.03,
    sharpeRatio: 2.56,
    maxDrawdownPct: 3.97,
    rPerDay: 0.277,
  },
  stress_4_of_4_positive: true,
};
