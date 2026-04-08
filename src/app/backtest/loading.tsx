export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="animate-pulse">
        <div className="h-8 w-32 rounded bg-[var(--color-surface)]/60" />
        <div className="mt-2 h-4 w-96 rounded bg-[var(--color-surface)]/60" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="h-[600px] rounded-xl bg-[var(--color-surface)]/60" />
          <div className="h-[400px] rounded-xl bg-[var(--color-surface)]/60" />
        </div>
      </div>
    </div>
  );
}
