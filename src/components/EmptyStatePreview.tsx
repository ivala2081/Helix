"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

// Faded skeleton-style preview shown on /backtest before any run.
// Sets the user's expectation for what the results will look like.

export function EmptyStatePreview() {
  const dict = useDictionary();
  const t = dict.backtest.emptyState;
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6 backdrop-blur-md">
      {/* Faded preview content */}
      <div className="space-y-4 opacity-25 pointer-events-none">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </div>
        {/* Equity chart placeholder */}
        <div className="h-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <svg viewBox="0 0 400 100" className="h-full w-full" preserveAspectRatio="none">
            <path
              d="M 0 80 Q 60 70, 100 60 T 200 35 T 300 20 T 400 10"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
            <path
              d="M 0 80 Q 60 70, 100 60 T 200 35 T 300 20 T 400 10 L 400 100 L 0 100 Z"
              fill="rgba(16,185,129,0.15)"
            />
          </svg>
        </div>
        {/* Candlestick placeholder */}
        <div className="h-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex h-full items-end gap-1">
            {Array.from({ length: 60 }).map((_, i) => {
              const isUp = (i * 17) % 3 !== 0;
              const h = 30 + ((i * 7) % 60);
              return (
                <div
                  key={i}
                  className={
                    "w-1 rounded-sm " + (isUp ? "bg-emerald-500" : "bg-red-500")
                  }
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        </div>
        {/* Trade table rows */}
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </div>
      </div>

      {/* Center overlay */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="rounded-xl border border-emerald-500/30 bg-[var(--color-bg)]/80 px-6 py-5 text-center shadow-2xl backdrop-blur-xl">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-semibold">{t.title}</h3>
          <p className="mt-1 max-w-xs text-xs text-[var(--color-muted)]">
            {t.body}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
