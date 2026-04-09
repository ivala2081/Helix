import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Helix — Price Action Backtesting",
    short_name: "Helix",
    description:
      "Test Market Structure + Fair Value Gap strategies on any Binance-listed pair.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      // Browser favicon
      { src: "/icon", sizes: "64x64", type: "image/png" },
      // PWA "any" icon — Android / desktop chrome standard
      { src: "/icon0", sizes: "192x192", type: "image/png", purpose: "any" },
      // PWA "maskable" icon — Android adaptive icons (circle, squircle, etc.)
      // Mark sized inside the 80% safe zone so launcher cropping never
      // touches the helix.
      { src: "/icon1", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // iOS home screen
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
