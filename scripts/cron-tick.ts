// CLI cron worker — runs the forward-test tick from a GitHub Actions runner
// instead of a Vercel serverless function.
//
// Why: Binance API blocks AWS IP ranges (HTTP 451), so all Vercel regions
// (iad1/fra1/sin1/hnd1) fail. GitHub-hosted runners run on Azure with
// different IPs that Binance currently allows.
//
// Usage: npx tsx scripts/cron-tick.ts
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { stepCandle, type StrategyState } from "../src/lib/engine/paper-engine";
import { V5_DEFAULTS } from "../src/lib/engine/defaults";
import { V6_2_DEFAULTS } from "../src/lib/engine/defaults_v6_2";
import { FORWARD_TEST_INTERVAL_MS } from "../src/lib/engine/live-config";
import type { BacktestParams, Candle } from "../src/lib/engine/types";
import {
  sendTelegramMessage,
  formatTradeOpened,
  formatTradeClosed,
  formatCronSummary,
} from "../src/lib/telegram";

// Live = backtest mode (2026-05-25). The strategy runs with V5_DEFAULTS,
// the exact same params used by the backtester. Allowed divergence sources
// are limited to: slippage (P2 model), spread (P3), gap/halt events, and
// multi-symbol concurrent execution noise. All other LIVE-only protections
// (risk_pct override, per-symbol allocation, kill-switch preflight) are
// suspended so live behavior mirrors backtest. Kill-switch code remains
// available in src/lib/engine/kill-switch.ts but is not invoked here.

const INTERVAL_MS = FORWARD_TEST_INTERVAL_MS;
const MAX_PAGES = 10;

interface EngineVariant {
  label: string;                 // "V5" / "V6.2" — for logs and Telegram
  portfoliosTable: string;       // live_portfolios | live_v6_2_portfolios
  tradesTable: string;           // live_trades | live_v6_2_trades
  snapshotsTable: string;        // live_equity_snapshots | live_v6_2_equity_snapshots
  params: BacktestParams;        // V5_DEFAULTS | V6_2_DEFAULTS
  sendTelegram: boolean;         // V5 sends, V6.2 paper-test stays silent to avoid noise
  extraUpdateFields?: Record<string, unknown>; // e.g. allocation_weight for V5
}

const V5_VARIANT: EngineVariant = {
  label: "V5",
  portfoliosTable: "live_portfolios",
  tradesTable: "live_trades",
  snapshotsTable: "live_equity_snapshots",
  params: V5_DEFAULTS,
  sendTelegram: true,
  extraUpdateFields: { allocation_weight: 0.20 },
};

const V6_2_VARIANT: EngineVariant = {
  label: "V6.2",
  portfoliosTable: "live_v6_2_portfolios",
  tradesTable: "live_v6_2_trades",
  snapshotsTable: "live_v6_2_equity_snapshots",
  params: V6_2_DEFAULTS,
  sendTelegram: false, // paper-test, keep Telegram quiet
};

