"use client";

import dynamic from "next/dynamic";

// Dynamically load the Three.js scene on the client only.
// This keeps three.js (~150KB gzipped) out of the initial bundle and
// avoids SSR errors from window/document references.
export const HeroScene = dynamic(
  () =>
    import("./anomalous-matter-hero").then((m) => ({
      default: m.GenerativeArtScene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 z-0 bg-[var(--color-bg)]" aria-hidden />
    ),
  },
);
