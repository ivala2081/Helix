// Helix Streaming Paper-Trading Engine
//
// Converts the batch backtester loop (backtester.ts) into a single-candle
// stepping function: stepCandle(state, candle, params) → StepResult.
//
// PARITY RULES (must match backtester.ts:1-15 exactly):
//   1. Equity recorded at START of bar (before warmup check).
//   2. SL suppressed for first minBarsBeforeSl bars — only hard stop (15× ATR).
//   3. After TP1 → SL moves to breakeven (entry ± 0.3 ATR).
//   4. TPs checked in order: TP1 → TP2 → TP3.
//   5. Slippage on entries and SL/HardStop exits, NOT on TPs.
//   6. Commission: proportional entry+exit on each partial close.
//   7. Only 1 position at a time.
//
// Reused as-is: aggregate(), calculatePositionSize(), partialClose(), closeFull().
// Replaced:     addAtr → rolling ATR,  computeMarketStructure → ring-buffer swings,
//               computeFvg → incremental FVG tracker.

import { aggregate } from "./aggregator";
import { partialClose, closeFull } from "./backtester";
import { calculatePositionSize } from "./sizing";
import type {
  BacktestParams,
  Candle,
  Direction,
  ExitReason,
  Signal,
  Trade,
  Trend,
} from "./types";

// ─── Constants (mirroring batch modules) ────────────────────────────

const SWING_LOOKBACK = 5;
const FVG_MAX_AGE_BARS = 100;
const FVG_MIN_GAP_ATR_MULT = 0.3;

// ─── Internal FVG type (mirrors fvg.ts:InternalFVG) ────────────────

interface InternalFVG {
  direction: "bullish" | "bearish";
  top: number;
  bottom: number;
  creationBar: number;
  filled: boolean;
  tested: boolean;
  testedThisBar: boolean; // signal fires only on first-test bar
}

// Signal at bar i close → fill at bar (i+1) open. Snapshot of signal-bar
// data needed at fill time. Persisted in StrategyState across cron cycles.
export interface PendingEntry {
  direction: Direction;
  decisionScore: number;
  decisionReasons: string[];
  signalSl: number | undefined;
  atrAtSignal: number;
  signalBarIndex: number;
  signalBarTimestamp: number;
}

// ─── Strategy State ─────────────────────────────────────────────────

export interface StrategyState {
  // Trade state
  realizedPnl: number;
  openTrade: Trade | null;
  pendingEntry: PendingEntry | null;
  nextTradeId: number;
  barIndex: number;
  warmupComplete: boolean;

  // ATR rolling (replaces batch addAtr)
  atr: {
    period: number;
    trBuffer: number[];      // circular buffer of TR values
    trSum: number;           // rolling sum
    bufferIdx: number;       // write pointer into trBuffer
    count: number;           // total TR values seen
    prevClose: number;       // previous candle's close
    currentAtr: number | undefined;
  };

  // Market Structure rolling (replaces batch computeMarketStructure)
  ms: {
    // Ring buffer of candles for swing detection (size = SWING_LOOKBACK*2 + 1 = 11)
    candleRing: Candle[];
    ringIdx: number;
    ringCount: number;
    // Forward-filled swing state
    lastSwingHigh: number | undefined;
    lastSwingLow: number | undefined;
    prevSwingHigh: number | undefined;
    prevSwingLow: number | undefined;
    // Trend classification
    trend: Trend;
    lastShType: "HH" | "LH" | null;
    lastSlType: "HL" | "LL" | null;
    consecBull: number;
    consecBear: number;
    trendMaturity: number;
    // BOS / CHoCH
    prevTrend: Trend;
    lastConfirmedSh: number | undefined;
    lastConfirmedSl: number | undefined;
  };

  // FVG rolling (replaces batch computeFvg)
  fvg: {
    activeFvgs: InternalFVG[];
    prevPrevCandle: Candle | null;
    prevCandle: Candle | null;
  };

  // Equity tracking
  equity: number;
  peakEquity: number;
}

// ─── Step Result ────────────────────────────────────────────────────

