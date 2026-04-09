import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensures barrel-file imports (e.g. lucide-react) are tree-shaken to only the
  // icons that are actually used. Big wins for lucide-react (~700 icons),
  // framer-motion, and recharts.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "three",
      "@radix-ui/react-icons",
    ],
  },
  // Production source maps are only useful when debugging — they double the
  // build size and slow down builds. Disable for landing-page perf.
  productionBrowserSourceMaps: false,
  compiler: {
    // Strip console.* in production except warn/error.
    removeConsole: {
      exclude: ["warn", "error"],
    },
  },
};

export default nextConfig;
