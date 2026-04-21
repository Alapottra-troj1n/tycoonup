'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { PLAYER_COLOR_MAP } from '@/lib/game-data';
import { startGame, addBot } from '@/app/actions/game';
import { formatMoney } from '@/lib/utils';

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

  const isHost = players
    .slice()
    .sort((a, b) => a.turn_order - b.turn_order)
    .find((p) => !p.is_bot)?.id === myPlayerId;

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #0d1a2e 0%, #060912 100%)' }}
    >
      {/* Title */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-black tracking-widest"
          style={{
            background: 'linear-gradient(90deg, #00f5ff, #ff00ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 20px rgba(0,245,255,0.3))',
          }}
        >
          TYCOONUP
        </h1>
        <p className="text-slate-500 text-sm mt-1 tracking-widest uppercase">Lobby</p>
      </motion.div>

      {/* Room code */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">Room Code</p>
        <button
          onClick={copyCode}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl transition-all"
          style={{
            background: 'rgba(0,245,255,0.05)',
            border: '1px solid rgba(0,245,255,0.25)',
            boxShadow: '0 0 30px rgba(0,245,255,0.08)',
          }}
        >
          <span
            className="text-4xl font-black tracking-[0.2em]"
            style={{ color: '#00f5ff', textShadow: '0 0 20px rgba(0,245,255,0.6)' }}
          >
            {room.room_code}
          </span>
          <span className="text-slate-600 text-xs group-hover:text-slate-400 transition-colors">
            {copied ? '✓ Copied!' : 'Copy'}
          </span>
        </button>
        <p className="text-slate-600 text-xs mt-2">Share this code with friends to join</p>
      </motion.div>

      {/* Players list */}
      <motion.div
        className="w-full max-w-sm mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-500 text-xs uppercase tracking-widest">
            Players ({players.length}/6)
          </p>
          {canAddBot && (
            <motion.button
              disabled={botLoading}
              onClick={handleAddBot}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
              style={{
                background: 'rgba(139,92,246,0.12)',
                color: '#a78bfa',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {botLoading ? '…' : '🤖 Add Bot'}
            </motion.button>
          )}
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {players
              .slice()
              .sort((a, b) => a.turn_order - b.turn_order)
              .map((player, idx) => {
                const colorHex = PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff';
                const isMe = player.id === myPlayerId;
                return (
                  <motion.div
                    key={player.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: isMe
                        ? `1px solid ${colorHex}44`
                        : '1px solid rgba(255,255,255,0.05)',
                    }}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        backgroundColor: colorHex,
                        color: '#000',
                        boxShadow: `0 0 10px ${colorHex}66`,
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {player.name}
                        {player.is_bot && (
                          <span className="ml-1.5 text-xs text-violet-400">🤖 bot</span>
                        )}
                        {idx === 0 && !player.is_bot && (
                          <span className="ml-1.5 text-xs text-amber-400">👑 Host</span>
                        )}
                        {isMe && <span className="ml-1.5 text-xs text-slate-500">(you)</span>}
                      </p>
                      <p className="text-slate-500 text-xs">{formatMoney(player.balance)} ready</p>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colorHex, boxShadow: `0 0 6px ${colorHex}` }}
                    />
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Start button / waiting message */}
      <div className="w-full max-w-sm">
        {error && (
          <p className="text-red-400 text-sm text-center mb-3 bg-red-900/20 rounded-lg py-2 px-4">
            {error}
          </p>
        )}
        {isHost ? (
          <motion.button
            disabled={!canStart || loading}
            onClick={handleStart}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-wider transition-all disabled:opacity-40"
            style={{
              background: canStart
                ? 'linear-gradient(135deg, #0077aa, #00bcd4)'
                : 'rgba(100,100,120,0.2)',
              color: canStart ? '#fff' : '#555',
              boxShadow: canStart && !loading ? '0 0 30px rgba(0,188,212,0.35)' : 'none',
            }}
            whileHover={canStart ? { scale: 1.02 } : {}}
            whileTap={canStart ? { scale: 0.98 } : {}}
          >
            {loading ? 'Starting…' : canStart ? 'Start Game' : 'Need 2+ Players'}
          </motion.button>
        ) : (
          <div className="text-center">
            <motion.div
              className="inline-flex items-center gap-2 text-slate-400 text-sm"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span>Waiting for host to start</span>
              <span>…</span>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
