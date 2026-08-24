'use client';

import type { Player, Property, Tile } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { NEON } from '@/lib/colors';
import { SET_COLORS } from '@/lib/game-data';
import { renderMascotSVG } from './PlayerMascot';
import { ChainIcon } from './icons';

interface PlayerCardProps {
  player: Player;
  properties: Property[];
  tiles: Tile[];
  isCurrentTurn: boolean;
  isMe: boolean;
  compact?: boolean; // horizontal strip variant (mobile)
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
      color, letterSpacing: '0.05em', textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

export default function PlayerCard({ player, properties, tiles, isCurrentTurn, isMe, compact = false }: PlayerCardProps) {
  const neon = NEON[player.color] || 'var(--neon-cyan)';
  const owned = properties.filter((p) => p.owner_id === player.id);

  // Portfolio dots: one per owned property, colored by its set
  const portfolio = owned
    .map((p) => {
      const t = tiles[p.tile_id];
      const color = t?.set ? SET_COLORS[t.set] :
        t?.type === 'transport' ? 'var(--set-transit)' :
        t?.type === 'utility' ? 'var(--set-utility)' : 'var(--text-faint)';
      return { id: p.id, color, mortgaged: p.is_mortgaged };
    })
    .slice(0, 14);

  if (compact) {
    // Mobile horizontal chip
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 11px',
        background: isCurrentTurn ? `oklch(from ${neon} l c h / 0.10)` : 'var(--bg-glass-strong)',
        border: `1px solid ${isCurrentTurn ? neon : 'var(--stroke-soft)'}`,
        boxShadow: isCurrentTurn ? `0 0 0 1px ${neon}` : 'none',
        borderRadius: 'var(--r-pill)',
        flexShrink: 0,
        opacity: player.is_bankrupt ? 0.4 : 1,
        transition: 'all var(--dur-med) var(--ease-out)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: `1.5px solid ${neon}`,
          boxShadow: isCurrentTurn ? `0 0 8px ${neon}` : 'none',
        }}>
          {renderMascotSVG(player.color)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11.5, color: 'var(--gold)' }}>
            {player.is_bankrupt ? 'bust' : formatMoney(player.balance)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 12px',
        background: isCurrentTurn
          ? `linear-gradient(135deg, oklch(from ${neon} l c h / 0.13) 0%, oklch(from ${neon} l c h / 0.02) 100%)`
          : 'oklch(1 0 0 / 0.015)',
        border: `1px solid ${isCurrentTurn ? neon : 'var(--stroke-hairline)'}`,
        borderRadius: 'var(--r-lg)',
        position: 'relative',
        boxShadow: isCurrentTurn ? `0 0 0 1px ${neon}, 0 0 22px oklch(from ${neon} l c h / 0.16)` : 'none',
        opacity: player.is_bankrupt ? 0.4 : 1,
        transition: 'all var(--dur-med) var(--ease-out)',
      }}
    >
      {/* Mascot avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        border: `2px solid ${isCurrentTurn ? neon : 'oklch(1 0 0 / 0.15)'}`,
        boxShadow: isCurrentTurn ? `0 0 10px ${neon}66` : '0 2px 6px oklch(0 0 0 / 0.3)',
        transition: 'all var(--dur-med)',
      }}>
        {renderMascotSVG(player.color)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5,
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {player.name}
          </span>
          {isMe && <Tag color="var(--text-faint)">you</Tag>}
          {player.is_bot && <Tag color="var(--neon-violet)">bot</Tag>}
          {player.is_bankrupt && <Tag color="var(--danger)">bust</Tag>}
          {isCurrentTurn && !player.is_bankrupt && (
            <span style={{
              marginLeft: 'auto',
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: neon,
            }} />
          )}
        </div>

        {/* Cash row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 3 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14.5,
            color: 'var(--gold)', letterSpacing: '-0.01em',
          }}>
            {formatMoney(player.balance)}
          </span>
          {player.in_jail && !player.is_bankrupt && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neon-violet)', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <ChainIcon size={9} /> jail
            </span>
          )}
          {(player.goojf_cards ?? 0) > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }} title="Get Out of Jail Free cards">
              GOOJF ×{player.goojf_cards}
            </span>
          )}
        </div>

        {/* Portfolio dots */}
        {portfolio.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
            {portfolio.map((d) => (
              <span key={d.id} style={{
                width: 7, height: 7, borderRadius: 2,
                background: d.color,
                opacity: d.mortgaged ? 0.3 : 0.95,
                boxShadow: 'inset 0 0 0 0.5px oklch(0 0 0 / 0.3)',
              }} />
            ))}
            {owned.length > 14 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>
                +{owned.length - 14}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
