'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameRoom, Player } from '@/lib/types';
import { TILES, SET_COLORS } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { buyProperty, skipBuy } from '@/app/actions/game';

interface BuyOfferModalProps {
  room: GameRoom;
  myPlayer: Player;
  tileId: number;
  price: number;
}

export default function BuyOfferModal({ room, myPlayer, tileId, price }: BuyOfferModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tile = TILES[tileId];
  if (!tile) return null;

  const canAfford = myPlayer.balance >= price;
  const afterBalance = myPlayer.balance - price;
  const setColor = tile.set ? SET_COLORS[tile.set] : '#00f5ff';

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await buyProperty(room.id, myPlayer.id, tileId);
      if (!res.success) setError(res.error ?? 'Purchase failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    setError(null);
    try {
      const res = await skipBuy(room.id, myPlayer.id);
      if (!res.success) setError(res.error ?? 'Failed to skip');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: 'linear-gradient(145deg, #0c0c22, #0e1435)',
          border: `1px solid ${setColor}55`,
          boxShadow: `0 0 80px ${setColor}20, 0 0 160px rgba(0,0,0,0.9)`,
        }}
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            className="text-6xl mb-3"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            {tile.flag ?? '🏠'}
          </motion.div>

          {tile.set && (
            <div
              className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ background: `${setColor}18`, color: setColor, border: `1px solid ${setColor}44` }}
            >
              {tile.set.replace('-', ' ')} Set
            </div>
          )}

          <h2 className="text-2xl font-black text-white tracking-tight">{tile.name}</h2>
          <p className="text-slate-500 text-xs mt-1">Unowned — Buy now or send to auction</p>
        </div>

        {/* Price row */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.12)' }}
          >
            <p className="text-slate-500 text-[10px] mb-1 uppercase tracking-wide">Listing Price</p>
            <p className="text-cyan-400 text-xl font-black">{formatMoney(price)}</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              background: canAfford ? 'rgba(0,255,100,0.05)' : 'rgba(255,50,50,0.05)',
              border: `1px solid ${canAfford ? 'rgba(0,255,100,0.15)' : 'rgba(255,50,50,0.15)'}`,
            }}
          >
            <p className="text-slate-500 text-[10px] mb-1 uppercase tracking-wide">Your Balance</p>
            <p className={`text-xl font-black ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
              {formatMoney(myPlayer.balance)}
            </p>
          </div>
        </div>

        {/* Rent table */}
        {tile.rentLevels && tile.rentLevels.length > 0 && (
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-slate-600 text-[10px] uppercase tracking-wide mb-2">Rent levels</p>
            <div className="flex gap-1">
              {tile.rentLevels.map((r, i) => (
                <div key={i} className="flex-1 text-center">
                  <p
                    className="text-[8px] mb-0.5"
                    style={{ color: i === 0 ? '#64748b' : setColor }}
                  >
                    {i === 0 ? 'Base' : `Lvl ${i}`}
                  </p>
                  <p className="text-xs font-bold text-green-400">${r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advantage */}
        {tile.advantage && (
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: 'rgba(255,200,0,0.05)', border: '1px solid rgba(255,200,0,0.15)' }}
          >
            <p className="text-amber-300 text-xs">✦ {tile.advantage}</p>
          </div>
        )}

        {/* After-purchase balance */}
        {canAfford && (
          <p className="text-center text-slate-600 text-xs">
            Balance after purchase: <span className="text-slate-400 font-semibold">{formatMoney(afterBalance)}</span>
          </p>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center bg-red-900/20 rounded px-2 py-1">{error}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <motion.button
            disabled={loading || !canAfford}
            onClick={handleBuy}
            className="flex-1 py-3.5 rounded-xl font-black text-sm disabled:opacity-40"
            style={{
              background: canAfford
                ? `linear-gradient(135deg, ${setColor}cc, ${setColor})`
                : 'rgba(100,100,100,0.2)',
              color: canAfford ? '#000' : '#666',
              boxShadow: canAfford && !loading ? `0 0 24px ${setColor}44` : 'none',
            }}
            whileHover={canAfford && !loading ? { scale: 1.02 } : {}}
            whileTap={canAfford && !loading ? { scale: 0.97 } : {}}
          >
            {loading ? '…' : canAfford ? `💰 Buy ${formatMoney(price)}` : '❌ Cannot Afford'}
          </motion.button>

          <motion.button
            disabled={loading}
            onClick={handleSkip}
            className="px-4 py-3.5 rounded-xl font-bold text-sm disabled:opacity-40"
            style={{
              background: 'rgba(100,100,150,0.12)',
              color: '#94a3b8',
              border: '1px solid rgba(100,100,150,0.2)',
            }}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
          >
            🔨 Auction
          </motion.button>
        </div>

        {!canAfford && (
          <p className="text-center text-red-400 text-xs -mt-1">
            Insufficient funds — property will go to auction.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
