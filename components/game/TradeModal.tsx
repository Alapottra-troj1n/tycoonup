'use client';

import { useState, useMemo } from 'react';
import type { GameRoom, Player, Property, Tile } from '@/lib/types';
import { SET_COLORS } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { proposeTrade, acceptTrade, rejectTrade } from '@/app/actions/game';
import { NEON } from '@/lib/colors';
import { playClick } from '@/lib/sounds';
import { CloseIcon } from './icons';
import ErrorNote from './ErrorNote';

interface TradeModalProps {
  room: GameRoom;
  myPlayer: Player;
  allPlayers: Player[];
  properties: Property[];
  tiles: Tile[];
  onClose: () => void;
}

function TileTag({ tiles, tileId, selected, onClick }: { tiles: Tile[]; tileId: number; selected?: boolean; onClick?: () => void }) {
  const tile = tiles[tileId];
  const color = tile?.set ? SET_COLORS[tile.set] : 'var(--set-transit)';
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 11px', borderRadius: 'var(--r-pill)',
        background: selected ? `${color}22` : 'oklch(1 0 0 / 0.04)',
        border: `1px solid ${selected ? `${color}88` : 'var(--stroke-soft)'}`,
        fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--dur-fast) var(--ease-out)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      {tile?.name ?? `Tile ${tileId}`}
    </Tag>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>
      {children}
    </div>
  );
}

function CashInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>Cash</span>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--gold)' }}>$</span>
        <input
          type="number" min={0} max={max} value={value}
          onChange={e => onChange(Math.max(0, Math.min(max, Number(e.target.value))))}
          style={{
            width: 110, padding: '8px 10px 8px 22px', borderRadius: 'var(--r-sm)',
            background: 'var(--bg-input)', border: '1px solid var(--stroke-soft)',
            fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-faint)' }}>of {formatMoney(max)}</span>
    </div>
  );
}

