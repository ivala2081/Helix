"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { EquityPoint } from "@/lib/engine/types";
import { useResponsiveChartHeight } from "@/lib/hooks/useResponsiveChartHeight";

export function EquityCurve({
  equityCurve,
  buyHoldCurve,
  initialCapital,
}: {
  equityCurve: EquityPoint[];
  buyHoldCurve?: EquityPoint[];
  initialCapital: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const chartHeight = useResponsiveChartHeight({
    minH: 240,
    maxH: 400,
    ratio: 0.45,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 360,
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
      leftPriceScale: { borderColor: "#3f3f46", visible: true },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    // Sample to ~2000 points for performance on huge curves.
    // Always include the final point — but skip it if the stride loop already
    // landed on it, otherwise lightweight-charts asserts on duplicate timestamps.
    const sample = (curve: EquityPoint[]) => {
      const maxPoints = 2000;
      const stride = Math.max(1, Math.floor(curve.length / maxPoints));
      const data: { time: Time; value: number }[] = [];
      for (let i = 0; i < curve.length; i += stride) {
        const p = curve[i];
        data.push({
          time: Math.floor(p.timestamp / 1000) as Time,
          value: p.equity,
        });
      }
      if (curve.length > 0) {
        const last = curve[curve.length - 1];
        const lastTime = Math.floor(last.timestamp / 1000) as Time;
        if (data.length === 0 || data[data.length - 1].time !== lastTime) {
          data.push({ time: lastTime, value: last.equity });
        }
      }
      return data;
    };

    // ── Equity area (right scale) ──
    const equitySeries: ISeriesApi<"Area"> = chart.addSeries(AreaSeries, {
      lineColor: "#10b981",
      topColor: "rgba(16,185,129,0.45)",
      bottomColor: "rgba(16,185,129,0.02)",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
      priceScaleId: "right",
    });
    equitySeries.setData(sample(equityCurve));

    // Baseline marker
    equitySeries.createPriceLine({
      price: initialCapital,
      color: "#a1a1aa",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Start",
    });

    // ── Buy-and-hold line (right scale) ──
    if (buyHoldCurve && buyHoldCurve.length > 0) {
      const bhSeries = chart.addSeries(LineSeries, {
        color: "#71717a",
        lineWidth: 1,
        lineStyle: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        priceScaleId: "right",
      });
      bhSeries.setData(sample(buyHoldCurve));
    }

    // ── Drawdown area (left scale, inverted view) ──
    const ddData: { time: Time; value: number }[] = [];
    {
      let runningMax = -Infinity;
      const stride = Math.max(1, Math.floor(equityCurve.length / 2000));
      for (let i = 0; i < equityCurve.length; i += stride) {
        const p = equityCurve[i];
        if (p.equity > runningMax) runningMax = p.equity;
        const dd = runningMax > 0 ? ((p.equity - runningMax) / runningMax) * 100 : 0;
        ddData.push({ time: Math.floor(p.timestamp / 1000) as Time, value: dd });
      }
    }
    const ddSeries = chart.addSeries(AreaSeries, {
      lineColor: "rgba(239,68,68,0.7)",
      topColor: "rgba(239,68,68,0.0)",
      bottomColor: "rgba(239,68,68,0.35)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      priceScaleId: "left",
    });
    ddSeries.setData(ddData);
    chart
      .priceScale("left")
      .applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [equityCurve, buyHoldCurve, initialCapital]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Equity Curve
        </h3>
        <div className="flex flex-wrap gap-3 text-[10px] text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
            Strategy
          </span>
          {buyHoldCurve && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 bg-zinc-500" />
              Buy &amp; Hold
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-red-500/50" />
            Drawdown
          </span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: chartHeight }}
      />
    </div>
  );
}
