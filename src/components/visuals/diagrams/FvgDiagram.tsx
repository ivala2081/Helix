"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Animated SVG showing a 3-candle bullish FVG and the retest entry signal.

export function FvgDiagram() {
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 120"
      className="h-auto w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40"
    >
      <defs>
        <marker id="fvg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#10b981" />
        </marker>
      </defs>

      {/* Grid */}
      <g stroke="rgba(63,63,70,0.3)" strokeWidth="0.3">
        {[20, 40, 60, 80, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="240" y2={y} />
        ))}
      </g>

      {/* Candle 1: small bullish */}
      <motion.g
        initial={{ opacity: 0, y: 5 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <line x1="40" y1="55" x2="40" y2="80" stroke="#10b981" strokeWidth="0.8" />
        <rect x="36" y="60" width="8" height="15" fill="#10b981" />
      </motion.g>

      {/* Candle 2: huge bullish gap candle */}
      <motion.g
        initial={{ opacity: 0, y: 5 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <line x1="80" y1="20" x2="80" y2="50" stroke="#10b981" strokeWidth="0.8" />
        <rect x="76" y="25" width="8" height="20" fill="#10b981" />
      </motion.g>

      {/* Candle 3: small bullish, opens above candle 1's high */}
      <motion.g
        initial={{ opacity: 0, y: 5 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <line x1="120" y1="20" x2="120" y2="40" stroke="#10b981" strokeWidth="0.8" />
        <rect x="116" y="22" width="8" height="15" fill="#10b981" />
      </motion.g>

      {/* The FVG zone (between candle1.high and candle3.low) */}
      <motion.rect
        x="44"
        y="37"
        width="76"
        height="18"
        fill="rgba(16,185,129,0.15)"
        stroke="rgba(16,185,129,0.5)"
        strokeWidth="0.6"
        strokeDasharray="3,2"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
      <motion.text
        x="82"
        y="48"
        fill="#10b981"
        fontSize="6"
        textAnchor="middle"
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.0 }}
      >
        FVG
      </motion.text>

      {/* Continuation candles + retest */}
      {[
        { x: 140, h: 12, l: 30, top: 14, bot: 22 },
        { x: 155, h: 8, l: 28, top: 12, bot: 22 },
        { x: 170, h: 14, l: 36, top: 18, bot: 30 },
        { x: 185, h: 30, l: 50, top: 35, bot: 45 }, // dipping back
        { x: 200, h: 38, l: 50, top: 40, bot: 48 }, // touches FVG zone (retest!)
      ].map((c, i) => {
        const isUp = i < 3;
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.2, delay: 1.0 + i * 0.15 }}
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
              y={c.top}
              width="6"
              height={c.bot - c.top}
              fill={isUp ? "#10b981" : "#ef4444"}
            />
          </motion.g>
        );
      })}

      {/* Retest arrow */}
      <motion.line
        x1="210"
        y1="48"
        x2="220"
        y2="65"
        stroke="#10b981"
        strokeWidth="1.2"
        markerEnd="url(#fvg-arrow)"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 0.4, delay: 1.9 }}
      />
      <motion.text
        x="222"
        y="76"
        fill="#10b981"
        fontSize="6"
        fontFamily="monospace"
        fontWeight="bold"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 2.2 }}
      >
        Long
      </motion.text>
    </svg>
  );
}
