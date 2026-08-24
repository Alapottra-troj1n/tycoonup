'use client';

import { useState } from 'react';
import type { GameRoom, Player, Property } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { rollDice, endTurn, payJailFine, useGoojfCard } from '@/app/actions/game';
import { playClick, playHover } from '@/lib/sounds';
import { ChainIcon } from './icons';
import ErrorNote from './ErrorNote';

interface ActionPanelProps {
  room: GameRoom;
  myPlayer: Player;
  isMyTurn: boolean;
  properties: Property[];
  jailFine?: number;
  /** Render Roll / End Turn here (mobile dock). On desktop the board center owns them. */
  showTurnActions?: boolean;
}

export default function ActionPanel({
  room, myPlayer, isMyTurn, properties, jailFine = 50, showTurnActions = false,
}: ActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const showRoll = showTurnActions && isMyTurn && room.turn_phase === 'roll';
  const showEnd = showTurnActions && isMyTurn && room.turn_phase === 'end'
    && pending?.type !== 'chest_quiz' && pending?.type !== 'auction' && pending?.type !== 'trade_offer';
  const inJailActions = isMyTurn && myPlayer.in_jail && room.turn_phase === 'roll';

  return (
    <div style={{
      background: 'oklch(1 0 0 / 0.02)',
      border: isMyTurn ? '1px solid oklch(0.80 0.11 168 / 0.45)' : '1px solid var(--stroke-hairline)',
      borderRadius: 'var(--r-lg)',
      boxShadow: isMyTurn ? 'var(--glow-accent)' : 'none',
      overflow: 'hidden',
      transition: 'border-color var(--dur-med), box-shadow var(--dur-med)',
    }}>
      {/* Wallet header */}
      <div style={{
        padding: '13px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            color: isMyTurn ? 'var(--accent)' : 'var(--text-faint)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {isMyTurn && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
            {isMyTurn ? 'Your turn' : 'Your wallet'}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 23,
            color: 'var(--gold)', letterSpacing: '-0.015em', lineHeight: 1,
          }}>
            {formatMoney(myPlayer.balance)}
          </div>
        </div>
        {myOwnedCount > 0 && (
          <div style={{
            textAlign: 'right', flexShrink: 0,
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{myOwnedCount}</span> propert{myOwnedCount !== 1 ? 'ies' : 'y'}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '0 14px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && <ErrorNote>{error}</ErrorNote>}

        {/* Jail state + actions */}
        {myPlayer.in_jail && !myPlayer.is_bankrupt && (
          <div style={{
            padding: '9px 12px', borderRadius: 'var(--r-md)',
            background: 'oklch(0.66 0.10 290 / 0.10)',
            border: '1px solid oklch(0.66 0.10 290 / 0.3)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, color: 'var(--neon-violet)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChainIcon size={12} /> In jail — roll doubles to escape{isMyTurn ? `, or pay ${formatMoney(jailFine)}` : ''}
            </div>
            {inJailActions && (
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  className="tu-btn"
                  style={{ flex: 1, padding: '8px 10px', fontSize: 12.5 }}
                  disabled={loading || myPlayer.balance < jailFine}
                  onClick={() => { playClick(); withLoad(() => payJailFine(room.id, myPlayer.id)); }}
                  onMouseEnter={() => playHover()}
                >
                  Pay ${jailFine}
                </button>
                {(myPlayer.goojf_cards ?? 0) > 0 && (
                  <button
                    className="tu-btn"
                    style={{ flex: 1, padding: '8px 10px', fontSize: 12.5 }}
                    disabled={loading}
                    onClick={() => { playClick(); withLoad(() => useGoojfCard(room.id, myPlayer.id)); }}
                    onMouseEnter={() => playHover()}
                  >
                    Use card ({myPlayer.goojf_cards})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contextual pending info */}
        {isMyTurn && pending?.type === 'pay_rent' && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--danger)' }}>
            Rent paid: {formatMoney(pending.amount ?? 0)}
          </div>
        )}
        {isMyTurn && pending?.type === 'event_result' && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, color: 'var(--gold)', lineHeight: 1.5 }}>
            {pending.message}
          </div>
        )}
        {isMyTurn && pending?.type === 'tax_paid' && (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--danger)' }}>
            Tax paid: {formatMoney(pending.amount ?? 0)}
          </div>
        )}

        {/* Roll / End turn (mobile dock only) */}
        {showRoll && (
          <button
            className="tu-btn tu-btn-primary"
            style={{ width: '100%', padding: '12px 16px', fontSize: 14.5 }}
            disabled={loading}
            onClick={() => { playClick(true); withLoad(() => rollDice(room.id, myPlayer.id)); }}
          >
            {loading ? 'Rolling…' : 'Roll dice'}
          </button>
        )}
        {showEnd && (
          <button
            className={`tu-btn ${doublesTurn ? 'tu-btn-primary' : ''}`}
            style={{ width: '100%', padding: '12px 16px', fontSize: 14.5 }}
            disabled={loading}
            onClick={() => { playClick(); withLoad(() => endTurn(room.id, myPlayer.id)); }}
          >
            {loading ? '…' : doublesTurn ? 'Roll again (doubles)' : 'End turn'}
          </button>
        )}

        {!isMyTurn && !myPlayer.in_jail && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>
            Waiting for your turn — you can trade or manage assets anytime.
          </div>
        )}
      </div>
    </div>
  );
}
