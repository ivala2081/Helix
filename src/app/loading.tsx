export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-2/3 rounded-lg bg-[var(--color-surface)]/60" />
        <div className="h-6 w-1/2 rounded-lg bg-[var(--color-surface)]/60" />
        <div className="grid grid-cols-2 gap-3 pt-8 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--color-surface)]/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
