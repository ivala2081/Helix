// Warmup script: initializes all 5 live portfolios by feeding 150 historical
// candles through stepCandle(). Run once before enabling the cron.
//
// Usage: npx tsx scripts/warmup.ts
//
// Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { createInitialState, stepCandle } from "../src/lib/engine/paper-engine";
import { V5_DEFAULTS } from "../src/lib/engine/defaults";
import {
  FORWARD_TEST_COINS,
  FORWARD_TEST_INITIAL_CAPITAL,
  FORWARD_TEST_WARMUP_CANDLES,
} from "../src/lib/engine/live-config";
import type { Candle } from "../src/lib/engine/types";

const COINS = FORWARD_TEST_COINS;
const WARMUP_CANDLES = FORWARD_TEST_WARMUP_CANDLES;
const INITIAL_CAPITAL = FORWARD_TEST_INITIAL_CAPITAL;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const symbol of COINS) {
    console.log(`\n── Warming up ${symbol} ──`);

    // Fetch last 150 closed 1h candles from Binance
    const candles = await fetchCandles(symbol, WARMUP_CANDLES);
    console.log(`  Fetched ${candles.length} candles`);

    if (candles.length < 50) {
      console.error(`  ERROR: Only ${candles.length} candles — need at least 50 for warmup`);
      continue;
    }

    // Run stepCandle on all warmup candles
    const state = createInitialState(INITIAL_CAPITAL);
    for (const candle of candles) {
      stepCandle(state, candle, V5_DEFAULTS);
    }

    const lastCandle = candles[candles.length - 1];
    console.log(`  State after warmup:`);
    console.log(`    barIndex: ${state.barIndex}`);
    console.log(`    warmupComplete: ${state.warmupComplete}`);
    console.log(`    equity: ${state.equity.toFixed(2)}`);
    console.log(`    realizedPnl: ${state.realizedPnl.toFixed(2)}`);
    console.log(`    ATR: ${state.atr.currentAtr?.toFixed(2) ?? "undefined"}`);
    console.log(`    openTrade: ${state.openTrade ? `${state.openTrade.direction} @ ${state.openTrade.entryPrice.toFixed(2)}` : "none"}`);
    console.log(`    lastCandleTs: ${lastCandle.timestamp} (${lastCandle.date})`);

    // Upsert into live_portfolios
    const { error: upsertErr } = await db
      .from("live_portfolios")
      .upsert({
        symbol,
        interval: "1h",
        status: "active",
        initial_capital: INITIAL_CAPITAL,
        equity: state.equity,
        realized_pnl: state.realizedPnl,
        open_trade: state.openTrade as unknown as Record<string, unknown> | null,
        state: state as unknown as Record<string, unknown>,
        last_candle_ts: lastCandle.timestamp,
        bar_index: state.barIndex,
        warmup_complete: state.warmupComplete,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "symbol" });

    if (upsertErr) {
      console.error(`  ERROR upserting ${symbol}:`, upsertErr.message);
      continue;
    }

    // Insert initial equity snapshot
    const { error: snapErr } = await db
      .from("live_equity_snapshots")
      .insert({
        symbol,
        ts: lastCandle.timestamp,
        bar_index: state.barIndex,
        equity: state.equity,
        drawdown_pct: state.peakEquity > 0
          ? Math.abs(((state.equity - state.peakEquity) / state.peakEquity) * 100)
          : 0,
      });

    if (snapErr) {
      console.error(`  WARNING: equity snapshot insert failed:`, snapErr.message);
    }

    console.log(`  ✓ ${symbol} warmed up and persisted`);
  }

  console.log("\n── Warmup complete ──");
}

async function fetchCandles(symbol: string, count: number): Promise<Candle[]> {
  const intervalMs = 3_600_000;
  const now = Date.now();
  const currentHourStart = Math.floor(now / intervalMs) * intervalMs;
  const startTime = currentHourStart - count * intervalMs;

  const params = new URLSearchParams({
    symbol,
    interval: "1h",
    startTime: String(startTime),
    endTime: String(currentHourStart),
    limit: String(count),
  });

  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });

  if (!r.ok) {
    throw new Error(`Binance ${r.status}: ${await r.text().catch(() => "")}`);
  }

  const raw = (await r.json()) as unknown[][];
  return raw
    .filter((row) => Number(row[0]) < currentHourStart) // only closed candles
    .map((row) => ({
      timestamp: Number(row[0]),
      date: new Date(Number(row[0])).toISOString(),
      open: parseFloat(row[1] as string),
      high: parseFloat(row[2] as string),
      low: parseFloat(row[3] as string),
      close: parseFloat(row[4] as string),
      volume: parseFloat(row[5] as string),
    }));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
