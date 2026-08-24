'use client';

// Minimal shared line-icon set (feather-style: stroke = currentColor).
// Replaces the emoji scattered across tiles, corners, and modal chrome.

import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  style?: CSSProperties;
}

function base(size: number, style?: CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    'aria-hidden': true,
  };
}

export function ChestIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
      <path d="M12 8v12" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export function BoltIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function TaxIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15 9.5c-.6-1-1.7-1.5-3-1.5-1.8 0-3 1-3 2.25S10.2 12 12 12s3 .75 3 2.25-1.2 2.25-3 2.25c-1.3 0-2.4-.5-3-1.5" />
    </svg>
  );
}

export function PlaneIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

export function GearIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ChainIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function UmbrellaIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <path d="M12 2a9.5 9.5 0 0 1 9.5 10H2.5A9.5 9.5 0 0 1 12 2z" />
      <path d="M12 12v7a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function SirenIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <path d="M7 18v-6a5 5 0 0 1 10 0v6" />
      <path d="M5 21a1 1 0 0 1 1-2h12a1 1 0 0 1 1 2z" transform="translate(0 -1)" />
      <path d="M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4" />
    </svg>
  );
}

export function FlagIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function HomeIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <path d="M3 9.5L12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function LockIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function CloseIcon({ size = 14, style }: IconProps) {
  return (
    <svg {...base(size, style)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Tile-type → icon component, used by TileCell and detail views
export const TILE_TYPE_ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  chest: ChestIcon,
  event: BoltIcon,
  tax: TaxIcon,
  transport: PlaneIcon,
  utility: GearIcon,
  jail: ChainIcon,
  'free-parking': UmbrellaIcon,
  'go-to-jail': SirenIcon,
  go: FlagIcon,
};

// ── Shared close button (replaces the four hand-rolled ✕ buttons) ──
export function CloseButton({ onClick, size = 28 }: { onClick: () => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid var(--stroke-soft)',
        background: 'var(--bg-raised)',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <CloseIcon size={Math.round(size * 0.5)} />
    </button>
  );
}
