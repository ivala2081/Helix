import Link from "next/link";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";
import { Logo } from "@/components/brand/Logo";

export async function Footer() {
  const { dict } = await getCurrentDictionary();
  const t = dict.footer;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  return (
    <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white"
            aria-label="Helix"
          >
            <Logo size={24} />
            <span className="font-semibold tracking-tight">Helix</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--color-muted)]">
            <Link
              href="/live"
              className="transition-colors hover:text-white"
            >
              {t.links.live}
            </Link>
            <Link
              href="/about"
              className="transition-colors hover:text-white"
            >
              {t.links.about}
            </Link>
            <Link
              href="/about#disclaimer"
              className="transition-colors hover:text-white"
            >
              {t.links.disclaimer}
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-[var(--color-border)]/60 pt-5 text-[10px] text-[var(--color-muted)]/80 sm:flex-row sm:items-center">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t.status}
            <span className="ml-2 font-mono text-[var(--color-muted)]/50">
              {t.build} {commit}
            </span>
          </span>
          <span>© {new Date().getFullYear()} Helix</span>
        </div>
      </div>
    </footer>
  );
}
