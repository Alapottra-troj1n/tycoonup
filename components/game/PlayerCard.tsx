'use client';

import { motion } from 'framer-motion';
import type { Player, Property } from '@/lib/types';
import { TILES, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';

interface PlayerCardProps {
  player: Player;
  properties: Property[];
  isCurrentTurn: boolean;
  isMe: boolean;
}

export default function PlayerCard({ player, properties, isCurrentTurn, isMe }: PlayerCardProps) {
  const colorHex = PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff';
  const owned = properties.filter((p) => p.owner_id === player.id);
  const currentTile = TILES[player.position];

  return (
    <motion.div
      className="rounded-xl p-3 relative overflow-hidden"
      style={{
        background: isCurrentTurn
          ? `linear-gradient(135deg, rgba(10,10,26,0.95), rgba(10,10,26,0.85))`
          : 'rgba(10,10,26,0.6)',
        border: isCurrentTurn
          ? `1px solid ${colorHex}66`
          : '1px solid rgba(100,116,139,0.15)',
        boxShadow: isCurrentTurn ? `0 0 20px ${colorHex}22` : 'none',
        opacity: player.is_bankrupt ? 0.4 : 1,
      }}
      animate={isCurrentTurn ? { scale: [1, 1.01, 1] } : { scale: 1 }}
      transition={{ repeat: isCurrentTurn ? Infinity : 0, duration: 2 }}
    >
      {/* Active turn indicator */}
      {isCurrentTurn && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${colorHex}, transparent)` }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Token */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: colorHex,
            color: '#000',
            boxShadow: `0 0 8px ${colorHex}88`,
          }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-white truncate">{player.name}</p>
            {isMe && <span className="text-[9px] text-slate-500 shrink-0">(you)</span>}
            {player.is_bankrupt && <span className="text-[9px] text-red-400">BANKRUPT</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-sm font-bold"
              style={{ color: colorHex, textShadow: `0 0 6px ${colorHex}66` }}
            >
              {formatMoney(player.balance)}
            </span>
            {player.in_jail && <span className="text-[10px] text-amber-400">🔒 Jail</span>}
          </div>
        </div>
      </div>

      {/* Position */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500">At:</span>
        <span className="text-[10px] text-slate-400">
          {currentTile?.flag ?? ''} {currentTile?.name}
        </span>
      </div>

      {/* Properties count */}
      {owned.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {owned.slice(0, 6).map((p) => {
            const t = TILES[p.tile_id];
            return (
              <span
                key={p.id}
                className="text-[9px] px-1 py-0.5 rounded"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {t?.flag ?? t?.name.slice(0, 3)}
              </span>
            );
          })}
          {owned.length > 6 && (
            <span className="text-[9px] text-slate-600">+{owned.length - 6}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
