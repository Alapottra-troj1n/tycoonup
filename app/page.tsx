'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';
import type { PlayerColor } from '@/lib/types';
import { ALL_PLAYER_COLORS } from '@/lib/game-data';
import { createRoom, joinRoom } from '@/app/actions/game';

const PRESET_NAMES = ['Atlas', 'Nexus', 'Vega', 'Orion', 'Nova', 'Apex'];

const NEON_COLORS: Record<string, string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  lime:    'var(--neon-lime)',
  amber:   'var(--neon-amber)',
  violet:  'var(--neon-violet)',
  rose:    'var(--neon-rose)',
};

function PlayerToken({ color, size = 36 }: { color: string; size?: number }) {
  const c = NEON_COLORS[color] || 'var(--neon-cyan)';
  const id = `token-${color}-home`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.35" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill={c} opacity="0.25" style={{ filter: 'blur(6px)' }} />
      <circle cx="20" cy="20" r="14" fill={`url(#${id})`} stroke="oklch(0 0 0 / 0.3)" strokeWidth="0.5" />
      <ellipse cx="15.5" cy="18" rx="1.5" ry="2" fill="oklch(0.1 0.02 260)" />
      <ellipse cx="24.5" cy="18" rx="1.5" ry="2" fill="oklch(0.1 0.02 260)" />
      <path d="M15 23 Q20 26 25 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <ellipse cx="14.5" cy="14.5" rx="2.5" ry="1.6" fill="white" opacity="0.55" />
    </svg>
  );
}

