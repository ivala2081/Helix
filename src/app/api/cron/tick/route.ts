// Cron worker: processes 1h candles for all active live portfolios.
// Scheduled via Vercel Cron at "0 * * * *" (every hour at :00).
// Protected by CRON_SECRET header validation.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stepCandle, type StrategyState } from "@/lib/engine/paper-engine";
import { V5_DEFAULTS } from "@/lib/engine/defaults";
import { FORWARD_TEST_INTERVAL_MS } from "@/lib/engine/live-config";
import type { Candle } from "@/lib/engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INTERVAL_MS = FORWARD_TEST_INTERVAL_MS;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // ── Production-only guard ──
  // Forward test runs on Vercel, not localhost. This prevents accidental
  // double-writes from a dev machine racing the production cron.
  // Override with ALLOW_LOCAL_CRON=1 for explicit manual testing.
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCAL_CRON !== "1") {
    return NextResponse.json(
      {
        error: "Cron disabled in non-production environments",
        hint: "Forward test runs on Vercel. Set ALLOW_LOCAL_CRON=1 to override.",
      },
      { status: 403 },
    );
  }

  // ── Auth ──
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  let totalCandlesProcessed = 0;
  let totalTradesClosed = 0;

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
        totalCandlesProcessed++;

        // Collect trade events
        for (const event of result.events) {
          if (event.type === "tradeClosed" && event.trade) {
            const t = event.trade;
            totalTradesClosed++;
            tradesToInsert.push({
              symbol,
              trade_id: t.id,
              direction: t.direction,
              entry_ts: t.entryTs ?? candle.timestamp,
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

  // ── Log cron run for health tracking ──
  const duration = Date.now() - startTime;
  const errors = results.filter((r) => r.error).map((r) => ({ symbol: r.symbol, message: r.error }));
  const status = errors.length === 0 ? "ok" : errors.length === results.length ? "error" : "partial";

  await db.from("live_cron_runs").insert({
    duration_ms: duration,
    portfolios_processed: portfolios.length,
    candles_processed: totalCandlesProcessed,
    trades_closed: totalTradesClosed,
    status,
    errors: errors.length > 0 ? errors : null,
  });

  return NextResponse.json({
    message: "Tick complete",
    results,
    duration_ms: duration,
    timestamp: new Date().toISOString(),
  });
}

// ── Fetch closed candles from Binance ───────────────────────────────
// Gets all closed candles since the portfolio's last processed timestamp.
// Handles gaps >1000 candles by paginating (Binance limit per request).

const MAX_PAGES = 10; // safety cap: 10 × 1000 = 10000 candles ≈ 416 days on 1h

async function fetchClosedCandles(
  symbol: string,
  portfolios: Record<string, unknown>[],
): Promise<Candle[]> {
  const relevantPortfolios = portfolios.filter((p) => p.symbol === symbol);
  const oldestTs = Math.min(
    ...relevantPortfolios.map((p) => Number(p.last_candle_ts)),
  );

  const now = Date.now();
  const currentHourStart = Math.floor(now / INTERVAL_MS) * INTERVAL_MS;
  const lastClosedOpen = currentHourStart - INTERVAL_MS;

  if (oldestTs >= lastClosedOpen) {
    return []; // Already up to date
  }

  const candles: Candle[] = [];
  let cursor = oldestTs + INTERVAL_MS;
  let page = 0;

  while (cursor < currentHourStart && page < MAX_PAGES) {
    const params = new URLSearchParams({
      symbol,
      interval: "1h",
      startTime: String(cursor),
      endTime: String(currentHourStart),
      limit: "1000",
    });

    const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      throw new Error(`Binance ${r.status}: ${await r.text().catch(() => "")}`);
    }

    const raw = (await r.json()) as unknown[][];
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const row of raw) {
      const openTime = Number(row[0]);
      if (openTime >= currentHourStart) continue; // skip open candle
      if (candles.length > 0 && openTime <= candles[candles.length - 1].timestamp) continue;
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

    const lastOpen = Number(raw[raw.length - 1][0]);
    cursor = lastOpen + INTERVAL_MS;
    page++;

    if (raw.length < 1000) break;

    // Rate limit safety
    await new Promise((res) => setTimeout(res, 200));
  }

  return candles;
}
