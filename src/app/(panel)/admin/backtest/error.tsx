"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function BacktestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center sm:px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Backtest page crashed</h1>
      <p className="mt-3 text-sm text-[var(--color-muted)]">
        {error.message || "Something went wrong while rendering the backtest page."}
      </p>
      <Button variant="primary" size="md" className="mt-6" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        Reload backtest
      </Button>
    </div>
  );
}
