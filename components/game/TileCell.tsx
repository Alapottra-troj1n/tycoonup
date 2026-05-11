'use client';

import FlagChip from './FlagChip';
import type { Tile, Player, Property } from '@/lib/types';
import { SET_COLORS } from '@/lib/game-data';

const SHORT_NAMES: Record<string, string> = {
  'Ransom to Underworld': 'R. Underworld',
  'Rio de Janeiro': 'Rio de Jan.',
  'Global Airways': 'Gl. Airways',
  'Maritime Hub': 'Mar. Hub',
  'Free Parking': 'Free Park.',
  'Global Event': 'Gl. Event',
  'Income Tax': 'Inc. Tax',
  'Go To Jail': 'Go To Jail',
  'World Chest': 'World Chest',
  'Global Bank': 'Gl. Bank',
  'Los Angeles': 'L. Angeles',
  'Trade Route': 'Trade Route',
};

type TileSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

interface TileCellProps {
  tile: Tile;
  property?: Property;
  playersOnTile: Player[];
  isCorner: boolean;
  side: TileSide;
  onClick?: () => void;
}

// ── Player token dot ──────────────────────────────────────────────────────────

const NEON: Record<string, string> = {
  cyan:    'oklch(0.76 0.12 210)',
  magenta: 'oklch(0.68 0.13 340)',
  lime:    'oklch(0.77 0.13 145)',
  amber:   'oklch(0.76 0.12 72)',
  violet:  'oklch(0.66 0.12 290)',
  rose:    'oklch(0.66 0.12 18)',
};

function PlayerDot({ color, size = 8 }: { color: string; size?: number }) {
  const c = NEON[color] ?? NEON.cyan;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: c,
      boxShadow: `0 0 5px ${c}`,
      border: '1px solid oklch(1 0 0 / 0.35)',
      flexShrink: 0,
    }} />
  );
}

// ── Upgrade pips ─────────────────────────────────────────────────────────────

function UpgradePips({ level }: { level: number }) {
  if (level <= 0) return null;
  const isHotel = level >= 5;
  return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: isHotel ? 2 : '50%',
          background: isHotel ? 'oklch(0.64 0.16 25)' : 'oklch(0.72 0.14 150)',
        }} />
      ))}
    </div>
  );
}

// ── Corner tile ───────────────────────────────────────────────────────────────

const CORNER_ICONS: Record<number, string> = { 0: '🏁', 10: '⛓️', 20: '🅿️', 30: '🚨' };

function CornerTile({ tile, playersOnTile }: { tile: Tile; playersOnTile: Player[] }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3, background: 'oklch(0.19 0.022 255)',
    }}>
      <div style={{ fontSize: 24 }}>{CORNER_ICONS[tile.id] ?? '?'}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: 'center',
        lineHeight: 1.2, padding: '0 4px',
      }}>
        {SHORT_NAMES[tile.name] || tile.name}
      </div>
      {playersOnTile.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 5, right: 5,
          display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 28,
        }}>
          {playersOnTile.map((p) => <PlayerDot key={p.id} color={p.color} />)}
        </div>
      )}
    </div>
  );
}

// ── Tile icons for non-country tiles ─────────────────────────────────────────

const TILE_ICONS: Record<string, string> = {
  chest: '📦', event: '⚡', tax: '💸',
  transport: '✈️', utility: '⚙️',
  jail: '⛓️', 'free-parking': '🅿️', 'go-to-jail': '🚨', go: '🏁',
};

// ── Main TileCell ─────────────────────────────────────────────────────────────
//
// Rotation strategy so text always reads toward the board center:
//   bottom row (ids 1-9)   → no rotation   (text points up, toward center)
//   left col  (ids 11-19)  → rotate(90deg) (text points right, toward center)
//   top row   (ids 21-29)  → no rotation   (text points down, toward center)
//   right col (ids 31-39)  → rotate(-90deg)(text points left, toward center)
//
// Color band is pinned to the OUTER edge of each tile:
//   bottom → bottom edge   left → left edge   top → top edge   right → right edge

