'use client';

import { useEffect, useState } from 'react';

interface Props {
  playerName: string;
  playerColor: string;
  isMe: boolean;
  isBot?: boolean;
}

const NEON: Record<string, string> = {
  cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)', lime: 'var(--neon-lime)',
  amber: 'var(--neon-amber)', violet: 'var(--neon-violet)', rose: 'var(--neon-rose)',
};

export default function TurnAnnouncer({ playerName, playerColor, isMe, isBot }: Props) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const neon = NEON[playerColor] ?? 'var(--neon-cyan)';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 30);
    const t2 = setTimeout(() => setPhase('exit'), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isVisible = phase === 'visible';
  const isEntering = phase === 'enter';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      background: isVisible ? 'oklch(0 0 0 / 0.50)' : 'oklch(0 0 0 / 0)',
      transition: 'background 0.28s ease',
    }}>
      <div style={{
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isEntering ? -32 : isVisible ? 0 : -16}px) scale(${isEntering ? 0.84 : isVisible ? 1 : 0.93})`,
        transition: isEntering
          ? 'opacity 0.28s ease, transform 0.40s var(--ease-spring)'
          : 'opacity 0.32s ease, transform 0.28s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '30px 56px',
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1.5px solid ${neon}55`,
        borderRadius: 'var(--r-xl)',
        boxShadow: `0 0 0 1px oklch(1 0 0 / 0.05), 0 0 60px ${neon}28, 0 28px 64px oklch(0 0 0 / 0.65)`,
        minWidth: 260,
        textAlign: 'center',
      }}>

        {/* Outer ring + inner dot */}
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: `radial-gradient(circle at 38% 38%, ${neon}28, ${neon}0c)`,
          border: `2.5px solid ${neon}`,
          boxShadow: `0 0 0 6px ${neon}1a, 0 0 28px ${neon}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: neon,
            boxShadow: `0 0 14px ${neon}cc`,
          }} />
        </div>

        {/* Main label */}
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1,
          }}>
            {isMe ? (
              <>Your <span style={{ color: neon }}>Turn!</span></>
            ) : (
              <><span style={{ color: neon }}>{playerName}</span>'s Turn</>
            )}
          </div>
          {isBot && (
            <div style={{
              marginTop: 5,
              fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-faint)',
            }}>
              Bot player
            </div>
          )}
        </div>

        {/* Action hint pill */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: `${neon}bb`,
          padding: '5px 16px',
          background: `${neon}14`,
          borderRadius: 'var(--r-pill)',
          border: `1px solid ${neon}30`,
        }}>
          {isMe ? 'Roll the dice' : isBot ? 'Bot is thinking…' : 'Waiting for roll…'}
        </div>
      </div>
    </div>
  );
}
