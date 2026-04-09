"use client";

import createGlobe, { type Marker } from "cobe";
import { useEffect, useRef } from "react";

// Marker sizes are intentionally small (0.025 – 0.04).
// cobe markers are rendered on the *unit sphere* — values above ~0.05 cover
// entire continents and look like cartoon stickers. The previous values
// (0.05 – 0.09) were ~2× too big.
const DEFAULT_MARKERS: Marker[] = [
  { location: [1.3521, 103.8198], size: 0.04 },   // Singapore
  { location: [37.7749, -122.4194], size: 0.04 }, // SF
  { location: [40.7128, -74.006], size: 0.04 },   // NY
  { location: [51.5074, -0.1278], size: 0.035 },  // London
  { location: [35.6762, 139.6503], size: 0.035 }, // Tokyo
  { location: [22.3193, 114.1694], size: 0.03 },  // Hong Kong
  { location: [25.2048, 55.2708], size: 0.03 },   // Dubai
  { location: [-33.8688, 151.2093], size: 0.03 }, // Sydney
  { location: [50.1109, 8.6821], size: 0.028 },   // Frankfurt
  { location: [41.0082, 28.9784], size: 0.028 },  // Istanbul
  { location: [37.5665, 126.978], size: 0.03 },   // Seoul
  { location: [13.7563, 100.5018], size: 0.025 }, // Bangkok
  { location: [-23.5505, -46.6333], size: 0.028 },// São Paulo
  { location: [19.076, 72.8777], size: 0.03 },    // Mumbai
];

// Rotation speed in radians/second. Old value was 0.003/frame at 60fps,
// which is ~0.18 rad/sec — kept identical, but now frame-rate independent.
const TARGET_SPEED = 0.18;
const RAMP_MS = 1500; // ease-in for rotation start
const FADE_MS = 800;  // canvas fade in/out

/**
 * Self-sizing globe with:
 *  - Frame-rate-independent rotation that eases in over 1.5s
 *  - Soft canvas fade-in/out instead of "blank flash" on scroll
 *  - Refined cobe params (sharper land detail, brighter markers, softer terminator)
 *  - Ambient radial halo behind the globe for depth
 *  - prefers-reduced-motion respected (rotation pinned to 0)
 *  - Pause via canvas opacity + deferred destroy → no jarring flash on
 *    IntersectionObserver re-entry
 */
export function Globe({
  size,
  markers = DEFAULT_MARKERS,
  className,
}: {
  size?: number;
  markers?: Marker[];
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phiRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let globe: ReturnType<typeof createGlobe> | null = null;
    let rafId = 0;
    let pendingDestroy: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let isInView = false;
    let isPageVisible = !document.hidden;
    let currentSize = 0;
    let startedAt = 0;
    let lastFrameTime = 0;

    const measure = () => size ?? Math.max(1, wrap.clientWidth);
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (!globe || !running) return;
      if (!startedAt) {
        startedAt = now;
        lastFrameTime = now;
      }
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;
      const elapsed = now - startedAt;
      const ramp = reduced ? 0 : easeOutCubic(Math.min(1, elapsed / RAMP_MS));
      phiRef.current += TARGET_SPEED * ramp * dt;
      globe.update({ phi: phiRef.current });
      rafId = requestAnimationFrame(tick);
    };

    const createInstance = () => {
      currentSize = measure();
      canvas.style.opacity = "0";
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: currentSize * dpr,
        height: currentSize * dpr,
        phi: phiRef.current,
        theta: 0.3,
        dark: 1,
        diffuse: 0.85,           // softer terminator (was 1.2 — too contrasty)
        mapSamples: 22000,       // crisper land mass dots (was 16000)
        mapBrightness: 5.2,      // slightly less harsh (was 6)
        baseColor: [0.06, 0.07, 0.08],
        markerColor: [0.31, 0.95, 0.71], // brighter emerald-300 — pops on dark land
        glowColor: [0.08, 0.55, 0.42],   // warmer rim glow
        markers,
      });
    };

    const start = () => {
      if (pendingDestroy) {
        clearTimeout(pendingDestroy);
        pendingDestroy = null;
      }
      if (!globe) createInstance();
      if (running) return;
      running = true;
      startedAt = 0;
      lastFrameTime = 0;
      rafId = requestAnimationFrame(tick);
      // Trigger fade-in on the next frame so cobe has painted at least once
      requestAnimationFrame(() => {
        canvas.style.opacity = "1";
      });
    };

    const pause = () => {
      if (!running && !globe) return;
      running = false;
      cancelAnimationFrame(rafId);
      canvas.style.opacity = "0";
      // Defer the WebGL teardown until the fade-out finishes so the user
      // never sees a "blank flash". Cancellable if we re-enter view.
      if (pendingDestroy) clearTimeout(pendingDestroy);
      pendingDestroy = setTimeout(() => {
        if (globe) {
          globe.destroy();
          globe = null;
        }
        pendingDestroy = null;
      }, FADE_MS + 50);
    };

    const sync = () => {
      if (isInView && isPageVisible) start();
      else pause();
    };

    const io = new IntersectionObserver(
      (entries) => {
        isInView = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);

    const handleVisibility = () => {
      isPageVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Real width changes (>40px) — destroy immediately and let sync() recreate.
    // Below the threshold we ignore oscillations from sub-pixel layout shifts.
    const ro = new ResizeObserver(() => {
      const next = measure();
      if (Math.abs(next - currentSize) < 40) return;
      if (pendingDestroy) {
        clearTimeout(pendingDestroy);
        pendingDestroy = null;
      }
      cancelAnimationFrame(rafId);
      running = false;
      if (globe) {
        globe.destroy();
        globe = null;
      }
      sync();
    });
    ro.observe(wrap);

    return () => {
      if (pendingDestroy) clearTimeout(pendingDestroy);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(rafId);
      if (globe) globe.destroy();
      globe = null;
    };
  }, [size, markers]);

  return (
    <div
      ref={wrapRef}
      className={`relative aspect-square w-full max-w-[420px] ${className ?? ""}`}
    >
      {/* Ambient radial halo behind the globe. Lives on its own paint layer
          (-z-10) and ignores pointer events. Adds depth without affecting
          the cobe canvas itself. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10"
        style={{
          background:
            "radial-gradient(closest-side, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.06) 45%, transparent 75%)",
          filter: "blur(20px)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
          transition: `opacity ${FADE_MS}ms ease-out`,
        }}
        aria-hidden
      />
    </div>
  );
}
