'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player, GameSettings } from '@/lib/types';
import { startGame, addBot, updateRoomSettings, kickPlayer } from '@/app/actions/game';
import { normalizeSettings, SETTING_OPTIONS, boardMaxPlayers } from '@/lib/settings';
import { BOARDS } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { NEON } from '@/lib/colors';
import { playClick, playHover } from '@/lib/sounds';

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

// ── Small reusable controls ─────────────────────────────────────────────────

function Segmented<T extends string | number>({
  options, value, onChange, disabled, format,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  format?: (v: T) => string;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const sel = opt === value;
        return (
          <button
            key={String(opt)}
            disabled={disabled}
            onClick={() => { if (!sel) { playClick(); onChange(opt); } }}
            onMouseEnter={() => !disabled && playHover()}
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--r-pill)',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.03em',
              background: sel ? 'oklch(0.80 0.10 200 / 0.16)' : 'var(--bg-raised)',
              border: `1px solid ${sel ? 'oklch(0.80 0.10 200 / 0.55)' : 'var(--stroke-soft)'}`,
              color: sel ? 'var(--neon-cyan)' : 'var(--text-muted)',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled && !sel ? 0.4 : 1,
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            {format ? format(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  value, onChange, disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => { playClick(); onChange(!value); }}
      onMouseEnter={() => !disabled && playHover()}
      style={{
        width: 38, height: 21, borderRadius: 999, position: 'relative',
        background: value ? 'oklch(0.77 0.13 145 / 0.35)' : 'var(--bg-raised)',
        border: `1px solid ${value ? 'var(--neon-lime)' : 'var(--stroke-soft)'}`,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
        transition: 'all var(--dur-fast) var(--ease-out)',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 18 : 2,
        width: 15, height: 15, borderRadius: '50%',
        background: value ? 'var(--neon-lime)' : 'var(--text-faint)',
        boxShadow: value ? '0 0 8px var(--neon-lime)' : 'none',
        transition: 'left var(--dur-fast) var(--ease-out), background var(--dur-fast)',
      }} />
    </button>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '9px 0',
      borderBottom: '1px solid var(--stroke-hairline)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', marginTop: 2, lineHeight: 1.4 }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-glass-strong)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid var(--stroke-soft)',
  borderRadius: 'var(--r-xl)',
  boxShadow: 'var(--shadow-lg), inset 0 1px 0 oklch(1 0 0 / 0.04)',
  overflow: 'hidden',
};

interface LobbyProps {
  room: GameRoom;
  players: Player[];
  myPlayerId: string;
}

