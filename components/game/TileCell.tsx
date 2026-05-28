'use client';

import FlagChip from './FlagChip';
import PlayerMascot from './PlayerMascot';
import type { Tile, Player, Property } from '@/lib/types';
import { PLAYER_COLOR_MAP } from '@/lib/game-data';

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
  owner?: Player;
  playersOnTile: Player[];
  isCorner: boolean;
  side: TileSide;
  onClick?: () => void;
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

function CornerTile({ tile }: { tile: Tile }) {
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
  tile, property, owner, playersOnTile, isCorner, side, onClick,
}: TileCellProps) {
  if (isCorner) {
    return (
      <div
        className="tile-cell"
        onClick={onClick}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          border: '1px solid var(--stroke-hairline)', borderRadius: 4,
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <CornerTile tile={tile} />
        {/* ── Player mascots — always upright, floating, overlapping ── */}
        {playersOnTile.length > 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            pointerEvents: 'none',
          }}>
            {playersOnTile.map((p, idx) => (
              <PlayerMascot key={p.id} player={p} index={idx} total={playersOnTile.length} size={28} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isOwned     = !!property?.owner_id;
  const isMortgaged = !!property?.is_mortgaged;
  const upgradeLevel = property?.upgrade_level ?? 0;
  
  // Show color band for any owned country, transport, or utility tile
  const showBand    = (tile.type === 'country' || tile.type === 'transport' || tile.type === 'utility') && isOwned;
  
  // The color band displays the owner's player color instead of the country set color
  const ownerColorHex = owner ? (PLAYER_COLOR_MAP[owner.color]?.hex ?? '#ffffff') : '#ffffff';
  const bandColor   = ownerColorHex;

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
        position: 'relative',
        border: isOwned && owner ? `1px solid ${ownerColorHex}` : '1px solid var(--stroke-hairline)',
        borderRadius: 3,
        background: isMortgaged ? 'oklch(0.18 0.010 255)' :
                    (isOwned && owner) ? `linear-gradient(135deg, oklch(0.22 0.025 255) 0%, ${ownerColorHex}12 100%)` :
                                  'oklch(0.19 0.018 255)',
        boxShadow: (isOwned && owner) ? `inset 0 0 6px ${ownerColorHex}25, 0 0 4px ${ownerColorHex}15` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isMortgaged ? 0.55 : 1,
        transition: 'all var(--dur-fast)',
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
            fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 700,
            color: 'var(--danger)', letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'oklch(0.68 0.22 25 / 0.12)',
            padding: '1px 4px', borderRadius: 2,
            border: '1px solid oklch(0.68 0.22 25 / 0.35)',
            marginTop: 2,
          }}>
            Mortgaged
          </div>
        )}
      </div>

      {/* Mortgaged lock overlay */}
      {isMortgaged && (
        <div style={{
          position: 'absolute',
          top: 3, right: 3,
          width: 14, height: 14, borderRadius: '50%',
          background: 'oklch(0.12 0.02 260 / 0.9)',
          border: '1px solid var(--danger)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, zIndex: 10,
          boxShadow: '0 0 6px var(--danger)',
        }}>
          🔒
        </div>
      )}

      {/* ── Player mascots — always upright, floating, overlapping ── */}
      {playersOnTile.length > 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          pointerEvents: 'none',
        }}>
          {playersOnTile.map((p, idx) => (
            <PlayerMascot key={p.id} player={p} index={idx} total={playersOnTile.length} size={26} />
          ))}
        </div>
      )}
    </div>
  );
}
