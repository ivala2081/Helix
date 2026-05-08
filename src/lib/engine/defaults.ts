// V5 STRATEGY_PARAMS — direct port from strategy.py
// V5 RESULT on BTCUSDT 1H 2023-2026 with realism patches (2026-05-08):
//   +87.0% return, Sharpe 1.44, Max DD 13.3%, WR 64.6%, PF 1.71.
// (Pre-patch numbers were +949.7%, Sharpe 5.40, PF 12.46 — TP wick-fill bias
// inflated those by 4-7x. The patched figures are the honest baseline used
// by docs/launch-gates.md.)

import type { BacktestParams } from "./types";

export const V5_DEFAULTS: BacktestParams = {
  // Capital & risk
  initialCapital: 10_000,
  riskPct: 0.03, // V5-C: 3% per trade
  maxPositionPct: 0.8, // V5-C: 80% position cap

  // Signals
  useMarketStructure: true,
  useFvg: true,
  minConfluence: 0.5,

  // Stop loss
  slAtrMult: 1.0, // V5-A: 1x ATR (was 2x)

  // Take profits
  tp1AtrMult: 1.0, // V5-B: 1x ATR (was 2x)
  tp2AtrMult: 4.0,
  tp3AtrMult: 6.0,
  tp1ClosePct: 0.05,
  tp2ClosePct: 0.3,
  tp3ClosePct: 0.65,

  // Trailing — DISABLED in V5
  useTrailing: false,

  // Risk management
  beAfterTp1: true,
  beBufferAtr: 0.3,
  minSignalScore: 0.6,

  // SL suppression
  minBarsBeforeSl: 50,

  // Execution
  warmupBars: 50,
  commissionPct: 0.075,
  slippagePct: 0.02,

  // Realism patches (2026-05-08). See docs/launch-gates.md.
  tpRequireClose: true,
  slippageAtrFrac: 0.05,
  spreadAtrFrac: 0.03,

  // Hard stop — tightened from 15× ATR to 8× ATR; the previous floor allowed
  // unrealistic recovery during SL suppression (50 bars) and underestimated
  // worst-case drawdown.
  useHardStop: true,
  hardStopAtrMult: 8.0,
};

// Reference V5 results (hardcoded for landing page) — realism-patched baseline.
// See reports/realism_patched_baseline.json for the source numbers and
// docs/launch-gates.md for the policy framework.
export const V5_REFERENCE_RESULTS = {
  symbol: "BTCUSDT",
  interval: "1h",
  startDate: "2023-01-01",
  endDate: "2026-04-13",
  totalReturnPct: 87.0,
  sharpeRatio: 1.44,
  maxDrawdownPct: 13.3,
  winRatePct: 64.6,
  profitFactor: 1.71,
  expectancyUsd: null,
  walkForward: "deferred — to be re-validated post-realism-patch",
};