function ColorPicker({ selected, onSelect }: { selected: PlayerColor; onSelect: (c: PlayerColor) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ALL_PLAYER_COLORS.map((c) => {
        const isSelected = selected === c;
        return (
          <button
            key={c}
            onClick={() => onSelect(c as PlayerColor)}
            title={c}
            style={{
              width: isSelected ? 44 : 38,
              height: isSelected ? 44 : 38,
              borderRadius: '50%',
              border: 'none',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              transform: isSelected ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform var(--dur-fast) var(--ease-out), width var(--dur-fast), height var(--dur-fast)',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayerToken color={c} size={isSelected ? 40 : 34} />
          </button>
        );
      })}
    </div>
  );
}

function GlassInput({
  value, onChange, placeholder, style = {},
  accentColor = 'var(--neon-cyan)', maxLength, mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  accentColor?: string;
  maxLength?: number;
  mono?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: '100%',
        padding: '10px 14px',
        background: 'var(--bg-raised)',
        border: focused
          ? `1px solid ${accentColor}`
          : '1px solid var(--stroke-soft)',
        borderRadius: 'var(--r-md)',
        color: 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
        fontSize: mono ? 17 : 14,
        fontWeight: mono ? 600 : 400,
        letterSpacing: mono ? '0.22em' : 'normal',
        outline: 'none',
        boxShadow: focused ? `0 0 0 3px ${accentColor}18` : 'none',
        transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
        caretColor: accentColor,
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams.get('join') ?? '';

  const [mode, setMode] = useState<'home' | 'create' | 'join'>(joinCode ? 'join' : 'home');
  const [name, setName] = useState(() => PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)]);
  const [color, setColor] = useState<PlayerColor>('cyan');
  const [roomCode, setRoomCode] = useState(joinCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return setError('Enter a name');
    setLoading(true);
    setError(null);
    try {
      const res = await createRoom(name.trim(), color);
      if (!res.success || !res.data) { setError(res.error ?? 'Failed to create room'); return; }
      await fetch('/api/set-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: res.data.roomCode, playerId: res.data.playerId }),
      });
      router.push(`/${res.data.roomCode}`);
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter a name');
    if (!roomCode.trim()) return setError('Enter a room code');
    setLoading(true);
    setError(null);
    try {
      const res = await joinRoom(roomCode.trim().toUpperCase(), name.trim(), color);
      if (!res.success || !res.data) { setError(res.error ?? 'Failed to join room'); return; }
      await fetch('/api/set-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), playerId: res.data.playerId }),
      });
      router.push(`/${roomCode.trim().toUpperCase()}`);
    } finally { setLoading(false); }
  }

  return (
    <div className="tu-backdrop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '48px 16px' }}>
      {/* Logo + headline */}
      <motion.div
        style={{ marginBottom: 48, textAlign: 'center' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="tu-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="oklch(0.85 0.2 130)" />
                <stop offset="0.5" stopColor="oklch(0.82 0.17 210)" />
                <stop offset="1" stopColor="oklch(0.72 0.22 350)" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="28" height="28" rx="7" fill="oklch(0.22 0.03 260)" stroke="url(#tu-g)" strokeWidth="1.5"/>
            <path d="M9 10 L23 10 M16 10 L16 22" stroke="url(#tu-g)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="23.5" cy="9" r="1.6" fill="oklch(0.85 0.2 130)" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Tycoon<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
          </span>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 58, letterSpacing: '-0.04em', lineHeight: 0.95, color: 'var(--text-primary)', marginBottom: 6 }}>
          Build an
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 58,
          letterSpacing: '-0.04em',
          lineHeight: 0.95,
          background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-lime))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 18,
        }}>
          empire.
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Real-time multiplayer · No account needed
        </p>
      </motion.div>

      {/* Action card */}
      <AnimatePresence mode="wait">
        {mode === 'home' && (
          <motion.div
            key="home"
            style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <motion.button
              onClick={() => setMode('create')}
              style={{
                width: '100%', padding: '13px 22px',
                borderRadius: 'var(--r-xl)',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em',
                background: 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(0.65 0.16 210) 100%)',
                color: 'oklch(0.12 0.02 260)', border: 'none', cursor: 'pointer',
                boxShadow: '0 0 0 1px oklch(1 0 0 / 0.08), 0 4px 20px var(--neon-cyan-dim), inset 0 1px 0 oklch(1 0 0 / 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create game
            </motion.button>

            <motion.button
              onClick={() => setMode('join')}
              style={{
                width: '100%', padding: '13px 22px',
                borderRadius: 'var(--r-xl)',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em',
                background: 'var(--bg-raised)', color: 'var(--text-primary)',
                border: '1px solid var(--stroke-soft)', cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              Join game
            </motion.button>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', marginTop: 6, letterSpacing: '0.06em' }}>
              Up to 6 players · Bots available
            </p>
          </motion.div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <motion.div
            key={mode}
            style={{
              width: '100%', maxWidth: 380,
              background: 'var(--bg-glass-strong)',
              backdropFilter: 'blur(16px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
              border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-2xl)',
              boxShadow: 'var(--shadow-xl), inset 0 1px 0 oklch(1 0 0 / 0.04)',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            {/* Panel header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { setMode('home'); setError(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                {mode === 'create' ? 'Create a game' : 'Join a game'}
              </span>
            </div>

            <div style={{ padding: '20px 20px 24px' }}>
              <AnimatePresence>
                {error && (
                  <motion.div
                    style={{ background: 'oklch(0.68 0.22 25 / 0.12)', border: '1px solid oklch(0.68 0.22 25 / 0.35)', borderRadius: 'var(--r-md)', padding: '10px 12px', marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--danger)' }}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Your name</div>
                <GlassInput value={name} onChange={setName} placeholder="Enter your name" maxLength={20} accentColor="var(--neon-cyan)" />
              </div>

              {/* Token color */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Choose token</div>
                <ColorPicker selected={color} onSelect={setColor} />
              </div>

              {/* Room code */}
              {mode === 'join' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Room code</div>
                  <GlassInput
                    value={roomCode}
                    onChange={(v) => setRoomCode(v.toUpperCase().slice(0, 6))}
                    placeholder="XXXXXX"
                    accentColor="var(--neon-magenta)"
                    mono
                  />
                </div>
              )}

              {/* Submit */}
              <motion.button
                disabled={loading}
                onClick={mode === 'create' ? handleCreate : handleJoin}
                style={{
                  width: '100%', padding: '12px 20px', marginTop: 4,
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em',
                  background: mode === 'create'
                    ? 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(0.65 0.16 210) 100%)'
                    : 'linear-gradient(180deg, var(--neon-magenta) 0%, oklch(0.55 0.20 350) 100%)',
                  color: 'oklch(0.12 0.02 260)', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                  boxShadow: loading ? 'none' : mode === 'create'
                    ? '0 4px 20px var(--neon-cyan-dim), inset 0 1px 0 oklch(1 0 0 / 0.25)'
                    : '0 4px 20px var(--neon-magenta-dim), inset 0 1px 0 oklch(1 0 0 / 0.2)',
                }}
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading
                  ? (mode === 'create' ? 'Creating…' : 'Joining…')
                  : (mode === 'create' ? 'Create room' : 'Join room')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
