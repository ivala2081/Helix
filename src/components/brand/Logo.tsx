/**
 * Helix brand logo. Single SVG source of truth — used in the header,
 * footer, 404 page, ImageResponse files (icon/apple-icon/og), and
 * any future loading states.
 *
 * Design: an `H` whose crossbar is a stylised helix curve (an `S`
 * silhouette — the 2D projection of a real helix). Two vertical legs
 * at x=8 and x=24 in a 32×32 viewBox; the crossbar is a single
 * cubic+smooth-cubic Bezier sweeping through y=16.
 *
 * Variants:
 *  - "mark"     → just the H (square)
 *  - "wordmark" → mark + "Helix" text on the right (horizontal)
 *  - "stacked"  → mark on top, "Helix" centred below
 *
 * `mono` strips the gradient and renders in `currentColor` so the
 * caller can drop it on dark CTAs, share-sheet buttons, etc.
 *
 * The gradient id is intentionally static. Multiple instances on the
 * same page reference the same `<defs>` — visually identical, no
 * collision. (Avoids `useId`, which Satori/ImageResponse don't support.)
 */
const GRAD_ID = "helix-brand-gradient";

// Single source of truth for the H + helix-curve mark.
// Imported by ImageResponse files (icon, apple-icon, og) so the favicon,
// app icon, and social card all stay byte-identical to the inline component.
export const LOGO_PATHS = {
  leftLeg: "M8 4 V28",
  rightLeg: "M24 4 V28",
  crossbar: "M8 16 C12 9 16 9 16 16 S20 23 24 16",
} as const;
export const LOGO_VIEWBOX = "0 0 32 32";
export const LOGO_GRADIENT_FROM = "#10b981";
export const LOGO_GRADIENT_TO = "#3b82f6";

export function Logo({
  variant = "mark",
  size = 32,
  mono = false,
  className,
  title = "Helix",
}: {
  variant?: "mark" | "wordmark" | "stacked";
  size?: number;
  mono?: boolean;
  className?: string;
  title?: string;
}) {
  const stroke = mono ? "currentColor" : `url(#${GRAD_ID})`;

  const mark = (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {!mono && (
        <defs>
          <linearGradient
            id={GRAD_ID}
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
      )}
      <path
        d={LOGO_PATHS.leftLeg}
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d={LOGO_PATHS.rightLeg}
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d={LOGO_PATHS.crossbar}
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === "mark") {
    return <span className={className}>{mark}</span>;
  }

  if (variant === "wordmark") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3 }}
      >
        {mark}
        <span
          style={{
            fontSize: size * 0.78,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Helix
        </span>
      </span>
    );
  }

  // stacked
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size * 0.18,
      }}
    >
      {mark}
      <span
        style={{
          fontSize: size * 0.5,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        Helix
      </span>
    </span>
  );
}
