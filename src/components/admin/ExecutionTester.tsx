"use client";

import { useActionState } from "react";
import { Play, Users } from "lucide-react";
import {
  runFuturesTestTrade,
  runExecutorTestTick,
  type TestResult,
} from "@/lib/exchange/testnet-actions";
import { primaryBtn } from "@/lib/ui";

export function ExecutionTester({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<TestResult, FormData>(
    runFuturesTestTrade,
    {},
  );
  const [execState, execAction, execPending] = useActionState<TestResult, FormData>(
    runExecutorTestTick,
    {},
  );

  return (
    <div className="space-y-4">
      {!configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          ⚠️ <code>BINANCE_FUTURES_TESTNET_KEY</code> /{" "}
          <code>BINANCE_FUTURES_TESTNET_SECRET</code> <b>.env.local</b>&apos;de
          yok. testnet.binancefuture.com&apos;dan key alıp ekle, sonra dev
          server&apos;ı yeniden başlat.
        </div>
      )}

      <form action={action}>
        <button
          type="submit"
          disabled={pending || !configured}
          className={primaryBtn}
        >
          <Play size={15} />
          {pending ? "Çalışıyor…" : "Test işlemi çalıştır (1x long + SL/TP + kapat)"}
        </button>
      </form>

      {state.log && state.log.length > 0 && (
        <pre className="overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-300">
          {state.log.join("\n")}
        </pre>
      )}
      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {/* Phase B — full customer executor tick (reconciliation) on testnet. */}
      <div className="border-t border-white/5 pt-4">
        <p className="mb-3 max-w-2xl text-sm text-[var(--color-muted)]">
          Müşteri executor&apos;ı: canlı V5 sinyalini (live_portfolios) tüm uygun
          testnet müşterilerinin hesabına aynalar — pozisyon açar, TP merdiveninde
          küçültür, kapanışta <code>user_trades</code>&apos;e yazar.
        </p>
        <form action={execAction}>
          <button type="submit" disabled={execPending} className={primaryBtn}>
            <Users size={15} />
            {execPending ? "Çalışıyor…" : "Executor tick çalıştır (testnet · tüm müşteriler)"}
          </button>
        </form>

        {execState.log && execState.log.length > 0 && (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs leading-relaxed text-sky-300">
            {execState.log.join("\n")}
          </pre>
        )}
        {execState.error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {execState.error}
          </div>
        )}
      </div>
    </div>
  );
}
