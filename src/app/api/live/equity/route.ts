// Public endpoint for equity curve snapshots.
// Query param: ?symbol=BTCUSDT (optional, defaults to all 5).
//
// PostgREST has a server-side max_rows cap (default 1000) that overrides any
// .limit() passed via the JS client. With 5 symbols hitting the same table
// in a single query, the response truncates to 200 rows/symbol = ~8 days of
// hourly data, which is why the equity chart used to stop short.
//
// Fix: fan out one query per symbol in parallel and concatenate. Each per-
// symbol query gets its own 1000-row budget, giving ~41 days of hourly
// coverage per coin — enough for the launch evaluation window and beyond.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FORWARD_TEST_COINS } from "@/lib/engine/live-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const db = createClient(url, anonKey);
  const symbol = req.nextUrl.searchParams.get("symbol");

  const symbols = symbol ? [symbol] : [...FORWARD_TEST_COINS];

  const results = await Promise.all(
    symbols.map((s) =>
      db
        .from("live_equity_snapshots")
        .select("symbol, ts, bar_index, equity, drawdown_pct")
        .eq("symbol", s)
        .order("ts", { ascending: true })
        .limit(1000),
    ),
  );

  const failures = results.filter((r) => r.error);
  if (failures.length > 0) {
    return NextResponse.json(
      {
        error: "Failed to load equity data",
        detail: failures.map((f) => f.error!.message).join("; "),
      },
      { status: 500 },
    );
  }

  const snapshots = results.flatMap((r) => r.data ?? []);

  return NextResponse.json(
    { snapshots },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    },
  );
}