export default function TileCell({
  tile, property, playersOnTile, isCorner, side, onClick,
}: TileCellProps) {
  if (isCorner) {
    return (
      <div
        className="tile-cell"
        onClick={onClick}
        style={{
          width: '100%', height: '100%',
          border: '1px solid var(--stroke-hairline)', borderRadius: 4,
          overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <CornerTile tile={tile} playersOnTile={playersOnTile} />
      </div>
    );
  }

  const isOwned     = !!property?.owner_id;
  const isMortgaged = !!property?.is_mortgaged;
  const upgradeLevel = property?.upgrade_level ?? 0;
  const showBand    = tile.type === 'country' && !!tile.set;
  const bandColor   = tile.set ? (SET_COLORS[tile.set] ?? 'transparent') : 'transparent';

  // Content rotation — make text readable toward the board center
  const contentRotation =
    side === 'left'  ? 'rotate(90deg)'  :
    side === 'right' ? 'rotate(-90deg)' :
    'rotate(0deg)'; // bottom & top both show text without rotation (bottom: text up, top: text down from above)

  // The color band sits on the OUTER edge of each tile
  const bandStyle: React.CSSProperties =
    side === 'bottom' ? { bottom: 0,  left: 0, right: 0, height: 13 } :
    side === 'top'    ? { top: 0,    left: 0, right: 0, height: 13 } :
    side === 'left'   ? { left: 0,  top: 0, bottom: 0, width: 13 } :
                        { right: 0, top: 0, bottom: 0, width: 13 };

  // Padding that keeps content away from the color band so they don't overlap
  const contentPadding: React.CSSProperties =
    side === 'bottom' ? { paddingBottom: 14 } :
    side === 'top'    ? { paddingTop: 14 }    :
    side === 'left'   ? { paddingLeft: 14 }   :
                        { paddingRight: 14 };

  return (
    <div
      className="tile-cell"
      onClick={onClick}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden',
        border: '1px solid var(--stroke-hairline)', borderRadius: 3,
        background: isMortgaged ? 'oklch(0.18 0.010 255)' :
                    isOwned     ? 'oklch(0.22 0.025 255)' :
                                  'oklch(0.19 0.018 255)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isMortgaged ? 0.55 : 1,
        transition: 'background var(--dur-fast)',
      }}
    >
      {/* ── Color band (always on the outer edge) ── */}
      {showBand && (
        <div style={{
          position: 'absolute', ...bandStyle,
          background: bandColor,
          zIndex: 1,
          opacity: isMortgaged ? 0.4 : 1,
        }} />
      )}

      {/* ── Tile content (rotated so it reads toward center) ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transform: contentRotation,
        zIndex: 2,
        ...contentPadding,
        gap: 2,
        padding: '2px',
        // override the contentPadding gap — merge both
        ...(showBand ? contentPadding : {}),
      }}>

        {/* Flag for country tiles */}
        {tile.type === 'country' && tile.flag && (
          <FlagChip code={tile.flag} size={14} round />
        )}

        {/* Icon for non-country tiles */}
        {tile.type !== 'country' && (
          <span style={{ fontSize: 13, lineHeight: 1, display: 'block', textAlign: 'center' }}>
            {TILE_ICONS[tile.type] ?? ''}
          </span>
        )}

        {/* Tile name */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 8.5, textAlign: 'center',
          color: isMortgaged ? 'var(--text-faint)' : 'var(--text-secondary)',
          lineHeight: 1.1, letterSpacing: '0.01em',
          maxWidth: '95%',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}>
          {SHORT_NAMES[tile.name] || tile.name}
        </div>

        {/* Price (only when unowned country/transport/utility) */}
        {tile.buyPrice && !isOwned && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'var(--text-faint)', letterSpacing: '0.02em',
          }}>
            ${tile.buyPrice}
          </div>
        )}

        {/* Upgrade pips when owned */}
        {isOwned && <UpgradePips level={upgradeLevel} />}

        {/* Mortgaged label */}
        {isMortgaged && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 6,
            color: 'var(--danger)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            MORT
          </div>
        )}
      </div>

      {/* ── Player dots — always visible, top-right of the cell ── */}
      {playersOnTile.length > 0 && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          display: 'flex', flexWrap: 'wrap', gap: 1,
          maxWidth: 20, zIndex: 10,
        }}>
          {playersOnTile.map((p) => <PlayerDot key={p.id} color={p.color} size={7} />)}
        </div>
      )}
    </div>
  );
}
