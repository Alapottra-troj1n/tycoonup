'use client';

import type { Player, Property } from '@/lib/types';
import { TILES } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';

const NEON: Record<string, string> = {
  cyan:    'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  lime:    'var(--neon-lime)',
  amber:   'var(--neon-amber)',
  violet:  'var(--neon-violet)',
  rose:    'var(--neon-rose)',
};

function PlayerToken({ color, size = 32 }: { color: string; size?: number }) {
  const c = NEON[color] || 'var(--neon-cyan)';
  const id = `pc-token-${color}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.35" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill={`url(#${id})`} stroke="oklch(0 0 0 / 0.3)" strokeWidth="0.5" />
      <ellipse cx="15.5" cy="18" rx="1.3" ry="1.7" fill="oklch(0.1 0.02 260)" />
      <ellipse cx="24.5" cy="18" rx="1.3" ry="1.7" fill="oklch(0.1 0.02 260)" />
      <path d="M15.5 23 Q20 25.5 24.5 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <ellipse cx="14.5" cy="14.5" rx="2" ry="1.3" fill="white" opacity="0.5" />
    </svg>
  );
}

interface PlayerCardProps {
  player: Player;
  properties: Property[];
  isCurrentTurn: boolean;
  isMe: boolean;
}

export default function PlayerCard({ player, properties, isCurrentTurn, isMe }: PlayerCardProps) {
  const neon = NEON[player.color] || 'var(--neon-cyan)';
  const owned = properties.filter((p) => p.owner_id === player.id);
  const currentTile = TILES[player.position];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 11px',
        background: isCurrentTurn ? 'oklch(1 0 0 / 0.04)' : 'transparent',
        border: isCurrentTurn
          ? `1px solid ${neon}`
          : '1px solid var(--stroke-hairline)',
        borderRadius: 'var(--r-lg)',
        position: 'relative',
        boxShadow: isCurrentTurn ? `0 0 20px oklch(from ${neon} l c h / 0.25)` : 'none',
        opacity: player.is_bankrupt ? 0.35 : 1,
        transition: 'all var(--dur-med) var(--ease-out)',
      }}
    >
      {/* Active indicator bar */}
      {isCurrentTurn && (
        <div style={{
          position: 'absolute',
          left: -1, top: 11, bottom: 11, width: 3,
          background: neon,
          borderRadius: 2,
          boxShadow: `0 0 10px ${neon}`,
        }}/>
      )}

      <PlayerToken color={player.color} size={30} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.name}
          </span>
          {isMe && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>you</span>
          )}
          {player.is_bot && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--neon-violet)', letterSpacing: '0.04em' }}>bot</span>
          )}
          {player.is_bankrupt && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--danger)', letterSpacing: '0.04em' }}>bust</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {formatMoney(player.balance)}
          </span>
          {player.in_jail && !player.is_bankrupt && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', letterSpacing: '0.04em' }}>prison</span>
          )}
        </div>
        {owned.length > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', marginTop: 2, letterSpacing: '0.02em' }}>
            {owned.length} {owned.length === 1 ? 'property' : 'properties'}
          </div>
        )}
      </div>
    </div>
  );
}
