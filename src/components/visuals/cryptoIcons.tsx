// Inline SVG crypto icons. Simplified geometric brand marks — small enough
// to ship inline (~12 KB total) and avoid an external icon dependency.
//
// All paths are simplified single-color geometric representations of the
// official crypto brand marks, suitable for monochrome / accent display.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const baseProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  xmlns: "http://www.w3.org/2000/svg",
});

// ── BTC ──
function BtcIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        fill="#fff"
        d="M21.92 14.42c.27-1.78-1.09-2.74-2.94-3.38l.6-2.4-1.46-.36-.58 2.34c-.39-.1-.78-.19-1.17-.27l.59-2.36-1.46-.36-.6 2.4c-.31-.07-.62-.14-.92-.21l-2.02-.5-.39 1.56s1.08.25 1.06.27c.59.15.7.54.68.85l-.68 2.74c.04.01.1.03.16.05l-.16-.04-.96 3.84c-.07.18-.26.45-.67.35.02.02-1.06-.27-1.06-.27l-.72 1.67 1.91.48c.36.09.7.18 1.04.27l-.61 2.43 1.46.36.6-2.4c.4.11.78.21 1.16.31l-.6 2.39 1.46.36.61-2.43c2.49.47 4.36.28 5.15-1.97.63-1.81-.03-2.86-1.34-3.54.95-.22 1.67-.85 1.86-2.14zm-3.33 4.69c-.45 1.81-3.51.83-4.5.59l.81-3.23c.99.25 4.17.74 3.69 2.64zm.45-4.71c-.41 1.65-2.95.81-3.78.6l.74-2.93c.83.21 3.47.59 3.04 2.33z"
      />
    </svg>
  );
}

// ── ETH ──
function EthIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path fill="#fff" fillOpacity=".6" d="M16.498 4v8.87l7.497 3.35z" />
      <path fill="#fff" d="M16.498 4 9 16.22l7.498-3.35z" />
      <path fill="#fff" fillOpacity=".6" d="M16.498 21.968v6.027L24 17.616z" />
      <path fill="#fff" d="M16.498 27.995v-6.028L9 17.616z" />
      <path fill="#fff" fillOpacity=".2" d="m16.498 20.573 7.497-4.353-7.497-3.348z" />
      <path fill="#fff" fillOpacity=".6" d="m9 16.22 7.498 4.353v-7.701z" />
    </svg>
  );
}

// ── SOL ──
function SolIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#000" />
      <defs>
        <linearGradient id="sol-grad" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path
        fill="url(#sol-grad)"
        d="M9.94 12.05c.21-.21.5-.33.8-.33h13.8c.5 0 .76.61.4.97l-3.04 3.04c-.21.21-.5.33-.8.33H7.31c-.5 0-.76-.61-.4-.97l3.03-3.04zm0 7.93c.21-.21.5-.33.8-.33h13.8c.5 0 .76.61.4.97l-3.04 3.04c-.21.21-.5.33-.8.33H7.31c-.5 0-.76-.61-.4-.97l3.03-3.04zm14.6-7.04c-.21-.21-.5-.33-.8-.33H9.94c-.5 0-.76.61-.4.97l3.04 3.04c.21.21.5.33.8.33h13.8c.5 0 .76-.61.4-.97l-3.04-3.04z"
      />
    </svg>
  );
}

// ── BNB ──
function BnbIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path
        fill="#fff"
        d="m12.116 14.404 3.884-3.884 3.886 3.886 2.26-2.26L16 6 9.856 12.144zM6 16l2.26-2.26L10.52 16l-2.26 2.26zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.258L16 26l-6.144-6.144zM21.48 16l2.26-2.26L26 16l-2.26 2.26zm-3.187-.002L16 13.704l-1.692 1.692-.196.196L16 17.79l2.293-2.292z"
      />
    </svg>
  );
}

// ── AVAX ──
function AvaxIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#E84142" />
      <path
        fill="#fff"
        d="M21.04 13.43c.51-.88 1.34-.88 1.85 0l3.16 5.55c.51.88.09 1.6-.93 1.6h-6.39c-1 0-1.43-.72-.93-1.6l3.24-5.55zM13.86 7.4c.51-.88 1.32-.88 1.83 0l.7 1.27 1.66 2.92c.41.84.41 1.84 0 2.68l-5.57 9.66c-.51.79-1.36 1.29-2.31 1.34h-4.62c-1.02 0-1.45-.71-.94-1.6l9.25-16.27z"
      />
    </svg>
  );
}

