import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const metadata: Metadata = { title: "Panel" };

type Subscription = { id: string; status: string };
type UserTrade = {
  symbol: string;
  direction: string;
  status: string;
  pnl: number | null;
  pnl_pct: number | null;
  exit_reason: string | null;
  opened_at: string;
  closed_at: string | null;
};

export default async function AppDashboard() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [subRes, tradesRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, status")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("user_trades")
      .select("symbol, direction, status, pnl, pnl_pct, exit_reason, opened_at, closed_at")
      .order("opened_at", { ascending: false })
      .limit(20),
  ]);

  const sub = (subRes.data?.[0] ?? null) as Subscription | null;
  const active = sub?.status === "active";
  const trades = (tradesRes.data ?? []) as UserTrade[];

  // ── Customer's own stats (empty until the bot trades their account) ──
  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "open");
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : null;
  const hasActivity = trades.length > 0;

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
          {active ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Bot aktif
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-[var(--color-muted)]/50" />
              Bot pasif
            </>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">Hesabım</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{user?.email}</p>
      </div>

      {/* ── Customer KPI strip ── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Kpi
          label="Toplam K/Z"
          value={hasActivity ? `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}` : "—"}
          tone={hasActivity ? (totalPnl >= 0 ? "emerald" : "red") : undefined}
        />
        <Kpi label="Kapalı İşlem" value={String(closed.length)} />
        <Kpi label="Kazanma Oranı" value={winRate === null ? "—" : `%${winRate.toFixed(0)}`} />
        <Kpi label="Açık Pozisyon" value={String(open.length)} />
      </div>

      {/* ── Activity area: empty state until trades arrive ── */}
      {!hasActivity ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/20 px-6 py-14 text-center">
          <Activity size={28} className="text-[var(--color-muted)]/50" />
          <h2 className="mt-4 text-base font-medium text-white">Henüz işlem yok</h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
            {active
              ? "Borsa hesabını bağla; bot işlem açtıkça hepsi burada görünecek — bakiye, K/Z, açık pozisyonlar."
              : "Aboneliğini başlatıp borsanı bağladığında bot senin hesabında işlem açmaya başlar ve burada anlık olarak görürsün."}
          </p>
        </div>
      ) : (
        <section>
          <SectionLabel>İşlemlerim</SectionLabel>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">Parite</th>
                  <th className="px-3 py-2 text-left">Yön</th>
                  <th className="px-3 py-2 text-left">Durum</th>
                  <th className="px-3 py-2 text-right">K/Z</th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">Tarih</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {trades.map((t, i) => {
                  const pnlPct = t.pnl_pct ?? 0;
                  const win = (t.pnl ?? 0) > 0;
                  return (
                    <tr key={i} className="border-t border-[var(--color-border)]/50">
                      <td className="px-3 py-2 font-semibold text-white">
                        {t.symbol.replace("USDT", "")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
                            t.direction === "LONG"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                        {t.status === "open" ? "Açık" : t.exit_reason}
                      </td>
                      <td
                        className={`px-3 py-2 text-right ${
                          t.status === "open"
                            ? "text-[var(--color-muted)]"
                            : win
                              ? "text-emerald-400"
                              : "text-red-400"
                        }`}
                      >
                        {t.status === "open"
                          ? "—"
                          : `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
                      </td>
                      <td className="hidden px-3 py-2 text-right text-[10px] text-[var(--color-muted)]/60 sm:table-cell">
                        {new Date(t.opened_at).toLocaleDateString("tr-TR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Bot status / subscription (contextual) ── */}
      {active ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <h2 className="text-lg font-semibold text-emerald-300">
            Aboneliğin aktif ✓
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Borsa hesabını bağla ve botu çalıştır.
          </p>
          <Link
            href="/app/baglanti"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Borsa Bağla
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : sub?.status === "pending" ? (
        <StatusCard
          tone="amber"
          title="Ödemen inceleniyor"
          body="USDT işlemini aldık. Onaylandığında bot otomatik aktifleşir, genelde birkaç saat içinde."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-6">
          <h2 className="text-xl font-semibold text-white">
            Botu kendi hesabında çalıştır
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
            Helix Bot, Binance/Bybit hesabında 7/24 otomatik işlem açar. Paranı
            biz tutmayız — anahtar yalnızca işlem izniyle, çekim yetkisi olmadan
            bağlanır.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-[var(--color-muted)]">
            <li>✓ Tam otomatik · 7/24 · V5 stratejisi</li>
            <li>✓ Paran kendi borsanda kalır (non-custodial)</li>
            <li>✓ Giriş, SL ve TP&apos;ler bot tarafından yönetilir</li>
          </ul>
          <Link
            href="/app/paket"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            Satın Al · 499 USDT
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      <p className="text-center text-[10px] leading-relaxed text-[var(--color-muted)]/50">
        İşlem yüksek kayıp riski taşır. Yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
        ? "text-red-400"
        : "text-white/95";
  return (
    <div className="bg-[var(--color-bg)] px-4 py-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl font-medium tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function StatusCard({
  tone,
  title,
  body,
}: {
  tone: "amber" | "emerald";
  title: string;
  body: string;
}) {
  const border = tone === "emerald" ? "border-emerald-500/30" : "border-amber-500/30";
  const bg = tone === "emerald" ? "bg-emerald-500/10" : "bg-amber-500/10";
  const text = tone === "emerald" ? "text-emerald-300" : "text-amber-300";
  return (
    <div className={`rounded-xl border ${border} ${bg} p-5`}>
      <h2 className={`text-lg font-semibold ${text}`}>{title}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
