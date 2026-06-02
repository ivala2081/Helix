import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";
import { ExecutionTester } from "@/components/admin/ExecutionTester";

export const metadata: Metadata = { title: "Execution Testi" };

// Admin dev tool — exercises the live execution path against the FUTURES TESTNET
// (virtual funds). Hard-wired to testnet in the action; never touches live.
export default function ExecutionTestPage() {
  const configured = Boolean(
    process.env.BINANCE_FUTURES_TESTNET_KEY &&
      process.env.BINANCE_FUTURES_TESTNET_SECRET,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
      >
        <ArrowLeft size={16} /> Admin&apos;e dön
      </Link>

      <div className="flex items-center gap-2">
        <Cpu size={22} className="text-emerald-400" />
        <h1 className="text-2xl font-semibold text-white">Execution Testi</h1>
      </div>
      <p className="max-w-2xl text-sm text-[var(--color-muted)]">
        Futures testnet&apos;te (sanal para) tam emir döngüsünü çalıştırır: 1x
        LONG aç → borsa-native SL/TP koy → kapat. Gerçek paraya dokunmaz.
      </p>

      <ExecutionTester configured={configured} />
    </div>
  );
}
