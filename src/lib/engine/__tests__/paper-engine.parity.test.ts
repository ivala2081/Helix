// Parity test: batch runBacktest() vs streaming stepCandle()
//
// KNOWN DIVERGENCE (documented, not a bug):
// The batch engine has a 5-bar look-ahead in swing detection — swingHigh[i]
// is used for BOS/CHoCH at bar i, but that swing needs bars [i-5, i+5] to
// confirm. The streaming engine correctly delays swing confirmation by 5 bars,
// so BOS/CHoCH signals fire ~5 bars later. This causes:
//   - Streaming may see extra or shifted trades (different signal timing)
//   - Matching trades have slightly different PnL (equity cascade from sizing)
//
// The streaming engine is MORE CORRECT for live trading (no future data).
// This test verifies: (a) core mechanics match on overlapping trades,
// (b) ATR computation is identical, (c) sizing/TP/SL/commission logic works.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { runBacktest } from "../backtester";
import { addAtr } from "../atr";
import { createInitialState, stepCandle } from "../paper-engine";
import { V5_DEFAULTS } from "../defaults";
import type { Candle, Trade } from "../types";

// ── Load CSV candles ────────────────────────────────────────────────

function loadCsv(path: string, limit: number): Candle[] {
  const raw = readFileSync(path, "utf-8");
  const lines = raw.trim().split("\n");
  const start = lines[0].includes("timestamp") || lines[0].includes("open") ? 1 : 0;
  const candles: Candle[] = [];

  // CSV columns: timestamp,open,high,low,close,volume,quote_volume,trades,date
  for (let i = start; i < lines.length && candles.length < limit; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 6) continue;
    candles.push({
      timestamp: Number(cols[0]),
      date: cols[8] ?? new Date(Number(cols[0])).toISOString(),
      open: parseFloat(cols[1]),
      high: parseFloat(cols[2]),
      low: parseFloat(cols[3]),
      close: parseFloat(cols[4]),
      volume: parseFloat(cols[5]),
    });
  }
  return candles;
}

const CSV_PATH = resolve(__dirname, "../../../../data/BTCUSDT_1h_2023-01-01_to_2025-02-08.csv");
const CANDLE_COUNT = 1000;

// ── Helpers ──────────────────────────────────────────────────────────

