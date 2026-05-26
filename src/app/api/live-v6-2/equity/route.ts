// V6.2 paper-test equity snapshots endpoint.
// Mirror of /api/live/equity but reads from live_v6_2_equity_snapshots.
// Used by the /research/v6 Phase 5 equity-curve chart.

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
        .from("live_v6_2_equity_snapshots")
        .select("symbol, ts, bar_index, equity, drawdown_pct")
        .eq("symbol", s)
        .order("ts", { ascending: true })
        .limit(1000),
    ),
  );

  // Soft-fail if tables aren't migrated yet
  const failures = results.filter((r) => r.error);
  if (failures.length > 0) {
    const firstMsg = failures[0].error?.message ?? "";
    if (firstMsg.includes("does not exist") || firstMsg.includes("schema cache")) {
      return NextResponse.json({ initialized: false, snapshots: [] }, { status: 200 });
    }
    return NextResponse.json(
      {
        error: "Failed to load V6.2 equity data",
        detail: failures.map((f) => f.error!.message).join("; "),
      },
      { status: 500 },
    );
  }

  const snapshots = results.flatMap((r) => r.data ?? []);

  return NextResponse.json(
    { initialized: true, snapshots },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    },
  );
}
