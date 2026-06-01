import Link from "next/link";
import {
  Plug,
  Bot,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Send,
  Activity,
} from "lucide-react";
import { HeroScene } from "@/components/ui/HeroScene";

const STEPS = [
  {
    icon: Plug,
    title: "Borsanı bağla",
    body: "Binance hesabında sadece-işlem izinli (çekim KAPALI) bir API anahtarı oluştur, panele yapıştır. 5 dakika.",
  },
  {
    icon: Bot,
    title: "Bot çalışır",
    body: "Helix V5 stratejisi sinyal verdikçe senin hesabında otomatik işlem açar; stop ve hedefleri yönetir.",
  },
  {
    icon: TrendingUp,
    title: "Sen izle",
    body: "Her işlem panelinde anlık görünür. Bakiye, kâr/zarar, açık pozisyonlar — tek ekranda.",
  },
];

const METHOD = [
  {
    n: "01",
    title: "Market Structure",
    body: "HH/HL/LH/LL swing sınıflandırması. İşlemler doğrulanmış seviyelerde BOS/CHoCH ile açılır.",
  },
  {
    n: "02",
    title: "Fair Value Gap",
    body: "Dengesizlik bölgelerini takip eder, retest'te girer. ATR-ölçekli anlamlılık filtresi.",
  },
  {
    n: "03",
    title: "Disiplinli risk",
    body: "ATR tabanlı stop, SL baskılama, hard-stop tabanı, kademeli TP çıkışları.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroScene />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/40 via-[var(--color-bg)]/85 to-[var(--color-bg)]" />
      </div>

      <div className="relative z-20 mx-auto flex max-w-5xl flex-col gap-24 px-6 py-20 sm:py-28">
        {/* ── HERO ── */}
        <section className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
            <Zap size={12} /> Otomatik kripto trading botu
          </div>
          <h1 className="mt-6 text-[clamp(2.5rem,8vw,5rem)] font-light leading-[1.02] tracking-tight text-white/95">
            Stratejiyi <span className="text-emerald-400">kendi hesabında</span>{" "}
            çalıştır
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[var(--color-muted)]">
            Helix Bot, kanıtlanmış bir kripto stratejisini senin Binance
            hesabında 7/24 otomatik işletir. Paranı biz tutmayız — anahtarın
            yalnızca işlem izniyle bağlanır.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
            >
              Hemen başla <ArrowRight size={16} />
            </Link>
            <Link
              href="/live"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-surface)]"
            >
              <Activity size={15} /> Canlı test
            </Link>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section>
          <SectionLabel>Nasıl çalışır</SectionLabel>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6 backdrop-blur-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <s.icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── STRATEGY ── */}
        <section>
          <SectionLabel>Stratejinin temeli</SectionLabel>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {METHOD.map((m) => (
              <div
                key={m.n}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6 backdrop-blur-md"
              >
                <div className="font-mono text-[10px] text-[var(--color-muted)]/60">
                  {m.n}
                </div>
                <div className="mt-3 text-base font-medium text-white/90">
                  {m.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[var(--color-muted)]/70">
            Strateji <b>gerçekçi maliyetlerle</b> backtest edilir: slippage,
            spread, komisyon ve wick-fill koruması dahil — şişirilmiş rakam yok.
          </p>
        </section>

        {/* ── TRANSPARENCY ── */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-emerald-500/10 via-[var(--color-surface)]/20 to-transparent p-8 text-center">
          <ShieldCheck size={28} className="mx-auto text-emerald-400" />
          <h2 className="mt-4 text-2xl font-semibold text-white">
            Stratejiyi gizlemiyoruz
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--color-muted)]">
            Aynı stratejiyi canlı forward-test'te çalıştırıyoruz ve her işlemi —
            kazancı da kaybı da — anlık paylaşıyoruz. Kanıt ortada.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/live"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[var(--color-surface)]"
            >
              <Activity size={15} /> Canlı sonuçlar
            </Link>
            <a
              href="https://t.me/ArikanTrade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[var(--color-surface)]"
            >
              <Send size={15} /> Telegram kanalı
            </a>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="text-center">
          <SectionLabel>Fiyat</SectionLabel>
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-500/30 bg-[var(--color-surface)]/40 p-8 backdrop-blur-md">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold text-white">499</span>
              <span className="text-xl font-medium text-emerald-300">USDT</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">tek seferlik</p>
            <ul className="mt-6 space-y-2 text-left text-sm text-[var(--color-muted)]">
              <li>✓ Tam otomatik · 7/24 · V5 stratejisi</li>
              <li>✓ Paran kendi borsanda (non-custodial)</li>
              <li>✓ Giriş, SL ve TP&apos;ler otomatik yönetilir</li>
              <li>✓ Canlı panel + işlem geçmişi</li>
            </ul>
            <Link
              href="/signup"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
            >
              Hesap oluştur <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* ── DISCLAIMER ── */}
        <p className="mx-auto max-w-2xl text-center text-[10px] leading-relaxed text-[var(--color-muted)]/60">
          Helix bir kripto trading yazılımıdır. Yatırım tavsiyesi değildir.
          Geçmiş performans gelecek getiriyi garanti etmez. Kripto işlemleri
          yüksek kayıp riski taşır; yalnızca kaybetmeyi göze alabileceğin parayla
          işlem yap.
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
      {children}
    </div>
  );
}
