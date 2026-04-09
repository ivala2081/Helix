// ATR (Average True Range) — direct port of indicators.py:add_atr
// 14-period simple moving average of True Range.

import type { Candle } from "./types";

/**
 * Compute ATR-14 for each candle and write it to candle.atr14.
 * Mirrors Python: tr.rolling(period).mean()
 *  - First (period - 1) bars get NaN (we use undefined here)
 *  - First bar's prevClose is its own close (Python uses .shift(1) which produces NaN
 *    for index 0, and that NaN propagates into the TR via .abs() of NaN, so the .max()
 *    in Python will pick (high-low) since NaN comparisons return NaN, but pd.concat with
 *    .max(axis=1) handles NaN as skipna=True by default. So bar 0 effectively uses TR = high-low.)
 */
export function addAtr(candles: Candle[], period = 14): void {
  const n = candles.length;
  if (n === 0) return;

  const tr: number[] = new Array(n);

  // Bar 0: TR = high - low (no prevClose)
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const range = h - l;
    const upMove = Math.abs(h - prevC);
    const downMove = Math.abs(l - prevC);
    tr[i] = Math.max(range, upMove, downMove);
  }

  // Rolling mean of length `period`
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += tr[i];
    if (i >= period) sum -= tr[i - period];
    if (i >= period - 1) {
      candles[i].atr14 = sum / period;
    } else {
      candles[i].atr14 = undefined;
    }
  }
}