export type StepEventType = "tradeOpened" | "tradeClosed" | "equitySnapshot";

export interface StepEvent {
  type: StepEventType;
  trade?: Trade;
}

export interface StepResult {
  events: StepEvent[];
  equity: number;
  drawdownPct: number;
}

// ─── Create initial (empty) state ───────────────────────────────────

export function createInitialState(initialCapital: number): StrategyState {
  const ATR_PERIOD = 14;
  const RING_SIZE = SWING_LOOKBACK * 2 + 1; // 11

  return {
    realizedPnl: 0,
    openTrade: null,
    pendingEntry: null,
    nextTradeId: 1,
    barIndex: 0,
    warmupComplete: false,

    atr: {
      period: ATR_PERIOD,
      trBuffer: new Array(ATR_PERIOD).fill(0),
      trSum: 0,
      bufferIdx: 0,
      count: 0,
      prevClose: 0,
      currentAtr: undefined,
    },

    ms: {
      candleRing: new Array(RING_SIZE).fill(null),
      ringIdx: 0,
      ringCount: 0,
      lastSwingHigh: undefined,
      lastSwingLow: undefined,
      prevSwingHigh: undefined,
      prevSwingLow: undefined,
      trend: "NEUTRAL",
      lastShType: null,
      lastSlType: null,
      consecBull: 0,
      consecBear: 0,
      trendMaturity: 0,
      prevTrend: "NEUTRAL",
      lastConfirmedSh: undefined,
      lastConfirmedSl: undefined,
    },

    fvg: {
      activeFvgs: [],
      prevPrevCandle: null,
      prevCandle: null,
    },

    equity: initialCapital,
    peakEquity: initialCapital,
  };
}

// ─── stepCandle ─────────────────────────────────────────────────────

