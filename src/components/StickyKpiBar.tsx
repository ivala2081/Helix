"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { fmtPct, fmtUsd } from "@/lib/utils/format";
import type { Metrics } from "@/lib/engine/types";

// Slim sticky bar that slides in from the top once the user scrolls past
// the main KPI grid. Disappears when the KPI grid is back in view.

export function StickyKpiBar({
  metrics,
  symbol,
  watchRef,
}: {
  metrics: Metrics;
  symbol: string;
  watchRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [visible, setVisible] = useState(false);
  const ranOnce = useRef(false);

  useEffect(() => {
    const el = watchRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Show when the KPI strip is OUT of view AND we've scrolled past it
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          setVisible(true);
          ranOnce.current = true;
        } else {
          setVisible(false);
        }
      },
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [watchRef]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-kpi"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-1/2 top-16 z-30 w-[min(96vw,900px)] -translate-x-1/2"
        >
          <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 px-3 py-2 shadow-2xl backdrop-blur-xl">
            <div className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {symbol}
            </div>
            <Cell label="Return" value={fmtPct(metrics.totalReturnPct)} tone={metrics.totalReturnPct >= 0 ? "positive" : "negative"} />
            <Cell label="Sharpe" value={metrics.sharpeRatio.toFixed(2)} />
            <Cell label="Max DD" value={fmtPct(-metrics.maxDrawdownPct)} tone="negative" />
            <Cell label="Win" value={(metrics.winRate * 100).toFixed(1) + "%"} />
            <Cell
              label="PF"
              value={isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : "∞"}
            />
            <Cell label="Trades" value={String(metrics.totalTrades)} />
            <Cell label="Net" value={fmtUsd(metrics.netProfit)} tone={metrics.netProfit >= 0 ? "positive" : "negative"} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col px-2">
      <div className="text-[9px] uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
      <div
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          !tone && "text-white",
        )}
      >
        {value}
      </div>
    </div>
  );
}
