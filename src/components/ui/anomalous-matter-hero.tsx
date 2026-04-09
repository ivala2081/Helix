"use client";

import { useEffect, useRef } from "react";
import {
  Color,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

const VERTEX_SHADER = `
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normal;
    vPosition = position;
    float displacement = snoise(position * 2.0 + time * 0.5) * 0.2;
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 color;
  uniform vec3 pointLightPos;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(pointLightPos - vPosition);
    float diffuse = max(dot(normal, lightDir), 0.0);
    float fresnel = 1.0 - dot(normal, vec3(0.0, 0.0, 1.0));
    fresnel = pow(fresnel, 2.0);
    vec3 finalColor = color * diffuse + color * fresnel * 0.5;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function GenerativeArtScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || typeof window === "undefined") return;

    // ── Device tier detection ────────────────────────────────────────────
    const isMobile =
      typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent));
    const detail = isMobile ? 3 : 4;
    const maxDpr = isMobile ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    // ── Scene setup ──────────────────────────────────────────────────────
    const scene = new Scene();
    const camera = new PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 3;

    const renderer = new WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(dpr);
    currentMount.appendChild(renderer.domElement);

    const geometry = new IcosahedronGeometry(1.2, detail);
    const material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointLightPos: { value: new Vector3(0, 0, 5) },
        color: { value: new Color("#34d399") },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      wireframe: true,
    });

    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    // ── Reusable vectors for mousemove (no per-event allocation) ─────────
    const mouseVec = new Vector3();
    const lightPos = new Vector3(0, 0, 5);

    // ── Frame-rate-independent animation loop ────────────────────────────
    let frameId = 0;
    let lastTime = performance.now();
    let isVisible = true;
    let isInViewport = true;

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate);

      if (!isVisible || !isInViewport) {
        lastTime = now;
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp to avoid huge jumps after tab restore
      lastTime = now;

      material.uniforms.time.value = now * 0.0003;
      // 0.0005 rad/frame at 60fps = 0.03 rad/sec
      mesh.rotation.y += 0.03 * dt;
      mesh.rotation.x += 0.012 * dt;
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    // ── Debounced resize via ResizeObserver ──────────────────────────────
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const performResize = () => {
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(performResize, 120);
    });
    ro.observe(currentMount);

    // ── Mousemove with reused vectors ────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseVec.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
      const dist = -camera.position.z / mouseVec.z;
      lightPos.copy(camera.position).addScaledVector(mouseVec, dist);
      material.uniforms.pointLightPos.value.copy(lightPos);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // ── Pause when tab hidden ────────────────────────────────────────────
    const handleVisibility = () => {
      isVisible = !document.hidden;
      lastTime = performance.now();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── Pause when scrolled out of view ──────────────────────────────────
    const io = new IntersectionObserver(
      (entries) => {
        isInViewport = entries[0]?.isIntersecting ?? true;
        lastTime = performance.now();
      },
      { rootMargin: "100px" },
    );
    io.observe(currentMount);

    return () => {
      cancelAnimationFrame(frameId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      scene.clear();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />;
}
