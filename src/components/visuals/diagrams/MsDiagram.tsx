"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Animated SVG illustration of swing points + BOS for Market Structure section.

export function MsDiagram() {
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  // Sample candle data shaped to show HL → HH → HL → HH → BOS pattern
  const candles = [
    { x: 20, o: 70, c: 60, h: 55, l: 75 },
    { x: 40, o: 60, c: 50, h: 45, l: 65 },
    { x: 60, o: 50, c: 65, h: 45, l: 70 },
    { x: 80, o: 65, c: 55, h: 50, l: 70 }, // HL
    { x: 100, o: 55, c: 40, h: 35, l: 60 }, // HH
    { x: 120, o: 40, c: 50, h: 30, l: 55 },
    { x: 140, o: 50, c: 65, h: 45, l: 70 },
    { x: 160, o: 65, c: 55, h: 50, l: 65 }, // HL
    { x: 180, o: 55, c: 35, h: 25, l: 60 }, // HH
    { x: 200, o: 35, c: 22, h: 18, l: 40 }, // BOS!
  ];

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 120"
      className="h-auto w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40"
    >
      <defs>
        <marker id="ms-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#10b981" />
        </marker>
      </defs>

      {/* Grid */}
      <g stroke="rgba(63,63,70,0.3)" strokeWidth="0.3">
        {[20, 40, 60, 80, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="240" y2={y} />
        ))}
      </g>

      {/* Candles */}
      {candles.map((c, i) => {
        const isUp = c.c < c.o; // visually, lower y = higher price
        const top = Math.min(c.o, c.c);
        const bot = Math.max(c.o, c.c);
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={inView ? { opacity: 1, scaleY: 1 } : {}}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            style={{ transformOrigin: `${c.x}px 60px` }}
          >
            <line
              x1={c.x}
              y1={c.h}
              x2={c.x}
              y2={c.l}
              stroke={isUp ? "#10b981" : "#ef4444"}
              strokeWidth="0.8"
            />
            <rect
              x={c.x - 3}
              y={top}
              width="6"
              height={Math.max(bot - top, 1)}
              fill={isUp ? "#10b981" : "#ef4444"}
            />
          </motion.g>
        );
      })}

      {/* Swing point labels */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 1.0 }}
      >
        <circle cx="100" cy="35" r="2" fill="#fbbf24" />
        <text x="100" y="28" fill="#fbbf24" fontSize="6" textAnchor="middle" fontFamily="monospace">HH</text>
        <circle cx="80" cy="70" r="2" fill="#fbbf24" />
        <text x="80" y="80" fill="#fbbf24" fontSize="6" textAnchor="middle" fontFamily="monospace">HL</text>
        <circle cx="180" cy="25" r="2" fill="#fbbf24" />
        <text x="180" y="18" fill="#fbbf24" fontSize="6" textAnchor="middle" fontFamily="monospace">HH</text>
        <circle cx="160" cy="65" r="2" fill="#fbbf24" />
        <text x="160" y="75" fill="#fbbf24" fontSize="6" textAnchor="middle" fontFamily="monospace">HL</text>
      </motion.g>

      {/* BOS arrow */}
      <motion.line
        x1="180"
        y1="22"
        x2="200"
        y2="20"
        stroke="#10b981"
        strokeWidth="1.2"
        strokeDasharray="2,2"
        markerEnd="url(#ms-arrow)"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 0.5, delay: 1.4 }}
      />
      <motion.text
        x="206"
        y="14"
        fill="#10b981"
        fontSize="7"
        fontFamily="monospace"
        fontWeight="bold"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.7 }}
      >
        BOS
      </motion.text>
    </svg>
  );
}
