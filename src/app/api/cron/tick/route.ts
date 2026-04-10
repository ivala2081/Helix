// Cron worker: processes 1h candles for all active live portfolios.
// Scheduled via Vercel Cron at "0 * * * *" (every hour at :00).
// Protected by CRON_SECRET header validation.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stepCandle, type StrategyState } from "@/lib/engine/paper-engine";
import { V5_DEFAULTS } from "@/lib/engine/defaults";
import type { Candle } from "@/lib/engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INTERVAL_MS = 3_600_000; // 1h

const COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"];

export async function GET(req: NextRequest) {
  // ── Auth ──
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  // ── Load active portfolios ──
  const { data: portfolios, error: fetchErr } = await db
    .from("live_portfolios")
    .select("*")
    .eq("status", "active");

  if (fetchErr || !portfolios) {
    return NextResponse.json(
      { error: "Failed to load portfolios", detail: fetchErr?.message },
      { status: 500 },
    );
  }

  if (portfolios.length === 0) {
    return NextResponse.json({ message: "No active portfolios", processed: 0 });
  }

  // ── Fetch latest candles per symbol ──
  const symbolSet = new Set(portfolios.map((p) => p.symbol as string));
  const candleMap = new Map<string, Candle[]>();

  for (const symbol of symbolSet) {
    try {
      const candles = await fetchClosedCandles(symbol, portfolios);
      candleMap.set(symbol, candles);
    } catch (err) {
      console.error(`Failed to fetch candles for ${symbol}:`, err);
    }
  }

  // ── Process each portfolio ──
  const results: { symbol: string; processed: number; error?: string }[] = [];

  for (const portfolio of portfolios) {
    const symbol = portfolio.symbol as string;
    const candles = candleMap.get(symbol);
    if (!candles || candles.length === 0) {
      results.push({ symbol, processed: 0, error: "No candles" });
      continue;
    }

    try {
      const state: StrategyState = portfolio.state as StrategyState;
      const lastTs = Number(portfolio.last_candle_ts);
      let processed = 0;

      // Filter to only new candles (idempotency)
      const newCandles = candles.filter((c) => c.timestamp > lastTs);
      if (newCandles.length === 0) {
        results.push({ symbol, processed: 0 });
        continue;
      }

      const tradesToInsert: Record<string, unknown>[] = [];
      const snapshotsToInsert: Record<string, unknown>[] = [];

      for (const candle of newCandles) {
        const result = stepCandle(state, candle, V5_DEFAULTS);
        processed++;

        // Collect trade events
        for (const event of result.events) {
          if (event.type === "tradeClosed" && event.trade) {
            const t = event.trade;
            tradesToInsert.push({
              symbol,
              trade_id: t.id,
              direction: t.direction,
              entry_ts: t.entryBar, // we'll use candle timestamps instead
              entry_price: t.entryPrice,
              exit_ts: candle.timestamp,
              exit_price: t.exitPrice,
              size: t.size,
              pnl: t.pnl,
              pnl_pct: t.pnlPct,
              exit_reason: t.exitReason,
              commission: t.totalCommission,
            });
          }
        }

        // Equity snapshot every candle (1h = 1 snapshot/hour)
        snapshotsToInsert.push({
          symbol,
          ts: candle.timestamp,
          bar_index: state.barIndex - 1, // barIndex was incremented in stepCandle
          equity: result.equity,
          drawdown_pct: result.drawdownPct,
        });
      }

      // ── Persist ──
      const lastCandle = newCandles[newCandles.length - 1];

      // Update portfolio state
      const { error: updateErr } = await db
        .from("live_portfolios")
        .update({
          state: state as unknown as Record<string, unknown>,
          equity: state.equity,
          realized_pnl: state.realizedPnl,
          open_trade: state.openTrade as unknown as Record<string, unknown> | null,
          last_candle_ts: lastCandle.timestamp,
          bar_index: state.barIndex,
          warmup_complete: state.warmupComplete,
          updated_at: new Date().toISOString(),
        })
        .eq("symbol", symbol);

      if (updateErr) {
        results.push({ symbol, processed, error: updateErr.message });
        continue;
      }

      // Insert trades
      if (tradesToInsert.length > 0) {
        const { error: tradeErr } = await db
          .from("live_trades")
          .insert(tradesToInsert);
        if (tradeErr) console.error(`Trade insert error for ${symbol}:`, tradeErr);
      }

      // Insert equity snapshots
      if (snapshotsToInsert.length > 0) {
        const { error: snapErr } = await db
          .from("live_equity_snapshots")
          .insert(snapshotsToInsert);
        if (snapErr) console.error(`Snapshot insert error for ${symbol}:`, snapErr);
      }

      results.push({ symbol, processed });
    } catch (err) {
      results.push({
        symbol,
        processed: 0,
        error: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    message: "Tick complete",
    results,
    timestamp: new Date().toISOString(),
  });
}

// ── Fetch closed candles from Binance ───────────────────────────────
// Gets the most recent closed 1h candle(s). Also handles gap recovery
// by fetching multiple candles if the portfolio is behind.

async function fetchClosedCandles(
  symbol: string,
  portfolios: Record<string, unknown>[],
): Promise<Candle[]> {
  // Find the oldest last_candle_ts for this symbol (for gap recovery)
  const relevantPortfolios = portfolios.filter((p) => p.symbol === symbol);
  const oldestTs = Math.min(
    ...relevantPortfolios.map((p) => Number(p.last_candle_ts)),
  );

  // How many candles behind are we?
  const now = Date.now();
  // The most recently CLOSED candle ends at the start of the current hour
  const currentHourStart = Math.floor(now / INTERVAL_MS) * INTERVAL_MS;
  // The last closed candle opened 1h before currentHourStart
  const lastClosedOpen = currentHourStart - INTERVAL_MS;

  if (oldestTs >= lastClosedOpen) {
    return []; // Already up to date
  }

  // Fetch from Binance (max 1000 candles)
  const startTime = oldestTs + INTERVAL_MS; // next candle after last processed
  const params = new URLSearchParams({
    symbol,
    interval: "1h",
    startTime: String(startTime),
    endTime: String(currentHourStart), // up to (not including) current open candle
    limit: "1000",
  });

  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });

  if (!r.ok) {
    throw new Error(`Binance ${r.status}: ${await r.text().catch(() => "")}`);
  }

  const raw = (await r.json()) as unknown[][];
  const candles: Candle[] = [];

  for (const row of raw) {
    const openTime = Number(row[0]);
    // Only include closed candles (openTime < currentHourStart)
    if (openTime >= currentHourStart) continue;
    candles.push({
      timestamp: openTime,
      date: new Date(openTime).toISOString(),
      open: parseFloat(row[1] as string),
      high: parseFloat(row[2] as string),
      low: parseFloat(row[3] as string),
      close: parseFloat(row[4] as string),
      volume: parseFloat(row[5] as string),
    });
  }

  return candles;
}
