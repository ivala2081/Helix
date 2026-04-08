"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";

// Compact, expandable badge that explains why users can trust the engine.
// Lives below the V5 KPI strip on the landing page and at the top of the
// methodology section on the About page.

export function ParityBadge({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-500/8"
      >
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-emerald-50">
            Engine parity ·{" "}
            <span className="text-emerald-300">
              bit-for-bit match against the Python research code
            </span>
          </div>
          {!compact && (
            <div className="mt-0.5 text-[11px] text-emerald-200/60">
              Same algorithm, same fees, same slippage. Click to learn more.
            </div>
          )}
        </div>
        <ChevronDown
          className={
            "h-4 w-4 text-emerald-400/70 transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-emerald-500/20"
          >
            <div className="space-y-3 px-4 py-3 text-xs leading-relaxed text-emerald-100/80">
              <Row label="Same algorithm">
                The TypeScript engine that runs in your browser is a direct
                line-by-line port of <code>backtester.py</code>,{" "}
                <code>indicators.py</code>, and <code>stake_manager.py</code>{" "}
                from the Python research repo. Every formula — ATR, swing
                detection, BOS/CHoCH classification, FVG zone tracking,
                aggregator, fixed-fractional sizing, partial-close PnL — is the
                same.
              </Row>
              <Row label="Same execution model">
                0.075% taker commission, 0.02% adverse slippage on
                stops/end-of-data, no slippage on take-profits (limit orders).
                Position cap at 80% of equity. Identical to the published V5
                parameters.
              </Row>
              <Row label="Same warmup &amp; suppression">
                50-bar warmup before the first signal. 50-bar SL suppression
                window after entry, with the 15× ATR hard stop providing
                catastrophic protection during that window. Breakeven move at
                +0.30 ATR after TP1 hits.
              </Row>
              <Row label="No hidden tweaks">
                Open source, MIT licensed. The Python source and the TypeScript
                source are both on GitHub. Reproduce any result yourself.
              </Row>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
