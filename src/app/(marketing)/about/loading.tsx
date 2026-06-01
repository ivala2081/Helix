export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr]">
        <div className="hidden h-[300px] rounded bg-[var(--color-surface)]/60 lg:block" />
        <div className="max-w-3xl animate-pulse space-y-4">
          <div className="h-10 w-1/2 rounded bg-[var(--color-surface)]/60" />
          <div className="h-5 w-3/4 rounded bg-[var(--color-surface)]/60" />
          <div className="mt-8 h-[300px] rounded-xl bg-[var(--color-surface)]/60" />
        </div>
      </div>
    </div>
  );
}
