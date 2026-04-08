"use client";

// Lightweight WebGL shader background — animated emerald/blue gradient mesh.
// No Three.js. Single fragment shader rendered on a fullscreen quad. ~3 KB gzipped.
// Fixed position, sits behind everything (z-index: -10).

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Animated noise / gradient — slow, painterly, low-frequency. Designed to look
// premium-fintech: deep navy/black with subtle emerald and blue blooms drifting.
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

// Hash + value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 1.6;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.04;

  // Two slow-moving "bloom" centers
  vec2 c1 = vec2(0.3 + 0.15 * sin(t * 0.7), 0.6 + 0.1 * cos(t));
  vec2 c2 = vec2(0.75 + 0.12 * cos(t * 0.6), 0.35 + 0.15 * sin(t * 0.9));

  float d1 = distance(uv, c1);
  float d2 = distance(uv, c2);

  // Soft falloff blooms
  float bloom1 = exp(-d1 * 3.5);
  float bloom2 = exp(-d2 * 3.8);

  // Add fbm distortion
  float n = fbm(p + vec2(t * 0.4, t * 0.3));
  bloom1 *= 0.7 + 0.6 * n;
  bloom2 *= 0.7 + 0.6 * n;

  // Colors: emerald-500 and blue-500 over zinc-950
  vec3 base = vec3(0.035, 0.035, 0.043);    // ~zinc-950
  vec3 emerald = vec3(0.063, 0.725, 0.506); // emerald-500
  vec3 blue = vec3(0.231, 0.510, 0.965);    // blue-500

  vec3 col = base;
  col += emerald * bloom1 * 0.55;
  col += blue * bloom2 * 0.45;

  // Subtle vignette
  float vig = 1.0 - smoothstep(0.5, 1.4, length(uv - 0.5));
  col *= 0.6 + 0.4 * vig;

  // Faint scanline / film grain
  float grain = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.025;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("Shader compile error:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: 0.55 }}
    />
  );
}
