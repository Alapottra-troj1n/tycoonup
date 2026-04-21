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

  // ── Always-fresh players ref ──
  // Updated every render so bot effect never reads a stale player list.
  const playersRef = useRef<Player[]>(initialPlayers);
  useEffect(() => {
    playersRef.current = players.length > 0 ? players : initialPlayers;
  });

  // ── Init store ──
  useEffect(() => {
    setRoom(initialRoom);
    setPlayers(initialPlayers);
    setProperties(initialProperties);
    setMyPlayerId(myPlayerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ──
  const setupRealtime = useCallback(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const channel = supabase
      .channel(`room-${initialRoom.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) setRoom(payload.new as GameRoom); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) upsertPlayer(payload.new as Player); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties', filter: `room_id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) upsertProperty(payload.new as Property); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initialRoom.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setupRealtime(), [setupRealtime]);

  // ── Re-sync players from DB when the turn advances ──
  // After startGame shuffles turn_orders, CDC room event may arrive before
  // all player CDCs. A fresh fetch ensures the client's sorted array matches
  // what the server expects.
  const activeStatus = (room ?? initialRoom).status;
  const activeIdx    = (room ?? initialRoom).current_player_idx;

  useEffect(() => {
    if (activeStatus !== 'playing') return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase
      .from('players')
      .select('*')
      .eq('room_id', initialRoom.id)
      .order('turn_order')
      .then(({ data }) => {
        if (data && data.length > 0) setPlayers(data as Player[]);
      });
  }, [activeStatus, activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bot auto-play ──
  // Uses playersRef so it never operates on a stale player list, while
  // still only re-running when observable room state actually changes.
  useEffect(() => {
    const activeRoom = room ?? initialRoom;
    if (activeRoom.status !== 'playing') return;

    const sortedPlayers = playersRef.current
      .slice()
      .sort((a, b) => a.turn_order - b.turn_order);

    const currentPlayer = sortedPlayers[activeRoom.current_player_idx];
    if (!currentPlayer?.is_bot) return;

    const pending = activeRoom.pending_action;
    let timer: ReturnType<typeof setTimeout>;

    if (activeRoom.turn_phase === 'roll') {
      timer = setTimeout(
        () => rollDice(activeRoom.id, currentPlayer.id).catch(() => {}),
        1000 + Math.random() * 700,
      );
    } else if (activeRoom.turn_phase === 'action') {
      if (pending?.type === 'buy_offer' && pending.player_id === currentPlayer.id) {
        timer = setTimeout(() => {
          const canAfford = currentPlayer.balance >= (pending.price ?? 0);
          if (canAfford) {
            buyProperty(activeRoom.id, currentPlayer.id, pending.tile_id!).catch(() => {});
          } else {
            skipBuy(activeRoom.id, currentPlayer.id).catch(() => {});
          }
        }, 700);
      } else if (pending?.type === 'chest_quiz' && pending.player_id === currentPlayer.id) {
        timer = setTimeout(() => {
          answerChestQuestion(
            activeRoom.id,
            currentPlayer.id,
            Math.floor(Math.random() * 4),
          ).catch(() => {});
        }, 1200);
      }
      // auction: let the timer expire naturally
    } else if (activeRoom.turn_phase === 'end' && pending?.type !== 'auction') {
      timer = setTimeout(
        () => endTurn(activeRoom.id, currentPlayer.id).catch(() => {}),
        600,
      );
    }

    return () => clearTimeout(timer);
  }, [
    (room ?? initialRoom).status,
    (room ?? initialRoom).turn_phase,
    (room ?? initialRoom).current_player_idx,
    (room ?? initialRoom).pending_action?.type,
    (room ?? initialRoom).pending_action?.player_id,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ──
  const activeRoom       = room ?? initialRoom;
  const activePlayers    = (players.length > 0 ? players : initialPlayers)
    .slice()
    .sort((a, b) => a.turn_order - b.turn_order);
  const activeProperties = properties.length > 0 ? properties : initialProperties;

  const myPlayer      = activePlayers.find((p) => p.id === myPlayerId) ?? null;
  const currentPlayer = activePlayers[activeRoom.current_player_idx] ?? null;
  const isMyTurn      = currentPlayer?.id === myPlayerId;

  // ── Lobby ──
  if (activeRoom.status === 'lobby') {
    return <Lobby room={activeRoom} players={activePlayers} myPlayerId={myPlayerId} />;
  }

  // ── Win screen ──
  if (activeRoom.status === 'finished') {
    return (
      <WinScreen
        players={activePlayers}
        properties={activeProperties}
        myPlayerId={myPlayerId}
      />
    );
  }

  const pending = activeRoom.pending_action;
  const isChestActive    = pending?.type === 'chest_quiz' && !!pending.question;
  const isChestForMe     = pending?.player_id === myPlayerId;
  const isAuctionActive  = pending?.type === 'auction';
  const isBuyOfferActive = (
    pending?.type === 'buy_offer' &&
    isMyTurn &&
    !!myPlayer &&
    !myPlayer.is_bankrupt &&
    pending.tile_id !== undefined
  );

  // Phase label for top bar
  const phaseLabel = (() => {
    if (!isMyTurn) return null;
    if (activeRoom.doubles_turn) return '🎲 Doubles! Roll again';
    if (activeRoom.turn_phase === 'roll') return '🎲 Roll the dice';
    if (activeRoom.turn_phase === 'action' && pending?.type === 'buy_offer') return '🏠 Buy or Auction?';
    if (activeRoom.turn_phase === 'action') return '⌛ Waiting…';
    if (activeRoom.turn_phase === 'end') return '✅ End your turn';
    return null;
  })();

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a1020 0%, #060912 70%)' }}
    >
      {/* ── Overlays ── */}
      <DiceOverlay
        roll={lastDiceRoll}
        animating={diceAnimating}
        playerName={diceAnimating ? currentPlayer?.name : undefined}
      />

      {isChestActive && myPlayer && (
        <ChestModal
          room={activeRoom}
          playerId={myPlayerId}
          question={pending!.question!}
          isActivePlayer={isChestForMe}
        />
      )}

      {isAuctionActive && myPlayer && (
        <AuctionModal
          room={activeRoom}
          players={activePlayers}
          myPlayer={myPlayer}
        />
      )}

      {/* Buy offer — full-screen modal so it's impossible to miss */}
      {isBuyOfferActive && myPlayer && (
        <BuyOfferModal
          room={activeRoom}
          myPlayer={myPlayer}
          tileId={pending!.tile_id!}
          price={pending!.price ?? 0}
        />
      )}

      <TileDetailModal
        tile={selectedTile}
        property={selectedTile ? activeProperties.find((p) => p.tile_id === selectedTile.id) : undefined}
        players={activePlayers}
        onClose={() => setSelectedTile(null)}
      />

      {/* ── Top HUD ── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.25)' }}
      >
        {/* Turn indicator pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 min-w-0"
          style={
            isMyTurn
              ? { background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }
          }
        >
          {isMyTurn ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#00f5ff', boxShadow: '0 0 5px #00f5ff' }}
              />
              {phaseLabel ?? 'Your Turn'}
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#475569' }} />
              {currentPlayer?.name
                ? `${currentPlayer.name}${currentPlayer.is_bot ? ' 🤖' : ''}'s turn`
                : '…'}
            </>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Player balance chips — all players visible at a glance */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto min-w-0">
          {activePlayers.map((p) => {
            const colorHex   = PLAYER_COLOR_MAP[p.color]?.hex ?? '#fff';
            const isCurrent  = p.id === currentPlayer?.id;
            const isMe       = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 transition-all"
                style={{
                  background: isCurrent ? `${colorHex}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCurrent ? colorHex + '50' : 'rgba(255,255,255,0.06)'}`,
                  opacity: p.is_bankrupt ? 0.35 : 1,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
                  style={{ backgroundColor: colorHex, color: '#000' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] font-bold" style={{ color: colorHex }}>
                  {formatMoney(p.balance)}
                </span>
                {isMe && (
                  <span className="text-[8px] text-slate-600 font-normal">you</span>
                )}
                {p.is_bankrupt && (
                  <span className="text-[8px] text-red-500 font-bold">BUST</span>
                )}
                {p.in_jail && !p.is_bankrupt && (
                  <span className="text-[8px] text-amber-500">🔒</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 gap-3 p-3 overflow-hidden min-h-0">
        {/* Left: Player cards */}
        <div className="w-44 shrink-0 flex flex-col gap-2 overflow-y-auto">
          <p className="text-slate-700 text-[9px] uppercase tracking-widest px-1 shrink-0">Players</p>
          {activePlayers
            .slice()
            .sort((a, b) => a.turn_order - b.turn_order)
            .map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                properties={activeProperties}
                isCurrentTurn={currentPlayer?.id === player.id}
                isMe={player.id === myPlayerId}
              />
            ))}
        </div>

        {/* Center: Board */}
        <div className="flex-1 flex items-start justify-center overflow-auto">
          <BoardView
            players={activePlayers}
            properties={activeProperties}
            onTileClick={(id) => setSelectedTile(TILES[id])}
          />
        </div>

        {/* Right: Event log + Action panel */}
        <div className="w-52 shrink-0 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <EventLog entries={activeRoom.event_log ?? []} />
          </div>
          {myPlayer && (
            <ActionPanel
              room={activeRoom}
              myPlayer={myPlayer}
              isMyTurn={isMyTurn && !myPlayer.is_bankrupt}
              properties={activeProperties}
              allPlayers={activePlayers}
            />
          )}
        </div>
      </div>
    </div>
  );
}
