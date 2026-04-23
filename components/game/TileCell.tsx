'use client';

import { motion } from 'framer-motion';
import type { Tile, Player, Property } from '@/lib/types';
import { SET_COLORS, PLAYER_COLOR_MAP } from '@/lib/game-data';

import FlagChip from './FlagChip';
interface TileCellProps {
  tile: Tile;
  property?: Property;
  playersOnTile: Player[];
  isCorner: boolean;
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner';
  onClick?: () => void;
}

const NEON: Record<string, string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  lime:    'var(--neon-lime)',
  amber:   'var(--neon-amber)',
  violet:  'var(--neon-violet)',
  rose:    'var(--neon-rose)',
};

function TileToken({ color, size = 16 }: { color: string; size?: number }) {
  const c = NEON[color] || 'var(--neon-cyan)';
  const hex = PLAYER_COLOR_MAP[color]?.hex || '#fff';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={`tt-${color}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.35" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill={`url(#tt-${color})`} />
      <ellipse cx="15.5" cy="18" rx="1.4" ry="1.8" fill="oklch(0.1 0.02 260)" />
      <ellipse cx="24.5" cy="18" rx="1.4" ry="1.8" fill="oklch(0.1 0.02 260)" />
      <path d="M15.5 23 Q20 26 24.5 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// The color band always renders at the "top" of the tile content.
// The parent rotates the entire tile so the band faces the board center.
// bottom tiles → no rotation (band at top faces center) ✓
// top tiles    → 180° rotation (band at top of rotated = bottom = faces center) ✓
// left tiles   → 90° rotation (band at top of rotated = right = faces center) ✓
// right tiles  → -90° rotation (band at top of rotated = left = faces center) ✓

const SIDE_ROTATE: Record<string, string> = {
  bottom: 'rotate(0deg)',
  top:    'rotate(180deg)',
  left:   'rotate(90deg)',
  right:  'rotate(-90deg)',
  corner: 'rotate(0deg)',
};

function TileContent({ tile, property, isCorner, isMortgaged }: {
  tile: Tile;
  property?: Property;
  isCorner: boolean;
  isMortgaged: boolean;
}) {
  const hasOwner = !!property?.owner_id;
  const upgradeLevel = property?.upgrade_level ?? 0;
  const setColor = tile.set ? SET_COLORS[tile.set] : null;
  const ownerColorKey = property?.owner_id ? undefined : undefined; // resolved externally
  const bandColor = setColor ?? null;
  const isProperty = tile.type === 'country' || tile.type === 'transport' || tile.type === 'utility';

  const BAND_H = isCorner ? 0 : 11;

  // Corner tile content
  if (isCorner) {
    const isGo = tile.type === 'go';
    const isJail = tile.type === 'jail';
    const isParking = tile.type === 'free-parking';
    const isGotoJail = tile.type === 'go-to-jail';
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 }}>
        {isGo && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--neon-lime)', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px oklch(0.85 0.2 130 / 0.7)' }}>GO</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-secondary)', textAlign: 'center' }}>Collect $200</div>
          </>
        )}
        {isJail && (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-magenta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: 'var(--text-primary)' }}>Prison</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)' }}>Just visiting</div>
          </>
        )}
        {isParking && (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-lime)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4h-2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: 'var(--text-primary)' }}>Vacation</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)' }}>$50 held</div>
          </>
        )}
        {isGotoJail && (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-rose)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>Go to<br/>Prison</div>
          </>
        )}
      </div>
    );
  }

  // Regular tile
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Color band at top (faces inward after rotation) */}
      {isProperty && bandColor && (
        <div style={{
          height: BAND_H,
          background: bandColor,
          flexShrink: 0,
          position: 'relative',
          opacity: isMortgaged ? 0.3 : 1,
        }}>
          {upgradeLevel > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              {Array.from({ length: Math.min(upgradeLevel, 5) }).map((_, i) => (
                <div key={i} style={{ width: 4, height: 4, background: 'white', borderRadius: '50%', boxShadow: '0 0 4px white' }}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tile body */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 3px 4px',
        gap: 2,
        opacity: isMortgaged ? 0.45 : 1,
      }}>
        {/* Icon / flag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {tile.type === 'country' && tile.flag && (
            <FlagChip 
              code={tile.flag} 
              size={15}
              style={{ boxShadow: '0 1px 4px oklch(0 0 0 / 0.4)' }}
            />
          )}
          {tile.type === 'transport' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L9 12l-3 3H4l-1 1 3 2 2 3 1-1v-2l3-3 3.7 5.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
          )}
          {tile.type === 'utility' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          )}
          {tile.type === 'chest' && (
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'oklch(0.82 0.17 75 / 0.2)', border: '1px solid oklch(0.82 0.17 75 / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--neon-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="12" rx="1"/><path d="M3 12h18"/><circle cx="12" cy="14" r="1.5"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>
              </svg>
            </div>
          )}
          {tile.type === 'event' && (
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'oklch(0.72 0.22 350 / 0.2)', border: '1px solid oklch(0.72 0.22 350 / 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--neon-magenta)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          )}
          {tile.type === 'tax' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M5 7l7-4 7 4M5 7l-3 7h6zm14 0l3 7h-6z"/>
            </svg>
          )}
        </div>

        {/* City name */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 7.5,
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          maxWidth: '100%',
          overflow: 'hidden',
        }}>
          {tile.name}
        </div>

        {/* Country label (for city tiles) */}
        {tile.type === 'country' && tile.country && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 5.5,
            color: 'var(--text-faint)',
            textAlign: 'center',
            letterSpacing: '0.03em',
            lineHeight: 1,
          }}>
            {tile.country}
          </div>
        )}

        {/* Price */}
        {(tile.buyPrice || tile.taxAmount) && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 6.5,
            color: tile.taxAmount ? 'var(--danger)' : 'var(--text-secondary)',
            letterSpacing: '0.02em',
          }}>
            ${tile.taxAmount ?? tile.buyPrice}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TileCell({ tile, property, playersOnTile, isCorner, side, onClick }: TileCellProps) {
  const isMortgaged = property?.is_mortgaged ?? false;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={onClick}
    >
      {/* Rotated content wrapper */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: SIDE_ROTATE[side] ?? 'rotate(0deg)',
          transformOrigin: 'center center',
          background: 'var(--bg-tile)',
          border: '1px solid var(--stroke-hairline)',
          borderRadius: isCorner ? 'var(--r-md)' : 'var(--r-xs)',
          overflow: 'hidden',
          transition: 'background var(--dur-fast)',
          position: 'relative',
        }}
        className="tile-cell-inner"
      >
        <TileContent tile={tile} property={property} isCorner={isCorner} isMortgaged={isMortgaged} />
      </div>

      {/* Player tokens — on top, not rotated */}
      {playersOnTile.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: isCorner ? 6 : 3,
          left: 0,
          right: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          {playersOnTile.map((player) => (
            <motion.div
              key={player.id}
              layoutId={`token-${player.id}`}
              layout
              style={{ filter: `drop-shadow(0 0 4px ${PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff'})` }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <TileToken color={player.color} size={isCorner ? 20 : 15} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
