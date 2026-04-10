// Public endpoint for equity curve snapshots.
// Query param: ?symbol=BTCUSDT (optional, defaults to all)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const db = createClient(url, anonKey);
  const symbol = req.nextUrl.searchParams.get("symbol");

  let query = db
    .from("live_equity_snapshots")
    .select("symbol, ts, bar_index, equity, drawdown_pct")
    .order("ts", { ascending: true });

  if (symbol) {
    query = query.eq("symbol", symbol);
  }

  // Limit to last 2000 snapshots per symbol (~83 days of hourly data)
  query = query.limit(10000);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load equity data", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ snapshots: data ?? [] }, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
