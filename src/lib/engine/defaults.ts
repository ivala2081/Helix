// V5 STRATEGY_PARAMS — direct port from strategy.py
// V5 RESULT on BTCUSDT 1H 2023-2026: +949.7%, Sharpe 5.40, Max DD 8.55%, WR 84.3%, PF 12.46

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

  // Hard stop
  useHardStop: true,
  hardStopAtrMult: 15.0,
};

// Reference V5 results (hardcoded for landing page)
export const V5_REFERENCE_RESULTS = {
  symbol: "BTCUSDT",
  interval: "1h",
  startDate: "2023-01-01",
  endDate: "2026-02-28",
  totalReturnPct: 949.7,
  sharpeRatio: 5.4,
  maxDrawdownPct: 8.55,
  winRatePct: 84.3,
  profitFactor: 12.46,
  expectancyUsd: 426,
  walkForward: "5/5 folds profitable, avg OOS +48.72%",
};