export default function Lobby({ room, players, myPlayerId }: LobbyProps) {
  const [loading, setLoading] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // Optimistic overlay so the host's toggles feel instant; reverted on failure
  const [optimistic, setOptimistic] = useState<Partial<GameSettings>>({});
  const settings = useMemo(
    () => normalizeSettings({ ...normalizeSettings(room.settings), ...optimistic }),
    [room.settings, optimistic],
  );

  const sortedPlayers = players.slice().sort((a, b) => a.turn_order - b.turn_order);
  const host = sortedPlayers.find((p) => !p.is_bot);
  const isHost = host?.id === myPlayerId;
  const amInRoom = players.some((p) => p.id === myPlayerId);
  const canStart = players.length >= 2;
  const canAddBot = players.length < settings.maxPlayers;
  const board = BOARDS[settings.board];

  async function patchSettings(patch: Partial<GameSettings>) {
    setOptimistic((o) => ({ ...o, ...patch }));
    setError(null);
    const res = await updateRoomSettings(room.id, myPlayerId, patch);
    if (!res.success) {
      setError(res.error ?? 'Failed to update settings');
      // Revert the optimistic values for the keys we tried to change
      setOptimistic((o) => {
        const next = { ...o };
        for (const k of Object.keys(patch) as Array<keyof GameSettings>) delete next[k];
        return next;
      });
    }
  }

  async function handleAddBot() {
    setBotLoading(true);
    setError(null);
    const res = await addBot(room.id);
    if (!res.success) setError(res.error ?? 'Failed to add bot');
    setBotLoading(false);
  }

  async function handleKick(targetId: string) {
    playClick();
    setError(null);
    const res = await kickPlayer(room.id, myPlayerId, targetId);
    if (!res.success) setError(res.error ?? 'Failed to remove player');
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

  function copy(text: string, kind: 'code' | 'link') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // The player was kicked (or their session is stale)
  if (!amInRoom) {
    return (
      <div className="tu-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ ...panelStyle, maxWidth: 360, padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>👋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>
            You left the lobby
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
            You were removed from this room, or your session expired.
          </div>
          <Link
            href="/"
            style={{
              display: 'inline-block', padding: '10px 22px', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(0.65 0.16 210) 100%)',
              color: 'oklch(0.12 0.02 260)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="tu-backdrop"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '40px 16px 64px' }}
    >
      {/* Logo */}
      <motion.div
        style={{ marginBottom: 28, textAlign: 'center' }}
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

      <div style={{
        width: '100%', maxWidth: 880,
        display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start', justifyContent: 'center',
      }}>
        {/* ── Left column: share + players + start ── */}
        <div style={{ flex: '1 1 340px', maxWidth: 430, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Room code panel */}
          <motion.div style={panelStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Invite friends</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>share</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { playClick(); copy(room.room_code, 'code'); }}
                onMouseEnter={() => playHover()}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 14px', background: 'var(--bg-raised)',
                  border: '1px solid var(--stroke-hairline)', borderRadius: 'var(--r-md)', cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 22, letterSpacing: '0.18em', color: 'var(--neon-cyan)', textShadow: '0 0 12px var(--neon-cyan-dim)' }}>
                  {room.room_code}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  {copied === 'code' ? '✓ copied' : 'copy code'}
                </span>
              </button>
              <button
                onClick={() => {
                  playClick();
                  copy(`${window.location.origin}/?join=${room.room_code}`, 'link');
                }}
                onMouseEnter={() => playHover()}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '9px 14px', background: 'transparent',
                  border: '1px dashed var(--stroke-soft)', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: copied === 'link' ? 'var(--success)' : 'var(--text-muted)',
                  letterSpacing: '0.06em',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                {copied === 'link' ? '✓ invite link copied' : 'copy invite link'}
              </button>
            </div>
          </motion.div>

          {/* Players panel */}
          <motion.div style={panelStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Players</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  {players.length}/{settings.maxPlayers}
                </span>
                {canAddBot && (
                  <button
                    disabled={botLoading}
                    onClick={() => { playClick(); handleAddBot(); }}
                    onMouseEnter={() => !botLoading && playHover()}
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
                  const isPlayerHost = player.id === host?.id;
                  return (
                    <motion.div
                      key={player.id}
                      onMouseEnter={() => playHover()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 'var(--r-md)', marginBottom: 4,
                        background: isMe ? `oklch(from ${neon} l c h / 0.06)` : 'transparent',
                        border: isMe ? `1px solid ${neon}35` : '1px solid transparent',
                        transition: 'all var(--dur-fast)',
                      }}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <PlayerToken color={player.color} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {player.name}
                          </span>
                          {isPlayerHost && (
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
                          {formatMoney(settings.startingCash)} ready
                        </div>
                      </div>
                      {isHost && !isPlayerHost ? (
                        <button
                          onClick={() => handleKick(player.id)}
                          onMouseEnter={() => playHover()}
                          title={`Remove ${player.name}`}
                          style={{
                            width: 24, height: 24, borderRadius: 'var(--r-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: '1px solid var(--stroke-hairline)',
                            color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11,
                            flexShrink: 0,
                            transition: 'all var(--dur-fast)',
                          }}
                        >
                          ✕
                        </button>
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: neon, flexShrink: 0 }} />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid oklch(0.71 0.155 25 / 0.3)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
              {error}
            </div>
          )}

          {/* Start / waiting */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            {isHost ? (
              <motion.button
                disabled={!canStart || loading}
                onClick={() => { playClick(true); handleStart(); }}
                onMouseEnter={() => canStart && !loading && playHover()}
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

        {/* ── Right column: game settings ── */}
        <motion.div
          style={{ ...panelStyle, flex: '1 1 360px', maxWidth: 430 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Game settings</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: isHost ? 'var(--neon-lime)' : 'var(--text-muted)' }}>
              {isHost ? 'you decide' : 'host decides'}
            </span>
          </div>

          <div style={{ padding: '6px 16px 16px' }}>
            {/* Board picker */}
            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--stroke-hairline)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 8 }}>
                Board
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.values(BOARDS).map((b) => {
                  const sel = settings.board === b.id;
                  return (
                    <button
                      key={b.id}
                      disabled={!isHost}
                      onClick={() => {
                        if (sel) return;
                        playClick();
                        patchSettings({ board: b.id, maxPlayers: Math.min(boardMaxPlayers(b.id), Math.max(settings.maxPlayers, players.length)) });
                      }}
                      onMouseEnter={() => isHost && playHover()}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 'var(--r-md)', textAlign: 'left',
                        background: sel ? 'oklch(0.80 0.10 200 / 0.10)' : 'var(--bg-raised)',
                        border: `1px solid ${sel ? 'oklch(0.80 0.10 200 / 0.5)' : 'var(--stroke-soft)'}`,
                        cursor: isHost ? 'pointer' : 'default',
                        opacity: !isHost && !sel ? 0.45 : 1,
                        transition: 'all var(--dur-fast) var(--ease-out)',
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: sel ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>
                        {b.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-faint)', marginTop: 3, lineHeight: 1.4 }}>
                        {b.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <SettingRow label="Max players" hint={`This board allows up to ${board.maxPlayers}`}>
              <Segmented
                options={Array.from({ length: board.maxPlayers - 1 }, (_, i) => i + 2)}
                value={settings.maxPlayers}
                onChange={(v) => patchSettings({ maxPlayers: v })}
                disabled={!isHost}
              />
            </SettingRow>

            <SettingRow label="Starting cash">
              <Segmented
                options={SETTING_OPTIONS.startingCash}
                value={settings.startingCash}
                onChange={(v) => patchSettings({ startingCash: v })}
                disabled={!isHost}
                format={(v) => `$${v >= 1000 ? `${v / 1000}k`.replace('.5k', '.5k') : v}`}
              />
            </SettingRow>

            <SettingRow label="GO salary" hint="Collected when passing GO">
              <Segmented
                options={SETTING_OPTIONS.goSalary}
                value={settings.goSalary}
                onChange={(v) => patchSettings({ goSalary: v })}
                disabled={!isHost}
                format={(v) => v === 0 ? 'off' : `$${v}`}
              />
            </SettingRow>

            <SettingRow label="x2 rent on full sets" hint="Double base rent on completed, unimproved sets">
              <Toggle value={settings.doubleRentOnFullSet} onChange={(v) => patchSettings({ doubleRentOnFullSet: v })} disabled={!isHost} />
            </SettingRow>

            <SettingRow label="Auctions" hint="Declined properties go to a live auction">
              <Toggle value={settings.auctionsEnabled} onChange={(v) => patchSettings({ auctionsEnabled: v })} disabled={!isHost} />
            </SettingRow>

            {settings.auctionsEnabled && (
              <SettingRow label="Auction timer">
                <Segmented
                  options={SETTING_OPTIONS.auctionSeconds}
                  value={settings.auctionSeconds}
                  onChange={(v) => patchSettings({ auctionSeconds: v })}
                  disabled={!isHost}
                  format={(v) => `${v}s`}
                />
              </SettingRow>
            )}

            <SettingRow label="Mortgages" hint="Allow mortgaging properties for quick cash">
              <Toggle value={settings.mortgageEnabled} onChange={(v) => patchSettings({ mortgageEnabled: v })} disabled={!isHost} />
            </SettingRow>

            <SettingRow label="Even build rule" hint="Houses must be built and sold evenly across a set">
              <Toggle value={settings.evenBuild} onChange={(v) => patchSettings({ evenBuild: v })} disabled={!isHost} />
            </SettingRow>

            <SettingRow label="Vacation cash" hint="Taxes & fines pool up — collect the pot by landing on Free Parking">
              <Toggle value={settings.vacationCash} onChange={(v) => patchSettings({ vacationCash: v })} disabled={!isHost} />
            </SettingRow>

            <SettingRow label="Monopoly perks" hint="Each completed set unlocks a unique passive bonus">
              <Toggle value={settings.setAdvantages} onChange={(v) => patchSettings({ setAdvantages: v })} disabled={!isHost} />
            </SettingRow>

            <SettingRow label="Jail fine">
              <Segmented
                options={SETTING_OPTIONS.jailFine}
                value={settings.jailFine}
                onChange={(v) => patchSettings({ jailFine: v })}
                disabled={!isHost}
                format={(v) => `$${v}`}
              />
            </SettingRow>

            <div style={{ borderBottom: 'none' }}>
              <SettingRow label="Randomize turn order" hint="Shuffle who goes first when the game starts">
                <Toggle value={settings.randomizeOrder} onChange={(v) => patchSettings({ randomizeOrder: v })} disabled={!isHost} />
              </SettingRow>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
