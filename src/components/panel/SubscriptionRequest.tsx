"use client";

import { useActionState } from "react";
import {
  requestSubscriptionAction,
  type SubState,
} from "@/lib/subscription/actions";
import { MONTHLY_PRICE_USD, PROFIT_SHARE_PCT } from "@/lib/pricing";
import { inputClass, primaryBtn } from "@/lib/ui";

const INPUT = inputClass;

export function SubscriptionRequest({ wallet }: { wallet: string }) {
  const [state, formAction, pending] = useActionState<SubState, FormData>(
    requestSubscriptionAction,
    {},
  );

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <h2 className="text-lg font-semibold text-white">Helix Bot — İlk Ay</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Aylık <b>${MONTHLY_PRICE_USD}</b> + kârın %{PROFIT_SHARE_PCT}&apos;i. Başlamak için
        aşağıdaki cüzdana <b>${MONTHLY_PRICE_USD} USDT</b> (ilk ay) gönder, işlem
        hash&apos;ini gir; onaylandığında bot <b>30 gün</b> aktifleşir.
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

        <button type="submit" disabled={pending} className={`w-full ${primaryBtn}`}>
          {pending ? "Gönderiliyor..." : "Ödememi bildir"}
        </button>
      </form>
    </div>
  );
}
