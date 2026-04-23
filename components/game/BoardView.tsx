'use client';

import { useMemo, useRef, useLayoutEffect, useState } from 'react';
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

function DieFaceStatic({ n, size = 80 }: { n: number; size?: number }) {
  const dots: Record<number, number[][]> = {
    1: [[0.5,0.5]],
    2: [[0.25,0.25],[0.75,0.75]],
    3: [[0.25,0.25],[0.5,0.5],[0.75,0.75]],
    4: [[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]],
    5: [[0.25,0.25],[0.75,0.25],[0.5,0.5],[0.25,0.75],[0.75,0.75]],
    6: [[0.25,0.25],[0.75,0.25],[0.25,0.5],[0.75,0.5],[0.25,0.75],[0.75,0.75]],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <linearGradient id="die-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.98 0.005 260)"/>
          <stop offset="1" stopColor="oklch(0.88 0.01 260)"/>
        </linearGradient>
        <filter id="die-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="oklch(0 0 0 / 0.3)"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="11" fill="url(#die-g)" stroke="oklch(0.75 0.01 260)" strokeWidth="0.5" filter="url(#die-shadow)"/>
      {(dots[n] ?? []).map((d, i) => (
        <circle key={i} cx={d[0]*64} cy={d[1]*64} r="4.5" fill="oklch(0.15 0.02 260)"/>
      ))}
    </svg>
  );
}

export default function BoardView({ players, properties, onTileClick }: BoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);

  // Board intrinsic size: 2 corners (84px) + 9 tiles (56px each) + 10 gaps (2px) + 12 padding = 742px
  const BOARD_SIZE = 742;
  const CORNER_SIZE = 84;
  const TILE_SIZE = 56;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const avail = Math.min(width - 4, height - 4);
      if (avail <= 0) return;
      const s = Math.max(0.35, Math.min(1, avail / BOARD_SIZE));
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

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
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {/* Scaled board wrapper */}
      <div style={{ width: BOARD_SIZE * scale, height: BOARD_SIZE * scale, position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          display: 'grid',
          gridTemplateColumns: `${CORNER_SIZE}px repeat(9, ${TILE_SIZE}px) ${CORNER_SIZE}px`,
          gridTemplateRows: `${CORNER_SIZE}px repeat(9, ${TILE_SIZE}px) ${CORNER_SIZE}px`,
          background: 'radial-gradient(ellipse at center, oklch(0.20 0.03 260) 0%, oklch(0.14 0.02 260) 100%)',
          border: '1px solid var(--stroke-soft)',
          borderRadius: 18,
          padding: 5,
          gap: 2,
          boxShadow: 'var(--shadow-xl), inset 0 0 80px oklch(0 0 0 / 0.4)',
        }}>
          {/* Board tiles */}
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
            style={{
              gridRow: '2 / 11',
              gridColumn: '2 / 11',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, oklch(0.18 0.025 260) 0%, transparent 70%)',
              overflow: 'hidden',
              gap: 14,
            }}
          >
            {/* Watermark */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-18deg)',
              opacity: 0.03,
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 130, letterSpacing: '-0.05em', color: 'white', whiteSpace: 'nowrap' }}>
                TYCOON<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
              </div>
            </div>

            {/* Dice */}
            <div style={{ display: 'flex', gap: 14, zIndex: 1 }}>
              <div style={{ transform: 'rotate(-6deg)', filter: 'drop-shadow(0 6px 20px oklch(0 0 0 / 0.45))' }}>
                <DieFaceStatic n={5} size={80} />
              </div>
              <div style={{ transform: 'rotate(8deg)', filter: 'drop-shadow(0 6px 20px oklch(0 0 0 / 0.45))' }}>
                <DieFaceStatic n={3} size={80} />
              </div>
            </div>

            {/* Center label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                Tycoon<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                World Edition
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
