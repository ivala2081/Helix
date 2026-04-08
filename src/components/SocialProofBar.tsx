import { Github, Scale, Star } from "lucide-react";
import { formatRelativeTime, getRepoStats } from "@/lib/github";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";

export async function SocialProofBar() {
  const stats = await getRepoStats();
  const { dict } = await getCurrentDictionary();
  const t = dict.landing.socialProof;

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-muted)] sm:gap-4">
      <a
        href={stats.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 backdrop-blur-md transition-colors hover:border-emerald-500/40 hover:text-white"
      >
        <Github className="h-3.5 w-3.5" />
        <span>{t.openSource}</span>
        {stats.stars !== null && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <Star className="h-2.5 w-2.5" />
            {stats.stars.toLocaleString()}
          </span>
        )}
      </a>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 backdrop-blur-md">
        <Scale className="h-3.5 w-3.5" />
        {t.mitLicense}
      </span>

      {stats.lastPushed && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t.lastCommit} {formatRelativeTime(stats.lastPushed)}
        </span>
      )}
    </div>
  );
}
