'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';
import type { PlayerColor } from '@/lib/types';
import { ALL_PLAYER_COLORS, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { createRoom, joinRoom } from '@/app/actions/game';

const PRESET_NAMES = ['Atlas', 'Nexus', 'Vega', 'Orion', 'Nova', 'Apex'];

function ColorPicker({
  selected,
  onSelect,
}: {
  selected: PlayerColor;
  onSelect: (c: PlayerColor) => void;
}) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {ALL_PLAYER_COLORS.map((c) => {
        const hex = PLAYER_COLOR_MAP[c].hex;
        return (
          <button
            key={c}
            onClick={() => onSelect(c as PlayerColor)}
            className="w-8 h-8 rounded-full transition-all"
            style={{
              backgroundColor: hex,
              boxShadow: selected === c ? `0 0 14px ${hex}, 0 0 6px ${hex}` : 'none',
              transform: selected === c ? 'scale(1.2)' : 'scale(1)',
              outline: selected === c ? `2px solid ${hex}` : 'none',
              outlineOffset: '2px',
            }}
          />
        );
      })}
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams.get('join') ?? '';

  const [mode, setMode] = useState<'home' | 'create' | 'join'>(
    joinCode ? 'join' : 'home',
  );
  const [name, setName] = useState(
    () => PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)],
  );
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
      if (!res.success || !res.data) {
        setError(res.error ?? 'Failed to create room');
        return;
      }
      await fetch('/api/set-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: res.data.roomCode, playerId: res.data.playerId }),
      });
      router.push(`/${res.data.roomCode}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter a name');
    if (!roomCode.trim()) return setError('Enter a room code');
    setLoading(true);
    setError(null);
    try {
      const res = await joinRoom(roomCode.trim().toUpperCase(), name.trim(), color);
      if (!res.success || !res.data) {
        setError(res.error ?? 'Failed to join room');
        return;
      }
      await fetch('/api/set-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
          playerId: res.data.playerId,
        }),
      });
      router.push(`/${roomCode.trim().toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 40% 20%, #0a1020 0%, #060912 80%)' }}
    >
      {/* Ambient glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '25%', left: '25%',
          width: '400px', height: '400px',
          background: 'rgba(0,245,255,0.04)',
          filter: 'blur(80px)',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '30%', right: '25%',
          width: '320px', height: '320px',
          background: 'rgba(255,0,255,0.04)',
          filter: 'blur(80px)',
          transform: 'translate(50%, 50%)',
          borderRadius: '50%',
        }}
      />

      {/* Logo */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="flex items-end justify-center gap-1">
          <h1
            className="text-7xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #00f5ff 0%, #0077aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0,245,255,0.35))',
            }}
          >
            Tycoon
          </h1>
          <h1
            className="text-7xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #ff00ff 0%, #aa0077 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(255,0,255,0.35))',
            }}
          >
            UP
          </h1>
        </div>
        <p className="text-slate-600 text-sm mt-2 tracking-widest uppercase">
          Global Property Empire
        </p>
      </motion.div>

      {/* Main card area */}
      <AnimatePresence mode="wait">
        {mode === 'home' && (
          <motion.div
            key="home"
            className="flex flex-col gap-4 w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => setMode('create')}
              className="w-full py-4 rounded-2xl font-bold text-lg tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #003a55, #006688)',
                color: '#00f5ff',
                border: '1px solid rgba(0,245,255,0.2)',
                boxShadow: '0 0 30px rgba(0,245,255,0.1)',
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,245,255,0.18)' }}
              whileTap={{ scale: 0.98 }}
            >
              Create Game
            </motion.button>
            <motion.button
              onClick={() => setMode('join')}
              className="w-full py-4 rounded-2xl font-bold text-lg tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #330040, #660055)',
                color: '#ff00ff',
                border: '1px solid rgba(255,0,255,0.2)',
                boxShadow: '0 0 30px rgba(255,0,255,0.1)',
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(255,0,255,0.18)' }}
              whileTap={{ scale: 0.98 }}
            >
              Join Game
            </motion.button>
            <p className="text-slate-700 text-xs text-center mt-1">
              No account required · Up to 6 players
            </p>
          </motion.div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <motion.div
            key={mode}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: 'rgba(10,10,26,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
            }}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => { setMode('home'); setError(null); }}
                className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
              >
                ←
              </button>
              <h2 className="text-white font-bold text-lg">
                {mode === 'create' ? 'Create a Game' : 'Join a Game'}
              </h2>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2 mb-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  caretColor: '#00f5ff',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.35)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
            </div>

            {/* Color picker */}
            <div className="mb-4">
              <label className="block text-slate-500 text-xs uppercase tracking-widest mb-2">
                Choose Color
              </label>
              <ColorPicker selected={color} onSelect={setColor} />
            </div>

            {/* Room code (join only) */}
            {mode === 'join' && (
              <div className="mb-4">
                <label className="block text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="XXXXXX"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm font-mono tracking-widest outline-none uppercase"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    caretColor: '#ff00ff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,0,255,0.35)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>
            )}

            <motion.button
              disabled={loading}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              className="w-full py-3.5 rounded-xl font-bold text-base mt-2 disabled:opacity-50"
              style={{
                background:
                  mode === 'create'
                    ? 'linear-gradient(135deg, #0077aa, #00bcd4)'
                    : 'linear-gradient(135deg, #7700aa, #cc00ff)',
                color: '#fff',
                boxShadow:
                  mode === 'create'
                    ? '0 0 25px rgba(0,188,212,0.3)'
                    : '0 0 25px rgba(204,0,255,0.3)',
              }}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading
                ? mode === 'create' ? 'Creating…' : 'Joining…'
                : mode === 'create' ? 'Create Room' : 'Join Room'}
            </motion.button>
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
