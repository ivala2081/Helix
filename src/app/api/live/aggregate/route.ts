// Portfolio-level aggregate analytics endpoint.
// Computes ranking, allocation, risk metrics, and drawdown series
// from existing live_portfolios, live_trades, and live_equity_snapshots tables.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface TradeAgg {
  symbol: string;
  trade_count: number;
  win_count: number;
}

export async function GET() {
  const db = createClient(url, anonKey);

  const [portfoliosRes, snapshotsRes, tradesRes] = await Promise.all([
    db
      .from("live_portfolios")
      .select(
        "symbol, initial_capital, equity, realized_pnl, open_trade, warmup_complete",
      )
      .eq("status", "active")
      .order("symbol"),
    db
      .from("live_equity_snapshots")
      .select("symbol, ts, equity, drawdown_pct")
      .order("ts", { ascending: true })
      .limit(10000),
    db.from("live_trades").select("symbol, pnl"),
  ]);

  if (portfoliosRes.error) {
    return NextResponse.json(
      { error: "Failed to load portfolios", detail: portfoliosRes.error.message },
      { status: 500 },
    );
  }

  const portfolios = portfoliosRes.data ?? [];
  const snapshots = snapshotsRes.data ?? [];
  const allTrades = tradesRes.data ?? [];

  // ── Per-symbol trade aggregation ──
  const tradeAggs = new Map<string, TradeAgg>();
  for (const t of allTrades) {
    let agg = tradeAggs.get(t.symbol);
    if (!agg) {
      agg = { symbol: t.symbol, trade_count: 0, win_count: 0 };
      tradeAggs.set(t.symbol, agg);
    }
    agg.trade_count++;
    if (t.pnl > 0) agg.win_count++;
  }

  // ── Per-symbol max drawdown from snapshots ──
  const symbolMaxDD = new Map<string, number>();
  const symbolLatestDD = new Map<string, number>();
  for (const s of snapshots) {
    const dd = Math.abs(s.drawdown_pct ?? 0);
    const prev = symbolMaxDD.get(s.symbol) ?? 0;
    if (dd > prev) symbolMaxDD.set(s.symbol, dd);
    symbolLatestDD.set(s.symbol, dd);
  }

  // ── Ranking ──
  const totalEquity = portfolios.reduce((s, p) => s + p.equity, 0);

  const ranking = portfolios
    .map((p) => {
      const returnPct =
        p.initial_capital > 0
          ? ((p.equity - p.initial_capital) / p.initial_capital) * 100
          : 0;
      const agg = tradeAggs.get(p.symbol);
      return {
        symbol: p.symbol,
        equity: p.equity,
        initialCapital: p.initial_capital,
        returnPct,
        realizedPnl: p.realized_pnl,
        unrealizedPnl: p.equity - p.initial_capital - p.realized_pnl,
        tradeCount: agg?.trade_count ?? 0,
        winRate:
          agg && agg.trade_count > 0
            ? agg.win_count / agg.trade_count
            : null,
        maxDrawdownPct: symbolMaxDD.get(p.symbol) ?? 0,
        currentDrawdownPct: symbolLatestDD.get(p.symbol) ?? 0,
        hasOpenTrade: p.open_trade !== null,
        rank: 0,
      };
    })
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((item, i) => ({ ...item, rank: i + 1 }));

  // ── Allocation ──
  const allocation = portfolios.map((p) => ({
    symbol: p.symbol,
    equity: p.equity,
    pct: totalEquity > 0 ? (p.equity / totalEquity) * 100 : 0,
  }));

  // ── Combined equity series + drawdown + risk metrics ──
  const tsByTime = new Map<number, number>();
  for (const s of snapshots) {
    tsByTime.set(s.ts, (tsByTime.get(s.ts) ?? 0) + s.equity);
  }

  const combinedSeries = Array.from(tsByTime.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, equity]) => ({ ts, equity }));

  // Drawdown series from combined equity
  let peak = 0;
  const drawdownSeries: { ts: number; drawdownPct: number }[] = [];
  let maxCombinedDD = 0;
  let currentCombinedDD = 0;

  for (const point of combinedSeries) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0;
    drawdownSeries.push({ ts: point.ts, drawdownPct: dd });
    if (Math.abs(dd) > maxCombinedDD) maxCombinedDD = Math.abs(dd);
    currentCombinedDD = Math.abs(dd);
  }

  // Hourly returns for Sharpe/Sortino
  const returns: number[] = [];
  for (let i = 1; i < combinedSeries.length; i++) {
    const prev = combinedSeries[i - 1].equity;
    if (prev > 0) {
      returns.push((combinedSeries[i].equity - prev) / prev);
    }
  }

  let sharpeRatio: number | null = null;
  let sortinoRatio: number | null = null;
  let calmarRatio: number | null = null;

  if (returns.length >= 24) {
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance =
      returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    const annFactor = Math.sqrt(8760); // hours per year

    if (std > 0) {
      sharpeRatio = (mean / std) * annFactor;
    }

    const downsideVariance =
      returns.filter((r) => r < 0).reduce((s, r) => s + r ** 2, 0) /
      returns.length;
    const downsideStd = Math.sqrt(downsideVariance);

    if (downsideStd > 0) {
      sortinoRatio = (mean / downsideStd) * annFactor;
    }

    if (maxCombinedDD > 0) {
      const totalInitial = portfolios.reduce(
        (s, p) => s + p.initial_capital,
        0,
      );
      const totalReturnPct =
        totalInitial > 0
          ? ((totalEquity - totalInitial) / totalInitial) * 100
          : 0;
      // Annualize: assume data spans returns.length hours
      const hoursOfData = returns.length;
      const annualizedReturn = totalReturnPct * (8760 / hoursOfData);
      calmarRatio = annualizedReturn / maxCombinedDD;
    }
  }

  // ── Aggregate totals ──
  const totalInitial = portfolios.reduce((s, p) => s + p.initial_capital, 0);
  const totalRealizedPnl = portfolios.reduce((s, p) => s + p.realized_pnl, 0);
  const totalReturnPct =
    totalInitial > 0
      ? ((totalEquity - totalInitial) / totalInitial) * 100
      : 0;
  const totalTrades = allTrades.length;
  const totalWins = allTrades.filter((t) => t.pnl > 0).length;
  const totalLosses = allTrades.filter((t) => t.pnl <= 0).length;
  const overallWinRate = totalTrades > 0 ? totalWins / totalTrades : null;

  const winPnlSum = allTrades
    .filter((t) => t.pnl > 0)
    .reduce((s, t) => s + t.pnl, 0);
  const lossPnlSum = Math.abs(
    allTrades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0),
  );
  const overallProfitFactor =
    lossPnlSum > 0 ? winPnlSum / lossPnlSum : totalWins > 0 ? Infinity : null;

  return NextResponse.json(
    {
      ranking,
      allocation,
      aggregate: {
        totalEquity,
        totalInitial,
        totalReturnPct,
        totalRealizedPnl,
        totalUnrealizedPnl: totalEquity - totalInitial - totalRealizedPnl,
        totalTrades,
        overallWinRate,
        overallProfitFactor:
          overallProfitFactor === Infinity ? null : overallProfitFactor,
        portfolioMaxDrawdownPct: maxCombinedDD,
        portfolioCurrentDrawdownPct: currentCombinedDD,
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
      },
      drawdownSeries,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
