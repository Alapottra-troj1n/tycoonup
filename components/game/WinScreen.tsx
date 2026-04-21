'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Player, Property } from '@/lib/types';
import { TILES, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';

interface WinScreenProps {
  players: Player[];
  properties: Property[];
  myPlayerId: string;
}

function Particle({ color, delay }: { color: string; delay: number }) {
  const x = Math.random() * 100;
  const size = 4 + Math.random() * 6;
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: `${x}%`,
        top: '-10px',
        boxShadow: `0 0 6px ${color}`,
      }}
      animate={{
        y: ['0vh', '110vh'],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 2.5 + Math.random() * 2,
        delay,
        ease: 'linear',
        repeat: Infinity,
        repeatDelay: Math.random() * 3,
      }}
    />
  );
}

export default function WinScreen({ players, properties, myPlayerId }: WinScreenProps) {
  const router = useRouter();

  // Sort players by balance (bankrupt players last)
  const ranked = [...players].sort((a, b) => {
    if (a.is_bankrupt && !b.is_bankrupt) return 1;
    if (!a.is_bankrupt && b.is_bankrupt) return -1;
    return b.balance - a.balance;
  });

  const winner = ranked[0];
  const isWinner = winner?.id === myPlayerId;

  // Net worth = balance + property values
  function netWorth(player: Player): number {
    const propValue = properties
      .filter((p) => p.owner_id === player.id)
      .reduce((sum, p) => {
        const tile = TILES[p.tile_id];
        return sum + (tile.mortgageValue ?? 0) * 2 * (1 + p.upgrade_level * 0.5);
      }, 0);
    return player.balance + propValue;
  }

  const CONFETTI_COLORS = ['#00f5ff', '#ff00ff', '#00ff88', '#ffcc00', '#8b5cf6', '#ff2d78'];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a1428 0%, #060912 100%)' }}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <Particle
            key={i}
            color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
            delay={i * 0.12}
          />
        ))}
      </div>

      {/* Trophy */}
      <motion.div
        className="text-7xl mb-4"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
      >
        🏆
      </motion.div>

      {/* Winner announcement */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-slate-400 text-sm uppercase tracking-widest mb-1">
          {isWinner ? 'YOU WIN!' : 'Game Over'}
        </p>
        <h1
          className="text-4xl font-black"
          style={{
            background: `linear-gradient(135deg, ${PLAYER_COLOR_MAP[winner?.color ?? 'cyan']?.hex}, #ffffff)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 20px ${PLAYER_COLOR_MAP[winner?.color ?? 'cyan']?.hex}44)`,
          }}
        >
          {winner?.name ?? 'Unknown'} wins!
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          {formatMoney(netWorth(winner))} net worth
        </p>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        className="w-full max-w-sm space-y-2 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {ranked.map((player, idx) => {
          const colorHex = PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff';
          const isMe = player.id === myPlayerId;
          const worth = netWorth(player);
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <motion.div
              key={player.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: idx === 0 ? `${colorHex}12` : 'rgba(255,255,255,0.03)',
                border: idx === 0 ? `1px solid ${colorHex}33` : '1px solid rgba(255,255,255,0.05)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + idx * 0.1 }}
            >
              <span className="text-lg w-6 text-center">{medals[idx] ?? `${idx + 1}`}</span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: colorHex, color: '#000' }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  {player.name}
                  {isMe && <span className="text-slate-500 ml-1 text-xs">(you)</span>}
                </p>
                <p className="text-slate-500 text-xs">
                  {player.is_bankrupt ? '💀 Bankrupt' : `${formatMoney(player.balance)} cash`}
                </p>
              </div>
              <p
                className="font-bold text-sm"
                style={{ color: idx === 0 ? colorHex : '#64748b' }}
              >
                {formatMoney(worth)}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-xl font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #003a55, #006688)',
            color: '#00f5ff',
            border: '1px solid rgba(0,245,255,0.2)',
            boxShadow: '0 0 20px rgba(0,245,255,0.1)',
          }}
        >
          New Game
        </button>
      </motion.div>
    </div>
  );
}
