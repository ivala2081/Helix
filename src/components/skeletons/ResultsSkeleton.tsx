"use client";

// Shimmering skeleton placeholder shown while a backtest is running.
// Same shape as the actual results panel to prevent layout shift on swap.

export function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70"
          />
        ))}
      </div>
      {/* Equity curve */}
      <div className="h-[360px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70" />
      {/* Candlestick */}
      <div className="h-[460px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70" />
      {/* Two-up small panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[320px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70" />
        <div className="h-[320px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70" />
      </div>
      {/* Trade table */}
      <div className="h-[260px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70" />
    </div>
  );
}
