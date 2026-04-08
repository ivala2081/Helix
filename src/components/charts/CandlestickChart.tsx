"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { Candle, Trade } from "@/lib/engine/types";

export function CandlestickChart({
  candles,
  trades,
  symbol,
  focusedTradeId,
}: {
  candles: Candle[];
  trades: Trade[];
  symbol: string;
  /** When set, the chart highlights this trade and pans to it. */
  focusedTradeId?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<SeriesMarker<Time>[]>([]);
  // Structural type — `createSeriesMarkers` returns a richer API but we only use setMarkers
  const markersApiRef = useRef<{
    setMarkers: (markers: SeriesMarker<Time>[]) => void;
  } | null>(null);

  // Sample candles to keep chart performant on long ranges (memoized)
  const sampledData = useMemo(() => {
    const maxBars = 5000;
    const stride = Math.max(1, Math.floor(candles.length / maxBars));
    const data = [];
    for (let i = 0; i < candles.length; i += stride) {
      const c = candles[i];
      data.push({
        time: Math.floor(c.timestamp / 1000) as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
    }
    return data;
  }, [candles]);

  // Build base markers (memoized)
  const baseMarkers = useMemo(() => {
    const list: SeriesMarker<Time>[] = [];
    for (const t of trades) {
      list.push({
        time: Math.floor(new Date(t.entryDate).getTime() / 1000) as Time,
        position: t.direction === "LONG" ? "belowBar" : "aboveBar",
        color: t.direction === "LONG" ? "#10b981" : "#ef4444",
        shape: t.direction === "LONG" ? "arrowUp" : "arrowDown",
        text: t.direction === "LONG" ? "L" : "S",
      });
      if (t.exitDate) {
        const isWin = (t.pnl ?? 0) > 0;
        list.push({
          time: Math.floor(new Date(t.exitDate).getTime() / 1000) as Time,
          position: t.direction === "LONG" ? "aboveBar" : "belowBar",
          color: isWin ? "#10b981" : "#ef4444",
          shape: "circle",
          text: isWin ? "+" : "−",
        });
      }
    }
    list.sort((a, b) => Number(a.time) - Number(b.time));
    return list;
  }, [trades]);

  // Initial chart construction (depends only on candles+trades)
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 420,
      layout: {
        background: { color: "transparent" },
        textColor: "#a1a1aa",
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(63,63,70,0.3)" },
        horzLines: { color: "rgba(63,63,70,0.3)" },
      },
      timeScale: { borderColor: "#3f3f46", timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: "#3f3f46" },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const series: ISeriesApi<"Candlestick"> = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    seriesRef.current = series;
    series.setData(sampledData);

    markersRef.current = baseMarkers.slice();
    markersApiRef.current = createSeriesMarkers(
      series,
      markersRef.current,
    ) as { setMarkers: (markers: SeriesMarker<Time>[]) => void };

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersApiRef.current = null;
    };
  }, [sampledData, baseMarkers, candles.length]);

  // React to focused trade changes — highlight + pan
  useEffect(() => {
    const chart = chartRef.current;
    const api = markersApiRef.current;
    if (!chart || !api) return;

    if (focusedTradeId == null) {
      api.setMarkers(baseMarkers);
      return;
    }
    const trade = trades.find((t) => t.id === focusedTradeId);
    if (!trade) {
      api.setMarkers(baseMarkers);
      return;
    }

    // Add a highlight marker on top
    const highlight: SeriesMarker<Time> = {
      time: Math.floor(new Date(trade.entryDate).getTime() / 1000) as Time,
      position: "inBar",
      color: "#fbbf24", // amber-400
      shape: "square",
      text: `#${trade.id}`,
    };
    api.setMarkers([...baseMarkers, highlight]);

    // Pan to the trade — use logical index by binary searching the time
    const targetTs = Math.floor(new Date(trade.entryDate).getTime() / 1000);
    const ts = chart.timeScale();
    const range = ts.getVisibleRange();
    if (range) {
      const center = (Number(range.from) + Number(range.to)) / 2;
      const delta = targetTs - center;
      // Only pan if it's significantly out of view
      if (Math.abs(delta) > (Number(range.to) - Number(range.from)) * 0.3) {
        const half = (Number(range.to) - Number(range.from)) / 2;
        ts.setVisibleRange({
          from: (targetTs - half) as Time,
          to: (targetTs + half) as Time,
        });
      }
    }
  }, [focusedTradeId, baseMarkers, trades]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Price · {symbol} · {trades.length} trades
        </h3>
        <div className="flex gap-3 text-[10px] text-[var(--color-muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Long
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Short
          </span>
          {focusedTradeId != null && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
              Trade #{focusedTradeId}
            </span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="h-[420px] w-full" />
    </div>
  );
}
