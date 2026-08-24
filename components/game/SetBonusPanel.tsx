'use client';

// Shared "monopoly bonus" panel — shown active (full set owned) or locked.
// Used by TileDetailModal and PropertyManager.

interface SetBonusPanelProps {
  setColor: string | null;
  active: boolean;
  description: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

export default function SetBonusPanel({ setColor, active, description, compact = false, style }: SetBonusPanelProps) {
  const accent = setColor ?? 'var(--neon-lime)';
  const iconSize = compact ? 11 : 14;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: compact ? 7 : 8,
      padding: compact ? '6px 10px' : '8px 12px',
      borderRadius: compact ? 'var(--r-sm)' : 'var(--r-md)',
      background: active ? `${accent}10` : 'oklch(1 0 0 / 0.02)',
      border: `1px solid ${active ? `${accent}30` : 'var(--stroke-hairline)'}`,
      opacity: active ? 1 : 0.55,
      transition: 'opacity 0.3s, background 0.3s',
      ...style,
    }}>
      {active ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: compact ? 7.5 : 8,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
          color: active ? accent : 'var(--text-faint)',
        }}>
          {active ? 'Monopoly Bonus Active' : 'Monopoly Bonus (locked)'}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: compact ? 10 : 11, lineHeight: 1.4,
          color: active ? 'var(--text-secondary)' : 'var(--text-faint)',
        }}>
          {description}
        </div>
      </div>
    </div>
  );
}
