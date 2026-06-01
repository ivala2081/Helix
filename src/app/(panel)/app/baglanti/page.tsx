import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { decryptSecret, maskKey } from "@/lib/crypto/apiKeys";
import { ConnectExchangeForm } from "@/components/panel/ConnectExchangeForm";
import {
  disconnectExchangeAction,
  updateBotSettingsAction,
} from "@/lib/exchange/actions";

export const metadata: Metadata = { title: "Borsa Bağlantısı" };

type Conn = { exchange: string; api_key_enc: string; status: string; created_at: string };
type BotSettings = { enabled: boolean; risk_pct: number };

export default async function BaglantiPage() {
  const supabase = await createServerSupabase();

  const [subRes, connRes, botRes] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("status", "active").limit(1),
    supabase
      .from("exchange_connections")
      .select("exchange, api_key_enc, status, created_at")
      .limit(1),
    supabase.from("bot_settings").select("enabled, risk_pct").limit(1),
  ]);

  const active = Boolean(subRes.data && subRes.data.length > 0);
  const conn = (connRes.data?.[0] ?? null) as Conn | null;
  const bot = (botRes.data?.[0] ?? { enabled: false, risk_pct: 1 }) as BotSettings;

  let maskedKey = "••••";
  if (conn) {
    try {
      maskedKey = maskKey(decryptSecret(conn.api_key_enc));
    } catch {
      maskedKey = "••••";
    }
  }

  const back = (
    <Link
      href="/app"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
    >
      <ArrowLeft size={16} /> Panele dön
    </Link>
  );

  if (!active) {
    return (
      <div className="space-y-6">
        {back}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-lg font-semibold text-amber-300">Abonelik gerekli</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Borsa bağlamak için önce Helix Bot paketini almalısın.
          </p>
          <Link
            href="/app/paket"
            className="mt-4 inline-flex rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Paketi incele
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}
      <h1 className="text-2xl font-semibold text-white">Borsa Bağlantısı</h1>

      {conn ? (
        <>
          {/* Connected status */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="font-semibold text-white capitalize">
                  {conn.exchange} bağlı
                </span>
              </div>
              <form action={disconnectExchangeAction}>
                <button className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">
                  Bağlantıyı kes
                </button>
              </form>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <Lock size={14} /> API Key: <code className="text-white/80">{maskedKey}</code>
            </div>
          </div>

          {/* Bot settings */}
          <form
            action={updateBotSettingsAction}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5"
          >
            <h2 className="text-lg font-semibold text-white">Bot Ayarları</h2>
            <label className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={bot.enabled}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-sm text-white">Bot aktif (hesabımda işlem açsın)</span>
            </label>
            <div className="mt-4 max-w-xs">
              <label className="mb-1 block text-xs text-[var(--color-muted)]">
                İşlem başına risk (%)
              </label>
              <input
                type="number"
                name="risk_pct"
                defaultValue={bot.risk_pct}
                step="0.25"
                min="0.25"
                max="5"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60"
              />
              <p className="mt-1 text-[11px] text-[var(--color-muted)]/70">
                Önerilen: %1–2. Bakiyene göre her işlemde riske atılacak oran.
              </p>
            </div>
            <button className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400">
              Kaydet
            </button>
          </form>

          <p className="text-[11px] text-[var(--color-muted)]/60">
            Not: Canlı emir altyapısı (execution) devreye girene kadar bot işlem
            açmaz; bağlantı ve ayarlar hazır tutulur.
          </p>
        </>
      ) : (
        <ConnectExchangeForm />
      )}
    </div>
  );
}