export function stepCandle(
  state: StrategyState,
  candle: Candle,
  params: BacktestParams,
): StepResult {
  const events: StepEvent[] = [];
  const i = state.barIndex;

  // (1) Record equity at START of bar (parity rule #1)
  state.equity = params.initialCapital + state.realizedPnl;
  if (state.equity > state.peakEquity) state.peakEquity = state.equity;

  // ── Update ATR ────────────────────────────────────────────────────
  updateAtr(state, candle);

  // Attach ATR to candle (for signal generation)
  candle.atr14 = state.atr.currentAtr;
  const atr = state.atr.currentAtr;

  // ── Update Market Structure ring buffer ────────────────────────────
  updateMarketStructure(state, candle);

  // ── Update FVG tracker ────────────────────────────────────────────
  updateFvg(state, candle);

  // ── Warmup check ──────────────────────────────────────────────────
  if (i < params.warmupBars) {
    state.barIndex++;
    state.warmupComplete = false;
    return makeResult(events, state);
  }
  state.warmupComplete = true;

  // ATR sanity
  if (atr === undefined || !isFinite(atr) || atr <= 0) {
    state.barIndex++;
    return makeResult(events, state);
  }

  // ── (PE) FILL pendingEntry (signal at bar i-1 → fill at bar i open) ──
  // Falls through to manage block on success: SL is suppressed on fill bar
  // (barsInTrade=0 < minBarsBeforeSl) but hardStop and TPs are checked.
  if (state.pendingEntry !== null && state.openTrade === null) {
    const pe = state.pendingEntry;
    const sigAtr = pe.atrAtSignal;
    let entryPrice = candle.open;
    if (params.slippagePct > 0) {
      const slip = (entryPrice * params.slippagePct) / 100;
      entryPrice += pe.direction === "LONG" ? slip : -slip;
    }

    let stopLoss: number;
    if (pe.direction === "LONG") {
      const atrSl = entryPrice - params.slAtrMult * sigAtr;
      stopLoss = pe.signalSl !== undefined ? Math.max(pe.signalSl, atrSl) : atrSl;
    } else {
      const atrSl = entryPrice + params.slAtrMult * sigAtr;
      stopLoss = pe.signalSl !== undefined ? Math.min(pe.signalSl, atrSl) : atrSl;
    }

    const tp1 = pe.direction === "LONG"
      ? entryPrice + params.tp1AtrMult * sigAtr
      : entryPrice - params.tp1AtrMult * sigAtr;
    const tp2 = pe.direction === "LONG"
      ? entryPrice + params.tp2AtrMult * sigAtr
      : entryPrice - params.tp2AtrMult * sigAtr;
    const tp3 = pe.direction === "LONG"
      ? entryPrice + params.tp3AtrMult * sigAtr
      : entryPrice - params.tp3AtrMult * sigAtr;

    const sizing = calculatePositionSize(
      state.equity, entryPrice, stopLoss, pe.direction, params.riskPct, params.maxPositionPct,
    );

    if (sizing.size > 0) {
      let hardStop: number | null = null;
      if (params.useHardStop) {
        hardStop = pe.direction === "LONG"
          ? entryPrice - params.hardStopAtrMult * sigAtr
          : entryPrice + params.hardStopAtrMult * sigAtr;
      }
      const trade: Trade = {
        id: state.nextTradeId++,
        direction: pe.direction,
        entryBar: i,
        entryTs: candle.timestamp,
        entryDate: candle.date,
        entryPrice,
        initialStopLoss: stopLoss,
        stopLoss,
        hardStop,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        size: sizing.size,
        remainingSize: sizing.size,
        riskAmount: sizing.riskAmount,
        signalScore: pe.decisionScore,
        signalReasons: pe.decisionReasons,
        tp1Hit: false,
        tp2Hit: false,
        partialPnl: 0,
        entryCommission: 0,
        exitCommission: 0,
        totalCommission: 0,
        maxFavorable: 0,
        maxAdverse: 0,
      };
      state.openTrade = trade;
      events.push({ type: "tradeOpened", trade: { ...trade } });
    }
    state.pendingEntry = null;
  }

  // ── (A) MANAGE OPEN POSITION ──────────────────────────────────────
  if (state.openTrade !== null) {
    const t = state.openTrade;
    const dir = t.direction;

    // MFE / MAE
    if (dir === "LONG") {
      const unrealized = (candle.high - t.entryPrice) * t.remainingSize;
      const adverse = (t.entryPrice - candle.low) * t.remainingSize;
      if (unrealized > t.maxFavorable) t.maxFavorable = unrealized;
      if (adverse > t.maxAdverse) t.maxAdverse = adverse;
    } else {
      const unrealized = (t.entryPrice - candle.low) * t.remainingSize;
      const adverse = (candle.high - t.entryPrice) * t.remainingSize;
      if (unrealized > t.maxFavorable) t.maxFavorable = unrealized;
      if (adverse > t.maxAdverse) t.maxAdverse = adverse;
    }

    const barsInTrade = i - t.entryBar;
    let stoppedOut = false;
    let exitPrice = 0;
    let reason: ExitReason = "Stop Loss";

    // SL suppression logic (parity rule #2)
    if (barsInTrade >= params.minBarsBeforeSl) {
      if (dir === "LONG" && candle.low <= t.stopLoss) {
        exitPrice = t.stopLoss;
        reason = "Stop Loss";
        stoppedOut = true;
      } else if (dir === "SHORT" && candle.high >= t.stopLoss) {
        exitPrice = t.stopLoss;
        reason = "Stop Loss";
        stoppedOut = true;
      }
    } else if (params.useHardStop && t.hardStop !== null) {
      if (dir === "LONG" && candle.low <= t.hardStop) {
        exitPrice = t.hardStop;
        reason = "Hard Stop";
        stoppedOut = true;
      } else if (dir === "SHORT" && candle.high >= t.hardStop) {
        exitPrice = t.hardStop;
        reason = "Hard Stop";
        stoppedOut = true;
      }
    }

    if (stoppedOut) {
      const realized = closeFull(t, i, exitPrice, reason, params, candle.date);
      state.realizedPnl += realized;
      events.push({ type: "tradeClosed", trade: { ...t } });
      state.openTrade = null;
      state.barIndex++;
      return makeResult(events, state);
    }

    // Take profits (parity rule #4 — TP1 → TP2 → TP3 in order)
    if (dir === "LONG") {
      if (!t.tp1Hit && candle.high >= t.takeProfit1) {
        const closeSize = t.size * params.tp1ClosePct;
        state.realizedPnl += partialClose(t, t.takeProfit1, closeSize, params);
        t.remainingSize -= closeSize;
        t.tp1Hit = true;
        if (params.beAfterTp1) {
          t.stopLoss = t.entryPrice + params.beBufferAtr * atr;
        }
      }
      if (t.tp1Hit && !t.tp2Hit && candle.high >= t.takeProfit2) {
        const closeSize = t.size * params.tp2ClosePct;
        state.realizedPnl += partialClose(t, t.takeProfit2, closeSize, params);
        t.remainingSize -= closeSize;
        t.tp2Hit = true;
      }
      if (t.tp2Hit && candle.high >= t.takeProfit3) {
        const realized = closeFull(t, i, t.takeProfit3, "TP3", params, candle.date);
        state.realizedPnl += realized;
        events.push({ type: "tradeClosed", trade: { ...t } });
        state.openTrade = null;
        state.barIndex++;
        return makeResult(events, state);
      }
    } else {
      // SHORT
      if (!t.tp1Hit && candle.low <= t.takeProfit1) {
        const closeSize = t.size * params.tp1ClosePct;
        state.realizedPnl += partialClose(t, t.takeProfit1, closeSize, params);
        t.remainingSize -= closeSize;
        t.tp1Hit = true;
        if (params.beAfterTp1) {
          t.stopLoss = t.entryPrice - params.beBufferAtr * atr;
        }
      }
      if (t.tp1Hit && !t.tp2Hit && candle.low <= t.takeProfit2) {
        const closeSize = t.size * params.tp2ClosePct;
        state.realizedPnl += partialClose(t, t.takeProfit2, closeSize, params);
        t.remainingSize -= closeSize;
        t.tp2Hit = true;
      }
      if (t.tp2Hit && candle.low <= t.takeProfit3) {
        const realized = closeFull(t, i, t.takeProfit3, "TP3", params, candle.date);
        state.realizedPnl += realized;
        events.push({ type: "tradeClosed", trade: { ...t } });
        state.openTrade = null;
        state.barIndex++;
        return makeResult(events, state);
      }
    }

    // Position still open — don't evaluate new signals
    state.barIndex++;
    return makeResult(events, state);
  }

  // ── (B) GENERATE SIGNALS (no open position) ──────────────────────
  const signals: Signal[] = [];
  if (params.useMarketStructure) {
    const ms = getStreamingMsSignals(state, candle, i);
    if (ms.length) signals.push(...ms);
  }
  if (params.useFvg) {
    const fvgSigs = getStreamingFvgSignals(state, candle, i);
    if (fvgSigs.length) signals.push(...fvgSigs);
  }

  if (signals.length === 0) {
    state.barIndex++;
    return makeResult(events, state);
  }

  const decision = aggregate(signals, params);
  if (decision.action === "NONE" || decision.score < params.minSignalScore) {
    state.barIndex++;
    return makeResult(events, state);
  }

  // ── (C) SET pendingEntry — fill happens at next bar's open ──────
  state.pendingEntry = {
    direction: decision.action as Direction,
    decisionScore: decision.score,
    decisionReasons: decision.reasons,
    signalSl: decision.stopLoss,
    atrAtSignal: atr,
    signalBarIndex: i,
    signalBarTimestamp: candle.timestamp,
  };

  state.barIndex++;
  return makeResult(events, state);
}

