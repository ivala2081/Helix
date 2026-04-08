"use client";

import createGlobe, { type Marker } from "cobe";
import { useEffect, useRef } from "react";

const DEFAULT_MARKERS: Marker[] = [
  // Major crypto exchange HQs and trading hubs
  { location: [1.3521, 103.8198], size: 0.09 }, // Singapore — Binance, OKX, Crypto.com
  { location: [37.7749, -122.4194], size: 0.08 }, // SF — Coinbase, Kraken
  { location: [40.7128, -74.006], size: 0.08 }, // NY — Gemini, BlockFi, Bitstamp US
  { location: [51.5074, -0.1278], size: 0.07 }, // London — Bitstamp, Revolut
  { location: [35.6762, 139.6503], size: 0.07 }, // Tokyo — bitFlyer, Liquid
  { location: [22.3193, 114.1694], size: 0.07 }, // Hong Kong — Bybit, FTX (former)
  { location: [25.2048, 55.2708], size: 0.07 }, // Dubai — Binance MENA, Bybit
  { location: [-33.8688, 151.2093], size: 0.06 }, // Sydney — BTC Markets
  { location: [50.1109, 8.6821], size: 0.06 }, // Frankfurt — Bitvavo, Bison
  { location: [41.0082, 28.9784], size: 0.06 }, // Istanbul — BtcTurk, Paribu
  { location: [37.5665, 126.978], size: 0.07 }, // Seoul — Upbit, Bithumb
  { location: [13.7563, 100.5018], size: 0.05 }, // Bangkok — Bitkub
  { location: [-23.5505, -46.6333], size: 0.06 }, // São Paulo — Mercado Bitcoin
  { location: [19.076, 72.8777], size: 0.06 }, // Mumbai — WazirX, CoinDCX
];

export function Globe({
  size = 360,
  markers = DEFAULT_MARKERS,
  className,
}: {
  size?: number;
  markers?: Marker[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let phi = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.06, 0.06, 0.07],
      markerColor: [0.063, 0.725, 0.506], // emerald
      glowColor: [0.06, 0.4, 0.3],
      markers,
    });

    const tick = () => {
      phi += 0.003;
      globe.update({ phi });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      globe.destroy();
    };
  }, [size, markers]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, maxWidth: "100%", aspectRatio: "1" }}
      className={className}
      aria-hidden
    />
  );
}
