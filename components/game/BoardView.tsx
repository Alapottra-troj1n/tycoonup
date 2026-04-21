'use client';

import { useMemo } from 'react';
import { TILES, getTileGridPos } from '@/lib/game-data';
import TileCell from './TileCell';
import type { Player, Property } from '@/lib/types';

interface BoardViewProps {
  players: Player[];
  properties: Property[];
  onTileClick?: (tileId: number) => void;
}

type TileSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

function getTileSide(id: number): TileSide {
  if ([0, 10, 20, 30].includes(id)) return 'corner';
  if (id >= 1 && id <= 9) return 'bottom';
  if (id >= 11 && id <= 19) return 'left';
  if (id >= 21 && id <= 29) return 'top';
  return 'right';
}

export default function BoardView({ players, properties, onTileClick }: BoardViewProps) {
  const propertyMap = useMemo(() => {
    const m = new Map<number, Property>();
    properties.forEach((p) => m.set(p.tile_id, p));
    return m;
  }, [properties]);

  const playersOnTile = useMemo(() => {
    const m = new Map<number, Player[]>();
    players.forEach((p) => {
      if (!p.is_bankrupt) {
        const list = m.get(p.position) ?? [];
        list.push(p);
        m.set(p.position, list);
      }
    });
    return m;
  }, [players]);

  return (
    <div
      className="relative inline-grid border border-slate-600/50 shadow-2xl rounded-sm overflow-hidden"
      style={{
        // 11 columns: 2 corners (80px) + 9 regular tiles (52px each) = 628px
        gridTemplateColumns: '80px repeat(9, 52px) 80px',
        gridTemplateRows: '80px repeat(9, 52px) 80px',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1225 100%)',
        boxShadow: '0 0 60px rgba(0,245,255,0.08), 0 0 120px rgba(0,0,0,0.8)',
      }}
    >
      {/* Render all 40 tiles */}
      {TILES.map((tile) => {
        const { row, col } = getTileGridPos(tile.id);
        const side = getTileSide(tile.id);
        const isCorner = side === 'corner';

        return (
          <div
            key={tile.id}
            style={{ gridRow: row, gridColumn: col }}
          >
            <TileCell
              tile={tile}
              property={propertyMap.get(tile.id)}
              playersOnTile={playersOnTile.get(tile.id) ?? []}
              isCorner={isCorner}
              side={side}
              onClick={() => onTileClick?.(tile.id)}
            />
          </div>
        );
      })}

      {/* Board center */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          gridRow: '2 / 11',
          gridColumn: '2 / 11',
          background: 'radial-gradient(ellipse at center, #0d1a2e 0%, #060912 100%)',
        }}
      >
        <div className="text-center select-none">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3"
            style={{ color: 'rgba(0,245,255,0.25)' }}
          >
            World Edition
          </div>
          <h1
            className="text-4xl font-black tracking-widest leading-none"
            style={{
              color: '#00f5ff',
              textShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff55',
              fontFamily: 'monospace',
            }}
          >
            TYCOON
          </h1>
          <h1
            className="text-4xl font-black tracking-widest leading-none"
            style={{
              color: '#ff00ff',
              textShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff55',
              fontFamily: 'monospace',
            }}
          >
            UP
          </h1>
          <div
            className="mt-4 w-20 h-px mx-auto"
            style={{ background: 'linear-gradient(90deg, transparent, #00f5ff33, transparent)' }}
          />
          <p className="text-slate-700 text-[8px] mt-3 tracking-widest uppercase">
            Global Empire
          </p>
          <p className="text-slate-800 text-[8px] mt-1">
            Click any tile for details
          </p>
        </div>
      </div>
    </div>
  );
}
