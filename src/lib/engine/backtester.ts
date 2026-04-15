// Helix Backtester Engine — port of backtester.py:Backtester.run
//
// Critical parity rules (do not change without re-validating against Python):
//   1. equity_curve is appended at the START of every bar (before warmup check),
//      reflecting realized PnL up to and including the previous bar's actions.
//   2. Last equity entry is overwritten with the final realized equity after the loop.
//   3. SL suppression: during the first `minBarsBeforeSl` bars of a trade, the
//      regular SL is NOT checked — only the hard stop (15x ATR).
//   4. After SL suppression, normal SL is active (possibly moved to breakeven).
//   5. TPs are checked in order: TP1 → TP2 → TP3. TP3 only after TP2; TP2 only after TP1.
//   6. Each partial close charges proportional entry+exit commission.
//   7. Slippage is applied to entries and to SL/HardStop/EndOfData exits — NOT to TPs.
//   8. Trailing stop is OFF in V5 — skipped here.
//   9. Only one position open at a time. While open, no new signals are evaluated.

import { addAtr } from "./atr";
import { aggregate } from "./aggregator";
import { computeFvg, getFvgSignals } from "./fvg";
import { computeMarketStructure, getMarketStructureSignals } from "./market-structure";
import { computeMetrics } from "./metrics";
import { calculatePositionSize } from "./sizing";
import type {
  BacktestParams,
  BacktestResult,
  Candle,
  Direction,
  EquityPoint,
  ExitReason,
  ProgressCallback,
  Signal,
  Trade,
} from "./types";

const YIELD_EVERY_BARS = 1500;

interface OpenTradeState {
  trade: Trade;
}

