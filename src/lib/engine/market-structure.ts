// Market Structure indicator — port of indicators.py:MarketStructure
// Detects swing highs/lows, classifies HH/HL/LH/LL, determines trend,
// detects BOS (Break of Structure) and CHoCH (Change of Character).

import type { Candle, Signal, Trend } from "./types";

const SWING_LOOKBACK = 5;

interface MsState {
  // per-bar precomputed columns (NaN-equivalent = undefined)
  swingHigh: (number | undefined)[];
  swingLow: (number | undefined)[];
  lastSwingHigh: (number | undefined)[];
  lastSwingLow: (number | undefined)[];
  trend: Trend[];
  trendMaturity: number[];
  bos: number[]; // 1 bullish, -1 bearish, 0 none
  choch: number[]; // 1 bullish, -1 bearish, 0 none
}

/**
 * Run the full Market Structure computation in one pass over the candles.
 * Returns precomputed per-bar arrays the engine can index by bar.
 */
export function computeMarketStructure(candles: Candle[]): MsState {
  const n = candles.length;
  const lb = SWING_LOOKBACK;

  const swingHigh: (number | undefined)[] = new Array(n).fill(undefined);
  const swingLow: (number | undefined)[] = new Array(n).fill(undefined);

  // ── Swing detection (lookback on both sides) ──
  for (let i = lb; i < n - lb; i++) {
    let isHigh = true;
    let isLow = true;
    const h = candles[i].high;
    const l = candles[i].low;
    for (let j = i - lb; j <= i + lb; j++) {
      if (j === i) continue;
      if (candles[j].high > h) isHigh = false;
      if (candles[j].low < l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    // Python uses == max() so equal-to-max counts as a swing.
    // Our implementation uses strictly-greater for disqualification, which matches.
    if (isHigh) swingHigh[i] = h;
    if (isLow) swingLow[i] = l;
  }

  // ── Forward-fill last_swing_high / last_swing_low ──
  const lastSwingHigh: (number | undefined)[] = new Array(n).fill(undefined);
  const lastSwingLow: (number | undefined)[] = new Array(n).fill(undefined);
  let curSh: number | undefined = undefined;
  let curSl: number | undefined = undefined;
  for (let i = 0; i < n; i++) {
    if (swingHigh[i] !== undefined) curSh = swingHigh[i];
    if (swingLow[i] !== undefined) curSl = swingLow[i];
    lastSwingHigh[i] = curSh;
    lastSwingLow[i] = curSl;
  }

  // ── Build chronological event list of swing classifications ──
  // Mirrors Python: walk swing highs and lows separately, classify each as HH/LH/HL/LL,
  // then sort by index.
  type SwingEvent = { idx: number; stype: "HH" | "LH" | "HL" | "LL" };
  const events: SwingEvent[] = [];

  let prevSh: number | undefined = undefined;
  let prevSl: number | undefined = undefined;
  for (let i = 0; i < n; i++) {
    const sh = swingHigh[i];
    if (sh !== undefined) {
      if (prevSh !== undefined) {
        events.push({ idx: i, stype: sh > prevSh ? "HH" : "LH" });
      }
      prevSh = sh;
    }
    const sl = swingLow[i];
    if (sl !== undefined) {
      if (prevSl !== undefined) {
        events.push({ idx: i, stype: sl > prevSl ? "HL" : "LL" });
      }
      prevSl = sl;
    }
  }
  // Stable sort by idx
  events.sort((a, b) => a.idx - b.idx);

  // ── Walk events to determine trend at each event index ──
  const trendAtEvent: Map<number, Trend> = new Map();
  const maturityAtEvent: Map<number, number> = new Map();

  let currentTrend: Trend = "NEUTRAL";
  let lastShType: "HH" | "LH" | null = null;
  let lastSlType: "HL" | "LL" | null = null;
  let consecBull = 0;
  let consecBear = 0;

  for (const ev of events) {
    if (ev.stype === "HH" || ev.stype === "LH") {
      lastShType = ev.stype;
    } else {
      lastSlType = ev.stype;
    }

    if (lastShType === "HH" && lastSlType === "HL") {
      currentTrend = "BULLISH";
    } else if (lastShType === "LH" && lastSlType === "LL") {
      currentTrend = "BEARISH";
    } else if (lastShType === "LH" && lastSlType === "HL") {
      currentTrend = "NEUTRAL"; // transition / CHoCH zone
    }
    // note: HH+LL is undefined in Python; trend stays at previous value

    trendAtEvent.set(ev.idx, currentTrend);

    if (ev.stype === "HH" || ev.stype === "HL") {
      consecBull += 1;
      consecBear = 0;
    } else {
      consecBear += 1;
      consecBull = 0;
    }
    maturityAtEvent.set(ev.idx, Math.max(consecBull, consecBear));
  }

  // ── Forward-fill trend across all bars ──
  // Python:
  //   1. df["ms_trend"] = NEUTRAL by default
  //   2. assign trend value at each event idx
  //   3. replace NEUTRAL/0 with NaN, then for each i, if NaN copy from i-1
  //   4. final fillna(NEUTRAL)
  // Net effect: trend is forward-filled from each event onward; bars before first event = NEUTRAL.
  const trend: Trend[] = new Array(n).fill("NEUTRAL");
  const trendMaturity: number[] = new Array(n).fill(0);

  // Set values exactly at event indices first
  for (const ev of events) {
    const t = trendAtEvent.get(ev.idx);
    if (t !== undefined) trend[ev.idx] = t;
    const m = maturityAtEvent.get(ev.idx);
    if (m !== undefined) trendMaturity[ev.idx] = m;
  }
  // Forward-fill: a bar without an explicit event keeps the last non-NEUTRAL trend.
  // Python's exact loop: if cell is NEUTRAL OR NaN, copy previous. We mirror that.
  for (let i = 1; i < n; i++) {
    if (trend[i] === "NEUTRAL") {
      trend[i] = trend[i - 1];
    }
    if (trendMaturity[i] === 0) {
      trendMaturity[i] = trendMaturity[i - 1];
    }
  }

  // ── BOS and CHoCH detection (per bar from lb..n-1) ──
  const bos: number[] = new Array(n).fill(0);
  const choch: number[] = new Array(n).fill(0);

  let lastConfirmedSh: number | undefined = undefined;
  let lastConfirmedSl: number | undefined = undefined;
  let prevTrend: Trend = "NEUTRAL";

  for (let i = lb; i < n; i++) {
    if (swingHigh[i] !== undefined) lastConfirmedSh = swingHigh[i];
    if (swingLow[i] !== undefined) lastConfirmedSl = swingLow[i];

    if (lastConfirmedSh === undefined || lastConfirmedSl === undefined) continue;

    const curTrend = trend[i];
    const close = candles[i].close;

    if (curTrend === "BULLISH" && close > lastConfirmedSh) {
      bos[i] = 1;
    }
    if (curTrend === "BEARISH" && close < lastConfirmedSl) {
      bos[i] = -1;
    }

    if (curTrend !== prevTrend && curTrend !== "NEUTRAL" && prevTrend !== "NEUTRAL") {
      choch[i] = curTrend === "BULLISH" ? 1 : -1;
    }
    prevTrend = curTrend;
  }

  return { swingHigh, swingLow, lastSwingHigh, lastSwingLow, trend, trendMaturity, bos, choch };
}

/**
 * Generate market-structure signals at the given bar.
 * Mirrors indicators.py:MarketStructure.get_signals exactly.
 */
export function getMarketStructureSignals(
  candles: Candle[],
  state: MsState,
  i: number,
): Signal[] {
  const signals: Signal[] = [];
  // Python: if bar_index < swing_lookback * 2: return signals
  if (i < SWING_LOOKBACK * 2) return signals;

  const c = candles[i];
  const atr = c.atr14;
  if (atr === undefined || !isFinite(atr) || atr <= 0) return signals;

  const maturity = state.trendMaturity[i] || 1;
  const bodySize = Math.abs(c.close - c.open);
  const bodyModifier = Math.min(bodySize / atr / 1.5, 0.15);
  const maturityModifier = Math.min((maturity - 1) * 0.05, 0.15);

  // BOS
  if (state.bos[i] === 1) {
    const strength = Math.min(0.55 + maturityModifier + bodyModifier, 0.9);
    const sl =
      state.lastSwingLow[i] !== undefined ? state.lastSwingLow[i]! : c.low - 2 * atr;
    signals.push({
      source: "market_structure",
      type: "LONG",
      strength,
      entryPrice: c.close,
      stopLoss: sl,
      reason: "Bullish BOS — uptrend continuation",
      barIndex: i,
    });
  } else if (state.bos[i] === -1) {
    const strength = Math.min(0.55 + maturityModifier + bodyModifier, 0.9);
    const sl =
      state.lastSwingHigh[i] !== undefined ? state.lastSwingHigh[i]! : c.high + 2 * atr;
    signals.push({
      source: "market_structure",
      type: "SHORT",
      strength,
      entryPrice: c.close,
      stopLoss: sl,
      reason: "Bearish BOS — downtrend continuation",
      barIndex: i,
    });
  }

  // CHoCH
  if (state.choch[i] === 1) {
    const strength = Math.min(0.4 + bodyModifier, 0.6);
    const sl = c.low - 1.5 * atr;
    signals.push({
      source: "market_structure",
      type: "LONG",
      strength,
      entryPrice: c.close,
      stopLoss: sl,
      reason: "Bullish CHoCH — potential trend reversal",
      barIndex: i,
    });
  } else if (state.choch[i] === -1) {
    const strength = Math.min(0.4 + bodyModifier, 0.6);
    const sl = c.high + 1.5 * atr;
    signals.push({
      source: "market_structure",
      type: "SHORT",
      strength,
      entryPrice: c.close,
      stopLoss: sl,
      reason: "Bearish CHoCH — potential trend reversal",
      barIndex: i,
    });
  }

  return signals;
}

export type { MsState };
