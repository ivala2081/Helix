import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import {
  approveSubscriptionAction,
  rejectSubscriptionAction,
} from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Admin" };

type Sub = {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  price_usd: number;
  payment_tx: string | null;
  payment_network: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300",
  active: "text-emerald-300",
  rejected: "text-red-300",
  expired: "text-[var(--color-muted)]",
  cancelled: "text-[var(--color-muted)]",
};

export default async function AdminDashboard() {
  const supabase = await createServerSupabase();

  const { data: subsData } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });
  const subs = (subsData ?? []) as Sub[];

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const emailById = new Map<string, string>(
    (profs ?? []).map((p: { id: string; email: string | null }) => [p.id, p.email ?? "—"]),
  );

  const pendingCount = subs.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {subs.length} abonelik · {pendingCount} onay bekliyor
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">Paket</th>
              <th className="px-3 py-2">USDT tx</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  Henüz abonelik yok.
                </td>
              </tr>
            )}
            {subs.map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-border)]/50">
                <td className="px-3 py-2 text-white">{emailById.get(s.user_id) ?? "—"}</td>
                <td className="px-3 py-2 text-[var(--color-muted)]">
                  {s.plan} · ${s.price_usd}
                </td>
                <td className="px-3 py-2">
                  {s.payment_tx ? (
                    <span className="font-mono text-xs text-[var(--color-muted)]">
                      {s.payment_network} · {s.payment_tx.slice(0, 10)}…
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`px-3 py-2 ${STATUS_TONE[s.status] ?? ""}`}>{s.status}</td>
                <td className="px-3 py-2 text-right">
                  {s.status === "pending" ? (
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
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
