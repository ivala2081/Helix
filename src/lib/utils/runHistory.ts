// Lightweight run-history persistence in sessionStorage. Stores only metadata
// (no trade arrays) so we don't blow the 5MB sessionStorage limit.

import type { BacktestResult } from "@/lib/engine/types";

const KEY = "helix:run-history:v1";
const MAX_RUNS = 5;

export interface RunMeta {
  id: number;
  ts: number;
  symbol: string;
  interval: string;
  startDate: string;
  endDate: string;
  totalReturnPct: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  maxDrawdownPct: number;
}

function readAll(): RunMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function writeAll(runs: RunMeta[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    // quota exceeded — ignore
  }
}

export function loadRuns(): RunMeta[] {
  return readAll().sort((a, b) => b.ts - a.ts);
}

export function saveRun(result: BacktestResult): RunMeta {
  const meta: RunMeta = {
    id: Date.now(),
    ts: Date.now(),
    symbol: result.symbol,
    interval: result.interval,
    startDate: result.metrics.startDate.slice(0, 10),
    endDate: result.metrics.endDate.slice(0, 10),
    totalReturnPct: result.metrics.totalReturnPct,
    sharpeRatio: result.metrics.sharpeRatio,
    winRate: result.metrics.winRate,
    totalTrades: result.metrics.totalTrades,
    maxDrawdownPct: result.metrics.maxDrawdownPct,
  };
  const cur = readAll();
  cur.push(meta);
  // Cap to MAX_RUNS most recent
  cur.sort((a, b) => b.ts - a.ts);
  writeAll(cur.slice(0, MAX_RUNS));
  return meta;
}

export function clearRuns(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
