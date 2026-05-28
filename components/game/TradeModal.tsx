'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GameRoom, Player, Property } from '@/lib/types';
import { TILES, SET_COLORS } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { proposeTrade, acceptTrade, rejectTrade } from '@/app/actions/game';

interface TradeModalProps {
  room: GameRoom;
  myPlayer: Player;
  allPlayers: Player[];
  properties: Property[];
  onClose: () => void;
}

function TileTag({ tileId, color }: { tileId: number; color: string }) {
  const tile = TILES[tileId];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 'var(--r-pill)',
      background: `${color}18`, border: `1px solid ${color}40`,
      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)',
    }}>
      {tile?.flag && <span>{tile.flag}</span>}
      {tile?.name ?? `Tile ${tileId}`}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 }}>
      {children}
    </div>
  );
}

export default function TradeModal({ room, myPlayer, allPlayers, properties, onClose }: TradeModalProps) {
  const pending = room.pending_action;
  const isIncoming = pending?.type === 'trade_offer' && pending.trade_to_player_id === myPlayer.id;
  const isOutgoing = pending?.type === 'trade_offer' && pending.trade_from_player_id === myPlayer.id;

  // Proposal form state
  const [toPlayerId, setToPlayerId]         = useState('');
  const [offerTileIds, setOfferTileIds]     = useState<number[]>([]);
  const [offerCash, setOfferCash]           = useState(0);
  const [requestTileIds, setRequestTileIds] = useState<number[]>([]);
  const [requestCash, setRequestCash]       = useState(0);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const otherPlayers = allPlayers.filter(p => p.id !== myPlayer.id && !p.is_bankrupt);
  const toPlayer     = allPlayers.find(p => p.id === toPlayerId);

  const myTradeable = useMemo(
    () => properties.filter(p => p.owner_id === myPlayer.id && p.upgrade_level === 0),
    [properties, myPlayer.id],
  );
  const theirTradeable = useMemo(
    () => properties.filter(p => p.owner_id === toPlayerId && p.upgrade_level === 0),
    [properties, toPlayerId],
  );

  function toggleOffer(tileId: number) {
    setOfferTileIds(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
  }
  function toggleRequest(tileId: number) {
    setRequestTileIds(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
  }

  async function handlePropose() {
    if (!toPlayerId) { setError('Select a player'); return; }
    setLoading(true);
    setError(null);
    const res = await proposeTrade(room.id, myPlayer.id, toPlayerId, offerTileIds, offerCash, requestTileIds, requestCash);
    if (!res.success) setError(res.error ?? 'Failed');
    setLoading(false);
  }

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const res = await acceptTrade(room.id, myPlayer.id);
    if (!res.success) setError(res.error ?? 'Failed');
    else onClose();
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    setError(null);
    const res = await rejectTrade(room.id, myPlayer.id);
    if (!res.success) setError(res.error ?? 'Failed');
    else onClose();
    setLoading(false);
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
    background: 'transparent',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    pointerEvents: 'none',
  };
  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 420, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg-glass-strong)',
    border: '1px solid var(--stroke-soft)',
    borderRadius: 'var(--r-2xl)',
    overflow: 'hidden',
    pointerEvents: 'auto',
  };
  const headerStyle: React.CSSProperties = {
    padding: '16px 20px 12px',
    borderBottom: '1px solid var(--stroke-hairline)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  };

  // ── Incoming offer ──────────────────────────────────────────────
  if (isIncoming && pending?.type === 'trade_offer') {
    const fromName = pending.trade_from_player_name ?? 'Someone';
    const offeredTiles = pending.trade_offer_tile_ids ?? [];
    const requestedTiles = pending.trade_request_tile_ids ?? [];
    return (
      <motion.div style={overlayStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div style={cardStyle} initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 26 }}>
          <div style={headerStyle}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Trade Offer</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{fromName} wants to trade</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)', borderRadius: 'var(--r-sm)', padding: '6px 10px' }}>{error}</div>}

            <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
              <SectionLabel>{fromName} offers you</SectionLabel>
              {offeredTiles.length === 0 && (pending.trade_offer_cash ?? 0) === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>Nothing</span>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: offeredTiles.length > 0 ? 6 : 0 }}>
                {offeredTiles.map(id => <TileTag key={id} tileId={id} color={SET_COLORS[TILES[id]?.set ?? ''] ?? 'var(--stroke-soft)'} />)}
              </div>
              {(pending.trade_offer_cash ?? 0) > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--success)' }}>+ {formatMoney(pending.trade_offer_cash!)}</span>
              )}
            </div>

            <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
              <SectionLabel>{fromName} wants from you</SectionLabel>
              {requestedTiles.length === 0 && (pending.trade_request_cash ?? 0) === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>Nothing</span>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: requestedTiles.length > 0 ? 6 : 0 }}>
                {requestedTiles.map(id => <TileTag key={id} tileId={id} color={SET_COLORS[TILES[id]?.set ?? ''] ?? 'var(--stroke-soft)'} />)}
              </div>
              {(pending.trade_request_cash ?? 0) > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--danger)' }}>− {formatMoney(pending.trade_request_cash!)}</span>
              )}
            </div>
          </div>
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--stroke-hairline)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              disabled={loading}
              onClick={handleReject}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              Reject
            </button>
            <button
              disabled={loading}
              onClick={handleAccept}
              style={{ flex: 2, padding: '10px', borderRadius: 'var(--r-md)', background: 'linear-gradient(180deg, var(--neon-lime) 0%, oklch(from var(--neon-lime) calc(l * 0.82) c h) 100%)', border: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'oklch(0.12 0.02 260)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, boxShadow: '0 4px 16px oklch(from var(--neon-lime) l c h / 0.35)' }}
            >
              {loading ? 'Processing…' : 'Accept Trade'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Outgoing / waiting ──────────────────────────────────────────
  if (isOutgoing && pending?.type === 'trade_offer') {
    return (
      <motion.div style={overlayStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div style={cardStyle} initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 26 }}>
          <div style={headerStyle}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Waiting for response…</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', marginBottom: 16 }}>
              Offer sent to {pending.trade_to_player_name ?? 'player'}
            </div>
            <button
              disabled={loading}
              onClick={handleReject}
              style={{ padding: '10px 20px', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--neon-amber)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              Cancel offer
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Proposal form ───────────────────────────────────────────────
  return (
    <motion.div style={overlayStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div style={cardStyle} initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 26 }}>
        <div style={headerStyle}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Propose Trade</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>Only unimproved properties can be traded</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)', borderRadius: 'var(--r-sm)', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.2)', borderRadius: 'var(--r-sm)', padding: '6px 10px' }}>{error}</div>}

          {/* Select target player */}
          <div>
            <SectionLabel>Trade with</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {otherPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setToPlayerId(p.id); setRequestTileIds([]); }}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--r-pill)',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
                    background: toPlayerId === p.id ? 'oklch(0.82 0.17 210 / 0.15)' : 'var(--bg-raised)',
                    border: `1px solid ${toPlayerId === p.id ? 'oklch(0.82 0.17 210 / 0.5)' : 'var(--stroke-soft)'}`,
                    color: toPlayerId === p.id ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* My offer */}
          <div>
            <SectionLabel>You offer</SectionLabel>
            {myTradeable.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {myTradeable.map(prop => {
                  const tile  = TILES[prop.tile_id];
                  const color = tile.set ? SET_COLORS[tile.set] : 'var(--stroke-soft)';
                  const sel   = offerTileIds.includes(prop.tile_id);
                  return (
                    <button
                      key={prop.id}
                      onClick={() => toggleOffer(prop.tile_id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 'var(--r-pill)',
                        background: sel ? `${color}25` : 'var(--bg-raised)',
                        border: `1px solid ${sel ? `${color}70` : 'var(--stroke-soft)'}`,
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: sel ? color : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {tile.flag && <span>{tile.flag}</span>}
                      {tile.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>Cash:</span>
              <input
                type="number" min={0} max={myPlayer.balance} value={offerCash}
                onChange={e => setOfferCash(Math.max(0, Math.min(myPlayer.balance, Number(e.target.value))))}
                style={{
                  width: 90, padding: '5px 8px', borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>max {formatMoney(myPlayer.balance)}</span>
            </div>
          </div>

          {/* Their offer */}
          {toPlayerId && (
            <div>
              <SectionLabel>You request from {toPlayer?.name}</SectionLabel>
              {theirTradeable.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {theirTradeable.map(prop => {
                    const tile  = TILES[prop.tile_id];
                    const color = tile.set ? SET_COLORS[tile.set] : 'var(--stroke-soft)';
                    const sel   = requestTileIds.includes(prop.tile_id);
                    return (
                      <button
                        key={prop.id}
                        onClick={() => toggleRequest(prop.tile_id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 'var(--r-pill)',
                          background: sel ? `${color}25` : 'var(--bg-raised)',
                          border: `1px solid ${sel ? `${color}70` : 'var(--stroke-soft)'}`,
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          color: sel ? color : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {tile.flag && <span>{tile.flag}</span>}
                        {tile.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {theirTradeable.length === 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>{toPlayer?.name} has no tradeable properties</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>Cash:</span>
                <input
                  type="number" min={0} max={toPlayer?.balance ?? 0} value={requestCash}
                  onChange={e => setRequestCash(Math.max(0, Math.min(toPlayer?.balance ?? 0, Number(e.target.value))))}
                  style={{
                    width: 90, padding: '5px 8px', borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>max {formatMoney(toPlayer?.balance ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--stroke-hairline)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            disabled={loading || !toPlayerId}
            onClick={handlePropose}
            style={{ flex: 2, padding: '10px', borderRadius: 'var(--r-md)', background: 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(from var(--neon-cyan) calc(l * 0.82) c h) 100%)', border: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'oklch(0.12 0.02 260)', cursor: (loading || !toPlayerId) ? 'not-allowed' : 'pointer', opacity: (loading || !toPlayerId) ? 0.5 : 1, boxShadow: '0 4px 16px oklch(from var(--neon-cyan) l c h / 0.35)' }}
          >
            {loading ? 'Sending…' : 'Send Offer'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
