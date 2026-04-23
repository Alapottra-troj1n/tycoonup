'use client';

import type { CSSProperties } from 'react';
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

// ─── Icon ────────────────────────────────────────────────────────────────────

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  const paths: Record<string, React.ReactNode> = {
    arrow:    <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    palm:     <><path d="M12 22V12"/><path d="M12 12c-2-5-7-6-9-4 2 0 5 1 6 4"/><path d="M12 12c2-5 7-6 9-4-2 0-5 1-6 4"/><path d="M12 12c0-5-4-7-7-5 2 1 3 3 3 5"/><path d="M12 12c0-5 4-7 7-5-2 1-3 3-3 5"/></>,
    ban:      <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>,
    airplane: <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L9 12l-3 3H4l-1 1 3 2 2 3 1-1v-2l3-3 3.7 5.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>,
    bolt:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    drop:     <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>,
    treasure: <><rect x="3" y="8" width="18" height="12" rx="1"/><path d="M3 12h18"/><circle cx="12" cy="14" r="1.5"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    question: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    scale:    <><path d="M12 3v18M5 7l7-4 7 4M5 7l-3 7h6zm14 0l3 7h-6z"/></>,
  };
  if (!paths[name]) return null;
  return <svg {...p}>{paths[name]}</svg>;
}

// ─── Player token ─────────────────────────────────────────────────────────────

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
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={`tt-${color}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.35" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill={`url(#tt-${color})`} stroke="oklch(0 0 0 / 0.3)" strokeWidth="0.5"/>
      <ellipse cx="15.5" cy="18" rx="1.5" ry="2" fill="oklch(0.1 0.02 260)" />
      <ellipse cx="24.5" cy="18" rx="1.5" ry="2" fill="oklch(0.1 0.02 260)" />
      <path d="M15 23 Q20 26 25 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <ellipse cx="14.5" cy="14.5" rx="2.5" ry="1.6" fill="white" opacity="0.55"/>
    </svg>
  );
}

// ─── Band positioning ─────────────────────────────────────────────────────────
// The color band always faces the board center:
//   bottom row → band at top   | top row    → band at bottom
//   left col   → band at right | right col  → band at left

const BAND_H = 14;

const BAND_POS: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
  bottom: 'top',
  top:    'bottom',
  left:   'right',
  right:  'left',
};

function getBandStyle(side: string): CSSProperties {
  const pos = BAND_POS[side] ?? 'top';
  const base: CSSProperties = { position: 'absolute' };
  if (pos === 'top')    return { ...base, top: 0, left: 0, right: 0, height: BAND_H };
  if (pos === 'bottom') return { ...base, bottom: 0, left: 0, right: 0, height: BAND_H };
  if (pos === 'left')   return { ...base, top: 0, bottom: 0, left: 0, width: BAND_H };
  return { ...base, top: 0, bottom: 0, right: 0, width: BAND_H };
}

function getContentInset(side: string) {
  const pos = BAND_POS[side] ?? 'top';
  return {
    top:    pos === 'top'    ? BAND_H + 4 : 4,
    bottom: pos === 'bottom' ? BAND_H + 4 : 4,
    left:   pos === 'left'   ? BAND_H + 4 : 4,
    right:  pos === 'right'  ? BAND_H + 4 : 4,
  };
}

// ─── Tile content ─────────────────────────────────────────────────────────────

