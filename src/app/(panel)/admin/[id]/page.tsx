import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import {
  approveSubscriptionAction,
  rejectSubscriptionAction,
  setUserRoleAction,
  setUserBotAction,
} from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Müşteri" };

type Profile = {
  id: string;
  email: string | null;
  phone: string | null;
  telegram_id: string | null;
  referred_by_code: string | null;
  role: string;
  created_at: string;
};
type Sub = {
  id: string;
  status: string;
  price_usd: number;
  payment_tx: string | null;
  payment_network: string | null;
  created_at: string;
  activated_at: string | null;
};
type Conn = { exchange: string; status: string; created_at: string };
type Bot = { enabled: boolean; risk_pct: number };
type Trade = {
  symbol: string;
  direction: string;
  status: string;
  pnl_pct: number | null;
  opened_at: string;
};

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300",
  active: "text-emerald-300",
  rejected: "text-red-300",
};

export default async function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const [profRes, subsRes, connRes, botRes, tradesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("exchange_connections").select("exchange, status, created_at").eq("user_id", id),
    supabase.from("bot_settings").select("enabled, risk_pct").eq("user_id", id),
    supabase
      .from("user_trades")
      .select("symbol, direction, status, pnl_pct, opened_at")
      .eq("user_id", id)
      .order("opened_at", { ascending: false })
      .limit(20),
  ]);

  const p = profRes.data as Profile | null;
  if (!p) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-[var(--color-muted)]">Müşteri bulunamadı.</p>
      </div>
    );
  }

  const subs = (subsRes.data ?? []) as Sub[];
  const conn = (connRes.data?.[0] ?? null) as Conn | null;
  const bot = (botRes.data?.[0] ?? { enabled: false, risk_pct: 1 }) as Bot;
  const trades = (tradesRes.data ?? []) as Trade[];
  const pendingSub = subs.find((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-white">{p.email}</h1>
        {p.role === "admin" && (
          <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            ADMIN
          </span>
        )}
      </div>

      {/* Contact */}
      <Card title="İletişim">
        <Row k="Telefon" v={p.phone ?? "—"} />
        <Row k="Telegram" v={p.telegram_id ?? "—"} />
        <Row k="Referans kodu" v={p.referred_by_code ?? "—"} />
        <Row k="Kayıt" v={new Date(p.created_at).toLocaleString("tr-TR")} />
      </Card>

      {/* Subscription */}
      <Card title="Abonelik">
        {subs.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Abonelik kaydı yok.</p>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)]/60 px-3 py-2 text-sm"
              >
                <div>
                  <span className={STATUS_TONE[s.status] ?? "text-[var(--color-muted)]"}>
                    {s.status}
                  </span>
                  <span className="ml-2 text-[var(--color-muted)]">${s.price_usd}</span>
                  {s.payment_tx && (
                    <span className="ml-2 font-mono text-xs text-[var(--color-muted)]/70">
                      {s.payment_network} {s.payment_tx.slice(0, 12)}…
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--color-muted)]/60">
                  {new Date(s.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        )}
        {pendingSub && (
          <div className="mt-3 flex gap-2">
            <form action={approveSubscriptionAction}>
              <input type="hidden" name="id" value={pendingSub.id} />
              <button className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400">
                Onayla
              </button>
            </form>
            <form action={rejectSubscriptionAction}>
              <input type="hidden" name="id" value={pendingSub.id} />
              <button className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">
                Reddet
              </button>
            </form>
          </div>
        )}
      </Card>

      {/* Exchange + Bot */}
      <Card title="Borsa & Bot">
        <Row
          k="Borsa"
          v={
            conn
              ? `${conn.exchange} · ${conn.status === "connected" ? "bağlı ✓" : conn.status}`
              : "bağlı değil"
          }
        />
        <Row k="Bot" v={bot.enabled ? "aktif" : "pasif"} />
        <Row k="Risk" v={`%${bot.risk_pct}`} />
        <div className="mt-3 flex gap-2">
          <form action={setUserBotAction}>
            <input type="hidden" name="user_id" value={p.id} />
            <input type="hidden" name="enabled" value={(!bot.enabled).toString()} />
            <button className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-white hover:bg-[var(--color-surface)]">
              Botu {bot.enabled ? "kapat" : "aç"}
            </button>
          </form>
          <form action={setUserRoleAction}>
            <input type="hidden" name="user_id" value={p.id} />
            <input type="hidden" name="role" value={p.role === "admin" ? "customer" : "admin"} />
            <button className="rounded-md border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10">
              {p.role === "admin" ? "Admin'i kaldır" : "Admin yap"}
            </button>
          </form>
        </div>
      </Card>

      {/* Trades */}
      <Card title={`İşlemler · ${trades.length}`}>
        {trades.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Henüz işlem yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="font-mono tabular-nums">
                {trades.map((t, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]/40">
                    <td className="py-1.5 font-semibold text-white">{t.symbol.replace("USDT", "")}</td>
                    <td className="py-1.5 text-xs">{t.direction}</td>
                    <td className="py-1.5 text-xs text-[var(--color-muted)]">{t.status}</td>
                    <td
                      className={`py-1.5 text-right ${
                        (t.pnl_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {t.status === "open" ? "—" : `${(t.pnl_pct ?? 0).toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
    >
      <ArrowLeft size={16} /> Admin'e dön
    </Link>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <h2 className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-border)]/40 py-1.5 text-sm last:border-0">
      <span className="text-[var(--color-muted)]">{k}</span>
      <span className="text-white">{v}</span>
    </div>
  );
}
