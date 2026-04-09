// Compute the buy-and-hold equity curve for comparison against the strategy.
// Pure function. Does NOT touch the backtester or any state.

import type { Candle, EquityPoint } from "./types";

/**
 * Single buy at the first candle's close, sized to use 100% of `initialCapital`.
 * Equity at each subsequent bar = initialCapital * (close[i] / close[0]).
 */
export function computeBuyHoldEquity(
  candles: Candle[],
  initialCapital: number,
): EquityPoint[] {
  if (candles.length === 0) return [];
  const entryPrice = candles[0].close;
  if (entryPrice <= 0) return [];

  const out: EquityPoint[] = new Array(candles.length);
  let runningMax = initialCapital;
  for (let i = 0; i < candles.length; i++) {
    const equity = initialCapital * (candles[i].close / entryPrice);
    if (equity > runningMax) runningMax = equity;
    const ddPct = runningMax > 0 ? ((equity - runningMax) / runningMax) * 100 : 0;
    out[i] = { timestamp: candles[i].timestamp, equity, drawdownPct: ddPct };
  }
  return out;
}