// ─── ATR rolling update ─────────────────────────────────────────────

function updateAtr(state: StrategyState, candle: Candle): void {
  const a = state.atr;

  // Compute True Range
  let tr: number;
  if (a.count === 0) {
    // First bar: TR = high - low (no prevClose)
    tr = candle.high - candle.low;
  } else {
    const range = candle.high - candle.low;
    const upMove = Math.abs(candle.high - a.prevClose);
    const downMove = Math.abs(candle.low - a.prevClose);
    tr = Math.max(range, upMove, downMove);
  }

  // Update circular buffer
  if (a.count >= a.period) {
    // Remove oldest TR from sum
    a.trSum -= a.trBuffer[a.bufferIdx];
  }
  a.trBuffer[a.bufferIdx] = tr;
  a.trSum += tr;
  a.bufferIdx = (a.bufferIdx + 1) % a.period;
  a.count++;

  // Compute ATR (SMA of TR)
  if (a.count >= a.period) {
    a.currentAtr = a.trSum / a.period;
  } else {
    a.currentAtr = undefined;
  }

  a.prevClose = candle.close;
}

// ─── Market Structure rolling update ────────────────────────────────
// Swing detection with 5-bar delay (non-causal → delayed confirmation).
// The "center" candle of the ring is confirmed as swing only when 5 newer
// candles have arrived. This is mathematically identical to batch.

