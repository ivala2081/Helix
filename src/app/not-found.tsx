import Link from "next/link";
import { ArrowRight, BarChart3, Home } from "lucide-react";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "404 · Page not found",
};

export default async function NotFound() {
  const { dict } = await getCurrentDictionary();
  const t = dict.notFound;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <div className="mb-6">
        <Logo size={80} />
      </div>
      <div className="font-mono text-display-xl font-bold tracking-tighter text-transparent bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text">
        {t.code}
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">{t.body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-[var(--color-muted)]"
        >
          <Home className="h-4 w-4" />
          {t.goHome}
        </Link>
        <Link
          href="/backtest"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-500 px-5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
        >
          <BarChart3 className="h-4 w-4" />
          {t.runBacktest}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
