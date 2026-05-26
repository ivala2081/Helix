// Public read API for the V6.2 paper-test (see docs/v6-iteration-summary.md).
// Mirrors src/app/api/live/route.ts but reads from live_v6_2_* tables.
// V6.2 runs in parallel with V5 in the same cron tick. Paper-test only — no
// real capital. Used by /research/v6 to render the "live V6.2" section.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET() {
  const db = createClient(url, anonKey);

  const [portfoliosRes, tradesRes, tradeCountRes] = await Promise.all([
    db
      .from("live_v6_2_portfolios")
      .select(
        "symbol, interval, status, initial_capital, equity, realized_pnl, open_trade, last_candle_ts, bar_index, warmup_complete, started_at, updated_at",
      )
      .order("symbol"),
    db
      .from("live_v6_2_trades")
      .select("*")
      .order("exit_ts", { ascending: false })
      .limit(50),
    db
      .from("live_v6_2_trades")
      .select("*", { count: "exact", head: true }),
  ]);

  // Soft-fail if tables aren't migrated yet — the dashboard renders a
  // "paper-test not yet initialized" placeholder.
  if (portfoliosRes.error) {
    const msg = portfoliosRes.error.message ?? "";
    if (msg.includes("does not exist") || msg.includes("schema cache")) {
      return NextResponse.json(
        { initialized: false, reason: "V6.2 tables not migrated yet" },
        { status: 200, headers: { "Cache-Control": "public, s-maxage=15" } },
      );
    }
    return NextResponse.json(
      { error: "Failed to load V6.2 portfolios", detail: msg },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      initialized: true,
      portfolios: portfoliosRes.data ?? [],
      recentTrades: tradesRes.data ?? [],
      totalTradeCount: tradeCountRes.count ?? 0,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    },
  );
}
