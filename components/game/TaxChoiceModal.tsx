'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { chooseTax } from '@/app/actions/game';

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
    setLoading(true);
    setError(null);
    const res = await chooseTax(room.id, myPlayer.id, choice);
    if (!res.success) setError(res.error ?? 'Failed');
    setLoading(false);
  }

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        style={{
          width: '100%', maxWidth: 360,
          background: 'var(--bg-glass-strong)',
          border: '1px solid var(--stroke-soft)',
          borderRadius: 'var(--r-2xl)',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--stroke-hairline)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--r-md)',
            background: 'oklch(0.68 0.22 25 / 0.15)',
            border: '1px solid oklch(0.68 0.22 25 / 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            🏛️
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              Income Tax
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
              Choose your payment method
            </div>
          </div>
        </div>

        {/* Options */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)',
              background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)',
              borderRadius: 'var(--r-sm)', padding: '6px 10px',
            }}>
              {error}
            </div>
          )}

          {/* Flat $200 option */}
          <button
            disabled={loading}
            onClick={() => handleChoose('flat')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--r-lg)',
              background: flatBetter ? 'oklch(0.78 0.18 150 / 0.08)' : 'var(--bg-raised)',
              border: `1px solid ${flatBetter ? 'oklch(0.78 0.18 150 / 0.35)' : 'var(--stroke-soft)'}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              textAlign: 'left',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: flatBetter ? 'var(--success)' : 'var(--text-primary)' }}>
                {formatMoney(flatTax)}
              </span>
              {flatBetter && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 6px', borderRadius: 'var(--r-pill)', background: 'oklch(0.78 0.18 150 / 0.15)', color: 'var(--success)', letterSpacing: '0.08em' }}>
                  BETTER
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
              Flat rate
            </div>
          </button>

          {/* 10% net worth option */}
          <button
            disabled={loading}
            onClick={() => handleChoose('percent')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--r-lg)',
              background: !flatBetter ? 'oklch(0.78 0.18 150 / 0.08)' : 'var(--bg-raised)',
              border: `1px solid ${!flatBetter ? 'oklch(0.78 0.18 150 / 0.35)' : 'var(--stroke-soft)'}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              textAlign: 'left',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: !flatBetter ? 'var(--success)' : 'var(--text-primary)' }}>
                {formatMoney(netWorthTax)}
              </span>
              {!flatBetter && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 6px', borderRadius: 'var(--r-pill)', background: 'oklch(0.78 0.18 150 / 0.15)', color: 'var(--success)', letterSpacing: '0.08em' }}>
                  BETTER
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
              10% of net worth
            </div>
          </button>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', textAlign: 'center', lineHeight: 1.5 }}>
            Net worth = cash + properties + upgrades − mortgage debt
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
