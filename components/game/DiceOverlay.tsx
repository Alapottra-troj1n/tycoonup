'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceOverlayProps {
  roll: [number, number] | null;
  animating: boolean;
  playerName?: string;
}

const DOTS: Record<number, [number, number][]> = {
  1: [[0.5,0.5]],
  2: [[0.28,0.28],[0.72,0.72]],
  3: [[0.28,0.28],[0.5,0.5],[0.72,0.72]],
  4: [[0.28,0.28],[0.72,0.28],[0.28,0.72],[0.72,0.72]],
  5: [[0.28,0.28],[0.72,0.28],[0.5,0.5],[0.28,0.72],[0.72,0.72]],
  6: [[0.28,0.28],[0.72,0.28],[0.28,0.5],[0.72,0.5],[0.28,0.72],[0.72,0.72]],
};

function DieFace({ value, spinning }: { value: number; spinning: boolean }) {
  const [display, setDisplay] = useState(value);
  const id = `die-${value}-${spinning}`;

  useEffect(() => {
    if (!spinning) { setDisplay(value); return; }
    let count = 0;
    const iv = setInterval(() => {
      setDisplay(Math.ceil(Math.random() * 6));
      if (++count > 16) clearInterval(iv);
    }, 75);
    return () => clearInterval(iv);
  }, [spinning, value]);

  return (
    <motion.div
      animate={spinning ? { rotate: [0, 12, -12, 8, -8, 4, -4, 0] } : { rotate: 0 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      style={{ filter: 'drop-shadow(0 4px 16px oklch(0 0 0 / 0.5))' }}
    >
      <svg width="72" height="72" viewBox="0 0 64 64">
        <defs>
          <linearGradient id={`dg-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="oklch(0.98 0.005 260)"/>
            <stop offset="1" stopColor="oklch(0.88 0.01 260)"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="12" fill={`url(#dg-${id})`} stroke="oklch(0.75 0.01 260)" strokeWidth="0.5"/>
        {(DOTS[display] ?? []).map((d, i) => (
          <circle key={i} cx={d[0]*64} cy={d[1]*64} r="5" fill="oklch(0.14 0.02 260)"/>
        ))}
      </svg>
    </motion.div>
  );
}

function PlayerTokenMini({ color }: { color: string }) {
  const NEON: Record<string, string> = {
    cyan:'var(--neon-cyan)', magenta:'var(--neon-magenta)', lime:'var(--neon-lime)',
    amber:'var(--neon-amber)', violet:'var(--neon-violet)', rose:'var(--neon-rose)',
  };
  const c = NEON[color] || 'var(--neon-cyan)';
  return (
    <svg width="18" height="18" viewBox="0 0 40 40">
      <defs>
        <radialGradient id="do-tg" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6"/>
          <stop offset="0.35" stopColor={c} stopOpacity="1"/>
          <stop offset="1" stopColor={c} stopOpacity="0.85"/>
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="13" fill="url(#do-tg)"/>
      <ellipse cx="15.5" cy="18" rx="1.3" ry="1.7" fill="oklch(0.1 0.02 260)"/>
      <ellipse cx="24.5" cy="18" rx="1.3" ry="1.7" fill="oklch(0.1 0.02 260)"/>
      <path d="M15.5 23 Q20 25.5 24.5 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export default function DiceOverlay({ roll, animating, playerName }: DiceOverlayProps) {
  const d1 = roll?.[0] ?? 1;
  const d2 = roll?.[1] ?? 1;

  return (
    <AnimatePresence>
      {(roll || animating) && (
        <motion.div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              padding: '28px 36px',
              background: 'var(--bg-glass-strong)',
              backdropFilter: 'blur(20px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
              border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-2xl)',
              boxShadow: 'var(--shadow-xl)',
            }}
            initial={{ scale: 0.75, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            {/* Player indicator */}
            {playerName && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--stroke-soft)',
                borderRadius: 'var(--r-pill)',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }}/>
                {playerName} rolling
              </div>
            )}

            {/* Dice */}
            <div style={{ display: 'flex', gap: 20 }}>
              <DieFace value={d1} spinning={animating} />
              <DieFace value={d2} spinning={animating} />
            </div>

            {/* Result */}
            {!animating && roll && (
              <motion.div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--neon-cyan)' }}>{d1}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 8px', fontWeight: 400 }}>+</span>
                  <span style={{ color: 'var(--neon-cyan)' }}>{d2}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 8px', fontWeight: 400 }}>=</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{d1 + d2}</span>
                </div>
                {d1 === d2 && (
                  <div style={{
                    padding: '3px 10px', borderRadius: 'var(--r-pill)',
                    background: 'oklch(0.82 0.17 75 / 0.15)',
                    border: '1px solid oklch(0.82 0.17 75 / 0.4)',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--neon-amber)', letterSpacing: '0.08em',
                  }}>
                    Doubles!
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
