export default function LiveLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-48 animate-pulse rounded-full bg-[var(--color-surface)]" />
        <div className="h-4 w-64 animate-pulse rounded bg-[var(--color-surface)]" />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60"
          />
        ))}
      </div>
      <div className="mt-8 h-80 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60" />
    </div>
  );
}
