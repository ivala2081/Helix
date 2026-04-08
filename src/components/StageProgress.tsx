"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export type Stage = "fetch" | "indicators" | "backtest";

const STAGES: { id: Stage; label: string }[] = [
  { id: "fetch", label: "Fetch data" },
  { id: "indicators", label: "Indicators" },
  { id: "backtest", label: "Backtest" },
];

export function StageProgress({
  current,
  pct,
  message,
}: {
  current: Stage;
  pct: number; // 0-100 within the current stage
  message?: string;
}) {
  const currentIdx = STAGES.findIndex((s) => s.id === current);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((s, i) => {
          const isPast = i < currentIdx;
          const isActive = i === currentIdx;
          const fill = isPast ? 100 : isActive ? Math.min(Math.max(pct, 0), 100) : 0;
          return (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                <span
                  className={cn(
                    isPast || isActive ? "text-emerald-400" : "text-[var(--color-muted)]/60",
                  )}
                >
                  {s.label}
                </span>
                <span className="font-mono tabular-nums text-[var(--color-muted)]">
                  {isPast ? "100%" : isActive ? `${Math.round(fill)}%` : ""}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg)]">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isPast || isActive ? "bg-emerald-500" : "bg-transparent",
                  )}
                  initial={false}
                  animate={{ width: `${fill}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {message && (
        <div className="text-center text-xs text-[var(--color-muted)]">
          {message}
        </div>
      )}
    </div>
  );
}