async function main() {
  const startTime = Date.now();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load both engine variants' active portfolios. V6.2 is optional (paper-test
  // may not be initialized yet); fail soft if its table doesn't exist.
  const v5 = await loadPortfolios(db, V5_VARIANT);
  if (v5 === null) {
    console.error("V5 portfolios fetch failed — aborting");
    process.exit(1);
  }
  const v62 = await loadPortfolios(db, V6_2_VARIANT);
  if (v62 === null) {
    console.warn("V6.2 portfolios table not available — running V5 only");
  }

  const allPortfolios = [...v5, ...(v62 ?? [])];
  if (allPortfolios.length === 0) {
    console.log("No active portfolios — nothing to do");
    return;
  }

  console.log(
    `Loaded ${v5.length} V5 + ${v62?.length ?? 0} V6.2 = ${allPortfolios.length} active portfolios`,
  );

  // Fetch candles once per symbol using the OLDEST last_candle_ts across
  // both variants (so neither falls behind on its own clock).
  const symbolSet = new Set(allPortfolios.map((p) => p.symbol as string));
  const candleMap = new Map<string, Candle[]>();
  const fetchErrors = new Map<string, string>();
  for (const symbol of symbolSet) {
    try {
      const candles = await fetchClosedCandles(symbol, allPortfolios);
      candleMap.set(symbol, candles);
      console.log(`  ${symbol}: fetched ${candles.length} candles`);
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`  ${symbol}: fetch failed —`, msg);
      fetchErrors.set(symbol, msg);
    }
  }

  // Run V5 then V6.2 in sequence. Each writes to its own table set.
  const v5Outcome = await runEngineVariant(
    db, V5_VARIANT, v5, candleMap, fetchErrors,
  );
  let totalCandlesProcessed = v5Outcome.candlesProcessed;
  let totalTradesClosed = v5Outcome.tradesClosed;
  const results: { symbol: string; processed: number; error?: string }[] =
    v5Outcome.results;

  if (v62 && v62.length > 0) {
    const v62Outcome = await runEngineVariant(
      db, V6_2_VARIANT, v62, candleMap, fetchErrors,
    );
    totalCandlesProcessed += v62Outcome.candlesProcessed;
    totalTradesClosed += v62Outcome.tradesClosed;
    // Tag V6.2 results so the summary distinguishes them
    for (const r of v62Outcome.results) {
      results.push({ ...r, symbol: `${r.symbol} [V6.2]` });
    }
  }

  const duration = Date.now() - startTime;
  const errors = results.filter((r) => r.error).map((r) => ({ symbol: r.symbol, message: r.error }));
  const status = errors.length === 0 ? "ok" : errors.length === results.length ? "error" : "partial";

  await db.from("live_cron_runs").insert({
    duration_ms: duration,
    portfolios_processed: allPortfolios.length,
    candles_processed: totalCandlesProcessed,
    trades_closed: totalTradesClosed,
    status,
    errors: errors.length > 0 ? errors : null,
  });

  const summaryMsg = formatCronSummary(results, duration, totalTradesClosed);
  if (summaryMsg) sendTelegramMessage(summaryMsg);

  console.log(`\nTick complete in ${duration}ms — status=${status}, candles=${totalCandlesProcessed}, trades=${totalTradesClosed}`);

  await new Promise((res) => setTimeout(res, 1500));

  if (status === "error") process.exit(1);
}

async function loadPortfolios(
  db: SupabaseClient,
  variant: EngineVariant,
): Promise<Record<string, unknown>[] | null> {
  const { data, error } = await db
    .from(variant.portfoliosTable)
    .select("*")
    .eq("status", "active");
  if (error) {
    // Treat missing table (V6.2 not migrated yet) as "no portfolios" — don't
    // crash the V5 path. Real DB errors still surface.
    const msg = error.message || "";
    if (msg.includes("does not exist") || msg.includes("schema cache")) {
      return null;
    }
    console.error(`Failed to load ${variant.label} portfolios:`, msg);
    return null;
  }
  return data ?? [];
}

interface VariantOutcome {
  candlesProcessed: number;
  tradesClosed: number;
  results: { symbol: string; processed: number; error?: string }[];
}

