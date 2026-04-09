// Export helpers — CSV, shareable URL, PNG (for backtest results page).

import type { BacktestParams, Trade } from "@/lib/engine/types";

export function tradesToCsv(trades: Trade[]): string {
  const headers = [
    "id",
    "direction",
    "entry_date",
    "entry_price",
    "exit_date",
    "exit_price",
    "size",
    "pnl",
    "pnl_pct",
    "r_multiple",
    "bars_held",
    "exit_reason",
    "signal_score",
    "stop_loss",
    "take_profit_1",
    "take_profit_2",
    "take_profit_3",
    "total_commission",
  ];
  const rows = trades.map((t) =>
    [
      t.id,
      t.direction,
      t.entryDate,
      t.entryPrice,
      t.exitDate ?? "",
      t.exitPrice ?? "",
      t.size,
      t.pnl ?? "",
      t.pnlPct ?? "",
      t.rMultiple ?? "",
      t.barsHeld ?? "",
      t.exitReason ?? "",
      t.signalScore,
      t.initialStopLoss,
      t.takeProfit1,
      t.takeProfit2,
      t.takeProfit3,
      t.totalCommission,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

function csvEscape(v: string | number): string {
  if (typeof v === "number") return String(v);
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ShareableConfig {
  symbol: string;
  interval: string;
  startDate: string;
  endDate: string;
}

export function paramsToQueryString(
  config: ShareableConfig,
  params: BacktestParams,
  defaults: BacktestParams,
): string {
  const sp = new URLSearchParams();
  sp.set("symbol", config.symbol);
  sp.set("interval", config.interval);
  sp.set("start", config.startDate);
  sp.set("end", config.endDate);
  // Only include params that diverge from defaults — keeps URLs short.
  for (const key of Object.keys(params) as (keyof BacktestParams)[]) {
    const cur = params[key];
    const def = defaults[key];
    if (cur !== def) {
      sp.set(`p_${key}`, String(cur));
    }
  }
  return sp.toString();
}

export function readShareableQueryString(
  search: URLSearchParams,
  defaults: BacktestParams,
): { config: ShareableConfig | null; params: BacktestParams } {
  const symbol = search.get("symbol");
  const interval = search.get("interval");
  const start = search.get("start");
  const end = search.get("end");
  let config: ShareableConfig | null = null;
  if (symbol && interval && start && end) {
    config = { symbol, interval, startDate: start, endDate: end };
  }
  const params: BacktestParams = { ...defaults };
  for (const [k, v] of search.entries()) {
    if (!k.startsWith("p_")) continue;
    const key = k.slice(2) as keyof BacktestParams;
    if (!(key in defaults)) continue;
    const defVal = defaults[key];
    if (typeof defVal === "boolean") {
      (params[key] as boolean) = v === "true";
    } else if (typeof defVal === "number") {
      (params[key] as number) = parseFloat(v);
    }
  }
  return { config, params };
}
