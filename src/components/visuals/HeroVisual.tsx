"use client";

// Minimal-modern hero visual: an animated 3D-perspective candlestick lattice.
//
// Pure Canvas2D, no Three.js, no Spline, no external scene downloads.
// ~5 KB, renders instantly, runs at 60fps. Theme: trading data, but abstract
// enough that it doesn't feel literal — just "lots of price information,
// slowly rotating, beautiful."

import { useEffect, useRef } from "react";

interface Candle3D {
  x: number; // grid position
  z: number;
  baseHeight: number; // resting body height
  amplitude: number; // how dramatic this candle's pulse is
  speed: number; // per-candle frequency (chaos!)
  speed2: number; // secondary slow drift frequency (incommensurate)
  phase: number; // primary phase offset
  phase2: number; // secondary phase offset
  flipPhase: number; // controls when this candle flips bullish/bearish
  flipSpeed: number; // how often it flips
}

const GRID_W = 9;
const GRID_D = 11;
const SPACING = 0.55;

// Deterministic hash → 0..1, decoupled per channel
function hash01(seed: number, channel: number): number {
  const v = Math.sin(seed * 12.9898 + channel * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function buildCandles(): Candle3D[] {
  const out: Candle3D[] = [];
  for (let xi = 0; xi < GRID_W; xi++) {
    for (let zi = 0; zi < GRID_D; zi++) {
      const x = (xi - (GRID_W - 1) / 2) * SPACING;
      const z = (zi - (GRID_D - 1) / 2) * SPACING;
      const seed = xi * 31 + zi * 13;
      // Each candle gets independent speed, amplitude, phase from
      // separate hash channels — no synchronized motion.
      const r1 = hash01(seed, 1);
      const r2 = hash01(seed, 2);
      const r3 = hash01(seed, 3);
      const r4 = hash01(seed, 4);
      const r5 = hash01(seed, 5);
      const r6 = hash01(seed, 6);
      out.push({
        x,
        z,
        baseHeight: 0.3 + r1 * 0.85,
        amplitude: 0.35 + r2 * 0.9, // wide spread → some barely move, some swing hard
        speed: 0.35 + r3 * 1.95, // 0.35..2.30 rad/s — wide spread, no LCM cycle
        speed2: 0.07 + r4 * 0.23, // very slow drift, incommensurate with speed
        phase: r5 * Math.PI * 2,
        phase2: r6 * Math.PI * 2,
        flipPhase: r1 * Math.PI * 2,
        flipSpeed: 0.08 + r4 * 0.18, // each candle flips color on its own timer
      });
    }
  }
  return out;
}

export function HeroVisual({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const candlesRef = useRef<Candle3D[]>(buildCandles());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();

    const render = () => {
      const t = (performance.now() - start) / 1000;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // ── Camera ──
      // Slow rotation around the Y axis. Slight tilt down (theta).
      const angle = t * 0.18;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt = 0.55; // ~32°
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      // ── Project each candle ──
      type Projected = {
        cx: number;
        cy: number;
        topY: number;
        bodyW: number;
        bodyH: number;
        depth: number;
        bullish: boolean;
        phasePulse: number;
      };
      const projected: Projected[] = [];

      const focal = Math.min(W, H) * 0.95;
      const cameraDist = 5.2;

      for (const c of candlesRef.current) {
        // Two layered sine waves at incommensurate frequencies →
        // each candle has its own non-repeating motion. No two candles
        // pulse together for more than a moment.
        const wave1 = Math.sin(t * c.speed + c.phase);
        const wave2 = Math.sin(t * c.speed2 + c.phase2);
        const pulse = 0.5 + 0.5 * (wave1 * 0.75 + wave2 * 0.25);
        const animH = c.baseHeight * (0.35 + c.amplitude * pulse);

        // Color flips on its own slow clock — bars trade red/green over time
        const bullish = Math.sin(t * c.flipSpeed + c.flipPhase) > 0;

        // Rotate around Y
        const rx = c.x * cosA + c.z * sinA;
        const rz = c.z * cosA - c.x * sinA;
        // Apply tilt around X
        const ry0 = 0; // ground center
        const ry = ry0 * cosT - rz * sinT;
        const rzT = rz * cosT + ry0 * sinT;

        // Top of the candle (extrudes upward in world Y)
        const topYWorld = ry - animH * cosT;

        const z = rzT + cameraDist;
        if (z <= 0.1) continue;

        const px = (rx / z) * focal + W / 2;
        const py = (ry / z) * focal + H / 2;
        const topPy = (topYWorld / z) * focal + H / 2;

        const scale = focal / (z * 100);
        const bodyW = Math.max(2, scale * 9 * dpr);
        const bodyH = Math.abs(py - topPy);

        projected.push({
          cx: px,
          cy: py,
          topY: topPy,
          bodyW,
          bodyH,
          depth: z,
          bullish,
          phasePulse: pulse,
        });
      }

      // Z-sort: farther first
      projected.sort((a, b) => b.depth - a.depth);

      // ── Draw ──
      for (const p of projected) {
        const farMin = cameraDist - 3;
        const farMax = cameraDist + 3;
        const depthN = 1 - Math.min(Math.max((p.depth - farMin) / (farMax - farMin), 0), 1);

        // Base colors (emerald / red)
        const base = p.bullish ? [16, 185, 129] : [239, 68, 68];
        const alpha = 0.35 + depthN * 0.55;
        const glowAlpha = 0.06 + depthN * 0.18;

        // Glow halo (closer candles glow more)
        ctx.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${glowAlpha})`;
        const haloW = p.bodyW * 3;
        ctx.fillRect(
          p.cx - haloW / 2,
          Math.min(p.cy, p.topY) - haloW / 2,
          haloW,
          p.bodyH + haloW,
        );

        // The candle body
        ctx.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${alpha})`;
        const bodyTop = Math.min(p.cy, p.topY);
        const bodyHeight = Math.max(p.bodyH, 1);
        ctx.fillRect(p.cx - p.bodyW / 2, bodyTop, p.bodyW, bodyHeight);

        // Top highlight line — adds the "modern" sharpness
        ctx.fillStyle = `rgba(255,255,255,${0.15 + depthN * 0.25})`;
        ctx.fillRect(p.cx - p.bodyW / 2, bodyTop, p.bodyW, Math.max(1, dpr));
      }

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        aria-hidden
        style={{ display: "block" }}
      />
    </div>
  );
}
