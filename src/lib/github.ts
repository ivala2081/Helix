// GitHub repo stats fetcher. Used by the social-proof bar on the landing page.
// Cached for 1 hour via Next.js fetch revalidation. Gracefully degrades on
// rate-limit / network failure so the page never crashes.

const REPO = "ivala2081/Helix";

export interface RepoStats {
  stars: number | null;
  forks: number | null;
  lastPushed: string | null; // ISO date
  url: string;
  ok: boolean;
}

export async function getRepoStats(): Promise<RepoStats> {
  const fallback: RepoStats = {
    stars: null,
    forks: null,
    lastPushed: null,
    url: `https://github.com/${REPO}`,
    ok: false,
  };

  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 }, // 1 hour
    });
    if (!r.ok) return fallback;
    const data = (await r.json()) as {
      stargazers_count: number;
      forks_count: number;
      pushed_at: string;
      html_url: string;
    };
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      lastPushed: data.pushed_at,
      url: data.html_url,
      ok: true,
    };
  } catch {
    return fallback;
  }
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
