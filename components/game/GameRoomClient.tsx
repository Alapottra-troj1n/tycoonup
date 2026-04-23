'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import type { GameRoom, Player, Property, Tile } from '@/lib/types';
import { useGameStore } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { TILES, PLAYER_COLOR_MAP } from '@/lib/game-data';
import { formatMoney } from '@/lib/utils';
import { rollDice, buyProperty, skipBuy, answerChestQuestion, endTurn } from '@/app/actions/game';
import Lobby from './Lobby';
import BoardView from './BoardView';
import ActionPanel from './ActionPanel';
import EventLog from './EventLog';
import PlayerCard from './PlayerCard';
import DiceOverlay from './DiceOverlay';
import ChestModal from './ChestModal';
import AuctionModal from './AuctionModal';
import WinScreen from './WinScreen';
import TileDetailModal from './TileDetailModal';
import BuyOfferModal from './BuyOfferModal';
import PropertyManager from './PropertyManager';

const NEON: Record<string, string> = {
  cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)', lime: 'var(--neon-lime)',
  amber: 'var(--neon-amber)', violet: 'var(--neon-violet)', rose: 'var(--neon-rose)',
};

function TULogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="grc-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--neon-lime)"/>
          <stop offset="0.5" stopColor="var(--neon-cyan)"/>
          <stop offset="1" stopColor="var(--neon-magenta)"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#grc-lg)" opacity="0.15"/>
      <rect x="4" y="4" width="32" height="32" rx="8" stroke="url(#grc-lg)" strokeWidth="1.5" fill="none"/>
      <text x="20" y="26" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="16" fill="url(#grc-lg)">T</text>
    </svg>
  );
}

interface GameRoomClientProps {
  initialRoom: GameRoom;
  initialPlayers: Player[];
  initialProperties: Property[];
  myPlayerId: string;
}

