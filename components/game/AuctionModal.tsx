'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameRoom, Player, Tile } from '@/lib/types';
import { SET_COLORS } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { placeBid, resolveAuction, foldAuction } from '@/app/actions/game';
import FlagChip from './FlagChip';
import DockCard from './DockCard';
import ErrorNote from './ErrorNote';
import { playBidPlaced, playClick, playSkip } from '@/lib/sounds';
import { NEON } from '@/lib/colors';

interface AuctionModalProps {
  room: GameRoom;
  players: Player[];
  myPlayer: Player;
  tiles: Tile[];
  onManageProperties?: () => void;
}

export default function AuctionModal({ room, players, myPlayer, tiles, onManageProperties }: AuctionModalProps) {
  const pending = room.pending_action;

  // Server-synced countdown: measure remaining time against the server clock
  // at the moment this auction state was produced, so client clock drift and
  // network latency don't desync the timer.
  const [remainingMs, setRemainingMs] = useState(0);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (pending?.type !== 'auction') return;
    resolvedRef.current = false; // deadline changed (new auction or anti-snipe extension)
    const receivedAt = Date.now();
    const serverNow = pending.server_now ?? receivedAt;
    const baseRemaining = Math.max(0, (pending.expires_at ?? serverNow) - serverNow);

    const tick = () => {
      const rem = Math.max(0, baseRemaining - (Date.now() - receivedAt));
      setRemainingMs(rem);
      if (rem <= 0 && !resolvedRef.current) {
        resolvedRef.current = true;
        resolveAuction(room.id).catch(() => {});
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [pending?.type, pending?.expires_at, pending?.server_now, room.id]);

  const timeLeft = Math.ceil(remainingMs / 1000);

  const [bidInput, setBidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBid = pending?.type === 'auction' ? (pending.current_bid ?? 0) : 0;
  const tile = useMemo(
    () => tiles[pending?.type === 'auction' ? (pending.tile_id ?? 0) : 0],
    [tiles, pending],
  );

  if (pending?.type !== 'auction' || !tile) return null;

  const setColor = tile.set ? SET_COLORS[tile.set] : 'var(--set-transit)';
  const listPrice = tile.buyPrice ?? 0;
  const maxBid = listPrice * 2;
  const minBid = currentBid + 1;
  const parsedBid = parseInt(bidInput, 10);
  const folded = pending.folded_ids ?? [];
  const iAmFolded = folded.includes(myPlayer.id);
  const iAmLeading = pending.highest_bidder_id === myPlayer.id;
  const canParticipate = !myPlayer.is_bankrupt && !iAmFolded && timeLeft > 0;
  const canBid = canParticipate && !isNaN(parsedBid) && parsedBid >= minBid && parsedBid <= myPlayer.balance && parsedBid <= maxBid;
  const highestBidder = players.find((p) => p.id === pending.highest_bidder_id);

  async function submitBid(amount: number) {
    if (!canParticipate || loading) return;
    playClick();
    setLoading(true);
    setError(null);
    const res = await placeBid(room.id, myPlayer.id, amount);
    if (!res.success) setError(res.error ?? 'Bid failed');
    else { setBidInput(''); playBidPlaced(); }
    setLoading(false);
  }

  async function handleFold() {
    if (loading || iAmFolded || iAmLeading) return;
    playClick();
    setLoading(true);
    setError(null);
    const res = await foldAuction(room.id, myPlayer.id);
    if (!res.success) setError(res.error ?? 'Failed to withdraw');
    else playSkip();
    setLoading(false);
  }

  // Quick-bid options (clamped to balance and the 2× cap)
  const quickBids = [10, 50, 100]
    .map((step) => currentBid + step)
    .filter((amt, i, arr) => arr.indexOf(amt) === i && amt <= myPlayer.balance && amt <= maxBid);
  const canMatchPrice = listPrice > currentBid && listPrice <= myPlayer.balance && listPrice <= maxBid;

  const timerDanger = timeLeft <= 5;
  const timerWarn = timeLeft <= 10;
  const timerColor = timerDanger ? 'var(--danger)' : timerWarn ? 'var(--gold)' : 'var(--accent)';

  return (
    <DockCard accent={setColor} width={500}>
      <div style={{ padding: '14px 18px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
          {tile.flag && <FlagChip code={tile.flag} size={24} style={{ boxShadow: '0 2px 6px oklch(0 0 0 / 0.4)', flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {tile.name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              Live auction · list {formatMoney(listPrice)} · cap {formatMoney(maxBid)}
            </div>
          </div>

          {/* Current bid */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              key={currentBid}
              className={currentBid > 0 ? 'tu-bid-pop' : undefined}
              style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24,
                color: currentBid > 0 ? 'var(--gold)' : 'var(--text-faint)',
                lineHeight: 1,
              }}
            >
              {currentBid > 0 ? formatMoney(currentBid) : 'No bids'}
            </div>
            <AnimatePresence>
              {highestBidder && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
                    fontFamily: 'var(--font-display)', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4,
                  }}
                >
                  <span style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: NEON[highestBidder.color] ?? 'var(--neon-cyan)',
                  }} />
                  <strong style={{ color: 'var(--text-secondary)' }}>{highestBidder.name}</strong>
                  {highestBidder.id === myPlayer.id ? ' (you) leads' : ' leads'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timer ring */}
          <div
            style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17,
              background: `oklch(from ${timerColor} l c h / 0.10)`,
              border: `2.5px solid ${timerColor}`,
              color: timerColor,
              animation: timerDanger ? 'tu-pulse 0.6s infinite ease-in-out' : undefined,
            }}
          >
            {timeLeft}
          </div>
        </div>

        {/* Participants */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
          {players.filter((p) => !p.is_bankrupt).map((p) => {
            const hasFolded = folded.includes(p.id);
            const leading = p.id === pending.highest_bidder_id;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 'var(--r-pill)',
                  background: leading ? 'var(--gold-soft)' : 'var(--bg-raised)',
                  border: `1px solid ${leading ? 'oklch(0.84 0.115 88 / 0.4)' : 'var(--stroke-hairline)'}`,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: leading ? 'var(--gold)' : hasFolded ? 'var(--text-faint)' : 'var(--text-secondary)',
                  opacity: hasFolded ? 0.5 : 1,
                  textDecoration: hasFolded ? 'line-through' : 'none',
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: NEON[p.color] ?? 'var(--neon-cyan)',
                  flexShrink: 0,
                }} />
                {p.name}{p.id === myPlayer.id ? ' (you)' : ''}{hasFolded ? ' · out' : ''}
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          {onManageProperties && (
            <button
              onClick={onManageProperties}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 'var(--r-pill)',
                background: 'var(--gold-soft)',
                border: '1px solid oklch(0.84 0.115 88 / 0.3)',
                color: 'var(--gold)',
                fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
              }}
            >
              Raise cash
            </button>
          )}
        </div>

        {error && <ErrorNote style={{ marginBottom: 10 }}>{error}</ErrorNote>}

        {/* Bidding controls */}
        {timeLeft <= 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.06em', padding: '6px 0' }}>
            Resolving auction…
          </div>
        ) : iAmFolded ? (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center',
            letterSpacing: '0.05em', padding: '8px 0',
          }}>
            You withdrew — waiting for the hammer…
          </div>
        ) : (
          <>
            {/* Quick bid chips */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
              {quickBids.map((amt) => (
                <button
                  key={amt}
                  disabled={loading}
                  onClick={() => submitBid(amt)}
                  className="tu-btn"
                  style={{
                    padding: '7px 14px', fontSize: 12.5,
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    background: `${setColor}14`,
                    borderColor: `${setColor}50`,
                    borderRadius: 'var(--r-pill)',
                  }}
                >
                  +{amt - currentBid} → {formatMoney(amt)}
                </button>
              ))}
              {canMatchPrice && (
                <button
                  disabled={loading}
                  onClick={() => submitBid(listPrice)}
                  className="tu-btn"
                  style={{
                    padding: '7px 14px', fontSize: 12.5,
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    background: 'var(--gold-soft)',
                    borderColor: 'oklch(0.84 0.115 88 / 0.4)',
                    color: 'var(--gold)',
                    borderRadius: 'var(--r-pill)',
                  }}
                >
                  List {formatMoney(listPrice)}
                </button>
              )}
            </div>

            {/* Custom bid input + withdraw */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canBid && submitBid(parsedBid)}
                placeholder={`Custom · min $${minBid}`}
                min={minBid}
                max={Math.min(myPlayer.balance, maxBid)}
                style={{
                  flex: 1, padding: '11px 14px',
                  background: 'var(--bg-input)',
                  border: `1px solid ${canBid ? setColor + '88' : 'var(--stroke-soft)'}`,
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)',
                  outline: 'none',
                  caretColor: setColor,
                }}
              />
              <button
                disabled={!canBid || loading}
                onClick={() => submitBid(parsedBid)}
                className="tu-btn tu-btn-primary"
                style={{ padding: '11px 22px', fontSize: 14 }}
              >
                {loading ? '…' : 'Bid'}
              </button>
              {!iAmLeading && (
                <button
                  disabled={loading}
                  onClick={handleFold}
                  title="Withdraw from this auction"
                  className="tu-btn tu-btn-ghost"
                  style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-muted)' }}
                >
                  Pass
                </button>
              )}
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>
              Your balance {formatMoney(myPlayer.balance)} · bids in the final 8s extend the clock
            </div>
          </>
        )}
      </div>
    </DockCard>
  );
}
