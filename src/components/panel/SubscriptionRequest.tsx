"use client";

import { useActionState } from "react";
import {
  requestSubscriptionAction,
  type SubState,
} from "@/lib/subscription/actions";

const INPUT =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60";

export function SubscriptionRequest({ wallet }: { wallet: string }) {
  const [state, formAction, pending] = useActionState<SubState, FormData>(
    requestSubscriptionAction,
    {},
  );

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <h2 className="text-lg font-semibold text-white">Helix Bot Paketi</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Otomatik işlem botu. Aşağıdaki cüzdana <b>499 USDT</b> gönder, işlem
        hash&apos;ini gir; onaylandığında bot panelinde aktifleşir.
      </p>

      <div className="mt-4 rounded-md border border-[var(--color-border)] bg-black/30 p-3">
        <div className="text-xs text-[var(--color-muted)]">USDT Cüzdan (TRC20)</div>
        <div className="mt-1 break-all font-mono text-sm text-emerald-300">
          {wallet}
        </div>
      </div>

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">
            İşlem Hash (tx)
          </label>
          <input name="payment_tx" required className={INPUT} placeholder="0x... / TRON tx id" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Ağ</label>
          <select name="payment_network" className={INPUT} defaultValue="TRC20">
            <option value="TRC20">TRC20 (Tron)</option>
            <option value="ERC20">ERC20 (Ethereum)</option>
            <option value="BEP20">BEP20 (BSC)</option>
          </select>
        </div>

        {state.error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
        >
          {pending ? "Gönderiliyor..." : "Ödememi bildir"}
        </button>
      </form>
    </div>
  );
}
