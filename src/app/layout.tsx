import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Github } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import { ShaderBackground } from "@/components/visuals/ShaderBackground";
import { PageTransition } from "@/components/visuals/PageTransition";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Helix — Institutional-Grade Price Action Backtesting",
    template: "%s · Helix",
  },
  description:
    "Test Market Structure + Fair Value Gap strategies on any Binance-listed pair. Walk-forward validated. +949.7% return on BTCUSDT 1H.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://helix.local"),
  openGraph: {
    title: "Helix — Institutional-Grade Price Action Backtesting",
    description:
      "Test Market Structure + Fair Value Gap strategies on any Binance-listed pair. +949.7% return, 5.40 Sharpe on BTCUSDT 1H.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Helix — Institutional-Grade Price Action Backtesting",
    description:
      "+949.7% return, 5.40 Sharpe on BTCUSDT 1H. Walk-forward validated.",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = await getCurrentDictionary();

  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased"
        suppressHydrationWarning
      >
        <ShaderBackground />
        <DictionaryProvider dict={dict} locale={locale}>
          <ToastProvider>
            <CommandPalette />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
            >
              {dict.nav.skipToContent}
            </a>
            <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/60 backdrop-blur-xl">
              <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-blue-500 font-mono text-xs font-bold text-black">
                    H
                  </div>
                  <span className="font-semibold tracking-tight">Helix</span>
                </Link>
                <div className="flex items-center gap-1 sm:gap-2">
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
                    href="/about"
                    className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
                  >
                    {dict.nav.about}
                  </Link>
                  <Link
                    href="/changelog"
                    className="hidden rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white sm:block"
                  >
                    {dict.nav.changelog}
                  </Link>
                  <LanguageSwitcher />
                  <kbd className="ml-1 hidden items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-2 py-1 font-mono text-[10px] text-[var(--color-muted)] sm:flex">
                    ⌘K
                  </kbd>
                  <a
                    href="https://github.com/ivala2081/Helix"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 rounded-md p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
                    aria-label={dict.nav.github}
                  >
                    <Github className="h-4 w-4" />
                  </a>
                </div>
              </nav>
            </header>
            <main id="main">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </ToastProvider>
        </DictionaryProvider>
      </body>
    </html>
  );
}