function updateMarketStructure(state: StrategyState, candle: Candle): void {
  const ms = state.ms;
  const RING_SIZE = SWING_LOOKBACK * 2 + 1; // 11

  // Capture trend at start of this bar — batch CHoCH compares prev-bar trend
  // to current-bar trend, not prev-event to current-event. (Python parity.)
  ms.prevTrend = ms.trend;

  // Push candle into ring buffer
  ms.candleRing[ms.ringIdx] = candle;
  ms.ringIdx = (ms.ringIdx + 1) % RING_SIZE;
  ms.ringCount++;

  // Need at least 11 candles to check the center
  if (ms.ringCount < RING_SIZE) return;

  // ringIdx points to the NEXT write slot = oldest entry in the ring.
  // Chronological order: slot ringIdx (oldest) → slot (ringIdx-1+RING_SIZE)%RING_SIZE (newest).
  // Center = SWING_LOOKBACK positions from oldest.
  const oldestIdx = ms.ringIdx;
  const cIdx = (oldestIdx + SWING_LOOKBACK) % RING_SIZE;
  const centerCandle = ms.candleRing[cIdx];

  // Check if center is a swing high/low
  let isHigh = true;
  let isLow = true;
  const h = centerCandle.high;
  const l = centerCandle.low;

  for (let offset = 0; offset < RING_SIZE; offset++) {
    if (offset === SWING_LOOKBACK) continue; // skip center
    const idx = (oldestIdx + offset) % RING_SIZE;
    if (ms.candleRing[idx].high > h) isHigh = false;
    if (ms.candleRing[idx].low < l) isLow = false;
    if (!isHigh && !isLow) break;
  }

  // Process swing events (mirrors batch: classify as HH/LH/HL/LL, update trend).
  // lastSwingHigh = most recent confirmed swing high.
  // When a new swing high is found, classify it relative to lastSwingHigh (the previous one).
  if (isHigh) {
    const shPrice = h;
    if (ms.lastSwingHigh !== undefined) {
      const stype = shPrice > ms.lastSwingHigh ? "HH" : "LH";
      ms.lastShType = stype;
      updateTrend(ms);
    }
    ms.prevSwingHigh = ms.lastSwingHigh;
    ms.lastSwingHigh = shPrice;
    ms.lastConfirmedSh = shPrice;
  }

  if (isLow) {
    const slPrice = l;
    if (ms.lastSwingLow !== undefined) {
      const stype = slPrice > ms.lastSwingLow ? "HL" : "LL";
      ms.lastSlType = stype;
      updateTrend(ms);
    }
    ms.prevSwingLow = ms.lastSwingLow;
    ms.lastSwingLow = slPrice;
    ms.lastConfirmedSl = slPrice;
  }
}