async function runEngineVariant(
  db: SupabaseClient,
  variant: EngineVariant,
  portfolios: Record<string, unknown>[],
  candleMap: Map<string, Candle[]>,
  fetchErrors: Map<string, string>,
): Promise<VariantOutcome> {
  const results: { symbol: string; processed: number; error?: string }[] = [];
  let candlesProcessed = 0;
  let tradesClosed = 0;

  for (const portfolio of portfolios) {
    const symbol = portfolio.symbol as string;
    if (fetchErrors.has(symbol)) {
      results.push({ symbol, processed: 0, error: `fetch: ${fetchErrors.get(symbol)}` });
      continue;
    }
    const candles = candleMap.get(symbol);
    if (!candles || candles.length === 0) {
      results.push({ symbol, processed: 0 });
      continue;
    }

    try {
      const state: StrategyState = portfolio.state as StrategyState;
      const lastTs = Number(portfolio.last_candle_ts);
      let processed = 0;

      const newCandles = candles.filter((c) => c.timestamp > lastTs);
      if (newCandles.length === 0) {
        results.push({ symbol, processed: 0 });
        continue;
      }

      const tradesToInsert: Record<string, unknown>[] = [];
      const snapshotsToInsert: Record<string, unknown>[] = [];

      for (const candle of newCandles) {
        const result = stepCandle(state, candle, variant.params);
        processed++;
        candlesProcessed++;

        for (const event of result.events) {
          if (event.type === "tradeOpened" && event.trade && variant.sendTelegram) {
            sendTelegramMessage(formatTradeOpened(symbol, event.trade));
          }
          if (event.type === "tradeClosed" && event.trade) {
            const t = event.trade;
            tradesClosed++;
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
              r_multiple: t.rMultiple,
              bars_held: t.barsHeld,
            });
            if (variant.sendTelegram) {
              sendTelegramMessage(
                formatTradeClosed(
                  symbol,
                  t,
                  state.equity,
                  portfolio.initial_capital as number,
                  tradesToInsert.filter((tr) => (tr.pnl as number) > 0).length,
                  tradesToInsert.filter((tr) => (tr.pnl as number) <= 0).length,
                ),
              );
            }
          }
        }

        snapshotsToInsert.push({
          symbol,
          ts: candle.timestamp,
          bar_index: state.barIndex - 1,
          equity: result.equity,
          drawdown_pct: result.drawdownPct,
        });
      }

      const lastCandle = newCandles[newCandles.length - 1];

      const updateFields: Record<string, unknown> = {
        state: state as unknown as Record<string, unknown>,
        equity: state.equity,
        realized_pnl: state.realizedPnl,
        open_trade: state.openTrade as unknown as Record<string, unknown> | null,
        last_candle_ts: lastCandle.timestamp,
        bar_index: state.barIndex,
        warmup_complete: state.warmupComplete,
        updated_at: new Date().toISOString(),
        ...(variant.extraUpdateFields ?? {}),
      };

      const { error: updateErr } = await db
        .from(variant.portfoliosTable)
        .update(updateFields)
        .eq("symbol", symbol);

      if (updateErr) {
        results.push({ symbol, processed, error: updateErr.message });
        continue;
      }

      if (tradesToInsert.length > 0) {
        const { error: tradeErr } = await db
          .from(variant.tradesTable)
          .insert(tradesToInsert);
        if (tradeErr) console.error(`${variant.label} trade insert error for ${symbol}:`, tradeErr);
      }

      if (snapshotsToInsert.length > 0) {
        const { error: snapErr } = await db
          .from(variant.snapshotsTable)
          .insert(snapshotsToInsert);
        if (snapErr) console.error(`${variant.label} snapshot insert error for ${symbol}:`, snapErr);
      }

      console.log(`  [${variant.label}] ${symbol}: processed ${processed} candles, ${tradesToInsert.length} trades closed`);
      results.push({ symbol, processed });
    } catch (err) {
      results.push({ symbol, processed: 0, error: (err as Error).message });
    }
  }

  return { candlesProcessed, tradesClosed, results };
}

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

  if (oldestTs >= lastClosedOpen) return [];

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

    // data-api.binance.vision is Binance's public market-data endpoint. It has
    // looser geo restrictions than api.binance.com, which blocks most AWS/Azure
    // IPs (including GitHub-hosted runners) with HTTP 451.
    const url = `https://data-api.binance.vision/api/v3/klines?${params.toString()}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      throw new Error(`Binance ${r.status}: ${await r.text().catch(() => "")}`);
    }

    const raw = (await r.json()) as unknown[][];
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const row of raw) {
      const openTime = Number(row[0]);
      if (openTime >= currentHourStart) continue;
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
    await new Promise((res) => setTimeout(res, 200));
  }

  return candles;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
