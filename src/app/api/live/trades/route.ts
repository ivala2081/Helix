// Paginated trade endpoint with server-computed stats for the forward test dashboard.
// Public read via RLS (anon key).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SORT_WHITELIST = new Set([
  "exit_ts",
  "entry_ts",
  "symbol",
  "direction",
  "pnl",
  "pnl_pct",
  "r_multiple",
  "bars_held",
  "entry_price",
  "exit_price",
  "exit_reason",
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const symbol = sp.get("symbol") || undefined;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);
  const sortRaw = sp.get("sort") || "exit_ts";
  const sort = SORT_WHITELIST.has(sortRaw) ? sortRaw : "exit_ts";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";

  const db = createClient(url, anonKey);

  // Build paginated query
  let paged = db
    .from("live_trades")
    .select("*", { count: "exact" })
    .order(sort, { ascending: dir === "asc" })
    .range(offset, offset + limit - 1);

  // Build full query for stats (all matching trades)
  let full = db
    .from("live_trades")
    .select("pnl, exit_reason, r_multiple, bars_held");

  if (symbol) {
    paged = paged.eq("symbol", symbol);
    full = full.eq("symbol", symbol);
  }

  const [pagedRes, fullRes] = await Promise.all([paged, full]);

  if (pagedRes.error) {
    return NextResponse.json(
      { error: "Failed to load trades", detail: pagedRes.error.message },
      { status: 500 },
    );
  }

  // Compute stats from all matching trades
  const allTrades = fullRes.data ?? [];
  const total = pagedRes.count ?? 0;

  let winCount = 0;
  let lossCount = 0;
  let sumWin = 0;
  let sumLoss = 0;
  let totalPnl = 0;
  const exitReasons: Record<string, number> = {};

  for (const t of allTrades) {
    const pnl = t.pnl ?? 0;
    totalPnl += pnl;
    if (pnl > 0) {
      winCount++;
      sumWin += pnl;
    } else {
      lossCount++;
      sumLoss += Math.abs(pnl);
    }
    const reason = t.exit_reason ?? "Unknown";
    exitReasons[reason] = (exitReasons[reason] ?? 0) + 1;
  }

  const tradeCount = winCount + lossCount;
  const winRate = tradeCount > 0 ? winCount / tradeCount : 0;
  const avgWin = winCount > 0 ? sumWin / winCount : 0;
  const avgLoss = lossCount > 0 ? sumLoss / lossCount : 0;
  const profitFactor = sumLoss > 0 ? sumWin / sumLoss : null;
  const expectancy = tradeCount > 0
    ? winRate * avgWin - (1 - winRate) * avgLoss
    : 0;

  return NextResponse.json(
    {
      trades: pagedRes.data ?? [],
      total,
      stats: {
        winCount,
        lossCount,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        expectancy,
        totalPnl,
      },
      exitReasons,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    },
  );
}
