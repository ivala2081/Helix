"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Timeline showing 50-bar SL suppression window followed by SL activation,
// plus the breakeven move after TP1.

export function RiskDiagram() {
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 120"
      className="h-auto w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40"
    >
      {/* Time axis */}
      <line x1="20" y1="100" x2="220" y2="100" stroke="#71717a" strokeWidth="0.6" />
      <text x="20" y="113" fill="#a1a1aa" fontSize="6" fontFamily="monospace">Bar 0</text>
      <text x="118" y="113" fill="#a1a1aa" fontSize="6" textAnchor="middle" fontFamily="monospace">Bar 50</text>
      <text x="220" y="113" fill="#a1a1aa" fontSize="6" textAnchor="end" fontFamily="monospace">Bar N</text>

      {/* Suppression zone */}
      <motion.rect
        x="20"
        y="40"
        width="100"
        height="60"
        fill="rgba(239,68,68,0.07)"
        stroke="rgba(239,68,68,0.3)"
        strokeWidth="0.5"
        strokeDasharray="2,2"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.2 }}
      />
      <motion.text
        x="70"
        y="55"
        fill="rgba(239,68,68,0.9)"
        fontSize="6"
        textAnchor="middle"
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
      >
        SL suppressed
      </motion.text>
      <motion.text
        x="70"
        y="63"
        fill="rgba(239,68,68,0.7)"
        fontSize="5"
        textAnchor="middle"
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.7 }}
      >
        only hard stop active
      </motion.text>

      {/* Active zone */}
      <motion.rect
        x="120"
        y="40"
        width="100"
        height="60"
        fill="rgba(16,185,129,0.07)"
        stroke="rgba(16,185,129,0.3)"
        strokeWidth="0.5"
        strokeDasharray="2,2"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4 }}
      />
      <motion.text
        x="170"
        y="55"
        fill="rgba(16,185,129,0.9)"
        fontSize="6"
        textAnchor="middle"
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.7 }}
      >
        SL active
      </motion.text>

      {/* Price line */}
      <motion.path
        d="M 20 75 Q 60 65, 80 60 T 130 50 Q 160 48, 180 45 T 220 35"
        fill="none"
        stroke="#10b981"
        strokeWidth="1.4"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 1.4, delay: 0.6 }}
      />

      {/* Entry marker */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.6 }}
      >
        <circle cx="20" cy="75" r="2" fill="#fbbf24" />
        <text x="22" y="71" fill="#fbbf24" fontSize="5" fontFamily="monospace">Entry</text>
      </motion.g>

      {/* TP1 marker */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 1.2 }}
      >
        <circle cx="130" cy="50" r="2" fill="#10b981" />
        <text x="132" y="46" fill="#10b981" fontSize="5" fontFamily="monospace">TP1 (5%)</text>
      </motion.g>

      {/* SL line — initial */}
      <motion.line
        x1="20"
        y1="90"
        x2="120"
        y2="90"
        stroke="#ef4444"
        strokeWidth="0.8"
        strokeDasharray="3,2"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 0.6 } : {}}
        transition={{ delay: 0.8 }}
      />
      {/* SL line — moved to breakeven after TP1 */}
      <motion.line
        x1="130"
        y1="73"
        x2="220"
        y2="73"
        stroke="#10b981"
        strokeWidth="0.8"
        strokeDasharray="3,2"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={inView ? { opacity: 0.9, pathLength: 1 } : {}}
        transition={{ delay: 1.4 }}
      />
      <motion.text
        x="135"
        y="70"
        fill="#10b981"
        fontSize="5"
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.7 }}
      >
        SL → BE + 0.3 ATR
      </motion.text>

      {/* Title */}
      <motion.text
        x="120"
        y="20"
        fill="#fafafa"
        fontSize="8"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.1 }}
      >
        Trade lifecycle
      </motion.text>
    </svg>
  );
}
