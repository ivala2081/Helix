import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Plug,
  Bot,
  TrendingUp,
  ShieldCheck,
  Lock,
  Wallet,
  Zap,
} from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { SubscriptionRequest } from "@/components/panel/SubscriptionRequest";

export const metadata: Metadata = { title: "Helix Bot Paketi" };

const USDT_WALLET =
  process.env.NEXT_PUBLIC_USDT_WALLET ?? "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

const STEPS = [
  {
    icon: Plug,
    title: "1 · Borsanı bağla",
    body: "Binance/Bybit'te sadece-işlem izinli (çekim KAPALI) bir API anahtarı oluşturup panele yapıştır.",
  },
  {
    icon: Bot,
    title: "2 · Bot çalışır",
    body: "Helix V5 stratejisi sinyal verdikçe senin hesabında otomatik işlem açar; SL ve TP'leri yönetir.",
  },
  {
    icon: TrendingUp,
    title: "3 · Sen izle",
    body: "Her işlem panelinde anlık görünür. Bakiye, K/Z, açık pozisyonlar — hepsi tek ekranda.",
  },
];

const TRUST = [
  { icon: Lock, title: "Çekim izni yok", body: "Bot parana dokunamaz, sadece işlem açar." },
  { icon: Wallet, title: "Paran sende", body: "Fonlar hep kendi borsa hesabında kalır." },
  { icon: ShieldCheck, title: "Şifreli & IP-kilitli", body: "Anahtarın şifrelenir, IP'ye kilitlenir." },
];

export default async function PaketPage() {
  const supabase = await createServerSupabase();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(1);
  const status = (subs?.[0]?.status as string | undefined) ?? null;

  const back = (
    <Link
      href="/app"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
    >
      <ArrowLeft size={16} /> Panele dön
    </Link>
  );

  if (status === "active") {
    return (
      <div className="space-y-6">
        {back}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <h1 className="text-lg font-semibold text-emerald-300">Aboneliğin zaten aktif ✓</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Borsa bağlama ekranından hesabını bağlayıp botu çalıştırabilirsin.
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-6">
        {back}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-lg font-semibold text-amber-300">Ödemen inceleniyor</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            USDT işlemini aldık. Onaylandığında bot otomatik aktifleşir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {back}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-emerald-500/15 via-[var(--color-surface)]/30 to-transparent p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
          <Zap size={12} /> Helix Bot Paketi
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Stratejiyi senin hesabında çalıştır
        </h1>
        <p className="mt-2 max-w-lg text-sm text-[var(--color-muted)]">
          Helix V5'i kendi Binance/Bybit hesabında 7/24 otomatik işlet. Kurulum
          5 dakika; gerisini bot halleder.
        </p>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">499</span>
          <span className="text-lg font-medium text-emerald-300">USDT</span>
          <span className="text-sm text-[var(--color-muted)]">/ tek seferlik</span>
        </div>
      </div>

      {/* ── How it works ── */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
          Nasıl çalışır
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <s.icon size={20} />
              </div>
              <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust ── */}
      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          {TRUST.map((t) => (
            <div key={t.title} className="rounded-xl border border-[var(--color-border)] p-5">
              <t.icon size={20} className="text-emerald-400" />
              <h3 className="mt-2 font-semibold text-white">{t.title}</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Payment ── */}
      <section id="odeme" className="scroll-mt-20">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
          Satın al
        </h2>
        <div className="mt-4">
          <SubscriptionRequest wallet={USDT_WALLET} />
        </div>
      </section>

      <p className="text-center text-[10px] leading-relaxed text-[var(--color-muted)]/50">
        İşlem yüksek kayıp riski taşır. Geçmiş performans gelecek getiriyi
        garanti etmez. Yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}