export async function runBacktest(
  rawCandles: Candle[],
  params: BacktestParams,
  onProgress?: ProgressCallback,
  symbol = "BTCUSDT",
  interval = "1h",
): Promise<BacktestResult> {
  // Defensive copy so we don't mutate the cached candle array (atr14 will be set on these copies)
  const candles: Candle[] = rawCandles.map((c) => ({ ...c }));
  const n = candles.length;

  if (n === 0) {
    throw new Error("No candles provided to backtester.");
  }

  // ── Indicator preparation ──
  addAtr(candles, 14);
  onProgress?.(5, "Computing market structure…");
  const ms = params.useMarketStructure ? computeMarketStructure(candles) : null;
  await yieldToBrowser();
  onProgress?.(15, "Detecting fair value gaps…");
  const fvg = params.useFvg ? computeFvg(candles) : null;
  await yieldToBrowser();
  onProgress?.(25, "Running backtest…");

  // ── Trading loop state ──
  let realizedPnl = 0;
  const getEquity = () => params.initialCapital + realizedPnl;

  const trades: Trade[] = [];
  const equityCurveValues: number[] = new Array(n);
  let openTrade: Trade | null = null;
  let nextTradeId = 1;

  for (let i = 0; i < n; i++) {
    // (1) Append equity for this bar (mirrors Python: equity_curve.append at top)
    equityCurveValues[i] = getEquity();

    // (2) Warmup check
    if (i < params.warmupBars) continue;

    // (3) ATR sanity
    const atr = candles[i].atr14;
    if (atr === undefined || !isFinite(atr) || atr <= 0) continue;

    const bar = candles[i];

    // ── (A) MANAGE OPEN POSITION ──
    if (openTrade !== null) {
      const t = openTrade;
      const dir: Direction = t.direction;

      // Track MFE / MAE in $ (Python uses (price-entry)*remainingSize)
      if (dir === "LONG") {
        const unrealized = (bar.high - t.entryPrice) * t.remainingSize;
        const adverse = (t.entryPrice - bar.low) * t.remainingSize;
        if (unrealized > t.maxFavorable) t.maxFavorable = unrealized;
        if (adverse > t.maxAdverse) t.maxAdverse = adverse;
      } else {
        const unrealized = (t.entryPrice - bar.low) * t.remainingSize;
        const adverse = (bar.high - t.entryPrice) * t.remainingSize;
        if (unrealized > t.maxFavorable) t.maxFavorable = unrealized;
        if (adverse > t.maxAdverse) t.maxAdverse = adverse;
      }

      const barsInTrade = i - t.entryBar;
      let stoppedOut = false;
      let exitPrice = 0;
      let reason: ExitReason = "Stop Loss";

      if (barsInTrade >= params.minBarsBeforeSl) {
        // Normal SL active
        if (dir === "LONG" && bar.low <= t.stopLoss) {
          exitPrice = t.stopLoss;
          reason = "Stop Loss";
          stoppedOut = true;
        } else if (dir === "SHORT" && bar.high >= t.stopLoss) {
          exitPrice = t.stopLoss;
          reason = "Stop Loss";
          stoppedOut = true;
        }
      } else if (params.useHardStop && t.hardStop !== null) {
        // Suppression: only catastrophic protection
        if (dir === "LONG" && bar.low <= t.hardStop) {
          exitPrice = t.hardStop;
          reason = "Hard Stop";
          stoppedOut = true;
        } else if (dir === "SHORT" && bar.high >= t.hardStop) {
          exitPrice = t.hardStop;
          reason = "Hard Stop";
          stoppedOut = true;
        }
      }

      if (stoppedOut) {
        const realized = closeFull(t, i, exitPrice, reason, params, candles[i].date);
        realizedPnl += realized;
        trades.push(t);
        openTrade = null;
        continue;
      }

      // ── Take profits ──
      if (dir === "LONG") {
        // TP1
        if (!t.tp1Hit && bar.high >= t.takeProfit1) {
          const closeSize = t.size * params.tp1ClosePct;
          const sliceRealized = partialClose(t, t.takeProfit1, closeSize, params);
          realizedPnl += sliceRealized;
          t.remainingSize -= closeSize;
          t.tp1Hit = true;
          if (params.beAfterTp1) {
            t.stopLoss = t.entryPrice + params.beBufferAtr * atr;
          }
        }
        // TP2
        if (t.tp1Hit && !t.tp2Hit && bar.high >= t.takeProfit2) {
          const closeSize = t.size * params.tp2ClosePct;
          const sliceRealized = partialClose(t, t.takeProfit2, closeSize, params);
          realizedPnl += sliceRealized;
          t.remainingSize -= closeSize;
          t.tp2Hit = true;
        }
        // TP3 — full close
        if (t.tp2Hit && bar.high >= t.takeProfit3) {
          const realized = closeFull(t, i, t.takeProfit3, "TP3", params, candles[i].date);
          realizedPnl += realized;
          trades.push(t);
          openTrade = null;
          continue;
        }
      } else {
        // SHORT
        if (!t.tp1Hit && bar.low <= t.takeProfit1) {
          const closeSize = t.size * params.tp1ClosePct;
          const sliceRealized = partialClose(t, t.takeProfit1, closeSize, params);
          realizedPnl += sliceRealized;
          t.remainingSize -= closeSize;
          t.tp1Hit = true;
          if (params.beAfterTp1) {
            t.stopLoss = t.entryPrice - params.beBufferAtr * atr;
          }
        }
        if (t.tp1Hit && !t.tp2Hit && bar.low <= t.takeProfit2) {
          const closeSize = t.size * params.tp2ClosePct;
          const sliceRealized = partialClose(t, t.takeProfit2, closeSize, params);
          realizedPnl += sliceRealized;
          t.remainingSize -= closeSize;
          t.tp2Hit = true;
        }
        if (t.tp2Hit && bar.low <= t.takeProfit3) {
          const realized = closeFull(t, i, t.takeProfit3, "TP3", params, candles[i].date);
          realizedPnl += realized;
          trades.push(t);
          openTrade = null;
          continue;
        }
      }

      // Trailing stop disabled in V5 — no-op
      // Position still open: don't evaluate new signals
      continue;
    }

    // ── (B) GENERATE SIGNALS (no open position) ──
    const all: Signal[] = [];
    if (ms) {
      const s = getMarketStructureSignals(candles, ms, i);
      if (s.length) all.push(...s);
    }
    if (fvg) {
      const s = getFvgSignals(candles, fvg, i);
      if (s.length) all.push(...s);
    }
    if (all.length === 0) continue;

    const decision = aggregate(all, params);
    if (decision.action === "NONE") continue;
    if (decision.score < params.minSignalScore) continue;

    // ── (C) OPEN NEW TRADE ──
    // Signal at bar i close → fill at bar i+1 open (no look-ahead).
    // ATR snapshot is from signal bar i (variable `atr` above).
    if (i + 1 >= n) continue;
    const fillBar = candles[i + 1];
    let entryPrice = fillBar.open;
    const dir: Direction = decision.action as Direction;

    // Slippage on entry (adverse)
    if (params.slippagePct > 0) {
      const slip = (entryPrice * params.slippagePct) / 100;
      entryPrice += dir === "LONG" ? slip : -slip;
    }

    // Stop loss: tighter of signal SL and ATR-based SL
    const signalSl = decision.stopLoss;
    let stopLoss: number;
    if (dir === "LONG") {
      const atrSl = entryPrice - params.slAtrMult * atr;
      stopLoss = signalSl !== undefined ? Math.max(signalSl, atrSl) : atrSl;
    } else {
      const atrSl = entryPrice + params.slAtrMult * atr;
      stopLoss = signalSl !== undefined ? Math.min(signalSl, atrSl) : atrSl;
    }

    // TPs
    const tp1 =
      dir === "LONG"
        ? entryPrice + params.tp1AtrMult * atr
        : entryPrice - params.tp1AtrMult * atr;
    const tp2 =
      dir === "LONG"
        ? entryPrice + params.tp2AtrMult * atr
        : entryPrice - params.tp2AtrMult * atr;
    const tp3 =
      dir === "LONG"
        ? entryPrice + params.tp3AtrMult * atr
        : entryPrice - params.tp3AtrMult * atr;

    // Sizing
    const equity = getEquity();
    const sizing = calculatePositionSize(
      equity,
      entryPrice,
      stopLoss,
      dir,
      params.riskPct,
      params.maxPositionPct,
    );
    if (sizing.size <= 0) continue;

    // Hard stop
    let hardStop: number | null = null;
    if (params.useHardStop) {
      hardStop =
        dir === "LONG"
          ? entryPrice - params.hardStopAtrMult * atr
          : entryPrice + params.hardStopAtrMult * atr;
    }

    const trade: Trade = {
      id: nextTradeId++,
      direction: dir,
      entryBar: i + 1,
      entryDate: fillBar.date,
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
      signalScore: decision.score,
      signalReasons: decision.reasons,
      tp1Hit: false,
      tp2Hit: false,
      partialPnl: 0,
      entryCommission: 0,
      exitCommission: 0,
      totalCommission: 0,
      maxFavorable: 0,
      maxAdverse: 0,
    };
    openTrade = trade;

    // Yield to UI thread periodically
    if (i % YIELD_EVERY_BARS === 0) {
      onProgress?.(25 + ((i / n) * 70), "Running backtest…");
      await yieldToBrowser();
    }
  }

  // Close any open trade at last bar
  if (openTrade !== null) {
    const last = candles[n - 1];
    const realized = closeFull(
      openTrade,
      n - 1,
      last.close,
      "End of data",
      params,
      last.date,
    );
    realizedPnl += realized;
    trades.push(openTrade);
    openTrade = null;
  }

  // Final equity correction (last bar gets the realized total)
  equityCurveValues[n - 1] = getEquity();

  // Build EquityPoint array with drawdown %
  const equityCurve: EquityPoint[] = new Array(n);
  let runningMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const eq = equityCurveValues[i];
    if (eq > runningMax) runningMax = eq;
    const ddPct = runningMax > 0 ? ((eq - runningMax) / runningMax) * 100 : 0;
    equityCurve[i] = {
      timestamp: candles[i].timestamp,
      equity: eq,
      drawdownPct: ddPct,
    };
  }

  onProgress?.(95, "Computing metrics…");
  const metrics = computeMetrics(trades, equityCurve, candles, params);
  onProgress?.(100, "Done");

  return {
    trades,
    equityCurve,
    metrics,
    params,
    candles,
    symbol,
    interval,
  };
}

