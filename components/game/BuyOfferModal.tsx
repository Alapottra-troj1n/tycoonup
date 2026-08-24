'use client';

import { useState } from 'react';
import type { GameRoom, Player, Tile } from '@/lib/types';
import { SET_COLORS, SET_ADVANTAGES, SET_SIZES } from '@/lib/game-data';
import { formatMoney, getSetOwnerCount } from '@/lib/utils';
import { buyProperty, skipBuy } from '@/app/actions/game';
import FlagChip from './FlagChip';
import DockCard from './DockCard';
import ErrorNote from './ErrorNote';
import { playBuySuccess, playSkip, playClick } from '@/lib/sounds';

interface BuyOfferModalProps {
  room: GameRoom;
  myPlayer: Player;
  tiles: Tile[];
  tileId: number;
  price: number;
  allProperties?: import('@/lib/types').Property[];
  auctionsEnabled?: boolean;
  onManageProperties?: () => void;
}

export default function BuyOfferModal({ room, myPlayer, tiles, tileId, price, allProperties = [], auctionsEnabled = true, onManageProperties }: BuyOfferModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tile = tiles[tileId];
  if (!tile) return null;

  const canAfford = myPlayer.balance >= price;
  const afterBalance = myPlayer.balance - price;
  const setColor = tile.set ? SET_COLORS[tile.set] : 'var(--set-transit)';

  // Monopoly progress
  const setTotal = tile.set ? (SET_SIZES[tile.set] ?? 2) : 0;
  const mySetOwned = tile.set ? getSetOwnerCount(tiles, allProperties, tile.set, myPlayer.id) : 0;
  const wouldComplete = tile.set && mySetOwned + 1 >= setTotal;
  const setAdvantage = tile.set ? SET_ADVANTAGES[tile.set] : null;

  async function handleBuy() {
    setLoading(true);
    setError(null);
    playClick();
    const res = await buyProperty(room.id, myPlayer.id, tileId);
    if (!res.success) setError(res.error ?? 'Purchase failed');
    else playBuySuccess();
    setLoading(false);
  }

  async function handleSkip() {
    setLoading(true);
    setError(null);
    playClick();
    const res = await skipBuy(room.id, myPlayer.id);
    if (!res.success) setError(res.error ?? 'Failed to skip');
    else playSkip();
    setLoading(false);
  }

  return (
    <DockCard accent={setColor} width={480}>
      <div style={{ padding: '16px 18px 18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {tile.flag && <FlagChip code={tile.flag} size={26} style={{ boxShadow: '0 2px 6px oklch(0 0 0 / 0.4)', flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {tile.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              {tile.set && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: setColor, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: setColor }} />
                  {tile.country ?? tile.set.replace('-', ' ')}
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-faint)' }}>
                {auctionsEnabled ? 'unowned · buy or auction' : 'unowned · buy or pass'}
              </span>
            </div>
          </div>
          {/* Price tag */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, color: 'var(--gold)', lineHeight: 1 }}>
              {formatMoney(price)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: canAfford ? 'var(--text-faint)' : 'var(--danger)', marginTop: 4 }}>
              {canAfford ? `${formatMoney(afterBalance)} after` : 'not enough cash'}
            </div>
          </div>
        </div>

        {/* Rent strip */}
        {tile.rentLevels && tile.rentLevels.length > 0 && (
          <div style={{
            display: 'flex', gap: 4, marginBottom: 12,
            padding: '9px 12px',
            background: 'oklch(1 0 0 / 0.025)',
            border: '1px solid var(--stroke-hairline)',
            borderRadius: 'var(--r-md)',
          }}>
            {tile.rentLevels.map((r, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, color: i === 0 ? 'var(--text-faint)' : setColor, marginBottom: 3, letterSpacing: '0.05em' }}>
                  {i === 0 ? 'BASE' : `LV ${i}`}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-secondary)' }}>${r}</div>
              </div>
            ))}
          </div>
        )}

        {/* Monopoly progress */}
        {tile.set && setAdvantage && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px',
            background: wouldComplete ? `${setColor}16` : 'oklch(1 0 0 / 0.02)',
            border: `1px solid ${wouldComplete ? `${setColor}45` : 'var(--stroke-hairline)'}`,
            borderRadius: 'var(--r-md)',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {Array.from({ length: setTotal }).map((_, i) => (
                <div key={i} style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: i < mySetOwned ? setColor : i === mySetOwned ? `${setColor}55` : 'oklch(1 0 0 / 0.08)',
                  boxShadow: i < mySetOwned ? `0 0 5px ${setColor}` : 'none',
                  border: i === mySetOwned ? `1px dashed ${setColor}` : 'none',
                }} />
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, color: wouldComplete ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.4 }}>
              {wouldComplete
                ? <><strong style={{ color: setColor }}>Completes the set!</strong> {setAdvantage}</>
                : `${mySetOwned}/${setTotal} of this set owned`}
            </span>
          </div>
        )}

        {error && <ErrorNote style={{ marginBottom: 10, textAlign: 'center' }}>{error}</ErrorNote>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={loading || !canAfford}
            onClick={handleBuy}
            className="tu-btn tu-btn-primary"
            style={{ flex: 2, padding: '12px 16px', fontSize: 14.5 }}
          >
            {loading ? '…' : canAfford ? `Buy for ${formatMoney(price)}` : 'Cannot afford'}
          </button>
          {!canAfford && onManageProperties && (
            <button
              disabled={loading}
              onClick={onManageProperties}
              className="tu-btn tu-btn-gold"
              style={{ flex: 1, padding: '12px 12px', fontSize: 13 }}
            >
              Raise cash
            </button>
          )}
          <button
            disabled={loading}
            onClick={handleSkip}
            className="tu-btn tu-btn-ghost"
            style={{ flex: 1, padding: '12px 12px', fontSize: 13.5, color: 'var(--text-muted)' }}
          >
            {auctionsEnabled ? 'Auction →' : 'Pass'}
          </button>
        </div>
      </div>
    </DockCard>
  );
}
