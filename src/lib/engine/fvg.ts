// Fair Value Gap (FVG) indicator — port of indicators.py:FairValueGap
// Detects 3-candle imbalance zones, tracks them, generates retest signals.

import type { Candle, Signal } from "./types";

const MAX_AGE_BARS = 100;
const MIN_GAP_ATR_MULT = 0.3;

interface InternalFVG {
  direction: "bullish" | "bearish";
  top: number;
  bottom: number;
  creationBar: number;
  filled: boolean;
  tested: boolean;
}

export interface FvgState {
  // Per-bar precomputed columns mirroring indicators.py
  fvgSignal: number[]; // 1 = long, -1 = short, 0 = none
  fvgGapSizeAtr: number[];
  fvgAgeBars: number[];
}

/**
 * Single forward pass over candles. Mirrors FairValueGap.calculate exactly,
 * including the per-bar update order: detect new FVGs FIRST, then update existing.
 */
export function computeFvg(candles: Candle[]): FvgState {
  const n = candles.length;
  const fvgSignal = new Array<number>(n).fill(0);
  const fvgGapSizeAtr = new Array<number>(n).fill(0);
  const fvgAgeBars = new Array<number>(n).fill(0);

  const active: InternalFVG[] = [];

  for (let i = 2; i < n; i++) {
    const c = candles[i];
    let atr = c.atr14;
    if (atr === undefined || !isFinite(atr)) {
      atr = c.high - c.low;
    }
    const minGap = atr * MIN_GAP_ATR_MULT;

    const prevHigh = candles[i - 2].high;
    const prevLow = candles[i - 2].low;
    const currLow = c.low;
    const currHigh = c.high;

    // ── Detect new FVGs ──
    if (prevHigh < currLow && currLow - prevHigh >= minGap) {
      active.push({
        direction: "bullish",
        top: currLow,
        bottom: prevHigh,
        creationBar: i - 1,
        filled: false,
        tested: false,
      });
    }
    if (prevLow > currHigh && prevLow - currHigh >= minGap) {
      active.push({
        direction: "bearish",
        top: prevLow,
        bottom: currHigh,
        creationBar: i - 1,
        filled: false,
        tested: false,
      });
    }

    // ── Check interactions with all active FVGs ──
    for (const fvg of active) {
      if (fvg.filled) continue;
      const age = i - fvg.creationBar;
      if (age > MAX_AGE_BARS) {
        fvg.filled = true; // expired
        continue;
      }

      if (fvg.direction === "bullish") {
        // Price dips into bullish FVG = buy signal
        if (c.low <= fvg.top && c.low >= fvg.bottom) {
          if (!fvg.tested) {
            fvg.tested = true;
            fvgSignal[i] = 1;
            const gapSize = fvg.top - fvg.bottom;
            fvgGapSizeAtr[i] = atr > 0 ? gapSize / atr : 0;
            fvgAgeBars[i] = age;
          }
        }
        // Filled (price went through completely)
        if (c.low < fvg.bottom) {
          fvg.filled = true;
        }
      } else {
        // bearish: price rises into zone = sell signal
        if (c.high >= fvg.bottom && c.high <= fvg.top) {
          if (!fvg.tested) {
            fvg.tested = true;
            fvgSignal[i] = -1;
            const gapSize = fvg.top - fvg.bottom;
            fvgGapSizeAtr[i] = atr > 0 ? gapSize / atr : 0;
            fvgAgeBars[i] = age;
          }
        }
        if (c.high > fvg.top) {
          fvg.filled = true;
        }
      }
    }

    // Garbage-collect filled FVGs to keep `active` short
    // (Python does `active_fvgs = [f for f in active_fvgs if not f.filled]`)
    for (let k = active.length - 1; k >= 0; k--) {
      if (active[k].filled) active.splice(k, 1);
    }
  }

  return { fvgSignal, fvgGapSizeAtr, fvgAgeBars };
}

/**
 * Generate FVG signals at bar i. Mirrors FairValueGap.get_signals.
 */
export function getFvgSignals(
  candles: Candle[],
  state: FvgState,
  i: number,
): Signal[] {
  const signals: Signal[] = [];
  const c = candles[i];
  let atr = c.atr14;
  if (atr === undefined || !isFinite(atr)) atr = c.high - c.low;
  if (atr <= 0) return signals;

  const sig = state.fvgSignal[i];
  if (sig === 0) return signals;

  const gapAtr = state.fvgGapSizeAtr[i] || 0.5;
  const age = state.fvgAgeBars[i] || 50;
  const gapModifier = Math.min(gapAtr * 0.15, 0.2);
  const freshnessModifier = Math.max(0.1 - age * 0.002, 0.0);
  const strength = Math.min(0.4 + gapModifier + freshnessModifier, 0.8);

  if (sig === 1) {
    signals.push({
      source: "fvg",
      type: "LONG",
      strength,
      entryPrice: c.close,
      stopLoss: c.low - 1.5 * atr,
      reason: "Bullish FVG retest — buying at imbalance zone",
      barIndex: i,
    });
  } else {
    signals.push({
      source: "fvg",
      type: "SHORT",
      strength,
      entryPrice: c.close,
      stopLoss: c.high + 1.5 * atr,
      reason: "Bearish FVG retest — selling at imbalance zone",
      barIndex: i,
    });
  }

  return signals;
}
