"use client";

import dynamic from "next/dynamic";
import { Logo } from "@/components/brand/Logo";

// Dynamically load the Three.js scene on the client only.
// This keeps three.js (~150KB gzipped) out of the initial bundle and
// avoids SSR errors from window/document references.
// While loading, a soft-pulsing Logo mark centres the viewport.
export const HeroScene = dynamic(
  () =>
    import("./anomalous-matter-hero").then((m) => ({
      default: m.GenerativeArtScene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-pulse opacity-30">
          <Logo size={96} />
        </div>
      </div>
    ),
  },
);