// ── MATIC ──
function MaticIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#8247E5" />
      <path
        fill="#fff"
        d="M21.092 12.693c-.369-.215-.848-.215-1.254 0l-2.879 1.654-1.955 1.078-2.842 1.654c-.369.215-.848.215-1.254 0l-2.214-1.292c-.369-.215-.627-.61-.627-1.04V11.83c0-.43.222-.825.627-1.04l2.214-1.255c.369-.215.848-.215 1.254 0l2.214 1.292c.369.215.627.61.627 1.04v1.654l1.955-1.114v-1.692c0-.43-.222-.825-.627-1.04l-4.13-2.41c-.369-.215-.848-.215-1.254 0l-4.21 2.447c-.405.215-.627.61-.627 1.04v4.819c0 .43.222.825.627 1.04l4.21 2.41c.369.215.848.215 1.254 0l2.842-1.617 1.955-1.114 2.842-1.617c.369-.215.848-.215 1.254 0l2.214 1.255c.369.215.627.61.627 1.04v2.483c0 .43-.222.825-.627 1.04l-2.176 1.255c-.369.215-.848.215-1.254 0l-2.214-1.255c-.369-.215-.627-.61-.627-1.04v-1.654l-1.955 1.114v1.654c0 .43.222.825.627 1.04l4.21 2.447c.369.215.848.215 1.254 0l4.21-2.447c.369-.215.627-.61.627-1.04v-4.856c0-.43-.222-.825-.627-1.04l-4.21-2.41z"
      />
    </svg>
  );
}

// ── ADA ──
function AdaIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#0033AD" />
      <g fill="#fff">
        <circle cx="16" cy="16" r="2" />
        <circle cx="16" cy="9" r="1" />
        <circle cx="16" cy="23" r="1" />
        <circle cx="10" cy="12.5" r="1" />
        <circle cx="22" cy="12.5" r="1" />
        <circle cx="10" cy="19.5" r="1" />
        <circle cx="22" cy="19.5" r="1" />
        <circle cx="8" cy="16" r="0.8" />
        <circle cx="24" cy="16" r="0.8" />
        <circle cx="13" cy="7" r="0.7" />
        <circle cx="19" cy="7" r="0.7" />
        <circle cx="13" cy="25" r="0.7" />
        <circle cx="19" cy="25" r="0.7" />
      </g>
    </svg>
  );
}

// ── XRP ──
function XrpIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#23292F" />
      <path
        fill="#fff"
        d="M22.84 8h2.42l-5.04 4.99c-2.34 2.32-6.13 2.32-8.47 0L6.71 8h2.42l3.83 3.79c1.5 1.49 3.94 1.49 5.45 0L22.21 8h.63zM9.1 24.18H6.68l5.07-5.02c2.34-2.32 6.13-2.32 8.47 0l5.07 5.02h-2.42l-3.86-3.82c-1.5-1.49-3.94-1.49-5.45 0L9.1 24.18z"
      />
    </svg>
  );
}

// ── DOT ──
function DotIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#E6007A" />
      <ellipse cx="16" cy="9" rx="3.5" ry="1.5" fill="#fff" />
      <ellipse cx="16" cy="23" rx="3.5" ry="1.5" fill="#fff" />
      <ellipse cx="10" cy="12.5" rx="3.5" ry="1.5" fill="#fff" transform="rotate(-60 10 12.5)" />
      <ellipse cx="22" cy="12.5" rx="3.5" ry="1.5" fill="#fff" transform="rotate(60 22 12.5)" />
      <ellipse cx="10" cy="19.5" rx="3.5" ry="1.5" fill="#fff" transform="rotate(60 10 19.5)" />
      <ellipse cx="22" cy="19.5" rx="3.5" ry="1.5" fill="#fff" transform="rotate(-60 22 19.5)" />
    </svg>
  );
}

// ── LINK ──
function LinkIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#2A5ADA" />
      <path fill="#fff" d="M16 6 7 11.2v9.6l9 5.2 9-5.2v-9.6L16 6zm-6.5 13.5v-7l6.5-3.75 6.5 3.75v7L16 23.25 9.5 19.5z" />
    </svg>
  );
}