export default function TradeModal({ room, myPlayer, allPlayers, properties, tiles, onClose }: TradeModalProps) {
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
    playClick();
    setOfferTileIds(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
  }
  function toggleRequest(tileId: number) {
    playClick();
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

  const errorBox = error && (
    <ErrorNote style={{ padding: '8px 12px' }}>{error}</ErrorNote>
  );

  // ── Side sheet shell ─────────────────────────────────────────────
  // Plain render helper (NOT a component) so inputs inside keep focus across re-renders.
  function renderSheet({ title, subtitle, children, footer, dismissable }: {
    title: string; subtitle?: string; children: React.ReactNode; footer: React.ReactNode; dismissable?: boolean;
  }) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: 'oklch(0.1 0.02 262 / 0.35)',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        }}
        onClick={(e) => dismissable && e.target === e.currentTarget && onClose()}
      >
        <div
          className="tu-sheet-in"
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 'min(430px, 100vw)',
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'blur(24px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.15)',
            borderLeft: '1px solid var(--stroke-soft)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--stroke-hairline)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{title}</div>
              {subtitle && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
            </div>
            <button
              onClick={() => { playClick(); if (dismissable) onClose(); else handleReject(); }}
              className="tu-btn tu-btn-ghost"
              style={{ width: 32, height: 32, padding: 0, color: 'var(--text-muted)' }}
              title={dismissable ? 'Close' : 'Dismiss trade'}
            >
              <CloseIcon size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {children}
          </div>
          <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--stroke-hairline)', display: 'flex', gap: 9, flexShrink: 0 }}>
            {footer}
          </div>
        </div>
      </div>
    );
  }

  // ── Incoming offer ──────────────────────────────────────────────
  if (isIncoming && pending?.type === 'trade_offer') {
    const fromName = pending.trade_from_player_name ?? 'Someone';
    const offeredTiles = pending.trade_offer_tile_ids ?? [];
    const requestedTiles = pending.trade_request_tile_ids ?? [];
    return renderSheet({
      title: 'Incoming trade',
      subtitle: `${fromName} wants to make a deal`,
      footer: (
        <>
          <button disabled={loading} onClick={handleReject} className="tu-btn tu-btn-ghost" style={{ flex: 1, color: 'var(--text-muted)' }}>
            Reject
          </button>
          <button disabled={loading} onClick={handleAccept} className="tu-btn tu-btn-primary" style={{ flex: 2 }}>
            {loading ? 'Processing…' : 'Accept trade'}
          </button>
        </>
      ),
      children: (
        <>
          {errorBox}

          <div style={{ background: 'var(--success-soft)', border: '1px solid oklch(0.78 0.13 155 / 0.25)', borderRadius: 'var(--r-lg)', padding: '13px 15px' }}>
            <SectionLabel>You receive</SectionLabel>
            {offeredTiles.length === 0 && (pending.trade_offer_cash ?? 0) === 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-faint)' }}>Nothing</span>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: offeredTiles.length > 0 ? 8 : 0 }}>
              {offeredTiles.map(id => <TileTag key={id} tiles={tiles} tileId={id} />)}
            </div>
            {(pending.trade_offer_cash ?? 0) > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--gold)' }}>+ {formatMoney(pending.trade_offer_cash!)}</span>
            )}
          </div>

          <div style={{ background: 'var(--danger-soft)', border: '1px solid oklch(0.71 0.155 25 / 0.22)', borderRadius: 'var(--r-lg)', padding: '13px 15px' }}>
            <SectionLabel>You give</SectionLabel>
            {requestedTiles.length === 0 && (pending.trade_request_cash ?? 0) === 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-faint)' }}>Nothing</span>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: requestedTiles.length > 0 ? 8 : 0 }}>
              {requestedTiles.map(id => <TileTag key={id} tiles={tiles} tileId={id} />)}
            </div>
            {(pending.trade_request_cash ?? 0) > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--danger)' }}>− {formatMoney(pending.trade_request_cash!)}</span>
            )}
          </div>
        </>
      ),
    });
  }

  // ── Outgoing / waiting ──────────────────────────────────────────
  if (isOutgoing && pending?.type === 'trade_offer') {
    return renderSheet({
      title: 'Offer sent',
      subtitle: `Waiting for ${pending.trade_to_player_name ?? 'player'} to respond…`,
      footer: (
        <button disabled={loading} onClick={handleReject} className="tu-btn" style={{ flex: 1, color: 'var(--gold)' }}>
          Cancel offer
        </button>
      ),
      children: (
        <>
          {errorBox}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid var(--stroke-soft)', borderTopColor: 'var(--accent)',
              animation: 'tu-spin 0.9s linear infinite',
            }} />
            They&apos;re weighing it up…
          </div>
        </>
      ),
    });
  }

  // ── Proposal form ───────────────────────────────────────────────
  return renderSheet({
    title: 'Propose a trade',
    subtitle: 'Only unimproved properties can change hands',
    dismissable: true,
    footer: (
      <>
        <button onClick={onClose} className="tu-btn tu-btn-ghost" style={{ flex: 1, color: 'var(--text-muted)' }}>
          Cancel
        </button>
        <button
          disabled={loading || !toPlayerId}
          onClick={handlePropose}
          className="tu-btn tu-btn-primary"
          style={{ flex: 2 }}
        >
          {loading ? 'Sending…' : 'Send offer'}
        </button>
      </>
    ),
    children: (
      <>
        {errorBox}

        {/* Select target player */}
        <div>
          <SectionLabel>Trade with</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {otherPlayers.map(p => {
              const sel = toPlayerId === p.id;
              const neon = NEON[p.color] ?? 'var(--neon-cyan)';
              return (
                <button
                  key={p.id}
                  onClick={() => { playClick(); setToPlayerId(p.id); setRequestTileIds([]); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 'var(--r-pill)',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5,
                    background: sel ? `oklch(from ${neon} l c h / 0.14)` : 'oklch(1 0 0 / 0.04)',
                    border: `1px solid ${sel ? neon : 'var(--stroke-soft)'}`,
                    color: sel ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all var(--dur-fast) var(--ease-out)',
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: neon, boxShadow: sel ? `0 0 6px ${neon}` : 'none' }} />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* My offer */}
        <div style={{ background: 'oklch(1 0 0 / 0.02)', border: '1px solid var(--stroke-hairline)', borderRadius: 'var(--r-lg)', padding: '13px 15px' }}>
          <SectionLabel>You offer</SectionLabel>
          {myTradeable.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              {myTradeable.map(prop => (
                <TileTag
                  key={prop.id}
                  tiles={tiles}
                  tileId={prop.tile_id}
                  selected={offerTileIds.includes(prop.tile_id)}
                  onClick={() => toggleOffer(prop.tile_id)}
                />
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
              No tradeable properties (sell upgrades first)
            </div>
          )}
          <CashInput value={offerCash} max={myPlayer.balance} onChange={setOfferCash} />
        </div>

        {/* Their side */}
        {toPlayerId && (
          <div style={{ background: 'oklch(1 0 0 / 0.02)', border: '1px solid var(--stroke-hairline)', borderRadius: 'var(--r-lg)', padding: '13px 15px' }}>
            <SectionLabel>You request from {toPlayer?.name}</SectionLabel>
            {theirTradeable.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
                {theirTradeable.map(prop => (
                  <TileTag
                    key={prop.id}
                    tiles={tiles}
                    tileId={prop.tile_id}
                    selected={requestTileIds.includes(prop.tile_id)}
                    onClick={() => toggleRequest(prop.tile_id)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
                {toPlayer?.name} has no tradeable properties
              </div>
            )}
            <CashInput value={requestCash} max={toPlayer?.balance ?? 0} onChange={setRequestCash} />
          </div>
        )}
      </>
    ),
  });
}
