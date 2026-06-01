import Link from "next/link";
import { PageTransition } from "@/components/visuals/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileNav } from "@/components/MobileNav";
import { AnimatedLogo } from "@/components/brand/AnimatedLogo";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";

// Public marketing chrome: top nav, command palette, footer. Wraps the landing
// page and the public /live, /backtest, /about, /changelog, /research routes.
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dict } = await getCurrentDictionary();

  return (
    <>
      <CommandPalette />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        {dict.nav.skipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center text-white"
            aria-label="Helix — home"
          >
            <AnimatedLogo size={28} />
          </Link>

          {/* Desktop / tablet cluster — hidden on phones */}
          <div className="hidden items-center gap-1 sm:flex sm:gap-2">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
            >
              {dict.nav.home}
            </Link>
            <Link
              href="/backtest"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
            >
              {dict.nav.backtest}
            </Link>
            <Link
              href="/live"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
            >
              {dict.nav.live}
            </Link>
            <Link
              href="/about"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
            >
              {dict.nav.about}
            </Link>
            <Link
              href="/changelog"
              className="hidden rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white md:block"
            >
              {dict.nav.changelog}
            </Link>
            <Link
              href="/app"
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              Panel
            </Link>
            <LanguageSwitcher />
            <kbd className="ml-1 hidden items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-2 py-1 font-mono text-[10px] text-[var(--color-muted)] md:flex">
              ⌘K
            </kbd>
          </div>

          {/* Mobile cluster */}
          <div className="flex items-center gap-1 sm:hidden">
            <LanguageSwitcher />
            <MobileNav nav={dict.nav} />
          </div>
        </nav>
      </header>
      <main id="main">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  );
}