// ── Helpers (exported for paper-engine reuse) ──

export function partialClose(
  trade: Trade,
  exitPrice: number,
  closeSize: number,
  params: BacktestParams,
): number {
  // Partial close at TP — no slippage applied (TPs are limit orders)
  let pnl: number;
  if (trade.direction === "LONG") {
    pnl = (exitPrice - trade.entryPrice) * closeSize;
  } else {
    pnl = (trade.entryPrice - exitPrice) * closeSize;
  }
  const exitComm = (exitPrice * closeSize * params.commissionPct) / 100;
  const entryComm = (trade.entryPrice * closeSize * params.commissionPct) / 100;
  const totalComm = exitComm + entryComm;
  pnl -= totalComm;

  trade.entryCommission += entryComm;
  trade.exitCommission += exitComm;
  trade.totalCommission += totalComm;
  trade.partialPnl += pnl;
  return pnl;
}

export function closeFull(
  trade: Trade,
  barIdx: number,
  exitPrice: number,
  reason: ExitReason,
  params: BacktestParams,
  exitDate: string,
): number {
  // Apply slippage on stop / end-of-data exits (not TPs)
  let finalExit = exitPrice;
  if (
    params.slippagePct > 0 &&
    (reason === "Stop Loss" || reason === "Hard Stop" || reason === "End of data")
  ) {
    const slip = (finalExit * params.slippagePct) / 100;
    finalExit += trade.direction === "LONG" ? -slip : slip;
  }

  let finalPnl: number;
  if (trade.direction === "LONG") {
    finalPnl = (finalExit - trade.entryPrice) * trade.remainingSize;
  } else {
    finalPnl = (trade.entryPrice - finalExit) * trade.remainingSize;
  }
  const exitComm = (finalExit * trade.remainingSize * params.commissionPct) / 100;
  const entryComm = (trade.entryPrice * trade.remainingSize * params.commissionPct) / 100;
  finalPnl -= exitComm + entryComm;

  trade.entryCommission += entryComm;
  trade.exitCommission += exitComm;
  trade.totalCommission += exitComm + entryComm;

  const totalPnl = trade.partialPnl + finalPnl;
  trade.exitBar = barIdx;
  trade.exitPrice = finalExit;
  trade.exitDate = exitDate;
  trade.exitReason = reason;
  trade.pnl = totalPnl;
  trade.pnlPct = trade.riskAmount > 0 ? (totalPnl / trade.riskAmount) * 100 : 0;
  trade.rMultiple = trade.riskAmount > 0 ? totalPnl / trade.riskAmount : 0;
  trade.barsHeld = barIdx - trade.entryBar;
  return finalPnl;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