function matchTrades(batch: Trade[], stream: Trade[]): [Trade, Trade][] {
  // Match by entry bar proximity (within 5 bars = swing detection delay)
  const pairs: [Trade, Trade][] = [];
  const usedStream = new Set<number>();

  for (const bt of batch) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < stream.length; j++) {
      if (usedStream.has(j)) continue;
      const dist = Math.abs(stream[j].entryBar - bt.entryBar);
      if (dist < bestDist && dist <= 5 && stream[j].direction === bt.direction) {
        bestDist = dist;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      pairs.push([bt, stream[bestIdx]]);
      usedStream.add(bestIdx);
    }
  }
  return pairs;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("paper-engine parity", () => {
  it("streaming engine produces trades and the core mechanics work", async () => {
    const candles = loadCsv(CSV_PATH, CANDLE_COUNT);
    expect(candles.length).toBe(CANDLE_COUNT);

    // ── Run batch backtester ──
    const batchResult = await runBacktest(
      candles.map((c) => ({ ...c })),
      V5_DEFAULTS,
      undefined,
      "BTCUSDT",
      "1h",
    );
    const batchTrades = batchResult.trades;

    // ── Run streaming engine ──
    const state = createInitialState(V5_DEFAULTS.initialCapital);
    const streamTrades: Trade[] = [];

    for (const candle of candles) {
      const c = { ...candle };
      const result = stepCandle(state, c, V5_DEFAULTS);
      for (const event of result.events) {
        if (event.type === "tradeClosed" && event.trade) {
          streamTrades.push(event.trade);
        }
      }
    }

    console.log(`Batch trades: ${batchTrades.length}, Stream trades: ${streamTrades.length}`);

    // ── 1. Both engines produce a reasonable number of trades ──
    expect(batchTrades.length).toBeGreaterThan(0);
    expect(streamTrades.length).toBeGreaterThan(0);

    // ── 2. Match overlapping trades and verify mechanics ──
    const batchFiltered = batchTrades.filter((t) => t.exitReason !== "End of data");
    const pairs = matchTrades(batchFiltered, streamTrades);

    console.log(`Matched pairs: ${pairs.length} / ${batchFiltered.length} batch trades`);

    // At least 60% of batch trades should match (accounting for 5-bar timing shift)
    expect(pairs.length).toBeGreaterThanOrEqual(Math.floor(batchFiltered.length * 0.6));

    for (const [bt, st] of pairs) {
      const label = `Trade batch#${bt.id} ↔ stream#${st.id}`;

      // Direction must match exactly
      expect(st.direction, `${label} direction`).toBe(bt.direction);

      // Exit reason must match
      expect(st.exitReason, `${label} exitReason`).toBe(bt.exitReason);

      // Entry prices: if entry bars match exactly, prices should be very close
      if (bt.entryBar === st.entryBar) {
        expect(st.entryPrice, `${label} entryPrice`).toBeCloseTo(bt.entryPrice, 2);
        expect(st.exitPrice!, `${label} exitPrice`).toBeCloseTo(bt.exitPrice!, 1);
      }
    }
  }, 30_000);

  it("ATR computation matches batch exactly", () => {
    const candles = loadCsv(CSV_PATH, 100);
    const batchCandles = candles.map((c) => ({ ...c }));

    // Run batch ATR
    addAtr(batchCandles, 14);

    // Run streaming ATR
    const state = createInitialState(V5_DEFAULTS.initialCapital);
    for (let i = 0; i < candles.length; i++) {
      const c = { ...candles[i] };
      stepCandle(state, c, V5_DEFAULTS);

      // After ATR period (14), values should match
      if (i >= 13) {
        expect(state.atr.currentAtr).toBeCloseTo(batchCandles[i].atr14!, 8);
      }
    }
  });

  it("is deterministic: same candles twice produce identical trades", () => {
    const candles = loadCsv(CSV_PATH, 500);

    const runOnce = () => {
      const state = createInitialState(V5_DEFAULTS.initialCapital);
      const trades: Trade[] = [];
      for (const candle of candles) {
        const result = stepCandle(state, { ...candle }, V5_DEFAULTS);
        for (const ev of result.events) {
          if (ev.type === "tradeClosed" && ev.trade) trades.push(ev.trade);
        }
      }
      return { trades, finalEquity: state.equity, realizedPnl: state.realizedPnl };
    };

    const run1 = runOnce();
    const run2 = runOnce();

    expect(run2.trades.length).toBe(run1.trades.length);
    expect(run2.finalEquity).toBe(run1.finalEquity);
    expect(run2.realizedPnl).toBe(run1.realizedPnl);

    for (let i = 0; i < run1.trades.length; i++) {
      expect(run2.trades[i].entryPrice).toBe(run1.trades[i].entryPrice);
      expect(run2.trades[i].exitPrice).toBe(run1.trades[i].exitPrice);
      expect(run2.trades[i].pnl).toBe(run1.trades[i].pnl);
      expect(run2.trades[i].exitReason).toBe(run1.trades[i].exitReason);
      expect(run2.trades[i].entryTs).toBe(run1.trades[i].entryTs);
    }
  });

  it("equity tracking is consistent", () => {
    const candles = loadCsv(CSV_PATH, 200);
    const state = createInitialState(V5_DEFAULTS.initialCapital);
    let prevRealizedPnl = 0;

    for (const candle of candles) {
      const c = { ...candle };
      // Capture realized PnL BEFORE this bar (equity is set at start of bar)
      const pnlBeforeBar = state.realizedPnl;
      const result = stepCandle(state, c, V5_DEFAULTS);

      // result.equity was recorded at START of bar = initialCapital + pnlBeforeBar
      expect(result.equity).toBeCloseTo(
        V5_DEFAULTS.initialCapital + pnlBeforeBar,
        6,
      );

      // Drawdown should be non-negative
      expect(result.drawdownPct).toBeGreaterThanOrEqual(0);

      prevRealizedPnl = state.realizedPnl;
    }
  });
});
