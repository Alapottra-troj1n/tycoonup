'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameRoom, Player, Property } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { rollDice, endTurn, payJailFine } from '@/app/actions/game';
import PropertyManager from './PropertyManager';

interface ActionPanelProps {
  room: GameRoom;
  myPlayer: Player;
  isMyTurn: boolean;
  properties: Property[];
  allPlayers: Player[];
}

function ActionBtn({
  children, onClick, disabled, variant = 'primary', fullWidth, color,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'end';
  fullWidth?: boolean;
  color?: string;
}) {
  const accentColor = color || 'var(--neon-cyan)';
  const bg = variant === 'primary'
    ? `linear-gradient(180deg, ${accentColor} 0%, oklch(from ${accentColor} calc(l * 0.82) c h) 100%)`
    : variant === 'end'
    ? 'var(--bg-raised)'
    : 'var(--bg-raised)';
  const textColor = variant === 'primary' ? 'oklch(0.12 0.02 260)' : 'var(--text-primary)';
  const border = variant === 'primary' ? 'none' : `1px solid var(--stroke-soft)`;
  const shadow = variant === 'primary' && !disabled
    ? `0 4px 16px oklch(from ${accentColor} l c h / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.25)`
    : 'none';

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '10px 14px',
        borderRadius: 'var(--r-md)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '-0.01em',
        background: bg,
        color: textColor,
        border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all var(--dur-fast) var(--ease-out)',
      }}
    >
      {children}
    </button>
  );
}

export default function ActionPanel({ room, myPlayer, isMyTurn, properties, allPlayers }: ActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProps, setShowProps] = useState(false);

  const pending = room.pending_action;
  const doublesTurn = room.doubles_turn ?? false;
  const myOwnedCount = properties.filter((p) => p.owner_id === myPlayer.id).length;

  async function withLoad(fn: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.success) setError(res.error ?? 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {showProps && (
          <PropertyManager
            room={room}
            player={myPlayer}
            properties={properties}
            allPlayers={allPlayers}
            onClose={() => setShowProps(false)}
          />
        )}
      </AnimatePresence>

      <div style={{
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: isMyTurn ? '1px solid var(--neon-cyan)' : '1px solid var(--stroke-hairline)',
        borderRadius: 'var(--r-lg)',
        boxShadow: isMyTurn ? 'var(--glow-cyan)' : 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'border-color var(--dur-med), box-shadow var(--dur-med)',
      }}>
        {/* Header */}
        <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid var(--stroke-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isMyTurn && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }}/>}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: isMyTurn ? 'var(--neon-cyan)' : 'var(--text-muted)' }}>
              {isMyTurn ? 'Your turn' : 'Waiting…'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {formatMoney(myPlayer.balance)}
            </span>
            {myOwnedCount > 0 && (
              <button
                onClick={() => setShowProps(true)}
                style={{
                  padding: '3px 8px', borderRadius: 'var(--r-pill)',
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                  background: 'var(--bg-raised)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--stroke-soft)',
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                {myOwnedCount} prop{myOwnedCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!isMyTurn && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', letterSpacing: '0.06em' }}>
              {myPlayer.in_jail ? 'You are in prison' : 'Waiting for your turn…'}
            </p>
          )}

          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', background: 'oklch(0.68 0.22 25 / 0.1)', border: '1px solid oklch(0.68 0.22 25 / 0.25)', borderRadius: 'var(--r-sm)', padding: '6px 10px' }}>
              {error}
            </div>
          )}

          {isMyTurn && (
            <>
              {/* ROLL phase */}
              {room.turn_phase === 'roll' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myPlayer.in_jail && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neon-amber)', letterSpacing: '0.04em' }}>
                      In prison — roll doubles to escape or pay {formatMoney(50)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionBtn
                      variant="primary"
                      color="var(--neon-cyan)"
                      disabled={loading}
                      onClick={() => withLoad(() => rollDice(room.id, myPlayer.id))}
                      fullWidth
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/></svg>
                      {loading ? 'Rolling…' : 'Roll dice'}
                    </ActionBtn>
                    {myPlayer.in_jail && (
                      <ActionBtn
                        variant="ghost"
                        disabled={loading || myPlayer.balance < 50}
                        onClick={() => withLoad(() => payJailFine(room.id, myPlayer.id))}
                      >
                        Pay $50
                      </ActionBtn>
                    )}
                  </div>
                </div>
              )}

              {/* Informational states during action phase */}
              {room.turn_phase === 'action' && pending?.type === 'buy_offer' && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--success)', letterSpacing: '0.04em', textAlign: 'center' }}>
                  Purchase dialog open
                </div>
              )}
              {pending?.type === 'pay_rent' && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--danger)' }}>
                  Rent paid: {formatMoney(pending.amount ?? 0)}
                </div>
              )}
              {pending?.type === 'event_result' && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--neon-amber)', lineHeight: 1.45 }}>
                  {pending.message}
                </div>
              )}
              {pending?.type === 'tax_paid' && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--danger)' }}>
                  Tax paid: {formatMoney(pending.amount ?? 0)}
                </div>
              )}

              {/* END TURN */}
              {room.turn_phase === 'end' && pending?.type !== 'chest_quiz' && pending?.type !== 'auction' && (
                <ActionBtn
                  variant={doublesTurn ? 'primary' : 'secondary'}
                  color={doublesTurn ? 'var(--neon-lime)' : undefined}
                  disabled={loading}
                  onClick={() => withLoad(() => endTurn(room.id, myPlayer.id))}
                  fullWidth
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  {loading ? (doublesTurn ? 'Rolling…' : 'Ending…') : (doublesTurn ? 'Roll again (doubles)' : 'End turn')}
                </ActionBtn>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
