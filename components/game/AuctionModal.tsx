'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { TILES, SET_COLORS } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { placeBid, resolveAuction } from '@/app/actions/game';
import FlagChip from './FlagChip';

const NEON: Record<string, string> = {
  cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)', lime: 'var(--neon-lime)',
  amber: 'var(--neon-amber)', violet: 'var(--neon-violet)', rose: 'var(--neon-rose)',
};

interface AuctionModalProps {
  room: GameRoom;
  players: Player[];
  myPlayer: Player;
}

export default function AuctionModal({ room, players, myPlayer }: AuctionModalProps) {
  const pending = room.pending_action;
  if (pending?.type !== 'auction') return null;

  const tile = TILES[pending.tile_id ?? 0];
  const setColor = tile.set ? SET_COLORS[tile.set] : 'var(--neon-cyan)';
  const expiresAt = pending.expires_at ?? Date.now() + 25000;

  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
  const [bidInput, setBidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !resolvedRef.current) {
        resolvedRef.current = true;
        clearInterval(interval);
        resolveAuction(room.id).catch(() => {});
      }
    }, 500);
    return () => clearInterval(interval);
  }, [expiresAt, room.id]);

  const currentBid = pending.current_bid ?? 0;
  const minBid = currentBid + 1;
  const parsedBid = parseInt(bidInput, 10);
  const canBid = !isNaN(parsedBid) && parsedBid >= minBid && parsedBid <= myPlayer.balance;
  const highestBidder = players.find((p) => p.id === pending.highest_bidder_id);

  async function handleBid() {
    if (!canBid) return;
    setLoading(true);
    setError(null);
    const res = await placeBid(room.id, myPlayer.id, parsedBid);
    if (!res.success) setError(res.error ?? 'Bid failed');
    else setBidInput('');
    setLoading(false);
  }

  const timerDanger = timeLeft <= 5;
  const timerWarn = timeLeft <= 10;
  const timerColor = timerDanger ? 'var(--danger)' : timerWarn ? 'var(--neon-amber)' : 'var(--neon-cyan)';

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'oklch(0.08 0.02 260 / 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${setColor}44`,
          borderRadius: 'var(--r-2xl)',
          boxShadow: `0 0 50px ${setColor}15, var(--shadow-xl)`,
          overflow: 'hidden',
        }}
        initial={{ scale: 0.82, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 310, damping: 24 }}
      >
        {/* Set color line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${setColor}, transparent)` }} />

        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--stroke-hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tile.flag && <FlagChip code={tile.flag} size={21} style={{ boxShadow: '0 1px 4px oklch(0 0 0 / 0.4)' }} />}
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                {tile.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Open Auction
              </div>
            </div>
          </div>

          {/* Timer */}
          <motion.div
            style={{
              width: 44, height: 44, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16,
              background: timerDanger ? 'oklch(0.68 0.22 25 / 0.15)' : timerWarn ? 'oklch(0.82 0.17 75 / 0.1)' : 'oklch(0.82 0.17 210 / 0.1)',
              border: `2px solid ${timerColor}`,
              color: timerColor,
              boxShadow: `0 0 16px ${timerColor}44`,
            }}
            animate={timerDanger ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.6 }}
          >
            {timeLeft}
          </motion.div>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Bid info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>List Price</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>{formatMoney(tile.buyPrice ?? 0)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Current Bid</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22,
                color: currentBid > 0 ? 'var(--success)' : 'var(--text-faint)',
                textShadow: currentBid > 0 ? '0 0 10px oklch(0.78 0.18 150 / 0.4)' : 'none',
              }}>
                {currentBid > 0 ? formatMoney(currentBid) : 'No bids'}
              </div>
            </div>
          </div>

          {/* Highest bidder */}
          <AnimatePresence>
            {highestBidder && (
              <motion.div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--r-md)',
                  background: 'oklch(0.78 0.18 150 / 0.06)',
                  border: '1px solid oklch(0.78 0.18 150 / 0.2)',
                }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: NEON[highestBidder.color] ?? 'var(--neon-cyan)',
                  boxShadow: `0 0 6px ${NEON[highestBidder.color] ?? 'var(--neon-cyan)'}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--success)' }}>
                  <strong>{highestBidder.name}</strong> is leading
                  {highestBidder.id === myPlayer.id && (
                    <span style={{ color: 'var(--text-faint)', marginLeft: 4 }}>(you)</span>
                  )}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Advantage */}
          {tile.advantage && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--neon-amber)', letterSpacing: '0.01em' }}>
              ✦ {tile.advantage}
            </div>
          )}

          {/* Active players */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {players.filter((p) => !p.is_bankrupt).map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px', borderRadius: 'var(--r-pill)',
                  background: 'var(--bg-raised)',
                  border: `1px solid ${p.id === pending.highest_bidder_id ? 'oklch(0.78 0.18 150 / 0.4)' : 'var(--stroke-hairline)'}`,
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: p.id === pending.highest_bidder_id ? 'var(--success)' : 'var(--text-faint)',
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: NEON[p.color] ?? 'var(--neon-cyan)',
                  flexShrink: 0,
                }} />
                {p.name}{p.id === myPlayer.id ? ' (you)' : ''}
              </div>
            ))}
          </div>

          {/* Balance hint */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
            Your balance: <span style={{ color: 'var(--neon-cyan)' }}>{formatMoney(myPlayer.balance)}</span>
            <span style={{ color: 'var(--stroke-strong)', margin: '0 6px' }}>·</span>
            Min bid: <span style={{ color: 'var(--text-primary)' }}>{formatMoney(minBid)}</span>
          </div>

          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)',
              background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)',
              borderRadius: 'var(--r-sm)', padding: '6px 10px',
            }}>
              {error}
            </div>
          )}

          {/* Bid input */}
          {timeLeft > 0 ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canBid && handleBid()}
                placeholder={`Min $${minBid}`}
                min={minBid}
                max={myPlayer.balance}
                style={{
                  flex: 1, padding: '10px 12px',
                  background: 'var(--bg-raised)',
                  border: `1px solid ${canBid ? setColor + '88' : 'var(--stroke-soft)'}`,
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)',
                  outline: 'none',
                  caretColor: setColor,
                }}
              />
              <motion.button
                disabled={!canBid || loading}
                onClick={handleBid}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  background: canBid ? `linear-gradient(180deg, ${setColor} 0%, oklch(from ${setColor} calc(l * 0.8) c h) 100%)` : 'var(--bg-raised)',
                  color: canBid ? 'oklch(0.12 0.02 260)' : 'var(--text-faint)',
                  border: canBid ? 'none' : '1px solid var(--stroke-soft)',
                  cursor: !canBid || loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
                whileHover={canBid ? { scale: 1.02 } : {}}
                whileTap={canBid ? { scale: 0.97 } : {}}
              >
                {loading ? '…' : 'Bid'}
              </motion.button>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', letterSpacing: '0.06em' }}>
              Resolving auction…
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
