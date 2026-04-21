'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Tile, Property, Player } from '@/lib/types';
import { SET_COLORS, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';

interface TileDetailModalProps {
  tile: Tile | null;
  property?: Property;
  players: Player[];
  onClose: () => void;
}

const TRANSPORT_RENTS = [25, 50, 100, 200];

export default function TileDetailModal({ tile, property, players, onClose }: TileDetailModalProps) {
  if (!tile) return null;

  const owner = property?.owner_id ? players.find((p) => p.id === property.owner_id) : null;
  const setColor = tile.set ? SET_COLORS[tile.set] : null;
  const ownerColor = owner ? PLAYER_COLOR_MAP[owner.color]?.hex : null;
  const isMortgaged = property?.is_mortgaged ?? false;
  const upgradeLevel = property?.upgrade_level ?? 0;

  return (
    <AnimatePresence>
      {tile && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-50 top-1/2 left-1/2 w-80 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0d1225 0%, #060912 100%)',
              border: setColor ? `1px solid ${setColor}44` : '1px solid rgba(255,255,255,0.1)',
              boxShadow: setColor
                ? `0 0 40px ${setColor}22, 0 20px 60px rgba(0,0,0,0.8)`
                : '0 20px 60px rgba(0,0,0,0.8)',
            }}
            initial={{ opacity: 0, x: '-50%', y: '-48%', scale: 0.95 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: '-48%', scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Color header */}
            {setColor && (
              <div
                className="w-full h-1.5"
                style={{ background: setColor, boxShadow: `0 0 12px ${setColor}` }}
              />
            )}

            <div className="p-5">
              {/* Title row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {tile.flag && <span className="text-3xl">{tile.flag}</span>}
                  <div>
                    <h2 className="text-white font-black text-lg leading-tight">{tile.name}</h2>
                    <p className="text-xs capitalize" style={{ color: setColor ?? '#64748b' }}>
                      {tile.set ? `${tile.set.replace('-', ' ')} set` : tile.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-600 hover:text-slate-400 transition-colors text-lg font-bold leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Owner */}
              {owner && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
                  style={{
                    background: `${ownerColor}15`,
                    border: `1px solid ${ownerColor}30`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: ownerColor ?? '#fff', boxShadow: `0 0 6px ${ownerColor}88` }}
                  />
                  <span className="text-sm text-white font-medium">{owner.name}</span>
                  {isMortgaged && (
                    <span className="ml-auto text-xs text-amber-400 font-semibold">Mortgaged</span>
                  )}
                  {!isMortgaged && upgradeLevel > 0 && (
                    <span className="ml-auto text-xs font-semibold" style={{ color: setColor ?? '#fff' }}>
                      Lvl {upgradeLevel}
                    </span>
                  )}
                </div>
              )}
              {!owner && tile.buyPrice && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-slate-500 text-xs">Unowned</span>
                  <span className="ml-auto text-slate-300 font-bold text-sm">{formatMoney(tile.buyPrice)}</span>
                </div>
              )}

              {/* Country / transport / utility details */}
              {(tile.type === 'country' || tile.type === 'transport' || tile.type === 'utility') && (
                <div className="space-y-3">
                  {/* Rent table */}
                  {tile.rentLevels && tile.type === 'country' && (
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">Rent</p>
                      <div className="space-y-1">
                        {tile.rentLevels.map((rent, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center px-3 py-1 rounded-lg text-xs"
                            style={{
                              background: upgradeLevel === i && !isMortgaged
                                ? `${setColor}18`
                                : 'rgba(255,255,255,0.03)',
                              border: upgradeLevel === i && !isMortgaged
                                ? `1px solid ${setColor}30`
                                : '1px solid transparent',
                            }}
                          >
                            <span className="text-slate-400">
                              {i === 0 ? 'Base' : `Level ${i}`}
                              {upgradeLevel === i && !isMortgaged && (
                                <span className="ml-1 text-[9px]" style={{ color: setColor ?? '#fff' }}>◀ current</span>
                              )}
                            </span>
                            <span className="text-white font-semibold">{formatMoney(rent)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transport rents */}
                  {tile.type === 'transport' && (
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">Rent (by routes owned)</p>
                      <div className="space-y-1">
                        {TRANSPORT_RENTS.map((rent, i) => (
                          <div key={i} className="flex justify-between items-center px-3 py-1 rounded-lg text-xs"
                            style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <span className="text-slate-400">{i + 1} route{i > 0 ? 's' : ''}</span>
                            <span className="text-white font-semibold">{formatMoney(rent)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Utility */}
                  {tile.type === 'utility' && (
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">Rent</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="text-slate-400">1 utility owned</span>
                          <span className="text-white font-semibold">4× dice roll</span>
                        </div>
                        <div className="flex justify-between px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="text-slate-400">Both owned</span>
                          <span className="text-white font-semibold">10× dice roll</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prices row */}
                  <div className="grid grid-cols-2 gap-2">
                    {tile.upgradePrice && (
                      <div className="px-3 py-2 rounded-xl text-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest">Upgrade</p>
                        <p className="text-white font-bold text-sm mt-0.5">{formatMoney(tile.upgradePrice)}</p>
                      </div>
                    )}
                    {tile.mortgageValue && (
                      <div className="px-3 py-2 rounded-xl text-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest">Mortgage</p>
                        <p className="text-amber-400 font-bold text-sm mt-0.5">{formatMoney(tile.mortgageValue)}</p>
                      </div>
                    )}
                  </div>

                  {/* Passive advantage */}
                  {tile.advantage && (
                    <div
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                      style={{
                        background: 'rgba(0,245,255,0.05)',
                        border: '1px solid rgba(0,245,255,0.15)',
                      }}
                    >
                      <span className="text-base shrink-0">⚡</span>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-cyan-500 mb-0.5">Advantage</p>
                        <p className="text-slate-300 text-xs leading-snug">{tile.advantage}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tax */}
              {tile.type === 'tax' && tile.taxAmount && (
                <div className="px-3 py-3 rounded-xl text-center"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <p className="text-slate-400 text-xs mb-1">Tax amount</p>
                  <p className="text-red-400 font-black text-2xl">{formatMoney(tile.taxAmount)}</p>
                </div>
              )}

              {/* Chest / Event */}
              {(tile.type === 'chest' || tile.type === 'event') && (
                <p className="text-slate-400 text-sm text-center py-2">
                  {tile.type === 'chest' ? 'Answer a trivia question to win or lose money.' : 'Draw a random global event card.'}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
