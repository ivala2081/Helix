"use client";

import { useState } from "react";
import { LiveEquityChart } from "@/components/live/LiveEquityChart";
import { LiveV62EquityChart } from "@/components/live/LiveV62EquityChart";
import { PortfolioAggregate } from "@/components/live/PortfolioAggregate";
import { QuantMonitor } from "@/components/live/QuantMonitor";
import { LiveTradeAnalytics } from "@/components/live/LiveTradeAnalytics";

type Strategy = "v5" | "v62";

const TABS: { key: Strategy; label: string; note: string }[] = [
  { key: "v5", label: "V5 · Canlı (Production)", note: "Şu an canlı yayında olan strateji." },
  { key: "v62", label: "V6.2 · Paper-test", note: "Raflanmış aday; karşılaştırma için izlenir." },
];

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
      {children}
    </div>
  );
}

export function LabTabs() {
  const [tab, setTab] = useState<Strategy>("v5");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md border px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--color-muted)]">{active.note}</p>

      {/* V5 */}
      {tab === "v5" && (
        <Section>
          <div>
            <Label>Equity eğrileri · V5</Label>
            <div className="mt-3">
              <LiveEquityChart title="" />
            </div>
          </div>
          <div>
            <Label>Agregat analiz · V5</Label>
            <div className="mt-3">
              <PortfolioAggregate />
            </div>
          </div>
          <div>
            <Label>Quant monitor · canlı vs backtest</Label>
            <div className="mt-3">
              <QuantMonitor />
            </div>
          </div>
          <div>
            <Label>İşlem geçmişi · V5</Label>
            <div className="mt-3">
              <LiveTradeAnalytics />
            </div>
          </div>
        </Section>
      )}

      {/* V6.2 */}
      {tab === "v62" && (
        <Section>
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/80">
            V6.2 paper-test 2026-05-25&apos;te raflandı (Gate 3 FAIL). Canlı değil;
            yalnızca karşılaştırma için tutuluyor.
          </div>
          <div>
            <Label>Equity eğrileri · V6.2</Label>
            <div className="mt-3">
              <LiveV62EquityChart title="" />
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
