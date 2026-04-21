'use client';

import { motion } from 'framer-motion';
import type { Tile, Player, Property } from '@/lib/types';
import { SET_COLORS, PLAYER_COLOR_MAP } from '@/lib/game-data';

interface TileCellProps {
  tile: Tile;
  property?: Property;
  playersOnTile: Player[];
  isCorner: boolean;
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner';
  onClick?: () => void;
}

const SIDE_ROTATIONS: Record<string, string> = {
  bottom: 'rotate-0',
  left: 'rotate-90',
  top: 'rotate-180',
  right: '-rotate-90',
  corner: 'rotate-0',
};

function TileIcon({ tile }: { tile: Tile }) {
  if (tile.type === 'go') return <span className="text-2xl font-black text-green-400">GO</span>;
  if (tile.type === 'go-to-jail') return <span className="text-lg">🚔</span>;
  if (tile.type === 'jail') return <span className="text-lg">⚖️</span>;
  if (tile.type === 'free-parking') return <span className="text-lg">🅿️</span>;
  if (tile.type === 'chest') return <span className="text-xl">📦</span>;
  if (tile.type === 'event') return <span className="text-xl">⚡</span>;
  if (tile.type === 'tax') return <span className="text-xl">💸</span>;
  if (tile.type === 'transport') return <span className="text-xl">✈️</span>;
  if (tile.type === 'utility') return <span className="text-xl">🏦</span>;
  if (tile.flag) return <span className="text-xl">{tile.flag}</span>;
  return null;
}

export default function TileCell({
  tile,
  property,
  playersOnTile,
  isCorner,
  side,
  onClick,
}: TileCellProps) {
  const setColor = tile.set ? SET_COLORS[tile.set] : null;
  const hasOwner = !!property?.owner_id;
  const upgradeLevel = property?.upgrade_level ?? 0;

  const rotation = SIDE_ROTATIONS[side];

  return (
    <div
      className={`relative flex items-stretch justify-stretch w-full h-full cursor-pointer group`}
      onClick={onClick}
    >
      <div
        className={`
          flex flex-col items-center justify-between w-full h-full
          border border-slate-700/60 bg-slate-900/80 hover:bg-slate-800/90
          transition-colors overflow-hidden select-none
          ${rotation}
        `}
      >
        {/* Color strip for country tiles */}
        {setColor && (
          <div
            className="w-full shrink-0"
            style={{
              height: isCorner ? '10px' : '8px',
              backgroundColor: setColor,
              boxShadow: hasOwner ? `0 0 6px ${setColor}` : 'none',
            }}
          />
        )}

        {/* Tile content */}
        <div className="flex flex-col items-center justify-center flex-1 gap-0.5 px-0.5 py-0.5">
          <TileIcon tile={tile} />
          {!isCorner && (
            <p
              className="text-[6px] font-semibold text-slate-300 text-center leading-tight"
              style={{ maxWidth: '52px' }}
            >
              {tile.name}
            </p>
          )}
          {isCorner && (
            <p className="text-[9px] font-bold text-slate-200 text-center">{tile.name}</p>
          )}
          {tile.buyPrice && !isCorner && (
            <p className="text-[5px] text-slate-500">${tile.buyPrice}</p>
          )}
          {tile.taxAmount && !isCorner && (
            <p className="text-[5px] text-red-400">${tile.taxAmount}</p>
          )}
        </div>

        {/* Upgrade pips */}
        {upgradeLevel > 0 && (
          <div className="flex gap-px pb-0.5">
            {Array.from({ length: upgradeLevel }).map((_, i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: setColor ?? '#fff' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Player tokens */}
      {playersOnTile.length > 0 && (
        <div className="absolute inset-0 flex flex-wrap items-end justify-center pb-1 gap-0.5 pointer-events-none">
          {playersOnTile.map((player) => (
            <motion.div
              key={player.id}
              layoutId={`token-${player.id}`}
              layout
              className="w-3 h-3 rounded-full border border-black/40 shadow-lg z-10"
              style={{
                backgroundColor: PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff',
                boxShadow: `0 0 6px ${PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff'}`,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
