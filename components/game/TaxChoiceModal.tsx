'use client';

import { useState } from 'react';
import type { GameRoom, Player } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { chooseTax } from '@/app/actions/game';
import DockCard from './DockCard';
import { TaxIcon } from './icons';
import ErrorNote from './ErrorNote';
import { playClick } from '@/lib/sounds';

interface TaxChoiceModalProps {
  room: GameRoom;
  myPlayer: Player;
}

export default function TaxChoiceModal({ room, myPlayer }: TaxChoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = room.pending_action;
  if (pending?.type !== 'income_tax_choice' || pending.player_id !== myPlayer.id) return null;

  const flatTax      = pending.flat_tax ?? 200;
  const netWorthTax  = pending.net_worth_tax ?? 0;
  const flatBetter   = flatTax <= netWorthTax;

  async function handleChoose(choice: 'flat' | 'percent') {
    playClick();
    setLoading(true);
    setError(null);
    const res = await chooseTax(room.id, myPlayer.id, choice);
    if (!res.success) setError(res.error ?? 'Failed');
    setLoading(false);
  }

  function Option({ amount, label, better, onPick }: { amount: number; label: string; better: boolean; onPick: () => void }) {
    return (
      <button
        disabled={loading}
        onClick={onPick}
        style={{
          flex: 1,
          padding: '15px 16px',
          borderRadius: 'var(--r-lg)',
          background: better ? 'var(--success-soft)' : 'oklch(1 0 0 / 0.03)',
          border: `1px solid ${better ? 'oklch(0.78 0.13 155 / 0.45)' : 'var(--stroke-soft)'}`,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          textAlign: 'left',
          transition: 'transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22,
            color: better ? 'var(--success)' : 'var(--text-primary)',
          }}>
            {formatMoney(amount)}
          </span>
          {better && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700,
              padding: '3px 8px', borderRadius: 'var(--r-pill)',
              background: 'oklch(0.78 0.13 155 / 0.18)', color: 'var(--success)',
              letterSpacing: '0.1em',
            }}>
              CHEAPER
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {label}
        </div>
      </button>
    );
  }

  return (
    <DockCard accent="var(--danger)" width={460}>
      {/* Header */}
      <div style={{
        padding: '13px 18px 12px',
        borderBottom: '1px solid var(--stroke-hairline)',
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r-md)',
          background: 'var(--danger-soft)',
          border: '1px solid oklch(0.71 0.155 25 / 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--danger)', flexShrink: 0,
        }}>
          <TaxIcon size={17} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            Income Tax
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
            Pick how you want to pay
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error && <ErrorNote>{error}</ErrorNote>}

        <div style={{ display: 'flex', gap: 10 }}>
          <Option amount={flatTax} label="Flat rate" better={flatBetter} onPick={() => handleChoose('flat')} />
          <Option amount={netWorthTax} label="10% of net worth" better={!flatBetter} onPick={() => handleChoose('percent')} />
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-faint)', textAlign: 'center', lineHeight: 1.5 }}>
          Net worth = cash + properties + upgrades − mortgage debt
        </div>
      </div>
    </DockCard>
  );
}
