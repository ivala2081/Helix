"use client";

import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";

export function Sparkline({
  points,
  tone = "positive",
  width = 120,
  height = 32,
  fill = true,
}: {
  points: readonly number[];
  tone?: "positive" | "negative" | "neutral";
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const { d, dFill } = useMemo(() => {
    if (points.length === 0) return { d: "", dFill: "" };
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of points) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const range = hi - lo || 1;
    const stepX = width / (points.length - 1 || 1);

    const coords: [number, number][] = points.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - lo) / range) * (height - 4) - 2;
      return [x, y];
    });

    const line = coords
      .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`))
      .join(" ");

    const fillPath = line + ` L ${width} ${height} L 0 ${height} Z`;

    return { d: line, dFill: fillPath };
  }, [points, width, height]);

  const stroke =
    tone === "positive" ? "#10b981" : tone === "negative" ? "#ef4444" : "#a1a1aa";
  const fillColor =
    tone === "positive"
      ? "rgba(16,185,129,0.18)"
      : tone === "negative"
        ? "rgba(239,68,68,0.18)"
        : "rgba(161,161,170,0.12)";

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      {fill && (
        <motion.path
          d={dFill}
          fill={fillColor}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />
      )}
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
