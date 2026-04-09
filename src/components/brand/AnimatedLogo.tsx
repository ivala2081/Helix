"use client";

import {
  LOGO_GRADIENT_FROM,
  LOGO_GRADIENT_TO,
  LOGO_PATHS,
  LOGO_VIEWBOX,
} from "./Logo";

/**
 * Animated variant of the Helix mark. On hover the helix crossbar
 * draws itself via stroke-dashoffset, the legs fade in with a slight
 * stagger, and the whole mark pulses with a soft glow.
 *
 * Uses pure CSS transitions + `:hover` on the wrapper — no JS, no
 * framer-motion, no requestAnimationFrame. Stays static when
 * prefers-reduced-motion is set.
 */
export function AnimatedLogo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const gradId = "anim-logo-grad";

  return (
    <span className={`group/logo inline-flex ${className ?? ""}`}>
      <svg
        viewBox={LOGO_VIEWBOX}
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Helix"
        className="transition-[filter] duration-500 ease-out group-hover/logo:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      >
        <defs>
          <linearGradient
            id={gradId}
            x1="4"
            y1="4"
            x2="28"
            y2="28"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={LOGO_GRADIENT_FROM} />
            <stop offset="1" stopColor={LOGO_GRADIENT_TO} />
          </linearGradient>
        </defs>

        {/* Left leg — slight scale-up on hover */}
        <path
          d={LOGO_PATHS.leftLeg}
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          className="origin-center transition-opacity duration-300 ease-out group-hover/logo:opacity-100"
          style={{ opacity: 0.85 }}
        />
        {/* Right leg — slight delay stagger */}
        <path
          d={LOGO_PATHS.rightLeg}
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          className="origin-center transition-opacity duration-300 ease-out [transition-delay:50ms] group-hover/logo:opacity-100"
          style={{ opacity: 0.85 }}
        />
        {/* Helix crossbar — draw-in effect via dashoffset */}
        <path
          d={LOGO_PATHS.crossbar}
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="0"
          className="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:[stroke-dashoffset:-0.4] motion-reduce:![stroke-dashoffset:0]"
        />
      </svg>
    </span>
  );
}
