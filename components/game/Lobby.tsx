'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { startGame, addBot } from '@/app/actions/game';
import { formatMoney } from '@/lib/utils';

const NEON: Record<string, string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  lime:    'var(--neon-lime)',
  amber:   'var(--neon-amber)',
  violet:  'var(--neon-violet)',
  rose:    'var(--neon-rose)',
};

function PlayerToken({ color, size = 32 }: { color: string; size?: number }) {
  const c = NEON[color] || 'var(--neon-cyan)';
  const id = `lobby-token-${color}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.35" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill={c} opacity="0.2" />
      <circle cx="20" cy="20" r="13" fill={`url(#${id})`} stroke="oklch(0 0 0 / 0.3)" strokeWidth="0.5" />
      <ellipse cx="15.5" cy="18" rx="1.4" ry="1.8" fill="oklch(0.1 0.02 260)" />
      <ellipse cx="24.5" cy="18" rx="1.4" ry="1.8" fill="oklch(0.1 0.02 260)" />
      <path d="M15.5 23 Q20 26 24.5 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      <ellipse cx="14.5" cy="14.5" rx="2.2" ry="1.4" fill="white" opacity="0.5" />
    </svg>
  );
}

interface LobbyProps {
  room: GameRoom;
  players: Player[];
  myPlayerId: string;
}

export default function Lobby({ room, players, myPlayerId }: LobbyProps) {
  const [loading, setLoading] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sortedPlayers = players.slice().sort((a, b) => a.turn_order - b.turn_order);
  const isHost = sortedPlayers.find((p) => !p.is_bot)?.id === myPlayerId;
  const canStart = players.length >= 2;
  const canAddBot = players.length < 6;

  async function handleAddBot() {
    setBotLoading(true);
    setError(null);
    const res = await addBot(room.id);
    if (!res.success) setError(res.error ?? 'Failed to add bot');
    setBotLoading(false);
  }

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await startGame(room.id, myPlayerId);
      if (!res.success) setError(res.error ?? 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(room.room_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="tu-backdrop"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '48px 16px' }}
    >
      {/* Logo */}
      <motion.div
        style={{ marginBottom: 40, textAlign: 'center' }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="tu-lobby-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="oklch(0.85 0.2 130)" />
                <stop offset="0.5" stopColor="oklch(0.82 0.17 210)" />
                <stop offset="1" stopColor="oklch(0.72 0.22 350)" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="28" height="28" rx="7" fill="oklch(0.22 0.03 260)" stroke="url(#tu-lobby-g)" strokeWidth="1.5"/>
            <path d="M9 10 L23 10 M16 10 L16 22" stroke="url(#tu-lobby-g)" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Tycoon<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Lobby
        </div>
      </motion.div>

      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Room code panel */}
        <motion.div
          style={{
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid var(--stroke-soft)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-lg), inset 0 1px 0 oklch(1 0 0 / 0.04)',
            overflow: 'hidden',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Share room</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>link</span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <button
              onClick={copyCode}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 14px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--stroke-hairline)',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 22, letterSpacing: '0.18em', color: 'var(--neon-cyan)', textShadow: '0 0 12px var(--neon-cyan-dim)' }}>
                {room.room_code}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                {copied ? '✓ copied' : 'tap to copy'}
              </span>
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 8, letterSpacing: '0.04em' }}>
              Share this code with friends to join
            </p>
          </div>
        </motion.div>

        {/* Players panel */}
        <motion.div
          style={{
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid var(--stroke-soft)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-lg), inset 0 1px 0 oklch(1 0 0 / 0.04)',
            overflow: 'hidden',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Players</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{players.length}/6</span>
              {canAddBot && (
                <button
                  disabled={botLoading}
                  onClick={handleAddBot}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--r-pill)',
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                    background: 'oklch(0.72 0.19 295 / 0.15)',
                    color: 'var(--neon-violet)',
                    border: '1px solid oklch(0.72 0.19 295 / 0.3)',
                    cursor: 'pointer', opacity: botLoading ? 0.5 : 1,
                  }}
                >
                  {botLoading ? '…' : '+ Bot'}
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: '10px' }}>
            <AnimatePresence>
              {sortedPlayers.map((player, idx) => {
                const neon = NEON[player.color] || 'var(--neon-cyan)';
                const isMe = player.id === myPlayerId;
                const isFirstHuman = idx === 0 && !player.is_bot;
                return (
                  <motion.div
                    key={player.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 'var(--r-md)', marginBottom: 4,
                      background: isMe ? `oklch(from ${neon} l c h / 0.06)` : 'transparent',
                      border: isMe ? `1px solid ${neon}35` : '1px solid transparent',
                      transition: 'all var(--dur-fast)',
                    }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                  >
                    <PlayerToken color={player.color} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {player.name}
                        </span>
                        {isFirstHuman && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', letterSpacing: '0.06em' }}>host</span>
                        )}
                        {player.is_bot && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-violet)', letterSpacing: '0.06em' }}>bot</span>
                        )}
                        {isMe && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>you</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {formatMoney(player.balance)} ready
                      </div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: neon, boxShadow: `0 0 6px ${neon}`, flexShrink: 0 }} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--danger)', background: 'oklch(0.68 0.22 25 / 0.1)', border: '1px solid oklch(0.68 0.22 25 / 0.3)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
            {error}
          </div>
        )}

        {/* Start / waiting */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          {isHost ? (
            <motion.button
              disabled={!canStart || loading}
              onClick={handleStart}
              style={{
                width: '100%', padding: '14px 22px',
                borderRadius: 'var(--r-xl)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
                background: canStart
                  ? 'linear-gradient(180deg, var(--neon-lime) 0%, oklch(0.68 0.18 130) 100%)'
                  : 'var(--bg-raised)',
                color: canStart ? 'oklch(0.12 0.02 260)' : 'var(--text-faint)',
                border: 'none',
                cursor: (!canStart || loading) ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: canStart && !loading ? '0 4px 24px var(--neon-lime-dim), inset 0 1px 0 oklch(1 0 0 / 0.25)' : 'none',
              }}
              whileHover={canStart && !loading ? { scale: 1.02 } : {}}
              whileTap={canStart && !loading ? { scale: 0.97 } : {}}
            >
              {loading ? 'Starting…' : canStart ? 'Start game' : 'Need 2+ players'}
            </motion.button>
          ) : (
            <div style={{ textAlign: 'center', padding: '14px' }}>
              <motion.div
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }} />
                Waiting for host to start…
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