function updateTrend(ms: StrategyState["ms"]): void {
  if (ms.lastShType === "HH" && ms.lastSlType === "HL") {
    ms.trend = "BULLISH";
  } else if (ms.lastShType === "LH" && ms.lastSlType === "LL") {
    ms.trend = "BEARISH";
  } else if (ms.lastShType === "LH" && ms.lastSlType === "HL") {
    ms.trend = "NEUTRAL";
  }
  // HH+LL: trend stays at previous value (matches Python)

  // Update maturity
  const isBullEvent = ms.lastShType === "HH" || ms.lastSlType === "HL";
  if (isBullEvent) {
    ms.consecBull++;
    ms.consecBear = 0;
  } else {
    ms.consecBear++;
    ms.consecBull = 0;
  }
  ms.trendMaturity = Math.max(ms.consecBull, ms.consecBear);

  // CHoCH/prevTrend bookkeeping is owned by updateMarketStructure (bar-based).
}

// ─── Market Structure signal generation ─────────────────────────────

function getStreamingMsSignals(
  state: StrategyState,
  candle: Candle,
  barIndex: number,
): Signal[] {
  const signals: Signal[] = [];
  const ms = state.ms;

  if (ms.ringCount < SWING_LOOKBACK * 2 + 1) return signals;

  const atr = candle.atr14;
  if (atr === undefined || !isFinite(atr) || atr <= 0) return signals;

  const maturity = ms.trendMaturity || 1;
  const bodySize = Math.abs(candle.close - candle.open);
  const bodyModifier = Math.min(bodySize / atr / 1.5, 0.15);
  const maturityModifier = Math.min((maturity - 1) * 0.05, 0.15);

  // BOS
  if (ms.lastConfirmedSh !== undefined && ms.lastConfirmedSl !== undefined) {
    if (ms.trend === "BULLISH" && candle.close > ms.lastConfirmedSh) {
      const strength = Math.min(0.55 + maturityModifier + bodyModifier, 0.9);
      const sl = ms.lastSwingLow !== undefined ? ms.lastSwingLow : candle.low - 2 * atr;
      signals.push({
        source: "market_structure",
        type: "LONG",
        strength,
        entryPrice: candle.close,
        stopLoss: sl,
        reason: "Bullish BOS — uptrend continuation",
        barIndex,
      });
    }
    if (ms.trend === "BEARISH" && candle.close < ms.lastConfirmedSl) {
      const strength = Math.min(0.55 + maturityModifier + bodyModifier, 0.9);
      const sl = ms.lastSwingHigh !== undefined ? ms.lastSwingHigh : candle.high + 2 * atr;
      signals.push({
        source: "market_structure",
        type: "SHORT",
        strength,
        entryPrice: candle.close,
        stopLoss: sl,
        reason: "Bearish BOS — downtrend continuation",
        barIndex,
      });
    }
  }

  // CHoCH
  if (ms.prevTrend !== ms.trend && ms.trend !== "NEUTRAL" && ms.prevTrend !== "NEUTRAL") {
    if (ms.trend === "BULLISH") {
      const strength = Math.min(0.4 + bodyModifier, 0.6);
      signals.push({
        source: "market_structure",
        type: "LONG",
        strength,
        entryPrice: candle.close,
        stopLoss: candle.low - 1.5 * atr,
        reason: "Bullish CHoCH — potential trend reversal",
        barIndex,
      });
    } else if (ms.trend === "BEARISH") {
      const strength = Math.min(0.4 + bodyModifier, 0.6);
      signals.push({
        source: "market_structure",
        type: "SHORT",
        strength,
        entryPrice: candle.close,
        stopLoss: candle.high + 1.5 * atr,
        reason: "Bearish CHoCH — potential trend reversal",
        barIndex,
      });
    }
  }

  return signals;
}

// ─── FVG rolling update ─────────────────────────────────────────────

