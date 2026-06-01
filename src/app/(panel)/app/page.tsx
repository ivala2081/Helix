import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { SubscriptionRequest } from "@/components/panel/SubscriptionRequest";
import { LiveEquityChart } from "@/components/live/LiveEquityChart";

export const metadata: Metadata = { title: "Panel" };

const USDT_WALLET =
  process.env.NEXT_PUBLIC_USDT_WALLET ?? "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

type Subscription = { id: string; status: string };
type Portfolio = { initial_capital: number; equity: number; started_at: string };
type Trade = { pnl: number };
type RecentTrade = {
  symbol: string;
  direction: string;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  exit_ts: number;
};

export default async function AppDashboard() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [subRes, portRes, tradesRes, recentRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, status")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("live_portfolios")
      .select("initial_capital, equity, started_at")
      .eq("status", "active"),
    supabase.from("live_trades").select("pnl"),
    supabase
      .from("live_trades")
      .select("symbol, direction, pnl, pnl_pct, exit_reason, exit_ts")
      .order("exit_ts", { ascending: false })
      .limit(8),
  ]);

  const sub = (subRes.data?.[0] ?? null) as Subscription | null;
  const active = sub?.status === "active";
  const portfolios = (portRes.data ?? []) as Portfolio[];
  const trades = (tradesRes.data ?? []) as Trade[];
  const recent = (recentRes.data ?? []) as RecentTrade[];

  // ── Real forward-test metrics ──
  const totalEquity = portfolios.reduce((s, p) => s + p.equity, 0);
  const totalInitial = portfolios.reduce((s, p) => s + p.initial_capital, 0);
  const totalReturn =
    totalInitial > 0 ? ((totalEquity - totalInitial) / totalInitial) * 100 : 0;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const earliest = portfolios.map((p) => p.started_at).sort()[0];
  const daysLive = earliest
    ? Math.max(0, Math.floor((Date.now() - new Date(earliest).getTime()) / 86_400_000))
    : 0;

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Canlı performans · Gün {daysLive}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">Helix Bot</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {user?.email} · V5 stratejisi · 5 parite · 1S · tam otomatik
        </p>
      </div>

      {/* ── KPI strip (real data) ── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Kpi
          label="Toplam Getiri"
          value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
          tone={totalReturn >= 0 ? "emerald" : "red"}
        />
        <Kpi label="Kazanma Oranı" value={`%${winRate.toFixed(0)}`} />
        <Kpi label="İşlem Sayısı" value={String(trades.length)} />
        <Kpi label="Aktif Gün" value={String(daysLive)} />
      </div>

      {/* ── Equity chart ── */}
      <section>
        <SectionLabel>Equity eğrisi</SectionLabel>
        <div className="mt-3">
          <LiveEquityChart title="" />
        </div>
      </section>

      {/* ── Bot status / subscription (contextual) ── */}
      {active ? (
        <StatusCard
          tone="emerald"
          title="Aboneliğin aktif ✓"
          body="Borsa hesabını bağla ve botu çalıştır — aşağıdan."
        />
      ) : sub?.status === "pending" ? (
        <StatusCard
          tone="amber"
          title="Ödemen inceleniyor"
          body="USDT işlemini aldık. Onaylandığında bot otomatik aktifleşir, genelde birkaç saat içinde."
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
            <h2 className="text-lg font-semibold text-white">
              Bu performansı kendi hesabında çalıştır
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Helix Bot, yukarıdaki stratejiyi senin Binance/Bybit hesabında
              otomatik işletir. Paranı biz tutmayız — anahtarın yalnızca işlem
              izniyle, çekim yetkisi olmadan bağlanır.
            </p>
          </div>
          <SubscriptionRequest wallet={USDT_WALLET} />
        </div>
      )}

      {/* ── Recent trades ── */}
      {recent.length > 0 && (
        <section>
          <SectionLabel>Son işlemler</SectionLabel>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">Parite</th>
                  <th className="px-3 py-2 text-left">Yön</th>
                  <th className="px-3 py-2 text-left">Sonuç</th>
                  <th className="px-3 py-2 text-right">Getiri</th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">Tarih</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {recent.map((t, i) => {
                  const win = t.pnl > 0;
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
                        {t.exit_reason}
                      </td>
                      <td
                        className={`px-3 py-2 text-right ${win ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {t.pnl_pct >= 0 ? "+" : ""}
                        {t.pnl_pct.toFixed(2)}%
                      </td>
                      <td className="hidden px-3 py-2 text-right text-[10px] text-[var(--color-muted)]/60 sm:table-cell">
                        {new Date(t.exit_ts).toLocaleDateString("tr-TR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-center text-[10px] leading-relaxed text-[var(--color-muted)]/50">
        Geçmiş performans gelecek getiriyi garanti etmez. İşlem yüksek kayıp
        riski taşır. Yatırım tavsiyesi değildir.
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
