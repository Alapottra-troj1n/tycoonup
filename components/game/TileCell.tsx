'use client';

import { useEffect, useRef, useState } from 'react';
import FlagChip from './FlagChip';
import PlayerMascot from './PlayerMascot';
import type { Tile, Player, Property } from '@/lib/types';
import { SET_COLORS } from '@/lib/game-data';
import { playerHexOf } from '@/lib/colors';
import { TILE_TYPE_ICONS, ChainIcon, UmbrellaIcon, SirenIcon, FlagIcon, LockIcon } from './icons';

const SHORT_NAMES: Record<string, string> = {
  'Ransom to Underworld': 'Underworld',
  'Rio de Janeiro': 'Rio',
  'Global Airways': 'Airways',
  'Maritime Hub': 'Maritime',
  'Free Parking': 'Free Parking',
  'Global Event': 'Event',
  'Income Tax': 'Income Tax',
  'Go To Jail': 'Go To Jail',
  'World Chest': 'Chest',
  'Global Bank': 'Bank',
  'Los Angeles': 'Los Angeles',
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

function UpgradePips({ level, color }: { level: number; color: string }) {
  if (level <= 0) return null;
  const isMax = level >= 4;
  return (
    <div style={{ display: 'flex', gap: 2.5, justifyContent: 'center' }}>
      {Array.from({ length: Math.min(level, 4) }).map((_, i) => (
        <div key={i} style={{
          width: 5.5, height: 5.5,
          borderRadius: isMax ? 1.5 : '50%',
          background: isMax ? 'var(--gold)' : color,
        }} />
      ))}
    </div>
  );
}

// ── Corner tile ───────────────────────────────────────────────────────────────

const CORNER_META: Record<string, { Icon: (p: { size?: number; style?: React.CSSProperties }) => React.JSX.Element; tint: string; iconColor: string }> = {
  go:             { Icon: FlagIcon,     tint: 'oklch(0.78 0.13 155 / 0.10)', iconColor: 'var(--success)' },
  jail:           { Icon: ChainIcon,    tint: 'oklch(0.66 0.10 290 / 0.10)', iconColor: 'var(--text-muted)' },
  'free-parking': { Icon: UmbrellaIcon, tint: 'oklch(0.84 0.115 88 / 0.10)', iconColor: 'var(--gold)' },
  'go-to-jail':   { Icon: SirenIcon,    tint: 'oklch(0.71 0.155 25 / 0.10)', iconColor: 'var(--danger)' },
};

function CornerTile({ tile }: { tile: Tile }) {
  const meta = CORNER_META[tile.type];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 5,
      background: `linear-gradient(150deg, ${meta?.tint ?? 'transparent'} 0%, transparent 70%), oklch(0.21 0.024 260)`,
    }}>
      {meta && <div style={{ color: meta.iconColor, display: 'flex' }}><meta.Icon size={22} /></div>}
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10.5,
        letterSpacing: '0.02em', color: 'var(--text-secondary)', textAlign: 'center',
        lineHeight: 1.2, padding: '0 6px',
      }}>
        {SHORT_NAMES[tile.name] || tile.name}
      </div>
    </div>
  );
}

// ── Main TileCell ─────────────────────────────────────────────────────────────
//
// Visual language (richup-style):
//  · Property tiles start with a NEUTRAL gray band — the board reads calm and
//    unclaimed until players start buying.
//  · When bought, the band fills with the OWNER's color. That color band is the
//    single ownership signal.
//  · A small muted set-color dot on the band preserves set identity so players
//    can still plan monopolies at a glance.

