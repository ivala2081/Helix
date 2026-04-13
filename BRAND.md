# Helix Brand Guide

## Mark

The Helix mark is an **H** whose crossbar is a stylised helix curve — an
S-shaped Bézier that represents the 2D projection of a real helix (double
spiral). The two vertical strokes are the legs of the H; the curve threads
between them at the midpoint.

```
  |       |
  |       |
  | ~~~~~ |     (helix S-curve crossbar)
  |       |
  |       |
```

### SVG source of truth

All logo renderings originate from a single file:

```
src/components/brand/Logo.tsx
```

This file exports:
- `Logo` — React component with `mark`, `wordmark`, and `stacked` variants
- `LOGO_PATHS` — the three SVG path `d` attributes (left leg, right leg, crossbar)
- `LOGO_VIEWBOX` — `"0 0 32 32"`
- `LOGO_GRADIENT_FROM` — `#10b981` (emerald-500)
- `LOGO_GRADIENT_TO` — `#3b82f6` (blue-500)

Every other rendering (favicon, PWA icons, OG image, Twitter card, GitHub
social preview) imports these constants rather than duplicating the geometry.

---

## Variants

| Variant | Usage | Component |
|---------|-------|-----------|
| **Mark** | Favicon, app icon, avatar, loading skeleton | `<Logo />` |
| **Wordmark** | Horizontal lockup: mark + "Helix" | `<Logo variant="wordmark" />` |
| **Stacked** | Vertical lockup: mark over "Helix" | `<Logo variant="stacked" />` |
| **Mono** | Single-colour `currentColor` for dark-on-light or light-on-dark surfaces | `<Logo mono />` |
| **Animated** | Header hover — crossbar draws in, glow pulse, leg fade stagger | `<AnimatedLogo />` |

---

## Colour palette

| Token | Hex | Usage |
|-------|-----|-------|
| Emerald 500 | `#10b981` | Gradient start, positive accent, marker colour |
| Blue 500 | `#3b82f6` | Gradient end, secondary accent |
| Emerald 300 | `#34d399` | Lighter accent (gradient text highlights, Three.js hero) |
| Blue 400 | `#60a5fa` | Lighter secondary (gradient text) |
| Zinc 950 | `#09090b` | Background, icon background |
| Zinc 800 | `#27272a` | Surface-2 |
| Zinc 600 | `#3f3f46` | Borders |
| Zinc 100 | `#fafafa` | Primary text |
| Zinc 400 | `#a1a1aa` | Muted / secondary text |

### Gradient

The primary brand gradient is a 135° diagonal:

```css
linear-gradient(135deg, #10b981 0%, #3b82f6 100%)
```

This gradient is used on:
- Logo mark strokes
- Hero heading text
- Globe marker colour
- Icon backgrounds (radial variant)

---

## Icon assets

All icons are generated at build time via Next.js `ImageResponse` (Satori) —
no static PNGs committed to the repo. They rebuild automatically on each deploy.

| File | Size | Purpose | Route |
|------|------|---------|-------|
| `src/app/icon.tsx` | 64×64 | Browser tab favicon | `/icon` |
| `src/app/icon0.tsx` | 192×192 | PWA standard ("any") | `/icon0` |
| `src/app/icon1.tsx` | 512×512 | PWA maskable (80% safe zone) | `/icon1` |
| `src/app/apple-icon.tsx` | 180×180 | iOS home screen | `/apple-icon` |
| `src/app/opengraph-image.tsx` | 1200×630 | OpenGraph social card | `/opengraph-image` |
| `src/app/twitter-image.tsx` | 1200×600 | Twitter/X summary_large_image | `/twitter-image` |
| `src/app/github-social/route.tsx` | 1280×640 | GitHub social preview (download) | `/github-social` |
| `src/app/telegram-avatar/route.tsx` | 800×800 | Telegram bot profile picture | `/telegram-avatar` |

### Maskable icon safe zone

Android adaptive icons crop content into arbitrary shapes (circle, squircle,
teardrop). The mark is sized inside the central **80% (410×410px of 512×512)**
so no launcher shape touches the helix:

```
┌────────────────────────────────┐  512px
│                                │
│    ┌──────────────────────┐    │
│    │                      │    │
│    │    H + helix curve   │    │  410px safe zone
│    │                      │    │
│    └──────────────────────┘    │
│                                │
└────────────────────────────────┘
```

### How to download the GitHub social preview

1. Deploy to Vercel (or run `npm run dev`)
2. Open `/github-social` in a browser
3. Right-click → Save Image As → `helix-social.png`
4. Go to GitHub → repo → Settings → Social preview → Upload

### How to set the Telegram bot profile picture

1. Deploy to Vercel (or run `npm run dev`)
2. Open `/telegram-avatar` in a browser
3. Right-click → Save Image As → `helix-telegram.png`
4. Open @BotFather on Telegram → `/setuserpic` → select your bot → upload the PNG

---

## Typography

| Role | Family | Weight | Tracking |
|------|--------|--------|----------|
| Primary | Geist Sans | 400–700 | Normal |
| Monospace | Geist Mono | 400–700 | Normal |
| Display (hero) | system-ui + `clamp()` | 600–700 | −0.02em |
| Logo wordmark | Inherits (Geist Sans) | 600 | −0.02em |

---

## Animation

### AnimatedLogo (header)

```
src/components/brand/AnimatedLogo.tsx
```

On hover:
1. **Leg fade**: left/right legs transition from 85% → 100% opacity (50ms stagger)
2. **Crossbar draw**: `stroke-dashoffset` animates by −0.4 (helix "scrolls" through)
3. **Glow**: emerald `drop-shadow` fades in (0 → 8px blur, 0.5 alpha)

Duration: 700ms crossbar, 300ms legs, 500ms glow. Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.

Respects `prefers-reduced-motion`: crossbar draw-in is suppressed.

### HeroScene loading state

While Three.js loads (~150KB gzipped), the viewport shows a soft-pulsing
`<Logo size={96} />` at 30% opacity via Tailwind's `animate-pulse`. Fades
away when the WebGL scene mounts.

---

## Minimum clear space

Maintain at least **0.25× the mark width** of clear space on all sides when
the mark appears alongside other elements. The `Logo` component already
includes no padding — spacing is the caller's responsibility via `gap-*`.

```
    ┌─────────┐
    │         │  ← 0.25× mark width minimum
    │  MARK   │
    │         │
    └─────────┘
```

---

## Don'ts

- Do not rotate or skew the mark
- Do not recolour the gradient with off-brand colours
- Do not place the gradient mark on a gradient background (use `mono` variant)
- Do not add a background shape (square, circle) around the mark — the strokes stand alone
- Do not animate the mark outside of the `AnimatedLogo` component
- Do not use raster exports when SVG is available
