import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import {
  approveSubscriptionAction,
  rejectSubscriptionAction,
} from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Admin" };

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
  user_id: string;
  status: string;
  price_usd: number;
  payment_tx: string | null;
  payment_network: string | null;
  created_at: string;
};
type Bot = { user_id: string; enabled: boolean };
type Conn = { user_id: string; exchange: string; status: string };

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300",
  active: "text-emerald-300",
  rejected: "text-red-300",
  expired: "text-[var(--color-muted)]",
  cancelled: "text-[var(--color-muted)]",
};

export default async function AdminDashboard() {
  const supabase = await createServerSupabase();

  const [profRes, subRes, botRes, connRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, phone, telegram_id, referred_by_code, role, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
    supabase.from("bot_settings").select("user_id, enabled"),
    supabase.from("exchange_connections").select("user_id, exchange, status"),
  ]);

  const profiles = (profRes.data ?? []) as Profile[];
  const subs = (subRes.data ?? []) as Sub[];
  const bots = (botRes.data ?? []) as Bot[];
  const conns = (connRes.data ?? []) as Conn[];

  // Latest subscription per user
  const latestSub = new Map<string, Sub>();
  for (const s of subs) if (!latestSub.has(s.user_id)) latestSub.set(s.user_id, s);
  const botByUser = new Map(bots.map((b) => [b.user_id, b.enabled]));
  const connByUser = new Map(conns.map((c) => [c.user_id, c.status]));

  const pending = subs.filter((s) => s.status === "pending");
  const activeUsers = new Set(
    subs.filter((s) => s.status === "active").map((s) => s.user_id),
  );
  const revenue = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.price_usd ?? 0), 0);
  const connectedCount = conns.filter((c) => c.status === "connected").length;

  const profById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Admin</h1>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-5">
        <Kpi label="Müşteri" value={String(profiles.length)} />
        <Kpi label="Aktif Abonelik" value={String(activeUsers.size)} tone="emerald" />
        <Kpi label="Onay Bekleyen" value={String(pending.length)} tone={pending.length ? "amber" : undefined} />
        <Kpi label="Gelir" value={`$${revenue.toLocaleString()}`} tone="emerald" />
        <Kpi label="Bağlı Borsa" value={String(connectedCount)} />
      </div>

      {/* ── Pending approvals ── */}
      <section>
        <SectionLabel>Onay Bekleyen Ödemeler · {pending.length}</SectionLabel>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Müşteri</th>
                <th className="px-3 py-2 text-left">Telefon</th>
                <th className="px-3 py-2 text-left">Telegram</th>
                <th className="px-3 py-2 text-left">USDT tx</th>
                <th className="px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-muted)]">
                    Onay bekleyen ödeme yok.
                  </td>
                </tr>
              )}
              {pending.map((s) => {
                const p = profById.get(s.user_id);
                return (
                  <tr key={s.id} className="border-b border-[var(--color-border)]/50">
                    <td className="px-3 py-2 text-white">{p?.email ?? "—"}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{p?.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{p?.telegram_id ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-muted)]">
                      {s.payment_tx ? `${s.payment_network ?? ""} ${s.payment_tx.slice(0, 12)}…` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <form action={approveSubscriptionAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-black hover:bg-emerald-400">
                            Onayla
                          </button>
                        </form>
                        <form action={rejectSubscriptionAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="rounded-md border border-red-500/40 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10">
                            Reddet
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── All customers ── */}
      <section>
        <SectionLabel>Tüm Müşteriler · {profiles.length}</SectionLabel>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">E-posta</th>
                <th className="px-3 py-2 text-left">Telefon</th>
                <th className="px-3 py-2 text-left">Telegram</th>
                <th className="px-3 py-2 text-left">Referans</th>
                <th className="px-3 py-2 text-left">Abonelik</th>
                <th className="px-3 py-2 text-left">Borsa</th>
                <th className="px-3 py-2 text-left">Bot</th>
                <th className="hidden px-3 py-2 text-right md:table-cell">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const sub = latestSub.get(p.id);
                const subStatus = sub?.status ?? "—";
                const conn = connByUser.get(p.id);
                const botOn = botByUser.get(p.id);
                return (
                  <tr key={p.id} className="border-b border-[var(--color-border)]/50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/${p.id}`}
                        className="text-white hover:text-emerald-400 hover:underline"
                      >
                        {p.email ?? "—"}
                      </Link>
                      {p.role === "admin" && (
                        <span className="ml-1.5 rounded-sm bg-amber-500/15 px-1 py-0.5 text-[9px] font-semibold text-amber-300">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{p.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{p.telegram_id ?? "—"}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{p.referred_by_code ?? "—"}</td>
                    <td className={`px-3 py-2 ${STATUS_TONE[subStatus] ?? "text-[var(--color-muted)]"}`}>
                      {subStatus}
                    </td>
                    <td className="px-3 py-2">
                      {conn === "connected" ? (
                        <span className="text-emerald-400">✓ bağlı</span>
                      ) : (
                        <span className="text-[var(--color-muted)]/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {botOn ? (
                        <span className="text-emerald-400">aktif</span>
                      ) : (
                        <span className="text-[var(--color-muted)]/60">pasif</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-right text-[10px] text-[var(--color-muted)]/60 md:table-cell">
                      {new Date(p.created_at).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
  tone?: "emerald" | "amber";
}) {
  const cls =
    tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-300" : "text-white/95";
  return (
    <div className="bg-[var(--color-bg)] px-4 py-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
      <div className={`mt-1 font-mono text-xl font-medium tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
