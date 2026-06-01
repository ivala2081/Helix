import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Forward Test",
  description:
    "Helix V5 running live on 5 coins (BTC, ETH, SOL, XRP, BNB) with real Binance 1h candles. True out-of-sample evidence, no look-ahead, no resets.",
  openGraph: {
    title: "Helix — Live Forward Test",
    description:
      "V5 strategy running on 5 coins in real time. The only true out-of-sample test.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Helix — Live Forward Test",
    description:
      "V5 strategy running on 5 coins in real time. The only true out-of-sample test.",
  },
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
