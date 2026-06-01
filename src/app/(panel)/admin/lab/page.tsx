import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FlaskConical, Play } from "lucide-react";
import { LabTabs } from "@/components/admin/LabTabs";

export const metadata: Metadata = { title: "Strateji Lab" };

// Internal R&D surface. NOT public — customers never see raw forward-test /
// backtest numbers here. Lives under the admin role gate.
export default function StrategyLab() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
      >
        <ArrowLeft size={16} /> Admin&apos;e dön
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={22} className="text-emerald-400" />
          <h1 className="text-2xl font-semibold text-white">Strateji Laboratuvarı</h1>
        </div>
        <Link
          href="/admin/backtest"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-white transition-colors hover:bg-[var(--color-surface)]"
        >
          <Play size={15} /> Backtest çalıştır
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-[var(--color-muted)]">
        İç R&amp;D paneli — forward-test, backtest ve strateji karşılaştırması.
        Burası müşteriye kapalıdır; ham performans yalnızca admin&apos;de.
      </p>

      <LabTabs />
    </div>
  );
}
