"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { connectExchangeAction, type ConnState } from "@/lib/exchange/actions";

const INPUT =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60";
const LABEL = "mb-1 block text-xs text-[var(--color-muted)]";

export function ConnectExchangeForm() {
  const [state, formAction, pending] = useActionState<ConnState, FormData>(
    connectExchangeAction,
    {},
  );
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <h2 className="text-lg font-semibold text-white">Borsa Bağla</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Binance hesabında <b>sadece-işlem izinli</b> (çekim KAPALI) bir API
        anahtarı oluştur ve aşağıya yapıştır.
      </p>

      <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-1.5 font-medium text-emerald-300">
          <ShieldCheck size={14} /> Güvenli anahtar nasıl oluşturulur
        </div>
        <ol className="mt-2 list-decimal space-y-0.5 pl-4">
          <li>Binance → Profil → API Management → Create API</li>
          <li>
            <b>Enable Spot &amp; Margin Trading</b> AÇIK
          </li>
          <li>
            <b>Enable Withdrawals</b> KAPALI (bırak)
          </li>
          <li>İstersen IP kısıtlamasını aç (önerilir)</li>
        </ol>
      </div>

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label className={LABEL}>Borsa</label>
          <select name="exchange" className={INPUT} defaultValue="binance">
            <option value="binance">Binance</option>
            <option value="bybit" disabled>
              Bybit (yakında)
            </option>
          </select>
        </div>
        <div>
          <label className={LABEL}>API Key</label>
          <input name="api_key" required className={INPUT} autoComplete="off" />
        </div>
        <div>
          <label className={LABEL}>API Secret</label>
          <div className="relative">
            <input
              name="api_secret"
              type={showSecret ? "text" : "password"}
              required
              autoComplete="off"
              className={`${INPUT} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              aria-label={showSecret ? "Gizle" : "Göster"}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-muted)] hover:text-white"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
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
          {pending ? "Doğrulanıyor..." : "Bağla"}
        </button>
      </form>
    </div>
  );
}
