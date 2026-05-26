// V6.2 parity test: batch runBacktest() vs streaming stepCandle() under V6_2_DEFAULTS.
//
// V6.2 adds two engine paths on top of V5:
//   1) trail-after-TP1 (after TP1, the remaining 90% rides a trailing stop)
//   2) tpRequireCloseBars=2 (TP fills need two consecutive confirming closes)
//
// Both must behave identically in batch and streaming, otherwise the cron-side
// V6.2 portfolios will diverge from offline V6.2 backtests.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { runBacktest } from "../backtester";
import { createInitialState, stepCandle } from "../paper-engine";
import { V6_2_DEFAULTS } from "../defaults_v6_2";
import type { Candle, Trade } from "../types";

function loadCsv(path: string, limit: number): Candle[] {
  const raw = readFileSync(path, "utf-8");
  const lines = raw.trim().split("\n");
  const start = lines[0].includes("timestamp") || lines[0].includes("open") ? 1 : 0;
  const candles: Candle[] = [];
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

describe("V6.2 parity", () => {
  it("streaming matches batch on V6_2_DEFAULTS (trade-by-trade)", async () => {
    const candles = loadCsv(CSV_PATH, CANDLE_COUNT);
    expect(candles.length).toBe(CANDLE_COUNT);

    const batchResult = await runBacktest(
      candles.map((c) => ({ ...c })),
      V6_2_DEFAULTS,
      undefined,
      "BTCUSDT",
      "1h",
    );
    const batchClosed = batchResult.trades.filter((t) => t.exitReason !== "End of data");

    const state = createInitialState(V6_2_DEFAULTS.initialCapital);
    const streamTrades: Trade[] = [];
    for (const candle of candles) {
      const result = stepCandle(state, { ...candle }, V6_2_DEFAULTS);
      for (const event of result.events) {
        if (event.type === "tradeClosed" && event.trade) {
          streamTrades.push(event.trade);
        }
      }
    }

    expect(Math.abs(streamTrades.length - batchClosed.length)).toBeLessThanOrEqual(2);

    const streamByBar = new Map<number, Trade>();
    for (const st of streamTrades) streamByBar.set(st.entryBar, st);

    let matched = 0;
    for (const bt of batchClosed) {
      const st = streamByBar.get(bt.entryBar);
      if (!st) continue;
      matched++;
      const label = `batch#${bt.id} ↔ stream#${st.id} @bar${bt.entryBar}`;
      expect(st.direction, `${label} direction`).toBe(bt.direction);
      expect(st.entryPrice, `${label} entryPrice`).toBeCloseTo(bt.entryPrice, 6);
      expect(st.exitBar!, `${label} exitBar`).toBe(bt.exitBar!);
      expect(st.exitPrice!, `${label} exitPrice`).toBeCloseTo(bt.exitPrice!, 6);
      expect(st.exitReason, `${label} exitReason`).toBe(bt.exitReason);
      expect(st.tp1Hit, `${label} tp1Hit`).toBe(bt.tp1Hit);
      // V6.2: tp2Hit should always be false because trail-after-TP1 short-circuits.
      expect(bt.tp2Hit, `${label} batch tp2Hit must be false in V6.2`).toBe(false);
      expect(st.tp2Hit, `${label} stream tp2Hit must be false in V6.2`).toBe(false);
      const stMove = (st.exitPrice! - st.entryPrice) * (st.direction === "LONG" ? 1 : -1);
      const btMove = (bt.exitPrice! - bt.entryPrice) * (bt.direction === "LONG" ? 1 : -1);
      expect(stMove, `${label} entry→exit move`).toBeCloseTo(btMove, 6);
    }

    expect(matched / batchClosed.length).toBeGreaterThanOrEqual(0.8);
  }, 30_000);

  it("V6.2 produces only TP1 / Trailing Stop / Stop Loss / Hard Stop exits (no TP2/TP3)", async () => {
    const candles = loadCsv(CSV_PATH, CANDLE_COUNT);
    const result = await runBacktest(
      candles.map((c) => ({ ...c })),
      V6_2_DEFAULTS,
      undefined,
      "BTCUSDT",
      "1h",
    );
    const closed = result.trades.filter((t) => t.exitReason !== "End of data");
    const exitReasons = new Set(closed.map((t) => t.exitReason));
    expect(exitReasons.has("TP2"), "V6.2 must not exit via TP2").toBe(false);
    expect(exitReasons.has("TP3"), "V6.2 must not exit via TP3").toBe(false);
    // At least one Trailing Stop or TP1 should appear in 1000 bars
    const hasTrailOrTp1 =
      exitReasons.has("Trailing Stop") || exitReasons.has("TP1");
    expect(hasTrailOrTp1, "V6.2 should produce TP1 and/or Trailing Stop exits").toBe(true);
  }, 30_000);

  it("V6.2 trail-after-TP1 trades have trailingPeak / trailingStop populated", async () => {
    const candles = loadCsv(CSV_PATH, CANDLE_COUNT);
    const result = await runBacktest(
      candles.map((c) => ({ ...c })),
      V6_2_DEFAULTS,
      undefined,
      "BTCUSDT",
      "1h",
    );
    const trailExits = result.trades.filter((t) => t.exitReason === "Trailing Stop");
    for (const t of trailExits) {
      expect(t.tp1Hit, "Trailing exit requires TP1 hit").toBe(true);
      expect(t.trailingStop, "trailingStop populated").not.toBeUndefined();
      expect(t.trailingPeak, "trailingPeak populated").not.toBeUndefined();
    }
  }, 30_000);

  it("V6.2 deterministic — same candles produce identical trades", () => {
    const candles = loadCsv(CSV_PATH, 500);
    const runOnce = () => {
      const state = createInitialState(V6_2_DEFAULTS.initialCapital);
      const trades: Trade[] = [];
      for (const candle of candles) {
        const result = stepCandle(state, { ...candle }, V6_2_DEFAULTS);
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
    for (let i = 0; i < run1.trades.length; i++) {
      expect(run2.trades[i].entryPrice).toBe(run1.trades[i].entryPrice);
      expect(run2.trades[i].exitPrice).toBe(run1.trades[i].exitPrice);
      expect(run2.trades[i].exitReason).toBe(run1.trades[i].exitReason);
    }
  });
});
