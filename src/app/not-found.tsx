import Link from "next/link";
import { ArrowRight, BarChart3, Home } from "lucide-react";

export const metadata = {
  title: "404 · Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 font-mono text-4xl font-bold text-black shadow-2xl shadow-emerald-500/20">
        H
      </div>
      <div className="font-mono text-7xl font-bold tracking-tighter text-transparent bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text">
        404
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        That route doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">
        The page you&apos;re looking for has either moved, never existed, or
        you mistyped the URL. The backtest engine is still running fine.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-[var(--color-muted)]"
        >
          <Home className="h-4 w-4" />
          Go home
        </Link>
        <Link
          href="/backtest"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-500 px-5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
        >
          <BarChart3 className="h-4 w-4" />
          Run a backtest
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
