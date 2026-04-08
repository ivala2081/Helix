import Link from "next/link";
import { Github } from "lucide-react";

const PRODUCT_LINKS = [
  { href: "/", label: "Home" },
  { href: "/backtest", label: "Backtest" },
  { href: "/about", label: "About" },
  { href: "/changelog", label: "Changelog" },
];

const RESOURCE_LINKS = [
  {
    href: "https://github.com/ivala2081/Helix",
    label: "GitHub repo",
    external: true,
  },
  {
    href: "https://github.com/ivala2081/Helix/blob/main/README.md",
    label: "Documentation",
    external: true,
  },
  {
    href: "https://github.com/ivala2081/Helix/blob/main/LICENSE",
    label: "MIT License",
    external: true,
  },
];

const LEGAL_LINKS = [
  { href: "/about#disclaimer", label: "Disclaimer" },
  {
    href: "https://github.com/ivala2081/Helix/blob/main/LICENSE",
    label: "License",
    external: true,
  },
];

export function Footer() {
  // Vercel injects this at build time. Falls back to a sensible label in dev.
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  return (
    <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-blue-500 font-mono text-xs font-bold text-black">
                H
              </div>
              <span className="font-semibold tracking-tight">Helix</span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
              Institutional-grade price action backtesting for cryptocurrency
              markets. Open source, walk-forward validated.
            </p>
            <a
              href="https://github.com/ivala2081/Helix"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-muted)] hover:text-white"
            >
              <Github className="h-3.5 w-3.5" />
              Star on GitHub
            </a>
          </div>

          {/* Product */}
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          {/* Resources */}
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
          {/* Legal */}
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border)]/60 pt-6 text-[10px] text-[var(--color-muted)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              All systems operational
            </span>
            <span className="font-mono text-[var(--color-muted)]/60">
              · build {commit}
            </span>
          </div>
          <div className="text-[var(--color-muted)]/80">
            © {new Date().getFullYear()} Helix · Past performance does not
            guarantee future results · Not financial advice.
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((link) =>
          link.external ? (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--color-muted)] transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ) : (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-xs text-[var(--color-muted)] transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
