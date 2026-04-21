'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player, Property } from '@/lib/types';
import { TILES, SET_COLORS, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { upgradeProperty, mortgageProperty, unmortgageProperty } from '@/app/actions/game';

interface PropertyManagerProps {
  room: GameRoom;
  player: Player;
  properties: Property[];
  allPlayers: Player[];
  onClose: () => void;
}

const LEVEL_LABELS = ['Base', 'Lvl 1', 'Lvl 2', 'Lvl 3', 'Max'];

export default function PropertyManager({
  room,
  player,
  properties,
  allPlayers,
  onClose,
}: PropertyManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myProperties = properties
    .filter((p) => p.owner_id === player.id)
    .sort((a, b) => a.tile_id - b.tile_id);

  const grouped = myProperties.reduce<Record<string, Property[]>>((acc, p) => {
    const tile = TILES[p.tile_id];
    const key = tile.set ?? tile.type;
    acc[key] = acc[key] ?? [];
    acc[key].push(p);
    return acc;
  }, {});

  async function withLoad(key: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(key);
    setError(null);
    const res = await fn();
    if (!res.success) setError(res.error ?? 'Action failed');
    setLoading(null);
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center px-2 pb-0 sm:pb-4"
      style={{ background: 'rgba(6,9,18,0.7)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1225, #060912)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-white font-bold">My Properties</p>
            <p className="text-slate-500 text-xs">{myProperties.length} owned · {formatMoney(player.balance)} balance</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-400 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-xs px-5 py-2 bg-red-950/30 shrink-0">{error}</p>
        )}

        {/* Property list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {myProperties.length === 0 && (
            <p className="text-slate-600 text-sm text-center py-6">No properties owned yet.</p>
          )}

          {Object.entries(grouped).map(([groupKey, props]) => {
            const setColor = SET_COLORS[groupKey] ?? '#475569';
            const groupTile = TILES[props[0].tile_id];
            const groupLabel = groupTile.set
              ? groupTile.set.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : groupTile.type.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div key={groupKey}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: setColor }} />
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
                    {groupLabel}
                  </p>
                </div>

                <div className="space-y-2">
                  {props.map((prop) => {
                    const tile = TILES[prop.tile_id];
                    const currentRent = tile.rentLevels?.[prop.upgrade_level];
                    const nextRent = tile.rentLevels?.[prop.upgrade_level + 1];
                    const unmortgageCost = tile.mortgageValue
                      ? Math.ceil(tile.mortgageValue * 1.1)
                      : 0;
                    const canUpgrade =
                      tile.type === 'country' &&
                      prop.upgrade_level < 4 &&
                      !prop.is_mortgaged &&
                      player.balance >= (tile.upgradePrice ?? 999);
                    const canMortgage = !prop.is_mortgaged && prop.upgrade_level === 0;
                    const canUnmortgage = prop.is_mortgaged && player.balance >= unmortgageCost;

                    return (
                      <div
                        key={prop.id}
                        className="rounded-xl px-3 py-3"
                        style={{
                          background: prop.is_mortgaged
                            ? 'rgba(100,100,120,0.08)'
                            : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${prop.is_mortgaged ? 'rgba(100,100,120,0.15)' : setColor + '22'}`,
                          opacity: prop.is_mortgaged ? 0.7 : 1,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg shrink-0">{tile.flag ?? '🏠'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-white text-sm font-semibold">{tile.name}</p>
                              {prop.is_mortgaged && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(255,100,100,0.15)', color: '#ff8888' }}
                                >
                                  MORTGAGED
                                </span>
                              )}
                              {prop.upgrade_level > 0 && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded"
                                  style={{ background: `${setColor}22`, color: setColor }}
                                >
                                  {LEVEL_LABELS[prop.upgrade_level]}
                                </span>
                              )}
                            </div>

                            {/* Upgrade dots */}
                            {tile.type === 'country' && (
                              <div className="flex gap-1 mt-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: i < prop.upgrade_level ? setColor : 'rgba(255,255,255,0.08)',
                                      boxShadow: i < prop.upgrade_level ? `0 0 4px ${setColor}` : 'none',
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Rent info */}
                            <div className="flex items-center gap-3 mt-1.5">
                              {currentRent !== undefined && (
                                <span className="text-xs text-slate-500">
                                  Rent: <span className="text-slate-300">{formatMoney(currentRent)}</span>
                                </span>
                              )}
                              {nextRent !== undefined && !prop.is_mortgaged && (
                                <span className="text-xs text-slate-600">
                                  → <span className="text-green-500">{formatMoney(nextRent)}</span>
                                </span>
                              )}
                              {tile.mortgageValue && (
                                <span className="text-xs text-slate-600">
                                  MV: {formatMoney(tile.mortgageValue)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-col gap-1 shrink-0">
                            {tile.type === 'country' && !prop.is_mortgaged && (
                              <button
                                disabled={!canUpgrade || loading === `up-${prop.id}`}
                                onClick={() =>
                                  withLoad(`up-${prop.id}`, () =>
                                    upgradeProperty(room.id, player.id, prop.tile_id),
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold disabled:opacity-30 transition-all"
                                style={{
                                  background: canUpgrade ? `${setColor}22` : 'rgba(100,100,120,0.1)',
                                  color: canUpgrade ? setColor : '#555',
                                  border: `1px solid ${canUpgrade ? setColor + '44' : 'transparent'}`,
                                }}
                              >
                                {loading === `up-${prop.id}` ? '…' : `↑ $${tile.upgradePrice}`}
                              </button>
                            )}

                            {canMortgage && (
                              <button
                                disabled={loading === `mort-${prop.id}`}
                                onClick={() =>
                                  withLoad(`mort-${prop.id}`, () =>
                                    mortgageProperty(room.id, player.id, prop.tile_id),
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                                style={{
                                  background: 'rgba(255,170,0,0.08)',
                                  color: '#ffaa00',
                                  border: '1px solid rgba(255,170,0,0.2)',
                                }}
                              >
                                {loading === `mort-${prop.id}` ? '…' : `Mortgage $${tile.mortgageValue}`}
                              </button>
                            )}

                            {prop.is_mortgaged && (
                              <button
                                disabled={!canUnmortgage || loading === `unmort-${prop.id}`}
                                onClick={() =>
                                  withLoad(`unmort-${prop.id}`, () =>
                                    unmortgageProperty(room.id, player.id, prop.tile_id),
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold disabled:opacity-40 transition-all"
                                style={{
                                  background: canUnmortgage ? 'rgba(0,255,136,0.08)' : 'rgba(100,100,120,0.08)',
                                  color: canUnmortgage ? '#00ff88' : '#555',
                                  border: `1px solid ${canUnmortgage ? 'rgba(0,255,136,0.2)' : 'transparent'}`,
                                }}
                              >
                                {loading === `unmort-${prop.id}` ? '…' : `Lift $${unmortgageCost}`}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
