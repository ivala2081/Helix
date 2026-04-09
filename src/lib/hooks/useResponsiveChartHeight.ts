import { useEffect, useState } from "react";

/**
 * Returns a chart height that adapts to viewport width.
 * Formula: clamp(minH, ratio * vw, maxH).
 *
 * Width is already handled by lightweight-charts ResizeObservers; height
 * is the gap. This hook listens to `window.resize` (cheap, fires far less
 * often than ResizeObserver on the chart container).
 */
export function useResponsiveChartHeight({
  minH = 240,
  maxH = 420,
  ratio = 0.55,
}: { minH?: number; maxH?: number; ratio?: number } = {}) {
  const [h, setH] = useState(maxH);

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      setH(Math.round(Math.min(maxH, Math.max(minH, vw * ratio))));
    };
    compute();
    window.addEventListener("resize", compute, { passive: true });
    return () => window.removeEventListener("resize", compute);
  }, [minH, maxH, ratio]);

  return h;
}
