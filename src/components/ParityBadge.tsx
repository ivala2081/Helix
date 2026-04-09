"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

export function ParityBadge({ compact = false }: { compact?: boolean }) {
  const dict = useDictionary();
  const t = dict.parityBadge;
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-500/8"
      >
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-emerald-50">
            {t.title} ·{" "}
            <span className="text-emerald-300">{t.titleSuffix}</span>
          </div>
          {!compact && (
            <div className="mt-0.5 text-[11px] text-emerald-200/60">
              {t.subtitle}
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
              {(
                [
                  "algorithm",
                  "execution",
                  "warmup",
                  "open",
                ] as const
              ).map((key) => (
                <div key={key}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {t.rows[key].label}
                  </div>
                  <div className="mt-0.5">{t.rows[key].body}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
