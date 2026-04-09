// Client-side paginated fetcher for Binance klines via /api/klines proxy.
//
// Binance returns max 1000 candles per request. We paginate by setting
// startTime to the openTime of the last received candle + 1 ms, and stop
// when the response has fewer than 1000 candles or we pass endTime.

import type { Candle, ProgressCallback } from "../engine/types";

const INTERVAL_MS: Record<string, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "2h": 7_200_000,
  "4h": 14_400_000,
  "6h": 21_600_000,
  "8h": 28_800_000,
  "12h": 43_200_000,
  "1d": 86_400_000,
  "3d": 259_200_000,
  "1w": 604_800_000,
};

interface FetchOptions {
  symbol: string;
  interval: string;
  startMs: number;
  endMs: number;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

export async function fetchKlines({
  symbol,
  interval,
  startMs,
  endMs,
  onProgress,
  signal,
}: FetchOptions): Promise<Candle[]> {
  const intervalMs = INTERVAL_MS[interval];
  if (!intervalMs) throw new Error(`Unknown interval: ${interval}`);

  const estimatedTotal = Math.ceil((endMs - startMs) / intervalMs);
  const candles: Candle[] = [];
  let cursor = startMs;
  let safety = 100; // hard cap on requests (~100k candles)

  while (cursor < endMs && safety-- > 0) {
    if (signal?.aborted) throw new Error("Fetch aborted");

    const params = new URLSearchParams({
      symbol,
      interval,
      startTime: String(cursor),
      endTime: String(endMs),
      limit: "1000",
    });
    const r = await fetch(`/api/klines?${params.toString()}`, { signal });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${r.status}`);
    }
    const raw = (await r.json()) as unknown[][];
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const row of raw) {
      const openTime = Number(row[0]);
      // Avoid duplicates if Binance returns overlap
      if (candles.length > 0 && openTime <= candles[candles.length - 1].timestamp) {
        continue;
      }
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
    cursor = lastOpen + intervalMs; // advance one full interval

    onProgress?.(
      Math.min((candles.length / estimatedTotal) * 100, 99),
      `Fetching ${candles.length.toLocaleString()} / ~${estimatedTotal.toLocaleString()} candles…`,
    );

    if (raw.length < 1000) break;

    // Rate limit safety: 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  onProgress?.(100, `Fetched ${candles.length.toLocaleString()} candles`);
  return candles;
}
