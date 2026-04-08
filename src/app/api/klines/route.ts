// Binance klines proxy — avoids browser CORS issues.
// Public endpoint, no API key required.

import { NextRequest, NextResponse } from "next/server";

const VALID_INTERVALS = new Set([
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w",
]);

const SYMBOL_RE = /^[A-Z0-9]{4,20}$/;

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const symbol = (sp.get("symbol") ?? "BTCUSDT").toUpperCase();
  const interval = sp.get("interval") ?? "1h";
  const startTime = sp.get("startTime");
  const endTime = sp.get("endTime");
  const limitRaw = sp.get("limit") ?? "1000";

  // ── Validation ──
  if (!SYMBOL_RE.test(symbol)) {
    return NextResponse.json(
      { error: "Invalid symbol. Use uppercase A-Z 0-9 (e.g., BTCUSDT)." },
      { status: 400 },
    );
  }
  if (!VALID_INTERVALS.has(interval)) {
    return NextResponse.json(
      { error: `Invalid interval. Allowed: ${[...VALID_INTERVALS].join(", ")}` },
      { status: 400 },
    );
  }
  const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 1000, 1), 1000);

  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(limit),
  });
  if (startTime) params.set("startTime", startTime);
  if (endTime) params.set("endTime", endTime);

  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;

  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: `Binance error ${r.status}: ${text.slice(0, 200)}` },
        { status: r.status },
      );
    }
    const data = await r.json();
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
