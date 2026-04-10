// Public read API for the live paper trading dashboard.
// Returns all portfolio summaries + recent trades.
// No auth required — all data is public via RLS.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const db = createClient(url, anonKey);

  const [portfoliosRes, tradesRes] = await Promise.all([
    db
      .from("live_portfolios")
      .select("symbol, interval, status, initial_capital, equity, realized_pnl, open_trade, last_candle_ts, bar_index, warmup_complete, started_at, updated_at")
      .order("symbol"),
    db
      .from("live_trades")
      .select("*")
      .order("exit_ts", { ascending: false })
      .limit(50),
  ]);

  if (portfoliosRes.error) {
    return NextResponse.json(
      { error: "Failed to load portfolios", detail: portfoliosRes.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    portfolios: portfoliosRes.data ?? [],
    recentTrades: tradesRes.data ?? [],
    updatedAt: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
    },
  });
}