// ── ATOM ──
function AtomIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#2E3148" />
      <g fill="none" stroke="#fff" strokeWidth="1.4">
        <ellipse cx="16" cy="16" rx="9" ry="3.5" />
        <ellipse cx="16" cy="16" rx="9" ry="3.5" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="9" ry="3.5" transform="rotate(120 16 16)" />
      </g>
      <circle cx="16" cy="16" r="1.6" fill="#fff" />
    </svg>
  );
}

// ── UNI ──
function UniIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#FF007A" />
      <path
        fill="#fff"
        d="M11.5 8c-1.2 1.5-1.5 3-1.5 4.8 0 2.5 1.5 4.7 4 6.2 2 1.2 3 2.2 3 4 0 .8-.3 1.5-.8 2-.5.5-1.2.8-2 .8-1.5 0-2.7-1.2-2.7-2.7 0-.5.2-1 .5-1.4-.7.5-1.2 1.4-1.2 2.4 0 1.8 1.5 3.3 3.4 3.3 1.2 0 2.3-.5 3.1-1.4.8-.9 1.2-2 1.2-3.2 0-2.5-1.5-4.5-4.3-6-2-1.1-3-2.3-3-4 0-.7.2-1.3.7-1.8.5-.5 1.1-.8 1.9-.8 1 0 1.8.5 2.3 1.3-.3-1.5-1.6-2.5-3.1-2.5-.5 0-1 .1-1.5.3z"
      />
    </svg>
  );
}

// ── DOGE ──
function DogeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#C2A633" />
      <path
        fill="#fff"
        d="M11 9.5h6.2c4.5 0 7 2.4 7 6.5s-2.5 6.5-7 6.5H11V18h2.5v-4H11V9.5zm4.7 9.7h1.5c2.6 0 4-1.3 4-3.2s-1.4-3.2-4-3.2h-1.5v6.4z"
      />
    </svg>
  );
}

// ── TRX ──
function TrxIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#EB0029" />
      <path fill="#fff" d="M22.6 11 6.5 8l8.6 18 9.6-15-2.1zM21.5 12 11 9.7l8.5 12.4L21.5 12zM10.7 10.4 8.7 9.6l5.6 11.2-3.6-10.4zm9.2 1.7L15.5 21l-3.5-9.2 7.9.3z" />
    </svg>
  );
}

// ── LTC ──
function LtcIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="16" cy="16" r="16" fill="#345D9D" />
      <path fill="#fff" d="m13.7 17.7-1.5 5h11.6V19H17l1-3.4-2.7.7 1.4-4.7-2.5.7-1.5 5.4 2-.6z" />
    </svg>
  );
}

// ── Fallback (gradient circle) ──
function GenericIcon({ size = 20, ticker, ...props }: IconProps & { ticker: string }) {
  // Stable hue from ticker hash
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return (
    <svg {...baseProps(size)} {...props}>
      <defs>
        <linearGradient id={`g-${ticker}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={`hsl(${hue}, 70%, 55%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 50) % 360}, 70%, 35%)`} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#g-${ticker})`} />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui, sans-serif"
        fontSize="12"
        fontWeight="700"
      >
        {ticker.slice(0, 1)}
      </text>
    </svg>
  );
}

const REGISTRY: Record<string, (props: IconProps) => React.JSX.Element> = {
  BTC: BtcIcon,
  ETH: EthIcon,
  SOL: SolIcon,
  BNB: BnbIcon,
  AVAX: AvaxIcon,
  MATIC: MaticIcon,
  ADA: AdaIcon,
  XRP: XrpIcon,
  DOT: DotIcon,
  LINK: LinkIcon,
  ATOM: AtomIcon,
  UNI: UniIcon,
  DOGE: DogeIcon,
  TRX: TrxIcon,
  LTC: LtcIcon,
};

export function CryptoIcon({
  ticker,
  size = 20,
  ...props
}: { ticker: string } & IconProps) {
  const upper = ticker.toUpperCase();
  const Component = REGISTRY[upper];
  if (Component) return <Component size={size} {...props} />;
  return <GenericIcon ticker={upper} size={size} {...props} />;
}
