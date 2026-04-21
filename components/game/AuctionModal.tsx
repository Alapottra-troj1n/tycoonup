'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { TILES, SET_COLORS, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { placeBid, resolveAuction } from '@/app/actions/game';

interface AuctionModalProps {
  room: GameRoom;
  players: Player[];
  myPlayer: Player;
}

export default function AuctionModal({ room, players, myPlayer }: AuctionModalProps) {
  const pending = room.pending_action;
  if (pending?.type !== 'auction') return null;

  const tile = TILES[pending.tile_id ?? 0];
  const setColor = tile.set ? SET_COLORS[tile.set] : '#00bcd4';
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

  const timerColor = timeLeft <= 5 ? '#ff4444' : timeLeft <= 10 ? '#ffcc00' : '#00f5ff';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(6,9,18,0.88)', backdropFilter: 'blur(16px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1225, #060912)',
          border: `1px solid ${setColor}44`,
          boxShadow: `0 0 60px ${setColor}18`,
        }}
        initial={{ scale: 0.75, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${setColor}22` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tile.flag ?? '🏠'}</span>
            <div>
              <p className="text-white font-bold text-sm">{tile.name}</p>
              <p className="text-slate-500 text-xs">Open Auction</p>
            </div>
          </div>
          {/* Timer ring */}
          <div className="flex items-center gap-2">
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: `${timerColor}18`,
                border: `2px solid ${timerColor}`,
                color: timerColor,
                boxShadow: `0 0 12px ${timerColor}44`,
              }}
              animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              {timeLeft}
            </motion.div>
          </div>
        </div>

        {/* Property info strip */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${setColor}, transparent)` }}
        />

        <div className="px-5 py-4 space-y-4">
          {/* Current price info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest">List Price</p>
              <p className="text-slate-300 font-semibold">{formatMoney(tile.buyPrice ?? 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs uppercase tracking-widest">Current Bid</p>
              <p
                className="font-bold text-xl"
                style={{
                  color: currentBid > 0 ? '#00ff88' : '#475569',
                  textShadow: currentBid > 0 ? '0 0 10px rgba(0,255,136,0.5)' : 'none',
                }}
              >
                {currentBid > 0 ? formatMoney(currentBid) : 'No bids'}
              </p>
            </div>
          </div>

          {/* Highest bidder */}
          <AnimatePresence>
            {highestBidder && (
              <motion.div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{
                    backgroundColor: PLAYER_COLOR_MAP[highestBidder.color]?.hex,
                    boxShadow: `0 0 6px ${PLAYER_COLOR_MAP[highestBidder.color]?.hex}`,
                  }}
                />
                <p className="text-green-400 text-sm">
                  <span className="font-semibold">{highestBidder.name}</span> is leading
                  {highestBidder.id === myPlayer.id && (
                    <span className="text-slate-500 ml-1">(you)</span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Country advantage */}
          {tile.advantage && (
            <p className="text-slate-600 text-xs italic">✦ {tile.advantage}</p>
          )}

          {/* Players who can bid */}
          <div className="flex flex-wrap gap-1.5">
            {players
              .filter((p) => !p.is_bankrupt)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${PLAYER_COLOR_MAP[p.color]?.hex}33`,
                    color: p.id === pending.highest_bidder_id ? '#00ff88' : '#64748b',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: PLAYER_COLOR_MAP[p.color]?.hex }}
                  />
                  {p.name}
                  {p.id === myPlayer.id && ' (you)'}
                </div>
              ))}
          </div>

          {/* My balance hint */}
          <p className="text-slate-600 text-xs">
            Your balance: <span className="text-cyan-400">{formatMoney(myPlayer.balance)}</span>
            {' · '}Min bid: <span className="text-white">{formatMoney(minBid)}</span>
          </p>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-950/30 rounded px-2 py-1">{error}</p>
          )}

          {/* Bid input */}
          {timeLeft > 0 && (
            <div className="flex gap-2">
              <input
                type="number"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canBid && handleBid()}
                placeholder={`Min $${minBid}`}
                min={minBid}
                max={myPlayer.balance}
                className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm outline-none font-mono"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${canBid ? setColor + '66' : 'rgba(255,255,255,0.08)'}`,
                  caretColor: setColor,
                }}
              />
              <motion.button
                disabled={!canBid || loading}
                onClick={handleBid}
                className="px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{
                  background: canBid ? `linear-gradient(135deg, ${setColor}cc, ${setColor})` : 'rgba(100,100,120,0.2)',
                  color: canBid ? '#000' : '#555',
                }}
                whileHover={canBid ? { scale: 1.02 } : {}}
                whileTap={canBid ? { scale: 0.97 } : {}}
              >
                {loading ? '…' : 'Bid'}
              </motion.button>
            </div>
          )}

          {timeLeft <= 0 && (
            <p className="text-slate-500 text-xs text-center">Resolving auction…</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
