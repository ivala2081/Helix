import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { SubscriptionRequest } from "@/components/panel/SubscriptionRequest";

export const metadata: Metadata = { title: "Panel" };

// Where customers send USDT. Set NEXT_PUBLIC_USDT_WALLET in env; placeholder
// shown until configured.
const USDT_WALLET =
  process.env.NEXT_PUBLIC_USDT_WALLET ?? "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

type Subscription = {
  id: string;
  status: string;
  plan: string;
  price_usd: number;
  payment_tx: string | null;
  created_at: string;
};

export default async function AppDashboard() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  const sub = (subs?.[0] ?? null) as Subscription | null;
  const active = sub?.status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Panel</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {user?.email}
        </p>
      </div>

      {/* Subscription state */}
      {!sub || sub.status === "rejected" ? (
        <SubscriptionRequest wallet={USDT_WALLET} />
      ) : sub.status === "pending" ? (
        <StatusCard
          tone="amber"
          title="Ödemen inceleniyor"
          body="USDT işlemini aldık. Onaylandığında bot otomatik aktifleşecek. Genellikle birkaç saat içinde."
        />
      ) : (
        <StatusCard
          tone="emerald"
          title="Aboneliğin aktif ✓"
          body="Helix Bot paketin aktif. Aşağıdan borsa hesabını bağla ve botu çalıştır."
        />
      )}

      {/* Placeholders — built in later modules */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleCard
          title="Borsa Bağlantısı"
          body="Binance/Bybit API anahtarını bağla (yalnızca işlem izni, çekim YOK)."
          disabled={!active}
          note={active ? "Yakında" : "Abonelik gerekli"}
        />
        <ModuleCard
          title="Bot Ayarları"
          body="Risk %, işlem çiftleri ve botu aç/kapa."
          disabled={!active}
          note={active ? "Yakında" : "Abonelik gerekli"}
        />
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

function ModuleCard({
  title,
  body,
  disabled,
  note,
}: {
  title: string;
  body: string;
  disabled: boolean;
  note: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-muted)]">
          {note}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
