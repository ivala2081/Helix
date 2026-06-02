"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";
import { runFuturesTestTrade, type TestResult } from "@/lib/exchange/testnet-actions";
import { primaryBtn } from "@/lib/ui";

export function ExecutionTester({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<TestResult, FormData>(
    runFuturesTestTrade,
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
    </div>
  );
}
