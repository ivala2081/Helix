import Link from "next/link";
import { Github } from "lucide-react";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";
import { Logo } from "@/components/brand/Logo";

export async function Footer() {
  const { dict } = await getCurrentDictionary();
  const t = dict.footer;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  const PRODUCT = [
    { href: "/", label: t.links.home },
    { href: "/backtest", label: t.links.backtest },
    { href: "/live", label: t.links.live },
    { href: "/about", label: t.links.about },
    { href: "/changelog", label: t.links.changelog },
  ];

  const RESOURCES = [
    { href: "https://github.com/ivala2081/Helix", label: t.links.githubRepo, ext: true },
    { href: "https://github.com/ivala2081/Helix/blob/main/README.md", label: t.links.documentation, ext: true },
    { href: "https://github.com/ivala2081/Helix/blob/main/LICENSE", label: t.links.mitLicense, ext: true },
  ];

  const LEGAL = [
    { href: "/about#disclaimer", label: t.links.disclaimer },
    { href: "https://github.com/ivala2081/Helix/blob/main/LICENSE", label: t.links.license, ext: true },
  ];

  return (
    <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-white"
              aria-label="Helix — home"
            >
              <Logo size={28} />
              <span className="font-semibold tracking-tight">Helix</span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
              {t.tagline}
            </p>
            <a
              href="https://github.com/ivala2081/Helix"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-muted)] hover:text-white"
            >
              <Github className="h-3.5 w-3.5" />
              {t.starOnGithub}
            </a>
          </div>
          <Col title={t.columns.product} links={PRODUCT} />
          <Col title={t.columns.resources} links={RESOURCES} />
          <Col title={t.columns.legal} links={LEGAL} />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border)]/60 pt-6 text-[10px] text-[var(--color-muted)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t.status}
            </span>
            <span className="font-mono text-[var(--color-muted)]/60">
              · {t.build} {commit}
            </span>
          </div>
          <div className="text-[var(--color-muted)]/80">
            © {new Date().getFullYear()} Helix · {t.copyright}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Col({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; ext?: boolean }[];
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((l) =>
          l.ext ? (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--color-muted)] transition-colors hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ) : (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-xs text-[var(--color-muted)] transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
