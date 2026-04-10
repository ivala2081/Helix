"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

interface EquitySnapshot {
  symbol: string;
  ts: number;
  bar_index: number;
  equity: number;
  drawdown_pct: number;
}

interface EquityResponse {
  snapshots: EquitySnapshot[];
}

const COIN_COLORS: Record<string, string> = {
  BTCUSDT: "#f59e0b", // amber
  ETHUSDT: "#60a5fa", // blue-400
  SOLUSDT: "#a78bfa", // violet-400
  XRPUSDT: "#34d399", // emerald-400
  BNBUSDT: "#fbbf24", // amber-300
};

export function LiveEquityChart({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [data, setData] = useState<EquitySnapshot[] | null>(null);

  // Fetch equity data
  useEffect(() => {
    async function fetchData() {
      try {
        const r = await fetch("/api/live/equity");
        if (!r.ok) return;
        const json: EquityResponse = await r.json();
        setData(json.snapshots);
      } catch {
        // silent fail
      }
    }
    fetchData();
    const iv = setInterval(fetchData, 60_000); // refresh every minute
    return () => clearInterval(iv);
  }, []);

  // Render chart
  useEffect(() => {
    if (!containerRef.current || !data) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "transparent" },
        textColor: "#a1a1aa",
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(63,63,70,0.3)" },
        horzLines: { color: "rgba(63,63,70,0.3)" },
      },
      timeScale: { borderColor: "#3f3f46", timeVisible: true },
      rightPriceScale: { borderColor: "#3f3f46" },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    // Group snapshots by symbol
    const bySymbol = new Map<string, EquitySnapshot[]>();
    for (const s of data) {
      if (!bySymbol.has(s.symbol)) bySymbol.set(s.symbol, []);
      bySymbol.get(s.symbol)!.push(s);
    }

    // Create a line series per coin
    for (const [symbol, snapshots] of bySymbol) {
      if (snapshots.length === 0) continue;
      const color = COIN_COLORS[symbol] ?? "#a1a1aa";
      const series: ISeriesApi<"Line"> = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: symbol.replace("USDT", ""),
      });

      // Sort by ts and dedupe (lightweight-charts requires strict ascending)
      const sorted = [...snapshots].sort((a, b) => a.ts - b.ts);
      const seen = new Set<number>();
      const points: { time: Time; value: number }[] = [];
      for (const s of sorted) {
        const t = Math.floor(s.ts / 1000);
        if (seen.has(t)) continue;
        seen.add(t);
        points.push({ time: t as Time, value: Number(s.equity) });
      }
      series.setData(points);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          {title}
        </h3>
        <div className="flex flex-wrap gap-3 text-[10px] text-[var(--color-muted)]">
          {Object.entries(COIN_COLORS).map(([symbol, color]) => (
            <span key={symbol} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-3"
                style={{ backgroundColor: color }}
              />
              {symbol.replace("USDT", "")}
            </span>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 320 }} />
      {!data && (
        <div className="flex h-64 items-center justify-center text-xs text-[var(--color-muted)]">
          Loading...
        </div>
      )}
    </div>
  );
}
