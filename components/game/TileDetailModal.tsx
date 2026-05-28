'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tile, Property, Player, GameRoom } from '@/lib/types';
import { SET_COLORS, SET_ADVANTAGES, SET_SIZES, TILES } from '@/lib/game-data';
import { formatMoney, ownsFullSet, getSetOwnerCount } from '@/lib/utils';
import { upgradeProperty, downgradeProperty, mortgageProperty, unmortgageProperty } from '@/app/actions/game';
import FlagChip from './FlagChip';

interface TileDetailModalProps {
  room?: GameRoom | null;
  myPlayerId?: string | null;
  tile: Tile | null;
  property?: Property;
  players: Player[];
  allProperties?: Property[];
  onClose: () => void;
}

const NEON: Record<string, string> = {
  cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)', lime: 'var(--neon-lime)',
  amber: 'var(--neon-amber)', violet: 'var(--neon-violet)', rose: 'var(--neon-rose)',
};

const TRANSPORT_RENTS = [25, 50, 100, 200];
const LEVEL_LABELS = ['Base', 'Lvl 1', 'Lvl 2', 'Lvl 3', 'Max'];

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 11px', borderRadius: 'var(--r-sm)',
      background: 'oklch(1 0 0 / 0.025)',
      border: '1px solid transparent',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, color: accent ? 'var(--success)' : 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function TileDetailModal({ room, myPlayerId, tile, property, players, allProperties = [], onClose }: TileDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tile) return null;

  const owner = property?.owner_id ? players.find((p) => p.id === property.owner_id) : null;
  const setColor = tile.set ? SET_COLORS[tile.set] : null;
  const ownerNeon = owner ? NEON[owner.color] : null;
  const isMortgaged = property?.is_mortgaged ?? false;
  const upgradeLevel = property?.upgrade_level ?? 0;

  // Monopoly bonus: check if owner has full set
  const setAdvantage = tile.set && owner
    ? (ownsFullSet(allProperties, tile.set, owner.id) ? SET_ADVANTAGES[tile.set] : null)
    : null;

  // Progress for non-owner or viewer: show cities owned count
  const ownerSetProgress = tile.set && owner
    ? { owned: getSetOwnerCount(allProperties, tile.set, owner.id), total: SET_SIZES[tile.set] ?? 2 }
    : null;

  const isMine = !!myPlayerId && property?.owner_id === myPlayerId;
  const myPlayer = myPlayerId ? players.find(p => p.id === myPlayerId) : null;
  const isMyTurn = !!myPlayerId && !!room && room.current_player_idx !== undefined && (() => {
    const sorted = players.slice().sort((a, b) => a.turn_order - b.turn_order);
    const cp = sorted[room.current_player_idx];
    return cp?.id === myPlayerId;
  })();

  // Monopoly progress for upgrades
  const mySetOwned = tile.set && myPlayerId ? getSetOwnerCount(allProperties, tile.set, myPlayerId) : 0;
  const setTotal = tile.set ? (SET_SIZES[tile.set] ?? 2) : 0;
  const hasMonopoly = tile.set && mySetOwned >= setTotal;

  // upgrade eligibility
  const setTileIds = tile.set ? TILES.filter(t => t.set === tile.set).map(t => t.id) : [];
  const myGroupProps = tile.set && myPlayerId ? allProperties.filter(p => setTileIds.includes(p.tile_id) && p.owner_id === myPlayerId) ?? [] : [];
  const minLevel = myGroupProps.length > 0 ? Math.min(...myGroupProps.map(p => p.upgrade_level)) : 0;
  const isEvenBuilding = upgradeLevel === minLevel;
  const canUpgrade = isMyTurn && hasMonopoly && upgradeLevel < 4 && !isMortgaged && !!myPlayer && myPlayer.balance >= (tile.upgradePrice ?? 999) && isEvenBuilding;

  // downgrade eligibility
  const maxLevel = myGroupProps.length > 0 ? Math.max(...myGroupProps.map(p => p.upgrade_level)) : 0;
  const isEvenDemolition = upgradeLevel === maxLevel;
  const canDowngrade = isMyTurn && upgradeLevel > 0 && !isMortgaged && isEvenDemolition;

  // mortgage eligibility
  const groupHasUpgrades = myGroupProps.some(p => p.upgrade_level > 0);
  const propHasUpgrades = tile.set ? groupHasUpgrades : (upgradeLevel > 0);
  const canMortgage = isMyTurn && !isMortgaged && !propHasUpgrades;
  
  // unmortgage eligibility
  const unmortgageCost = tile.mortgageValue ? Math.ceil(tile.mortgageValue * 1.1) : 0;
  const canUnmortgage = isMyTurn && isMortgaged && !!myPlayer && myPlayer.balance >= unmortgageCost;

  async function handleUpgrade() {
    if (!room || !myPlayerId || !tile) return;
    setLoading(true);
    setError(null);
    const res = await upgradeProperty(room.id, myPlayerId, tile.id);
    if (!res.success) setError(res.error ?? 'Upgrade failed');
    setLoading(false);
  }

  async function handleDowngrade() {
    if (!room || !myPlayerId || !tile) return;
    setLoading(true);
    setError(null);
    const res = await downgradeProperty(room.id, myPlayerId, tile.id);
    if (!res.success) setError(res.error ?? 'Downgrade failed');
    setLoading(false);
  }

  async function handleMortgage() {
    if (!room || !myPlayerId || !tile) return;
    setLoading(true);
    setError(null);
    const res = await mortgageProperty(room.id, myPlayerId, tile.id);
    if (!res.success) setError(res.error ?? 'Mortgage failed');
    setLoading(false);
  }

  async function handleUnmortgage() {
    if (!room || !myPlayerId || !tile) return;
    setLoading(true);
    setError(null);
    const res = await unmortgageProperty(room.id, myPlayerId, tile.id);
    if (!res.success) setError(res.error ?? 'Unmortgage failed');
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {tile && (
        <>
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'oklch(0.12 0.02 260 / 0.55)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            style={{
              position: 'fixed', zIndex: 50,
              top: '50%', left: '50%',
              width: 320,
              background: 'var(--bg-glass-strong)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: setColor ? `1px solid ${setColor}44` : '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-xl)',
              boxShadow: setColor ? `0 0 40px ${setColor}18, var(--shadow-xl)` : 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, x: '-50%', y: '-48%', scale: 0.94 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: '-48%', scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {/* Set color band */}
            {setColor && (
              <div style={{ height: 3, background: setColor, boxShadow: `0 0 12px ${setColor}` }} />
            )}

            <div style={{ padding: '16px 16px' }}>
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {tile.flag && <FlagChip code={tile.flag} size={27} style={{ boxShadow: '0 2px 6px oklch(0 0 0 / 0.4)' }} />}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      {tile.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: setColor ?? 'var(--text-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {tile.country ? `${tile.country} · ` : ''}{tile.set ? `${tile.set.replace('-', ' ')} set` : tile.type}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 28, height: 28, borderRadius: 'var(--r-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
                    color: 'var(--text-faint)', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Owner */}
              {owner ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--r-md)', marginBottom: 12,
                  background: ownerNeon ? `oklch(from ${ownerNeon} l c h / 0.08)` : 'var(--bg-raised)',
                  border: `1px solid ${ownerNeon ? `oklch(from ${ownerNeon} l c h / 0.25)` : 'var(--stroke-soft)'}`,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: ownerNeon ?? 'var(--neon-cyan)',
                    boxShadow: `0 0 6px ${ownerNeon ?? 'var(--neon-cyan)'}`,
                  }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{owner.name}</span>
                  {/* City progress */}
                  {ownerSetProgress && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: setColor ?? 'var(--text-faint)', letterSpacing: '0.06em' }}>
                      {ownerSetProgress.owned}/{ownerSetProgress.total} cities
                    </span>
                  )}
                  {isMortgaged && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', letterSpacing: '0.06em' }}>MORTGAGED</span>
                  )}
                  {!isMortgaged && upgradeLevel > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: setColor ?? 'var(--text-primary)', letterSpacing: '0.06em' }}>
                      LVL {upgradeLevel}
                    </span>
                  )}
                </div>
              ) : tile.buyPrice ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 'var(--r-md)', marginBottom: 12,
                  background: 'var(--bg-raised)', border: '1px solid var(--stroke-hairline)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>Unowned</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{formatMoney(tile.buyPrice)}</span>
                </div>
              ) : null}

              {/* Monopoly Bonus panel — shown only if owner has full set */}
              {setAdvantage && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--r-md)',
                  background: setColor ? `${setColor}14` : 'oklch(0.85 0.18 130 / 0.06)',
                  border: `1px solid ${setColor ? `${setColor}35` : 'oklch(0.85 0.18 130 / 0.2)'}`,
                  marginBottom: 10,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={setColor ?? 'var(--neon-lime)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: setColor ?? 'var(--neon-lime)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Monopoly Bonus Active</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{setAdvantage}</div>
                  </div>
                </div>
              )}

              {/* Monopoly Bonus locked preview (owner doesn't have full set yet) */}
              {tile.set && owner && !setAdvantage && SET_ADVANTAGES[tile.set] && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--r-md)',
                  background: 'oklch(1 0 0 / 0.02)',
                  border: '1px solid var(--stroke-hairline)',
                  marginBottom: 10,
                  opacity: 0.6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Monopoly Bonus (Locked)</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.4 }}>{SET_ADVANTAGES[tile.set]}</div>
                  </div>
                </div>
              )}

              {/* Rent table for country */}
              {tile.type === 'country' && tile.rentLevels && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Rent</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {tile.rentLevels.map((rent, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '5px 10px', borderRadius: 'var(--r-sm)',
                          background: upgradeLevel === i && !isMortgaged ? `${setColor}15` : 'oklch(1 0 0 / 0.02)',
                          border: upgradeLevel === i && !isMortgaged ? `1px solid ${setColor}30` : '1px solid transparent',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
                          {i === 0 ? 'Base' : `Level ${i}`}
                          {upgradeLevel === i && !isMortgaged && (
                            <span style={{ color: setColor ?? 'var(--neon-cyan)', marginLeft: 6, fontSize: 8 }}>◀ current</span>
                          )}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, color: 'var(--text-primary)' }}>{formatMoney(rent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transport rents */}
              {tile.type === 'transport' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Rent (by routes owned)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {TRANSPORT_RENTS.map((rent, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderRadius: 'var(--r-sm)', background: 'oklch(1 0 0 / 0.02)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>{i + 1} route{i > 0 ? 's' : ''}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, color: 'var(--text-primary)' }}>{formatMoney(rent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Utility */}
              {tile.type === 'utility' && (
                <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Rent</div>
                  <InfoRow label="1 utility owned" value="4× dice roll" />
                  <InfoRow label="Both owned" value="10× dice roll" />
                </div>
              )}

              {/* Upgrade / Mortgage prices */}
              {(tile.upgradePrice || tile.mortgageValue) && (
                <div style={{ display: 'grid', gridTemplateColumns: tile.upgradePrice && tile.mortgageValue ? '1fr 1fr' : '1fr', gap: 6, marginBottom: 10 }}>
                  {tile.upgradePrice && (
                    <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', textAlign: 'center', background: 'var(--bg-raised)', border: '1px solid var(--stroke-hairline)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Upgrade</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{formatMoney(tile.upgradePrice)}</div>
                    </div>
                  )}
                  {tile.mortgageValue && (
                    <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', textAlign: 'center', background: 'var(--bg-raised)', border: '1px solid var(--stroke-hairline)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Mortgage</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--neon-amber)' }}>{formatMoney(tile.mortgageValue)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tax */}
              {tile.type === 'tax' && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', textAlign: 'center', background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', marginBottom: 4 }}>Tax charge</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, color: 'var(--danger)' }}>
                    {tile.taxType === 'percent' ? '10% of balance' : formatMoney(tile.taxAmount ?? 0)}
                  </div>
                </div>
              )}

              {/* Chest / Event */}
              {(tile.type === 'chest' || tile.type === 'event') && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, padding: '6px 0' }}>
                  {tile.type === 'chest'
                    ? 'Answer a trivia question to win or lose money.'
                    : 'Draw a random global event card.'}
                </div>
              )}

              {/* Direct Property Management Actions */}
              {isMine && room && myPlayerId && (
                <div style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid var(--stroke-hairline)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                      color: 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>💼</span> Manage Property
                    </div>
                    {!isMyTurn && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        ⚠️ Not your turn
                      </span>
                    )}
                  </div>

                  {error && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--danger)',
                      background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)',
                      borderRadius: 'var(--r-sm)', padding: '6px 10px', marginBottom: 10, textAlign: 'center',
                    }}>
                      {error}
                    </div>
                  )}

                  {/* Upgrades (Houses) building controls */}
                  {tile.type === 'country' && (
                    <div style={{
                      padding: '10px 12px', borderRadius: 'var(--r-md)',
                      background: 'oklch(1 0 0 / 0.015)', border: '1px solid var(--stroke-soft)',
                      marginBottom: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Houses & Upgrades
                        </span>
                        {!hasMonopoly && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            🔒 Monopoly Required
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Current Level display & pips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {LEVEL_LABELS[upgradeLevel]}
                          </span>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: i < upgradeLevel ? (setColor ?? 'var(--neon-cyan)') : 'oklch(1 0 0 / 0.08)',
                                boxShadow: i < upgradeLevel ? `0 0 4px ${setColor ?? 'var(--neon-cyan)'}` : 'none',
                              }} />
                            ))}
                          </div>
                        </div>

                        {/* Upgrade/Downgrade keys (Up & Down buttons) */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            disabled={loading || !canDowngrade}
                            onClick={handleDowngrade}
                            title="Sell house / Downgrade"
                            style={{
                              width: 32, height: 32, borderRadius: 'var(--r-sm)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
                              color: canDowngrade ? 'var(--neon-amber)' : 'var(--text-faint)',
                              cursor: canDowngrade && !loading ? 'pointer' : 'not-allowed',
                              opacity: canDowngrade ? 1 : 0.4,
                              fontSize: 14, fontWeight: 700,
                              transition: 'all var(--dur-fast)',
                            }}
                          >
                            ▼
                          </button>
                          <button
                            disabled={loading || !canUpgrade}
                            onClick={handleUpgrade}
                            title="Build house / Upgrade"
                            style={{
                              width: 32, height: 32, borderRadius: 'var(--r-sm)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: canUpgrade ? `linear-gradient(180deg, ${setColor ?? 'var(--neon-cyan)'} 0%, oklch(from ${setColor ?? 'var(--neon-cyan)'} calc(l * 0.8) c h) 100%)` : 'var(--bg-raised)',
                              color: canUpgrade ? 'oklch(0.12 0.02 260)' : 'var(--text-faint)',
                              border: canUpgrade ? 'none' : '1px solid var(--stroke-soft)',
                              cursor: canUpgrade && !loading ? 'pointer' : 'not-allowed',
                              opacity: canUpgrade ? 1 : 0.4,
                              fontSize: 14, fontWeight: 700,
                              transition: 'all var(--dur-fast)',
                            }}
                          >
                            ▲
                          </button>
                        </div>
                      </div>

                      {tile.upgradePrice && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center', lineHeight: 1.3 }}>
                          {canUpgrade && `Build cost: $${tile.upgradePrice} (min level in group is ${minLevel})`}
                          {canDowngrade && `Sell value: +$${Math.floor(tile.upgradePrice / 2)} (max level in group is ${maxLevel})`}
                          {hasMonopoly && !canUpgrade && !isMortgaged && upgradeLevel < 4 && !isEvenBuilding && `Build evenly — upgrade other group properties first.`}
                          {!hasMonopoly && `Complete the set color group to build houses.`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mortgage / Unmortgage action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {isMortgaged ? (
                      <button
                        disabled={loading || !canUnmortgage}
                        onClick={handleUnmortgage}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 'var(--r-md)',
                          background: 'linear-gradient(180deg, var(--neon-lime) 0%, oklch(0.62 0.13 145) 100%)',
                          color: 'oklch(0.12 0.02 260)', border: 'none',
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                          cursor: canUnmortgage && !loading ? 'pointer' : 'not-allowed',
                          opacity: canUnmortgage ? 1 : 0.5,
                          boxShadow: canUnmortgage ? '0 3px 12px oklch(0.77 0.13 145 / 0.3)' : 'none',
                          transition: 'all var(--dur-fast)',
                        }}
                      >
                        {loading ? '…' : `Lift Mortgage (-$${unmortgageCost})`}
                      </button>
                    ) : (
                      <button
                        disabled={loading || !canMortgage}
                        onClick={handleMortgage}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 'var(--r-md)',
                          background: 'oklch(0.82 0.17 75 / 0.12)',
                          border: '1px solid oklch(0.82 0.17 75 / 0.35)',
                          color: 'var(--neon-amber)',
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                          cursor: canMortgage && !loading ? 'pointer' : 'not-allowed',
                          opacity: canMortgage ? 1 : 0.5,
                          boxShadow: canMortgage ? '0 3px 12px oklch(0.82 0.17 75 / 0.15)' : 'none',
                          transition: 'all var(--dur-fast)',
                        }}
                      >
                        {loading ? '…' : `Mortgage Property (+$${tile.mortgageValue})`}
                      </button>
                    )}
                    {propHasUpgrades && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--danger)', textAlign: 'center', lineHeight: 1.3 }}>
                        Must sell all upgrades in this color group before mortgaging.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
