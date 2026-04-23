'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { TILES, SET_COLORS, SET_ADVANTAGES, SET_SIZES } from '@/lib/game-data';
import { formatMoney, getSetOwnerCount } from '@/lib/utils';
import { buyProperty, skipBuy } from '@/app/actions/game';
import FlagChip from './FlagChip';
interface BuyOfferModalProps {
  room: GameRoom;
  myPlayer: Player;
  tileId: number;
  price: number;
  allProperties?: import('@/lib/types').Property[];
}

export default function BuyOfferModal({ room, myPlayer, tileId, price, allProperties = [] }: BuyOfferModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tile = TILES[tileId];
  if (!tile) return null;

  const canAfford = myPlayer.balance >= price;
  const afterBalance = myPlayer.balance - price;
  const setColor = tile.set ? SET_COLORS[tile.set] : 'var(--neon-cyan)';

  // Monopoly progress
  const setTotal = tile.set ? (SET_SIZES[tile.set] ?? 2) : 0;
  const mySetOwned = tile.set ? getSetOwnerCount(allProperties, tile.set, myPlayer.id) : 0;
  const wouldComplete = tile.set && mySetOwned + 1 >= setTotal;
  const setAdvantage = tile.set ? SET_ADVANTAGES[tile.set] : null;

  async function handleBuy() {
    setLoading(true);
    setError(null);
    const res = await buyProperty(room.id, myPlayer.id, tileId);
    if (!res.success) setError(res.error ?? 'Purchase failed');
    setLoading(false);
  }

  async function handleSkip() {
    setLoading(true);
    setError(null);
    const res = await skipBuy(room.id, myPlayer.id);
    if (!res.success) setError(res.error ?? 'Failed to skip');
    setLoading(false);
  }

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'oklch(0.1 0.02 260 / 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        style={{
          width: '100%', maxWidth: 380,
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${setColor}55`,
          borderRadius: 'var(--r-2xl)',
          boxShadow: `0 0 60px ${setColor}18, var(--shadow-xl)`,
          overflow: 'hidden',
        }}
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        {/* Set color band */}
        <div style={{ height: 3, background: setColor, boxShadow: `0 0 12px ${setColor}` }} />

        <div style={{ padding: '20px 20px 0' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {tile.set && (
              <div style={{
                display: 'inline-block',
                padding: '3px 10px',
                background: `${setColor}18`,
                border: `1px solid ${setColor}40`,
                borderRadius: 'var(--r-pill)',
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: setColor,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                {tile.set.replace('-', ' ')} Set
              </div>
            )}
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
              letterSpacing: '-0.02em', color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}>
              {tile.flag && <FlagChip code={tile.flag} size={21} style={{ boxShadow: '0 1px 4px oklch(0 0 0 / 0.4)', marginRight: 8, verticalAlign: 'middle' }} />}
              {tile.name}
            </div>
            {tile.country && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: setColor, marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {tile.country}
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 4, letterSpacing: '0.06em' }}>
              Unowned — Buy now or send to auction
            </div>
          </div>

          {/* Price / balance grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{
              padding: '10px 12px', borderRadius: 'var(--r-md)', textAlign: 'center',
              background: 'oklch(0.82 0.17 210 / 0.06)',
              border: '1px solid oklch(0.82 0.17 210 / 0.18)',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Listing price</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--neon-cyan)' }}>{formatMoney(price)}</div>
            </div>
            <div style={{
              padding: '10px 12px', borderRadius: 'var(--r-md)', textAlign: 'center',
              background: canAfford ? 'oklch(0.78 0.18 150 / 0.06)' : 'oklch(0.68 0.22 25 / 0.06)',
              border: `1px solid ${canAfford ? 'oklch(0.78 0.18 150 / 0.2)' : 'oklch(0.68 0.22 25 / 0.2)'}`,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Your balance</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: canAfford ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(myPlayer.balance)}</div>
            </div>
          </div>

          {/* Rent levels */}
          {tile.rentLevels && tile.rentLevels.length > 0 && (
            <div style={{
              padding: '10px 12px',
              background: 'oklch(1 0 0 / 0.02)',
              border: '1px solid var(--stroke-hairline)',
              borderRadius: 'var(--r-md)',
              marginBottom: 12,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Rent levels</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {tile.rentLevels.map((r, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: i === 0 ? 'var(--text-faint)' : setColor, marginBottom: 3, letterSpacing: '0.06em' }}>
                      {i === 0 ? 'Base' : `L${i}`}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, color: 'var(--success)' }}>${r}</div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Monopoly progress / bonus */}
          {tile.set && setAdvantage && (
            <div style={{
              padding: '8px 12px',
              background: wouldComplete ? `${setColor}18` : 'oklch(1 0 0 / 0.02)',
              border: `1px solid ${wouldComplete ? `${setColor}40` : 'var(--stroke-hairline)'}`,
              borderRadius: 'var(--r-md)',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: wouldComplete ? 5 : 0 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: setTotal }).map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < mySetOwned ? setColor : i === mySetOwned ? `${setColor}66` : 'oklch(1 0 0 / 0.08)',
                      boxShadow: i < mySetOwned ? `0 0 5px ${setColor}` : 'none',
                      border: i === mySetOwned ? `1px dashed ${setColor}` : 'none',
                    }} />
                  ))}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: wouldComplete ? setColor : 'var(--text-faint)', letterSpacing: '0.06em' }}>
                  {wouldComplete ? '🎯 Completes Monopoly!' : `${mySetOwned}/${setTotal} cities owned`}
                </span>
              </div>
              {wouldComplete && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Bonus: {setAdvantage}
                </div>
              )}
            </div>
          )}

          {/* After balance */}
          {canAfford && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', marginBottom: 8 }}>
              Balance after purchase: <span style={{ color: 'var(--text-secondary)' }}>{formatMoney(afterBalance)}</span>
            </div>
          )}

          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)',
              background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)',
              borderRadius: 'var(--r-sm)', padding: '6px 10px', marginBottom: 8, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {!canAfford && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)',
              textAlign: 'center', marginBottom: 8,
            }}>
              Insufficient funds — will go to auction
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
          <motion.button
            disabled={loading || !canAfford}
            onClick={handleBuy}
            style={{
              flex: 1, padding: '12px 16px',
              borderRadius: 'var(--r-lg)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
              background: canAfford
                ? `linear-gradient(180deg, ${setColor} 0%, oklch(from ${setColor} calc(l * 0.8) c h) 100%)`
                : 'var(--bg-raised)',
              color: canAfford ? 'oklch(0.12 0.02 260)' : 'var(--text-faint)',
              border: canAfford ? 'none' : '1px solid var(--stroke-soft)',
              cursor: !canAfford || loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: canAfford && !loading ? `0 4px 20px ${setColor}44` : 'none',
            }}
            whileHover={canAfford && !loading ? { scale: 1.02 } : {}}
            whileTap={canAfford && !loading ? { scale: 0.97 } : {}}
          >
            {loading ? '…' : canAfford ? `Buy ${formatMoney(price)}` : 'Cannot Afford'}
          </motion.button>

          <motion.button
            disabled={loading}
            onClick={handleSkip}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--r-lg)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
              background: 'var(--bg-raised)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--stroke-soft)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.4 : 1,
            }}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
          >
            Auction
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