export default function GameRoomClient({
  initialRoom,
  initialPlayers,
  initialProperties,
  myPlayerId,
}: GameRoomClientProps) {
  const {
    room, players, properties,
    setRoom, setPlayers, setProperties,
    upsertPlayer, upsertProperty, setMyPlayerId,
    lastDiceRoll, diceAnimating,
  } = useGameStore();

  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const [rollLoading, setRollLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

  const playersRef = useRef<Player[]>(initialPlayers);
  useEffect(() => {
    playersRef.current = players.length > 0 ? players : initialPlayers;
  });

  useEffect(() => {
    setRoom(initialRoom);
    setPlayers(initialPlayers);
    setProperties(initialProperties);
    setMyPlayerId(myPlayerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setupRealtime = useCallback(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    const channel = supabase
      .channel(`room-${initialRoom.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) setRoom(payload.new as GameRoom); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) upsertPlayer(payload.new as Player); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `room_id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) upsertProperty(payload.new as Property); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [initialRoom.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setupRealtime(), [setupRealtime]);

  const activeStatus = (room ?? initialRoom).status;
  const activeIdx    = (room ?? initialRoom).current_player_idx;

  useEffect(() => {
    if (activeStatus !== 'playing') return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.from('players').select('*').eq('room_id', initialRoom.id).order('turn_order')
      .then(({ data }) => { if (data && data.length > 0) setPlayers(data as Player[]); });
  }, [activeStatus, activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const activeRoom = room ?? initialRoom;
    if (activeRoom.status !== 'playing') return;
    const sortedPlayers = playersRef.current.slice().sort((a, b) => a.turn_order - b.turn_order);
    const currentPlayer = sortedPlayers[activeRoom.current_player_idx];
    if (!currentPlayer?.is_bot) return;
    const pending = activeRoom.pending_action;
    let timer: ReturnType<typeof setTimeout>;
    if (activeRoom.turn_phase === 'roll') {
      timer = setTimeout(() => rollDice(activeRoom.id, currentPlayer.id).catch(() => {}), 1000 + Math.random() * 700);
    } else if (activeRoom.turn_phase === 'action') {
      if (pending?.type === 'buy_offer' && pending.player_id === currentPlayer.id) {
        timer = setTimeout(() => {
          const canAfford = currentPlayer.balance >= (pending.price ?? 0);
          if (canAfford) buyProperty(activeRoom.id, currentPlayer.id, pending.tile_id!).catch(() => {});
          else skipBuy(activeRoom.id, currentPlayer.id).catch(() => {});
        }, 700);
      } else if (pending?.type === 'chest_quiz' && pending.player_id === currentPlayer.id) {
        timer = setTimeout(() => answerChestQuestion(activeRoom.id, currentPlayer.id, Math.floor(Math.random() * 4)).catch(() => {}), 1200);
      }
    } else if (activeRoom.turn_phase === 'end' && pending?.type !== 'auction') {
      timer = setTimeout(() => endTurn(activeRoom.id, currentPlayer.id).catch(() => {}), 600);
    }
    return () => clearTimeout(timer);
  }, [
    (room ?? initialRoom).status,
    (room ?? initialRoom).turn_phase,
    (room ?? initialRoom).current_player_idx,
    (room ?? initialRoom).pending_action?.type,
    (room ?? initialRoom).pending_action?.player_id,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRoom       = room ?? initialRoom;
  const activePlayers    = (players.length > 0 ? players : initialPlayers).slice().sort((a, b) => a.turn_order - b.turn_order);
  const activeProperties = properties.length > 0 ? properties : initialProperties;
  const myPlayer         = activePlayers.find((p) => p.id === myPlayerId) ?? null;
  const currentPlayer    = activePlayers[activeRoom.current_player_idx] ?? null;
  const isMyTurn         = currentPlayer?.id === myPlayerId;

  async function handleRoll() {
    if (!myPlayer || rollLoading) return;
    setRollLoading(true);
    try { await rollDice(activeRoom.id, myPlayer.id); } catch { /* handled by server action */ }
    finally { setRollLoading(false); }
  }

  async function handleEndTurn() {
    if (!myPlayer || endLoading) return;
    setEndLoading(true);
    try { await endTurn(activeRoom.id, myPlayer.id); } catch { /* handled by server action */ }
    finally { setEndLoading(false); }
  }

  if (activeRoom.status === 'lobby') {
    return <Lobby room={activeRoom} players={activePlayers} myPlayerId={myPlayerId} />;
  }

  if (activeRoom.status === 'finished') {
    return <WinScreen players={activePlayers} properties={activeProperties} myPlayerId={myPlayerId} />;
  }

  const pending          = activeRoom.pending_action;
  const isChestActive    = pending?.type === 'chest_quiz' && !!pending.question;
  const isChestForMe     = pending?.player_id === myPlayerId;
  const isAuctionActive  = pending?.type === 'auction';
  const isBuyOfferActive = pending?.type === 'buy_offer' && isMyTurn && !!myPlayer && !myPlayer.is_bankrupt && pending.tile_id !== undefined;
  const currentNeon      = NEON[currentPlayer?.color ?? 'cyan'] ?? 'var(--neon-cyan)';

  const phaseLabel = (() => {
    if (activeRoom.doubles_turn) return 'Doubles — roll again';
    if (activeRoom.turn_phase === 'roll') return 'Roll the dice';
    if (activeRoom.turn_phase === 'action' && pending?.type === 'buy_offer') return 'Buy or Auction?';
    if (activeRoom.turn_phase === 'action') return 'Processing…';
    if (activeRoom.turn_phase === 'end') return 'End turn';
    return '';
  })();

  function copyCode() {
    navigator.clipboard.writeText(activeRoom.room_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  const sidebarStyle: React.CSSProperties = {
    background: 'var(--bg-glass-strong)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  };

  return (
    <div className="tu-backdrop" style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* ── Overlays ── */}
      <DiceOverlay roll={lastDiceRoll} animating={diceAnimating} playerName={diceAnimating ? currentPlayer?.name : undefined} />

      {isChestActive && myPlayer && (
        <ChestModal room={activeRoom} playerId={myPlayerId} question={pending!.question!} isActivePlayer={isChestForMe} />
      )}
      {isAuctionActive && myPlayer && (
        <AuctionModal room={activeRoom} players={activePlayers} myPlayer={myPlayer} />
      )}
      {isBuyOfferActive && myPlayer && (
        <BuyOfferModal room={activeRoom} myPlayer={myPlayer} tileId={pending!.tile_id!} price={pending!.price ?? 0} />
      )}
      <TileDetailModal
        tile={selectedTile}
        property={selectedTile ? activeProperties.find((p) => p.tile_id === selectedTile.id) : undefined}
        players={activePlayers}
        onClose={() => setSelectedTile(null)}
      />

      {/* ── Left sidebar ── */}
      <div style={{ ...sidebarStyle, width: 230, borderRight: '1px solid var(--stroke-hairline)' }}>
        {/* Logo bar */}
        <div style={{
          padding: '13px 16px 11px',
          borderBottom: '1px solid var(--stroke-hairline)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <TULogo />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            TycoonUP
          </span>
        </div>

        {/* Room code */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--stroke-hairline)', flexShrink: 0 }}>
          <div style={{ marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Room code
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              flex: 1, padding: '7px 10px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15,
              color: 'var(--neon-cyan)', letterSpacing: '0.14em',
            }}>
              {activeRoom.room_code}
            </div>
            <button
              onClick={copyCode}
              style={{
                padding: '7px 10px',
                background: codeCopied ? 'oklch(0.78 0.18 150 / 0.15)' : 'var(--bg-raised)',
                border: `1px solid ${codeCopied ? 'oklch(0.78 0.18 150 / 0.4)' : 'var(--stroke-soft)'}`,
                borderRadius: 'var(--r-md)',
                color: codeCopied ? 'var(--success)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 11,
                fontFamily: 'var(--font-mono)', fontWeight: 600,
                transition: 'all var(--dur-fast) var(--ease-out)',
                whiteSpace: 'nowrap',
              }}
            >
              {codeCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Players header */}
        <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Players · {activePlayers.length}
          </span>
        </div>

        {/* Players list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {activePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              properties={activeProperties}
              isCurrentTurn={currentPlayer?.id === player.id}
              isMe={player.id === myPlayerId}
            />
          ))}
        </div>
      </div>

      {/* ── Center ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top turn bar */}
        <div style={{
          padding: '9px 16px',
          borderBottom: '1px solid var(--stroke-hairline)',
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          {/* Turn chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 12px',
            background: isMyTurn ? 'oklch(0.82 0.17 210 / 0.1)' : 'var(--bg-raised)',
            border: `1px solid ${isMyTurn ? 'oklch(0.82 0.17 210 / 0.35)' : 'var(--stroke-soft)'}`,
            borderRadius: 'var(--r-pill)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: currentNeon,
              boxShadow: `0 0 6px ${currentNeon}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
              color: isMyTurn ? 'var(--neon-cyan)' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>
              {isMyTurn ? 'Your turn' : `${currentPlayer?.name ?? '…'}${currentPlayer?.is_bot ? ' · Bot' : ''}`}
            </span>
            {phaseLabel && (
              <>
                <div style={{ width: 1, height: 12, background: 'var(--stroke-soft)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {phaseLabel}
                </span>
              </>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Settings button */}
          <button style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-raised)',
            border: '1px solid var(--stroke-soft)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Board area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 16 }}>
          <BoardView
            players={activePlayers}
            properties={activeProperties}
            onTileClick={(id) => setSelectedTile(TILES[id])}
            lastDice={lastDiceRoll ?? undefined}
            diceAnimating={diceAnimating}
            isMyTurn={isMyTurn && !myPlayer?.is_bankrupt}
            turnPhase={activeRoom.turn_phase}
            currentPlayerName={currentPlayer?.name}
            currentPlayerColor={currentPlayer?.color}
            doublesRolled={activeRoom.doubles_turn ?? false}
            onRoll={handleRoll}
            onEndTurn={handleEndTurn}
            isRollLoading={rollLoading || diceAnimating}
            isEndLoading={endLoading}
          />
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div style={{ ...sidebarStyle, width: 280, borderLeft: '1px solid var(--stroke-hairline)' }}>

        {/* PropertyManager modal (opened from Quick Actions) */}
        {showProps && myPlayer && (
          <PropertyManager
            room={activeRoom}
            player={myPlayer}
            properties={activeProperties}
            allPlayers={activePlayers}
            onClose={() => setShowProps(false)}
          />
        )}

        {/* ActionPanel — wallet balance + in-jail state + contextual status */}
        {myPlayer && (
          <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
            <ActionPanel
              room={activeRoom}
              myPlayer={myPlayer}
              isMyTurn={isMyTurn && !myPlayer.is_bankrupt}
              properties={activeProperties}
              allPlayers={activePlayers}
            />
          </div>
        )}

        {/* Quick Actions panel */}
        {myPlayer && (
          <div style={{ padding: '8px 12px 0', flexShrink: 0 }}>
            <div style={{
              background: 'var(--bg-glass-strong)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid var(--stroke-hairline)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '11px 14px 9px',
                borderBottom: '1px solid var(--stroke-hairline)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                  Quick actions
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {isMyTurn ? 'your turn' : 'your turn soon'}
                </span>
              </div>

              {/* Panel body */}
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Propose trade */}
                <button style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--stroke-soft)',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
                  color: 'var(--text-primary)', cursor: 'pointer',
                  transition: 'all var(--dur-fast) var(--ease-out)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Propose trade
                </button>

                {/* Manage properties */}
                <button
                  onClick={() => setShowProps(true)}
                  style={{
                    width: '100%', padding: '8px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'transparent',
                    border: '1px solid var(--stroke-soft)',
                    borderRadius: 'var(--r-md)',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    transition: 'all var(--dur-fast) var(--ease-out)',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9m0 0h5"/>
                  </svg>
                  Manage properties
                </button>

                {/* Helper text */}
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
                  textAlign: 'center', padding: '4px 8px 0',
                  fontFamily: 'var(--font-ui)',
                }}>
                  Click any tile you own to upgrade, mortgage, or list it for trade.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EventLog */}
        <div style={{
          flex: 1,
          margin: '12px',
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid var(--stroke-hairline)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <EventLog entries={activeRoom.event_log ?? []} />
        </div>
      </div>
    </div>
  );
}
