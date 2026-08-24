'use client';

import { useEffect, useState } from 'react';
import { neonOf } from '@/lib/colors';

interface Props {
  playerName: string;
  playerColor: string;
  isMe: boolean;
  isBot?: boolean;
  isMobile?: boolean;
}

/**
 * Slim, non-intrusive turn banner. Slides in below the top bar instead of
 * taking over the screen — the board stays fully visible and interactive.
 */
export default function TurnAnnouncer({ playerName, playerColor, isMe, isBot, isMobile = false }: Props) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const neon = neonOf(playerColor);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 20);
    const t2 = setTimeout(() => setPhase('exit'), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const visible = phase === 'visible';

  return (
    <div
      style={{
        position: 'fixed',
        top: isMobile ? 12 : 68,
        left: '50%',
        zIndex: 65,
        pointerEvents: 'none',
        transform: `translate(-50%, ${visible ? 0 : -14}px)`,
        opacity: visible ? 1 : 0,
        transition: phase === 'enter'
          ? 'none'
          : 'opacity 280ms var(--ease-out), transform 340ms var(--ease-spring)',
        animation: phase === 'visible' ? 'tu-banner-in 340ms var(--ease-spring)' : undefined,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px 10px 12px',
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(20px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.15)',
        border: `1px solid ${neon}66`,
        borderRadius: 'var(--r-pill)',
        boxShadow: 'var(--shadow-lg)',
        whiteSpace: 'nowrap',
      }}>
        {/* Player dot */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 32%, oklch(1 0 0 / 0.55), ${neon} 60%)`,
          border: '2px solid oklch(1 0 0 / 0.25)',
          flexShrink: 0,
        }} />
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5,
            letterSpacing: '-0.01em', color: 'var(--text-primary)', lineHeight: 1.15,
          }}>
            {isMe ? <>Your <span style={{ color: neon }}>turn!</span></> : <><span style={{ color: neon }}>{playerName}</span>&apos;s turn</>}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginTop: 1,
          }}>
            {isMe ? 'Roll the dice' : isBot ? 'Bot is thinking…' : 'Waiting for roll…'}
          </div>
        </div>
      </div>
    </div>
  );
}