function TileContent({ tile, property, isCorner, isMortgaged, side }: {
  tile: Tile;
  property?: Property;
  isCorner: boolean;
  isMortgaged: boolean;
  side: string;
}) {
  const upgradeLevel = property?.upgrade_level ?? 0;
  const setColor = tile.set ? SET_COLORS[tile.set] : null;
  const isHorizontal = side === 'left' || side === 'right';

  // ── Corner tiles ──────────────────────────────────────────────────────────
  if (isCorner) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
        {tile.type === 'go' && (<>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, color: 'var(--neon-lime)', letterSpacing: '-0.04em', textShadow: '0 0 18px oklch(0.85 0.2 130 / 0.8)', lineHeight: 1 }}>GO</div>
          <Icon name="arrow" size={18} color="var(--neon-lime)"/>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-secondary)', textAlign: 'center' }}>Collect $200</div>
        </>)}
        {tile.type === 'jail' && (<>
          <Icon name="lock" size={26} color="var(--neon-magenta)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>Prison</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>Just visiting</div>
        </>)}
        {tile.type === 'free-parking' && (<>
          <Icon name="palm" size={24} color="var(--neon-lime)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>Vacation</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>$50 held</div>
        </>)}
        {tile.type === 'go-to-jail' && (<>
          <Icon name="ban" size={24} color="var(--neon-rose)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: 'var(--text-primary)', textAlign: 'center' }}>Go to Prison</div>
        </>)}
      </div>
    );
  }

  // ── Regular tiles ─────────────────────────────────────────────────────────
  const inset = getContentInset(side);
  const bandStyle = getBandStyle(side);
  const isProperty = tile.type === 'country' || tile.type === 'transport' || tile.type === 'utility';

  // Derive band color: set color for countries, fixed variables for transit/utility
  const bandColor = setColor
    ?? (tile.type === 'transport' ? 'var(--set-transit)' : null)
    ?? (tile.type === 'utility'   ? 'var(--set-utility)' : null);

  // Global Bank (id 12) → bolt/electric; World Trade (id 28) → drop/water
  const utilityKind = tile.id === 12 ? 'electric' : 'water';

  // Tax sub-label
  const taxSub = tile.taxType === 'percent' ? '10%' : tile.taxAmount ? `$${tile.taxAmount}` : '';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: isMortgaged ? 0.5 : 1 }}>

      {/* ── Color band ──────────────────────────────────────────────────── */}
      {isProperty && bandColor && (
        <div style={{
          ...bandStyle,
          background: bandColor,
          opacity: isMortgaged ? 0.3 : 1,
          boxShadow: 'inset 0 -1px 0 oklch(0 0 0 / 0.25)',
        }}>
          {upgradeLevel > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexDirection: isHorizontal ? 'column' : 'row' }}>
              {Array.from({ length: Math.min(upgradeLevel, 5) }).map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, background: 'white', borderRadius: '50%', boxShadow: '0 0 4px white' }}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Country ─────────────────────────────────────────────────────── */}
      {tile.type === 'country' && (
        <div style={{
          position: 'absolute',
          top: inset.top, bottom: inset.bottom, left: inset.left, right: inset.right,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 6px', gap: 4,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', flexShrink: 0 }}>
            ${tile.buyPrice}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1, letterSpacing: '-0.01em', flex: isHorizontal ? 1 : 'none' }}>
            {tile.name}
          </div>
          {tile.flag && <FlagChip code={tile.flag} size={14} />}
        </div>
      )}

      {/* ── Transport ───────────────────────────────────────────────────── */}
      {tile.type === 'transport' && (
        <div style={{
          position: 'absolute',
          top: inset.top, bottom: inset.bottom, left: inset.left, right: inset.right,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 6px', gap: 4,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', flexShrink: 0 }}>
            ${tile.buyPrice}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1, flex: isHorizontal ? 1 : 'none' }}>
            {tile.name}
          </div>
          <Icon name="airplane" size={16} color="var(--text-secondary)"/>
        </div>
      )}

      {/* ── Utility ─────────────────────────────────────────────────────── */}
      {tile.type === 'utility' && (
        <div style={{
          position: 'absolute',
          top: inset.top, bottom: inset.bottom, left: inset.left, right: inset.right,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 4, gap: 4,
        }}>
          <Icon
            name={utilityKind === 'electric' ? 'bolt' : 'drop'}
            size={isHorizontal ? 16 : 20}
            color={utilityKind === 'electric' ? 'var(--neon-amber)' : 'var(--neon-cyan)'}
          />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>
            {tile.name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', flexShrink: 0 }}>
            ${tile.buyPrice}
          </div>
        </div>
      )}

      {/* ── World Chest ─────────────────────────────────────────────────── */}
      {tile.type === 'chest' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(180deg, oklch(0.76 0.12 72 / 0.20), oklch(0.76 0.12 72 / 0.05))', border: '1px solid oklch(0.76 0.12 72 / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="treasure" size={18} color="var(--neon-amber)"/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Treasure</div>
        </div>
      )}

      {/* ── Global Event ────────────────────────────────────────────────── */}
      {tile.type === 'event' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(180deg, oklch(0.68 0.13 340 / 0.20), oklch(0.68 0.13 340 / 0.05))', border: '1px solid oklch(0.68 0.13 340 / 0.36)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="question" size={16} color="var(--neon-magenta)"/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Surprise</div>
        </div>
      )}

      {/* ── Tax ─────────────────────────────────────────────────────────── */}
      {tile.type === 'tax' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }}>
          <Icon name="scale" size={18} color="var(--text-secondary)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>
            {tile.name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
            {taxSub}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TileCell ─────────────────────────────────────────────────────────────────

export default function TileCell({ tile, property, playersOnTile, isCorner, side, onClick }: TileCellProps) {
  const isMortgaged = property?.is_mortgaged ?? false;

  return (
    <div
      className="tile-cell"
      style={{
        width: '100%',
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        background: 'var(--bg-tile)',
        border: '1px solid var(--stroke-hairline)',
        borderRadius: isCorner ? 10 : 6,
        overflow: 'hidden',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}
      onClick={onClick}
    >
      <TileContent
        tile={tile}
        property={property}
        isCorner={isCorner}
        isMortgaged={isMortgaged}
        side={side}
      />

      {/* Player tokens — always upright, not rotated */}
      {playersOnTile.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: isCorner ? 6 : 2,
          left: 2, right: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'center',
          maxHeight: isCorner ? 32 : 18,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          {playersOnTile.slice(0, 4).map((player) => (
            <motion.div
              key={player.id}
              layoutId={`token-${player.id}`}
              layout
              style={{ filter: `drop-shadow(0 0 3px ${PLAYER_COLOR_MAP[player.color]?.hex ?? '#fff'})` }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <TileToken color={player.color} size={isCorner ? 20 : 14} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
