"use client";

import { Suspense, lazy } from "react";

// Lazy-load Spline runtime — it's ~2 MB and should NOT block first paint.
const Spline = lazy(() => import("@splinetool/react-spline"));

export function SplineScene({
  scene,
  className,
}: {
  scene: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Suspense fallback={<SplineSkeleton />}>
        <Spline scene={scene} />
      </Suspense>
    </div>
  );
}

function SplineSkeleton() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-emerald-500/10 via-zinc-800/20 to-blue-500/10" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs uppercase tracking-widest text-zinc-500">
        Loading scene…
      </div>
    </div>
  );
}