function updateFvg(state: StrategyState, candle: Candle): void {
  const f = state.fvg;
  const barIndex = state.barIndex;

  // Reset testedThisBar on all active FVGs at start of each bar
  for (const fvg of f.activeFvgs) fvg.testedThisBar = false;

  if (f.prevCandle !== null && f.prevPrevCandle !== null) {
    let atr = candle.atr14;
    if (atr === undefined || !isFinite(atr)) atr = candle.high - candle.low;
    const minGap = atr * FVG_MIN_GAP_ATR_MULT;

    const prevHigh = f.prevPrevCandle.high;
    const prevLow = f.prevPrevCandle.low;
    const currLow = candle.low;
    const currHigh = candle.high;

    // Detect new FVGs (prevPrev = i-2, current = i)
    if (prevHigh < currLow && currLow - prevHigh >= minGap) {
      f.activeFvgs.push({
        direction: "bullish",
        top: currLow,
        bottom: prevHigh,
        creationBar: barIndex - 1,
        filled: false,
        tested: false,
        testedThisBar: false,
      });
    }
    if (prevLow > currHigh && prevLow - currHigh >= minGap) {
      f.activeFvgs.push({
        direction: "bearish",
        top: prevLow,
        bottom: currHigh,
        creationBar: barIndex - 1,
        filled: false,
        tested: false,
        testedThisBar: false,
      });
    }

    // Update existing FVGs
    for (const fvg of f.activeFvgs) {
      if (fvg.filled) continue;
      const age = barIndex - fvg.creationBar;
      // FVG must be at least 2 bars old to avoid same-bar (look-ahead) signal
      if (age < 2) continue;
      if (age > FVG_MAX_AGE_BARS) { fvg.filled = true; continue; }

      if (fvg.direction === "bullish") {
        if (candle.low <= fvg.top && candle.low >= fvg.bottom && !fvg.tested) {
          fvg.tested = true;
          fvg.testedThisBar = true;
        }
        if (candle.low < fvg.bottom) fvg.filled = true;
      } else {
        if (candle.high >= fvg.bottom && candle.high <= fvg.top && !fvg.tested) {
          fvg.tested = true;
          fvg.testedThisBar = true;
        }
        if (candle.high > fvg.top) fvg.filled = true;
      }
    }

    // GC filled
    for (let k = f.activeFvgs.length - 1; k >= 0; k--) {
      if (f.activeFvgs[k].filled) f.activeFvgs.splice(k, 1);
    }
  }

  // Shift candle history
  f.prevPrevCandle = f.prevCandle;
  f.prevCandle = candle;
}

// ─── FVG signal generation ──────────────────────────────────────────

function getStreamingFvgSignals(
  state: StrategyState,
  candle: Candle,
  barIndex: number,
): Signal[] {
  const signals: Signal[] = [];
  const f = state.fvg;

  let atr = candle.atr14;
  if (atr === undefined || !isFinite(atr)) atr = candle.high - candle.low;
  if (atr <= 0) return signals;

  // Only fire signal on the exact bar an FVG was first tested (testedThisBar flag)
  for (const fvg of f.activeFvgs) {
    if (fvg.filled || !fvg.testedThisBar) continue;
    const age = barIndex - fvg.creationBar;
    const gapSize = fvg.top - fvg.bottom;
    const gapAtr = atr > 0 ? gapSize / atr : 0.5;
    const gapModifier = Math.min(gapAtr * 0.15, 0.2);
    const freshnessModifier = Math.max(0.1 - age * 0.002, 0.0);
    const strength = Math.min(0.4 + gapModifier + freshnessModifier, 0.8);

    if (fvg.direction === "bullish") {
      signals.push({
        source: "fvg",
        type: "LONG",
        strength,
        entryPrice: candle.close,
        stopLoss: candle.low - 1.5 * atr,
        reason: "Bullish FVG retest — buying at imbalance zone",
        barIndex,
      });
    } else {
      signals.push({
        source: "fvg",
        type: "SHORT",
        strength,
        entryPrice: candle.close,
        stopLoss: candle.high + 1.5 * atr,
        reason: "Bearish FVG retest — selling at imbalance zone",
        barIndex,
      });
    }
    break; // Only one FVG signal per bar (matches batch: first tested wins)
  }

  return signals;
}

// ─── Result helper ──────────────────────────────────────────────────

function makeResult(events: StepEvent[], state: StrategyState): StepResult {
  const dd = state.peakEquity > 0
    ? ((state.equity - state.peakEquity) / state.peakEquity) * 100
    : 0;
  return { events, equity: state.equity, drawdownPct: Math.abs(dd) };
}
