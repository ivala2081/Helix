// Shared UI tokens — keep the panel/auth surfaces visually consistent.

/** Glassmorphic input. */
export const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-emerald-500/50 focus:bg-white/[0.05]";

/** Glassmorphic surface card. */
export const cardClass =
  "rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm";

/** Primary (emerald) action button. */
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-60";

/** Small uppercase section label. */
export const sectionLabel =
  "text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70";