export default function TileCell({
  tile, property, owner, playersOnTile, isCorner, side, onClick,
}: TileCellProps) {
  // Flash the tile briefly whenever its owner changes (purchase, auction, trade)
  const prevOwnerRef = useRef<string | null | undefined>(undefined);
  const [justClaimed, setJustClaimed] = useState(false);
  const ownerId = property?.owner_id ?? null;
  useEffect(() => {
    const prev = prevOwnerRef.current;
    prevOwnerRef.current = ownerId;
    if (prev === undefined || prev === ownerId || !ownerId) return;
    setJustClaimed(true);
    const t = setTimeout(() => setJustClaimed(false), 750);
    return () => clearTimeout(t);
  }, [ownerId]);

  if (isCorner) {
    return (
      <div
        className="tile-cell"
        onClick={onClick}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          border: '1px solid var(--stroke-hairline)', borderRadius: 8,
          overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <CornerTile tile={tile} />
        {playersOnTile.length > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20, pointerEvents: 'none',
          }}>
            {playersOnTile.map((p, idx) => (
              <PlayerMascot key={p.id} player={p} index={idx} total={playersOnTile.length} size={28} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isOwned      = !!property?.owner_id;
  const isMortgaged  = !!property?.is_mortgaged;
  const upgradeLevel = property?.upgrade_level ?? 0;
  const isProperty   = tile.type === 'country' || tile.type === 'transport' || tile.type === 'utility';

  // Set identity — shown only as a small muted dot on the band
  const setColor =
    tile.type === 'country'   ? (tile.set ? SET_COLORS[tile.set] : '#888') :
    tile.type === 'transport' ? 'var(--set-transit)' :
    tile.type === 'utility'   ? 'var(--set-utility)' : null;

  const ownerColorHex = owner ? playerHexOf(owner.color) : null;

  // Band = ownership: neutral gray until bought, then the owner's color
  const bandColor = isMortgaged
    ? 'var(--band-neutral-mortgaged)'
    : isOwned && ownerColorHex ? ownerColorHex : 'var(--band-neutral)';
  // On a mortgaged tile the dot shows who owns it; otherwise it shows the set
  const dotColor = isMortgaged && ownerColorHex ? ownerColorHex : setColor;

  // Content rotation — make text readable toward the board center
  const contentRotation =
    side === 'left'  ? 'rotate(90deg)'  :
    side === 'right' ? 'rotate(-90deg)' :
    'rotate(0deg)';

  const BAND = 12;
  // The set band sits on the OUTER edge of each tile
  const bandStyle: React.CSSProperties =
    side === 'bottom' ? { bottom: 0, left: 0, right: 0, height: BAND } :
    side === 'top'    ? { top: 0,   left: 0, right: 0, height: BAND } :
    side === 'left'   ? { left: 0,  top: 0, bottom: 0, width: BAND } :
                        { right: 0, top: 0, bottom: 0, width: BAND };

  // Small set-identity dot centered on the band
  const DOT = 6;
  const dotStyle: React.CSSProperties =
    side === 'bottom' ? { bottom: BAND / 2 - DOT / 2, left: '50%', transform: 'translateX(-50%)' } :
    side === 'top'    ? { top: BAND / 2 - DOT / 2,    left: '50%', transform: 'translateX(-50%)' } :
    side === 'left'   ? { left: BAND / 2 - DOT / 2,   top: '50%',  transform: 'translateY(-50%)' } :
                        { right: BAND / 2 - DOT / 2,  top: '50%',  transform: 'translateY(-50%)' };

  const contentPadding: React.CSSProperties =
    side === 'bottom' ? { paddingBottom: BAND + 2 } :
    side === 'top'    ? { paddingTop: BAND + 2 }    :
    side === 'left'   ? { paddingLeft: BAND + 2 }   :
                        { paddingRight: BAND + 2 };

  return (
    <div
      className={`tile-cell${justClaimed ? ' tu-tile-claimed' : ''}`}
      onClick={onClick}
      style={{
        width: '100%', height: '100%',
        position: 'relative',
        border: isOwned && ownerColorHex && !isMortgaged
          ? `1px solid ${ownerColorHex}55`
          : '1px solid var(--stroke-hairline)',
        borderRadius: 6,
        background: isOwned && ownerColorHex && !isMortgaged
          ? `linear-gradient(${ownerColorHex}0d, ${ownerColorHex}0d), var(--bg-tile)`
          : 'var(--bg-tile)',
        boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.03)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isMortgaged ? 0.6 : 1,
        overflow: 'hidden',
      }}
    >
      {/* ── Ownership band: neutral gray → owner color when bought ── */}
      {isProperty && (
        <div style={{
          position: 'absolute', ...bandStyle,
          background: bandColor,
          zIndex: 1,
        }} />
      )}

      {/* ── Set-identity dot on the band ── */}
      {isProperty && dotColor && (
        <div style={{
          position: 'absolute', ...dotStyle,
          width: DOT, height: DOT, borderRadius: '50%',
          background: dotColor,
          opacity: isOwned ? 0.9 : 0.65,
          boxShadow: isOwned ? '0 0 0 1px oklch(0 0 0 / 0.35)' : 'none',
          zIndex: 3,
        }} />
      )}

      {/* ── Tile content (rotated so it reads toward center) ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transform: contentRotation,
        zIndex: 2,
        gap: 3,
        padding: 3,
        ...contentPadding,
      }}>

        {/* Flag for country tiles */}
        {tile.type === 'country' && tile.flag && (
          <FlagChip code={tile.flag} size={13} round />
        )}

        {/* Icon for non-country tiles */}
        {tile.type !== 'country' && TILE_TYPE_ICONS[tile.type] && (
          <span style={{ lineHeight: 0, display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
            {TILE_TYPE_ICONS[tile.type]({ size: 14 })}
          </span>
        )}

        {/* Tile name */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9.5,
          textAlign: 'center',
          color: isMortgaged ? 'var(--text-faint)' : 'var(--text-secondary)',
          lineHeight: 1.15, letterSpacing: '0.005em',
          maxWidth: '96%',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}>
          {SHORT_NAMES[tile.name] || tile.name}
        </div>

        {/* Price (only when unowned & purchasable) */}
        {tile.buyPrice && !isOwned && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 8.5,
            color: 'var(--text-muted)', letterSpacing: '0.02em',
          }}>
            ${tile.buyPrice}
          </div>
        )}

        {/* Upgrade pips when owned — in the owner's color */}
        {isOwned && tile.type === 'country' && ownerColorHex && (
          <UpgradePips level={upgradeLevel} color={ownerColorHex} />
        )}
      </div>

      {/* Mortgaged lock overlay */}
      {isMortgaged && (
        <div style={{
          position: 'absolute',
          top: 3, right: 3,
          width: 15, height: 15, borderRadius: '50%',
          background: 'oklch(0.13 0.02 260 / 0.92)',
          border: '1px solid var(--stroke-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', zIndex: 10,
        }}>
          <LockIcon size={8} />
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
