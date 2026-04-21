'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player, Property } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import {
  rollDice,
  endTurn,
  payJailFine,
} from '@/app/actions/game';
import PropertyManager from './PropertyManager';

interface ActionPanelProps {
  room: GameRoom;
  myPlayer: Player;
  isMyTurn: boolean;
  properties: Property[];
  allPlayers: Player[];
}

export default function ActionPanel({
  room,
  myPlayer,
  isMyTurn,
  properties,
  allPlayers,
}: ActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProps, setShowProps] = useState(false);

  const pending = room.pending_action;
  const doublesTurn = room.doubles_turn ?? false;

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

  const myOwnedCount = properties.filter((p) => p.owner_id === myPlayer.id).length;

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

      <motion.div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{
          background: isMyTurn ? 'rgba(10,10,26,0.9)' : 'rgba(10,10,26,0.6)',
          border: isMyTurn
            ? '1px solid rgba(0,245,255,0.25)'
            : '1px solid rgba(100,100,150,0.15)',
          backdropFilter: 'blur(16px)',
          boxShadow: isMyTurn ? '0 0 30px rgba(0,245,255,0.06)' : 'none',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
            {isMyTurn ? 'Your Turn' : 'Waiting…'}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-cyan-400 text-sm font-bold" style={{ textShadow: '0 0 8px #00f5ff' }}>
              {formatMoney(myPlayer.balance)}
            </p>
            {myOwnedCount > 0 && (
              <button
                onClick={() => setShowProps(true)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: 'rgba(0,245,255,0.07)',
                  color: '#00f5ff',
                  border: '1px solid rgba(0,245,255,0.15)',
                }}
              >
                🏠 {myOwnedCount}
              </button>
            )}
          </div>
        </div>

        {!isMyTurn && (
          <p className="text-slate-600 text-xs text-center">
            {myPlayer.in_jail ? '🔒 You are in Jail' : 'Waiting for your turn…'}
          </p>
        )}

        {error && (
          <p className="text-red-400 text-xs bg-red-900/20 rounded px-2 py-1">{error}</p>
        )}

        {isMyTurn && (
          <>
            {/* ROLL phase */}
            {room.turn_phase === 'roll' && (
              <div className="flex flex-col gap-2">
                {myPlayer.in_jail && (
                  <p className="text-amber-400 text-xs">
                    🔒 In Jail — roll doubles to escape or pay {formatMoney(50)} bail.
                  </p>
                )}
                <div className="flex gap-2">
                  <motion.button
                    disabled={loading}
                    onClick={() => withLoad(() => rollDice(room.id, myPlayer.id))}
                    className="flex-1 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #0077aa, #00bcd4)',
                      color: '#fff',
                      boxShadow: loading ? 'none' : '0 0 15px rgba(0,245,255,0.3)',
                    }}
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                  >
                    {loading ? 'Rolling…' : '🎲 Roll Dice'}
                  </motion.button>
                  {myPlayer.in_jail && (
                    <button
                      disabled={loading || myPlayer.balance < 50}
                      onClick={() => withLoad(() => payJailFine(room.id, myPlayer.id))}
                      className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                      style={{
                        background: 'rgba(255,170,0,0.12)',
                        color: '#ffcc00',
                        border: '1px solid rgba(255,204,0,0.2)',
                      }}
                    >
                      Pay $50
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* BUY OFFER is handled by BuyOfferModal — nothing to show here during action phase */}
            {room.turn_phase === 'action' && pending?.type === 'buy_offer' && (
              <div
                className="rounded-lg p-3 text-center"
                style={{ background: 'rgba(0,200,100,0.05)', border: '1px solid rgba(0,200,100,0.15)' }}
              >
                <p className="text-green-400 text-xs font-semibold">
                  💡 Buy offer dialog is open
                </p>
              </div>
            )}

            {/* PAY RENT — informational */}
            {pending?.type === 'pay_rent' && (
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,50,50,0.07)', border: '1px solid rgba(255,50,50,0.18)' }}
              >
                <p className="text-red-400 text-sm font-semibold">
                  Rent paid: {formatMoney(pending.amount ?? 0)}
                </p>
              </div>
            )}

            {/* EVENT RESULT — informational */}
            {pending?.type === 'event_result' && (
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.15)' }}
              >
                <p className="text-amber-300 text-xs">{pending.message}</p>
              </div>
            )}

            {/* TAX PAID — informational */}
            {pending?.type === 'tax_paid' && (
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,50,50,0.07)', border: '1px solid rgba(255,50,50,0.18)' }}
              >
                <p className="text-red-400 text-sm">Tax paid: {formatMoney(pending.amount ?? 0)}</p>
              </div>
            )}

            {/* END TURN / DOUBLES ROLL */}
            {room.turn_phase === 'end' && pending?.type !== 'chest_quiz' && pending?.type !== 'auction' && (
              <motion.button
                disabled={loading}
                onClick={() => withLoad(() => endTurn(room.id, myPlayer.id))}
                className="w-full py-2.5 rounded-lg font-bold text-sm disabled:opacity-50"
                style={
                  doublesTurn
                    ? {
                        background: 'linear-gradient(135deg, #005500, #00aa44)',
                        color: '#00ff88',
                        border: '1px solid rgba(0,255,136,0.25)',
                        boxShadow: '0 0 14px rgba(0,255,136,0.15)',
                      }
                    : {
                        background: 'linear-gradient(135deg, #2d1b69, #4c3d8f)',
                        color: '#c4b5fd',
                        border: '1px solid rgba(139,92,246,0.3)',
                        boxShadow: '0 0 10px rgba(139,92,246,0.15)',
                      }
                }
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading
                  ? doublesTurn ? 'Rolling again…' : 'Ending…'
                  : doublesTurn ? '🎲 Roll Again (Doubles!)' : 'End Turn →'}
              </motion.button>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}
