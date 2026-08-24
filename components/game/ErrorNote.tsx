'use client';

// Shared inline error note — replaces the copy-pasted error box across
// ActionPanel, modals, and the lobby.

export default function ErrorNote({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  if (!children) return null;
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--danger)',
      background: 'var(--danger-soft)', border: '1px solid oklch(0.71 0.155 25 / 0.3)',
      borderRadius: 'var(--r-sm)', padding: '7px 11px',
      ...style,
    }}>
      {children}
    </div>
  );
}
