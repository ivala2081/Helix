"use client";

import dynamic from "next/dynamic";

// cobe (and the Globe component) is below the fold and only needed on the
// client. Dynamic-load it to keep the WebGL bootstrap code out of the
// initial JS bundle.
export const GlobeLazy = dynamic(
  () => import("./Globe").then((m) => ({ default: m.Globe })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full max-w-[420px]" aria-hidden />
    ),
  },
);
