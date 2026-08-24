'use client';

/**
 * Shared shell for in-game action cards (buy offer, auction, quiz, tax…).
 * Docks to the bottom of the viewport instead of covering the board —
 * the game stays visible and the card feels like part of the table.
 */
export default function DockCard({
  children,
  accent,
  width = 460,
}: {
  children: React.ReactNode;
  accent?: string | null;
  width?: number;
}) {
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      display: 'flex', justifyContent: 'center',
      padding: '0 12px calc(18px + env(safe-area-inset-bottom))',
      pointerEvents: 'none',
    }}>
      <div
        className="tu-dock-in"
        style={{
          width: '100%',
          maxWidth: width,
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(22px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
          border: `1px solid ${accent ? `${accent}55` : 'var(--stroke-soft)'}`,
          borderRadius: 'var(--r-xl)',
          boxShadow: accent
            ? `var(--shadow-xl), 0 -4px 40px ${accent}18, inset 0 1px 0 oklch(1 0 0 / 0.06)`
            : 'var(--shadow-xl), inset 0 1px 0 oklch(1 0 0 / 0.06)',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        {accent && (
          <div style={{ height: 2.5, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        )}
        {children}
      </div>
    </div>
  );
}
