'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Player, Property } from '@/lib/types';
import { TILES } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';

interface WinScreenProps {
  players: Player[];
  properties: Property[];
  myPlayerId: string;
}

const NEON: Record<string, string> = {
  cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)', lime: 'var(--neon-lime)',
  amber: 'var(--neon-amber)', violet: 'var(--neon-violet)', rose: 'var(--neon-rose)',
};
const NEON_HEX: Record<string, string> = {
  cyan: '#00f5ff', magenta: '#ff00ff', lime: '#00ff88',
  amber: '#ffcc00', violet: '#8b5cf6', rose: '#ff2d78',
};

function WinnerToken({ color, size = 80 }: { color: string; size?: number }) {
  const c = NEON[color] || 'var(--neon-cyan)';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id="ws-tok" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.7"/>
          <stop offset="0.35" stopColor={c} stopOpacity="1"/>
          <stop offset="1" stopColor={c} stopOpacity="0.85"/>
        </radialGradient>
        <filter id="ws-glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="16" fill={`url(#ws-tok)`} filter="url(#ws-glow)" stroke="oklch(0 0 0 / 0.2)" strokeWidth="0.5"/>
      <ellipse cx="15.5" cy="17.5" rx="1.6" ry="2" fill="oklch(0.1 0.02 260)"/>
      <ellipse cx="24.5" cy="17.5" rx="1.6" ry="2" fill="oklch(0.1 0.02 260)"/>
      <path d="M15 23.5 Q20 26.5 25 23.5" stroke="oklch(0.1 0.02 260)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <ellipse cx="14" cy="13.5" rx="2.5" ry="1.6" fill="white" opacity="0.5"/>
    </svg>
  );
}

function Particle({ color, delay }: { color: string; delay: number }) {
  const x = Math.random() * 100;
  const size = 3 + Math.random() * 5;
  return (
    <motion.div
      style={{
        position: 'absolute', borderRadius: '50%',
        width: size, height: size, backgroundColor: color,
        left: `${x}%`, top: -10,
        boxShadow: `0 0 6px ${color}`,
        pointerEvents: 'none',
      }}
      animate={{ y: ['0vh', '110vh'], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], opacity: [1, 1, 0] }}
      transition={{ duration: 2.5 + Math.random() * 2, delay, ease: 'linear', repeat: Infinity, repeatDelay: Math.random() * 3 }}
    />
  );
}

export default function WinScreen({ players, properties, myPlayerId }: WinScreenProps) {
  const router = useRouter();

  const ranked = [...players].sort((a, b) => {
    if (a.is_bankrupt && !b.is_bankrupt) return 1;
    if (!a.is_bankrupt && b.is_bankrupt) return -1;
    return b.balance - a.balance;
  });

  const winner = ranked[0];
  const isWinner = winner?.id === myPlayerId;
  const winnerNeon = NEON[winner?.color ?? 'cyan'];
  const winnerHex = NEON_HEX[winner?.color ?? 'cyan'];

  function netWorth(player: Player): number {
    return player.balance + properties
      .filter((p) => p.owner_id === player.id)
      .reduce((sum, p) => {
        const tile = TILES[p.tile_id];
        return sum + (tile.mortgageValue ?? 0) * 2 * (1 + p.upgrade_level * 0.5);
      }, 0);
  }

  const CONFETTI_COLORS = Object.values(NEON_HEX);

  return (
    <div
      className="tu-backdrop"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '32px 16px' }}
    >
      {/* Confetti */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <Particle key={i} color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]} delay={i * 0.12} />
        ))}
      </div>

      {/* Winner announcement */}
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, zIndex: 1 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          style={{ marginBottom: 16 }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
        >
          <WinnerToken color={winner?.color ?? 'cyan'} size={88} />
        </motion.div>

        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)',
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          {isWinner ? 'You win!' : 'Game Over'}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36,
          letterSpacing: '-0.03em', lineHeight: 1,
          background: `linear-gradient(135deg, ${winnerHex}, white)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 0 20px ${winnerHex}55)`,
        }}>
          {winner?.name ?? 'Unknown'} wins!
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>
          {formatMoney(netWorth(winner))} net worth
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24, zIndex: 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {ranked.map((player, idx) => {
          const neon = NEON[player.color] ?? 'var(--neon-cyan)';
          const isMe = player.id === myPlayerId;
          const worth = netWorth(player);
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <motion.div
              key={player.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--r-lg)',
                background: idx === 0 ? `oklch(from ${neon} l c h / 0.08)` : 'var(--bg-glass)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: idx === 0 ? `1px solid oklch(from ${neon} l c h / 0.3)` : '1px solid var(--stroke-hairline)',
                boxShadow: idx === 0 ? `0 0 24px oklch(from ${neon} l c h / 0.15)` : 'none',
              }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + idx * 0.08 }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>
                {medals[idx] ?? String(idx + 1)}
              </span>
              <div style={{ flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 40 40">
                  <defs>
                    <radialGradient id={`ws-p-${player.color}`} cx="0.35" cy="0.3" r="0.9">
                      <stop offset="0" stopColor="white" stopOpacity="0.6"/>
                      <stop offset="0.35" stopColor={neon} stopOpacity="1"/>
                      <stop offset="1" stopColor={neon} stopOpacity="0.85"/>
                    </radialGradient>
                  </defs>
                  <circle cx="20" cy="20" r="14" fill={`url(#ws-p-${player.color})`}/>
                  <ellipse cx="15.5" cy="18" rx="1.3" ry="1.7" fill="oklch(0.1 0.02 260)"/>
                  <ellipse cx="24.5" cy="18" rx="1.3" ry="1.7" fill="oklch(0.1 0.02 260)"/>
                  <path d="M15.5 23 Q20 25.5 24.5 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {player.name}
                  {isMe && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', marginLeft: 5 }}>you</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                  {player.is_bankrupt ? '💀 Bankrupt' : `${formatMoney(player.balance)} cash`}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                color: idx === 0 ? neon : 'var(--text-faint)',
                flexShrink: 0,
              }}>
                {formatMoney(worth)}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Action */}
      <motion.div
        style={{ zIndex: 1 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '12px 28px',
            borderRadius: 'var(--r-lg)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            background: 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(0.67 0.14 210) 100%)',
            color: 'oklch(0.12 0.02 260)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--glow-cyan)',
          }}
        >
          New Game
        </button>
      </motion.div>
    </div>
  );
}
