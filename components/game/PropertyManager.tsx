'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameRoom, Player, Property } from '@/lib/types';
import { TILES, SET_COLORS, SET_ADVANTAGES, SET_SIZES } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { upgradeProperty, mortgageProperty, unmortgageProperty } from '@/app/actions/game';
import FlagChip from './FlagChip';

interface PropertyManagerProps {
  room: GameRoom;
  player: Player;
  properties: Property[];
  allPlayers: Player[];
  onClose: () => void;
}

const LEVEL_LABELS = ['Base', 'Lvl 1', 'Lvl 2', 'Lvl 3', 'Max'];

function PropActionBtn({
  children, onClick, disabled, color, variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  variant?: 'default' | 'danger' | 'success';
}) {
  const bg = variant === 'success' ? 'oklch(0.78 0.18 150 / 0.08)' : variant === 'danger' ? 'oklch(0.82 0.17 75 / 0.08)' : color ? `${color}18` : 'var(--bg-raised)';
  const borderColor = variant === 'success' ? 'oklch(0.78 0.18 150 / 0.25)' : variant === 'danger' ? 'oklch(0.82 0.17 75 / 0.25)' : color ? `${color}40` : 'var(--stroke-soft)';
  const textColor = variant === 'success' ? 'var(--success)' : variant === 'danger' ? 'var(--neon-amber)' : color ?? 'var(--text-secondary)';
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '4px 8px',
        borderRadius: 'var(--r-sm)',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        background: bg, border: `1px solid ${borderColor}`, color: textColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'all var(--dur-fast) var(--ease-out)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export default function PropertyManager({ room, player, properties, allPlayers, onClose }: PropertyManagerProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
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
    setLoadingKey(key);
    setError(null);
    const res = await fn();
    if (!res.success) setError(res.error ?? 'Action failed');
    setLoadingKey(null);
  }

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 0',
        background: 'oklch(0.08 0.02 260 / 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        style={{
          width: '100%', maxWidth: 520, maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--stroke-soft)',
          borderBottom: 'none',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          overflow: 'hidden',
        }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 'var(--r-pill)', background: 'var(--stroke-strong)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px 10px',
          borderBottom: '1px solid var(--stroke-hairline)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>My Properties</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
              {myProperties.length} owned · {formatMoney(player.balance)} balance
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-sm)', color: 'var(--text-faint)',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)',
            background: 'oklch(0.68 0.22 25 / 0.08)', borderBottom: '1px solid oklch(0.68 0.22 25 / 0.2)',
            padding: '7px 18px', flexShrink: 0,
          }}>
            {error}
          </div>
        )}

        {/* Properties list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {myProperties.length === 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>
              No properties owned yet
            </div>
          )}

          {Object.entries(grouped).map(([groupKey, props]) => {
            const setColor = SET_COLORS[groupKey] ?? 'var(--stroke-strong)';
            const groupTile = TILES[props[0].tile_id];
            const groupLabel = groupTile.set
              ? groupTile.set.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : groupTile.type.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div key={groupKey}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: setColor, boxShadow: `0 0 6px ${setColor}88`, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>
                    {groupLabel}
                  </span>
                  {/* Monopoly progress badge */}
                  {(() => {
                    const setKey = groupTile.set;
                    if (!setKey) return null;
                    const setSize = SET_SIZES[setKey] ?? 2;
                    const ownedCount = props.length;
                    const isComplete = ownedCount >= setSize;
                    return (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 8,
                        padding: '2px 7px', borderRadius: 'var(--r-pill)',
                        background: isComplete ? `${setColor}20` : 'oklch(1 0 0 / 0.04)',
                        color: isComplete ? setColor : 'var(--text-faint)',
                        border: `1px solid ${isComplete ? `${setColor}50` : 'var(--stroke-hairline)'}`,
                        letterSpacing: '0.05em',
                      }}>
                        {isComplete ? '⭐ MONOPOLY' : `${ownedCount}/${setSize}`}
                      </span>
                    );
                  })()}
                </div>
                {/* Monopoly advantage panel — always visible, locked or active */}
                {(() => {
                  const setKey = groupTile.set;
                  if (!setKey) return null;
                  const adv = SET_ADVANTAGES[setKey];
                  if (!adv) return null;
                  const setSize = SET_SIZES[setKey] ?? 2;
                  const ownedCount = props.length;
                  const isComplete = ownedCount >= setSize;
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 7,
                      padding: '6px 10px', borderRadius: 'var(--r-sm)',
                      background: isComplete ? `${setColor}10` : 'oklch(1 0 0 / 0.02)',
                      border: `1px solid ${isComplete ? `${setColor}30` : 'var(--stroke-hairline)'}`,
                      marginBottom: 8,
                      opacity: isComplete ? 1 : 0.55,
                      transition: 'opacity 0.3s, background 0.3s',
                    }}>
                      {isComplete ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={setColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      )}
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: isComplete ? setColor : 'var(--text-faint)', marginBottom: 2 }}>
                          {isComplete ? 'Bonus Active' : 'Monopoly Bonus (locked)'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: isComplete ? 'var(--text-secondary)' : 'var(--text-faint)', lineHeight: 1.4 }}>
                          {adv}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {props.map((prop) => {
                    const tile = TILES[prop.tile_id];
                    const currentRent = tile.rentLevels?.[prop.upgrade_level];
                    const nextRent = tile.rentLevels?.[prop.upgrade_level + 1];
                    const unmortgageCost = tile.mortgageValue ? Math.ceil(tile.mortgageValue * 1.1) : 0;
                    const canUpgrade = tile.type === 'country' && prop.upgrade_level < 4 && !prop.is_mortgaged && player.balance >= (tile.upgradePrice ?? 999);
                    const canMortgage = !prop.is_mortgaged && prop.upgrade_level === 0;
                    const canUnmortgage = prop.is_mortgaged && player.balance >= unmortgageCost;

                    return (
                      <div
                        key={prop.id}
                        style={{
                          padding: '10px 12px', borderRadius: 'var(--r-md)',
                          background: prop.is_mortgaged ? 'oklch(1 0 0 / 0.015)' : 'oklch(1 0 0 / 0.03)',
                          border: `1px solid ${prop.is_mortgaged ? 'var(--stroke-hairline)' : setColor + '28'}`,
                          opacity: prop.is_mortgaged ? 0.65 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          {tile.flag && <FlagChip code={tile.flag} size={16} style={{ display: 'inline-block', flexShrink: 0, boxShadow: '0 1px 4px oklch(0 0 0 / 0.4)' }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{tile.name}</span>
                              {prop.is_mortgaged && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px', borderRadius: 'var(--r-pill)', background: 'oklch(0.82 0.17 75 / 0.12)', color: 'var(--neon-amber)', letterSpacing: '0.06em' }}>
                                  MORTGAGED
                                </span>
                              )}
                              {prop.upgrade_level > 0 && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px', borderRadius: 'var(--r-pill)', background: `${setColor}18`, color: setColor, letterSpacing: '0.06em' }}>
                                  {LEVEL_LABELS[prop.upgrade_level]}
                                </span>
                              )}
                            </div>

                            {/* Upgrade pips */}
                            {tile.type === 'country' && (
                              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: 7, height: 7, borderRadius: '50%',
                                      background: i < prop.upgrade_level ? setColor : 'oklch(1 0 0 / 0.08)',
                                      boxShadow: i < prop.upgrade_level ? `0 0 4px ${setColor}` : 'none',
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {currentRent !== undefined && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
                                  Rent: <span style={{ color: 'var(--text-secondary)' }}>{formatMoney(currentRent)}</span>
                                </span>
                              )}
                              {nextRent !== undefined && !prop.is_mortgaged && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
                                  → <span style={{ color: 'var(--success)' }}>{formatMoney(nextRent)}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                            {tile.type === 'country' && !prop.is_mortgaged && (
                              <PropActionBtn
                                color={setColor}
                                disabled={!canUpgrade || loadingKey === `up-${prop.id}`}
                                onClick={() => withLoad(`up-${prop.id}`, () => upgradeProperty(room.id, player.id, prop.tile_id))}
                              >
                                {loadingKey === `up-${prop.id}` ? '…' : `↑ $${tile.upgradePrice}`}
                              </PropActionBtn>
                            )}
                            {canMortgage && (
                              <PropActionBtn
                                variant="danger"
                                disabled={loadingKey === `mort-${prop.id}`}
                                onClick={() => withLoad(`mort-${prop.id}`, () => mortgageProperty(room.id, player.id, prop.tile_id))}
                              >
                                {loadingKey === `mort-${prop.id}` ? '…' : `Mortgage $${tile.mortgageValue}`}
                              </PropActionBtn>
                            )}
                            {prop.is_mortgaged && (
                              <PropActionBtn
                                variant="success"
                                disabled={!canUnmortgage || loadingKey === `unmort-${prop.id}`}
                                onClick={() => withLoad(`unmort-${prop.id}`, () => unmortgageProperty(room.id, player.id, prop.tile_id))}
                              >
                                {loadingKey === `unmort-${prop.id}` ? '…' : `Lift $${unmortgageCost}`}
                              </PropActionBtn>
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
