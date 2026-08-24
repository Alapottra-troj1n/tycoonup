'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import type { GameRoom, Player, Property, Tile } from '@/lib/types';
import { useGameStore } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { boardFor } from '@/lib/game-data';
import { normalizeSettings } from '@/lib/settings';
import { formatMoney } from '@/lib/utils';
import { NEON } from '@/lib/colors';
import { rollDice, buyProperty, skipBuy, answerChestQuestion, endTurn, chooseTax, rejectTrade, placeBid, foldAuction } from '@/app/actions/game';
import {
  playDiceRoll, playTokenMove, playGameStart, playAuctionStart,
  playChestOpen, playTurnStart, playClick, playHover, playTax, playWin, playRentPaid,
  getMasterVolume, setMasterVolume, startAmbient, stopAmbient, setTension, playModalOpen, playModalClose
} from '@/lib/sounds';
import { UmbrellaIcon } from './icons';
import Lobby from './Lobby';
import BoardView from './BoardView';
import ActionPanel from './ActionPanel';
import EventLog from './EventLog';
import PlayerCard from './PlayerCard';

import ChestModal from './ChestModal';
import AuctionModal from './AuctionModal';
import WinScreen from './WinScreen';
import TileDetailModal from './TileDetailModal';
import BuyOfferModal from './BuyOfferModal';
import PropertyManager from './PropertyManager';
import TaxChoiceModal from './TaxChoiceModal';
import TradeModal from './TradeModal';
import TurnAnnouncer from './TurnAnnouncer';

/** Tracks the responsive breakpoint. Lazy-initialized from matchMedia so
 *  phones don't flash the desktop layout on first client paint. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1080px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1080px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

/** Volume glyph shared by the mobile top bar and desktop status bar. */
function VolumeIcon({ level }: { level: 'full' | 'half' | 'mute' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      {level === 'mute' && <><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>}
      {level === 'half' && <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>}
      {level === 'full' && <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>}
    </svg>
  );
}

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
    upsertPlayer, removePlayer, upsertProperty, setMyPlayerId,
    lastDiceRoll, diceAnimating,
    walkingPlayerId, pendingPlayerUpdate,
  } = useGameStore();

  const isMobile = useIsMobile();
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const [showLogMobile, setShowLogMobile] = useState(false);
  const [rollLoading, setRollLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [turnAnnounce, setTurnAnnounce] = useState<{
    name: string; color: string; isMe: boolean; isBot: boolean; key: number;
  } | null>(null);
  // Track who actually last rolled (may differ from currentPlayer during action/end phases)
  const [diceRollerName, setDiceRollerName] = useState<string | null>(null);
  const [diceRollerColor, setDiceRollerColor] = useState<string>('cyan');
  // Volume: 'full' | 'half' | 'mute'
  const [sfxLevel, setSfxLevel] = useState<'full' | 'half' | 'mute'>(() => {
    const v = getMasterVolume();
    if (v <= 0) return 'mute';
    if (v <= 0.3) return 'half';
    return 'full';
  });

  function cycleVolume() {
    const next = sfxLevel === 'full' ? 'half' : sfxLevel === 'half' ? 'mute' : 'full';
    setSfxLevel(next);
    setMasterVolume(next === 'full' ? 0.55 : next === 'half' ? 0.22 : 0);
    if (next !== 'mute') {
      startAmbient();
      playClick();
    }
  }

  const playersRef = useRef<Player[]>(initialPlayers);
  const prevCurrentPlayerIdRef = useRef<string | undefined>(undefined);
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
        (payload) => { if (payload.new && payload.eventType !== 'DELETE') upsertPlayer(payload.new as Player); })
      // DELETE payloads only carry the primary key and ignore column filters,
      // so listen unfiltered — removing an unknown id is a no-op.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players' },
        (payload) => {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (oldId) removePlayer(oldId);
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `room_id=eq.${initialRoom.id}` },
        (payload) => { if (payload.new) upsertProperty(payload.new as Property); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [initialRoom.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setupRealtime(), [setupRealtime]);

  // Procedural Lobby/Game Ambience Mount Cycle
  useEffect(() => {
    startAmbient();
    return () => {
      stopAmbient();
    };
  }, []);

  // Modal Whoosh Transitions
  const isFirstPropsRender = useRef(true);
  useEffect(() => {
    if (isFirstPropsRender.current) {
      isFirstPropsRender.current = false;
      return;
    }
    if (showProps) playModalOpen();
    else playModalClose();
  }, [showProps]);

  const isFirstTradeRender = useRef(true);
  useEffect(() => {
    if (isFirstTradeRender.current) {
      isFirstTradeRender.current = false;
      return;
    }
    if (showTrade) playModalOpen();
    else playModalClose();
  }, [showTrade]);

  const isFirstTileRender = useRef(true);
  useEffect(() => {
    if (isFirstTileRender.current) {
      isFirstTileRender.current = false;
      return;
    }
    if (selectedTile) playModalOpen();
    else playModalClose();
  }, [selectedTile]);



  const activeStatus = (room ?? initialRoom).status;
  const activeIdx    = (room ?? initialRoom).current_player_idx;

  useEffect(() => {
    if (activeStatus !== 'playing') return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.from('players').select('*').eq('room_id', initialRoom.id).order('turn_order')
      .then(({ data }) => { if (data && data.length > 0) setPlayers(data as Player[]); });
  }, [activeStatus, activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a new dice roll is detected (diceAnimating just turned true), snapshot who rolled + play SFX
  const prevDiceAnimatingRef = useRef(false);
  useEffect(() => {
    if (diceAnimating && !prevDiceAnimatingRef.current) {
      // Dice animation just started — capture the current player as the roller
      const activeRoom = room ?? initialRoom;
      const sorted = playersRef.current.slice().sort((a, b) => a.turn_order - b.turn_order);
      const cp = sorted[activeRoom.current_player_idx];
      if (cp) {
        setDiceRollerName(cp.name);
        setDiceRollerColor(cp.color);
      }
      playDiceRoll();
    }
    prevDiceAnimatingRef.current = diceAnimating;
  }, [diceAnimating]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const activeRoom = room ?? initialRoom;
    if (activeRoom.status !== 'playing') return;
    const sortedPlayers = playersRef.current.slice().sort((a, b) => a.turn_order - b.turn_order);
    const currentPlayer = sortedPlayers[activeRoom.current_player_idx];
    const pending = activeRoom.pending_action;
    let timer: ReturnType<typeof setTimeout>;

    // Auto-reject incoming trade offers directed at a bot, regardless of whose turn it is
    if (pending?.type === 'trade_offer' && pending.trade_to_player_id) {
      const recipientBot = sortedPlayers.find(p => p.id === pending.trade_to_player_id && p.is_bot);
      if (recipientBot) {
        timer = setTimeout(() => rejectTrade(activeRoom.id, recipientBot.id).catch(() => {}), 1200);
        return () => clearTimeout(timer);
      }
    }

    if (!currentPlayer?.is_bot) return;
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
      } else if (pending?.type === 'income_tax_choice' && pending.player_id === currentPlayer.id) {
        timer = setTimeout(() => {
          const flat = pending.flat_tax ?? 200;
          const pct  = pending.net_worth_tax ?? 0;
          chooseTax(activeRoom.id, currentPlayer.id, flat <= pct ? 'flat' : 'percent').catch(() => {});
        }, 700);
      }
    } else if (activeRoom.turn_phase === 'end' && pending?.type !== 'auction' && pending?.type !== 'trade_offer') {
      timer = setTimeout(() => endTurn(activeRoom.id, currentPlayer.id).catch(() => {}), 600);
    }
    return () => clearTimeout(timer);
  }, [
    (room ?? initialRoom).status,
    (room ?? initialRoom).turn_phase,
    (room ?? initialRoom).current_player_idx,
    (room ?? initialRoom).pending_action?.type,
    (room ?? initialRoom).pending_action?.player_id,
    (room ?? initialRoom).pending_action?.trade_to_player_id,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the trade proposal form when a pending trade resolves
  useEffect(() => {
    if ((room ?? initialRoom).pending_action?.type !== 'trade_offer') {
      setTimeout(() => setShowTrade(false), 0);
    }
  }, [(room ?? initialRoom).pending_action?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Announce whose turn it is whenever the active player index changes
  useEffect(() => {
    const activeRoom = room ?? initialRoom;
    if (activeRoom.status !== 'playing') return;
    const sorted = playersRef.current.slice().sort((a, b) => a.turn_order - b.turn_order);
    const cp = sorted[activeRoom.current_player_idx];
    if (!cp) return;
    const prevId = prevCurrentPlayerIdRef.current;
    prevCurrentPlayerIdRef.current = cp.id;
    if (prevId === undefined || prevId === cp.id) return;
    setTurnAnnounce({
      name: cp.name,
      color: cp.color,
      isMe: cp.id === myPlayerId,
      isBot: cp.is_bot ?? false,
      key: Date.now(),
    });
    playTurnStart();
    const timer = setTimeout(() => setTurnAnnounce(null), 2300);
    return () => clearTimeout(timer);
  }, [(room ?? initialRoom).current_player_idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss the turn announcer as soon as dice start rolling
  useEffect(() => {
    if (diceAnimating) {
      setTimeout(() => setTurnAnnounce(null), 0);
    }
  }, [diceAnimating]);

  // ── Sound effects driven by room state changes ──────────────────────────────
  const prevStatusRef = useRef<string | undefined>(undefined);
  const prevPendingTypeRef = useRef<string | undefined>(undefined);
  const prevPlayerPositionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const activeRoom = room ?? initialRoom;
    const status = activeRoom.status;
    const pendingType = activeRoom.pending_action?.type;

    // Game just started
    if (prevStatusRef.current === 'lobby' && status === 'playing') playGameStart();
    // Game finished
    if (prevStatusRef.current === 'playing' && status === 'finished') playWin();
    prevStatusRef.current = status;

    // Auction started
    if (prevPendingTypeRef.current !== 'auction' && pendingType === 'auction') playAuctionStart();
    // Chest opened
    if (prevPendingTypeRef.current !== 'chest_quiz' && pendingType === 'chest_quiz') playChestOpen();
    // Tax
    if (prevPendingTypeRef.current !== 'income_tax_choice' && pendingType === 'income_tax_choice') playTax();
    // Rent
    if (prevPendingTypeRef.current !== 'pay_rent' && pendingType === 'pay_rent') playRentPaid();
    prevPendingTypeRef.current = pendingType;
  }, [
    (room ?? initialRoom).status,
    (room ?? initialRoom).pending_action?.type,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRoom       = room ?? initialRoom;
  const board            = boardFor(activeRoom);
  const gameSettings     = useMemo(() => normalizeSettings(activeRoom.settings), [activeRoom.settings]);
  const rawPlayers       = players.length > 0 ? players : initialPlayers;
  // Memoize activePlayers to ensure a stable reference unless visual state changes
  const activePlayers    = useMemo(() => {
    return rawPlayers
      .slice().sort((a, b) => a.turn_order - b.turn_order);
  }, [rawPlayers]);

  // Token move sounds — fire once per tile as player position changes
  useEffect(() => {
    activePlayers.forEach((p) => {
      const prev = prevPlayerPositionsRef.current[p.id];
      if (prev !== undefined && prev !== p.position) {
        // Calculate steps moved (wrapping around the board perimeter)
        const steps = (p.position - prev + board.size) % board.size;
        // Stagger a tick sound per step
        for (let s = 0; s < Math.min(steps, 12); s++) {
          const isLast = s === Math.min(steps, 12) - 1;
          setTimeout(() => playTokenMove(isLast), s * 140);
        }
      }
      prevPlayerPositionsRef.current[p.id] = p.position;
    });
  }, [activePlayers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bots participate in auctions: they bid up to ~70% of list price, then withdraw
  useEffect(() => {
    const r = room ?? initialRoom;
    if (r.status !== 'playing') return;
    const pendingA = r.pending_action;
    if (pendingA?.type !== 'auction') return;
    const tile = board.tiles[pendingA.tile_id ?? 0];
    const price = tile?.buyPrice ?? 0;
    if (!price) return;

    const sorted = playersRef.current.slice().sort((a, b) => a.turn_order - b.turn_order);
    const folded = pendingA.folded_ids ?? [];
    const currentBid = pendingA.current_bid ?? 0;
    const actor = sorted.find(
      (p) => p.is_bot && !p.is_bankrupt && !folded.includes(p.id) && p.id !== pendingA.highest_bidder_id,
    );
    if (!actor) return;

    const cap = Math.floor(price * 0.7);
    const nextBid = currentBid + (currentBid < price / 2 ? 25 : 10);
    const timer = setTimeout(() => {
      if (nextBid <= cap && actor.balance >= nextBid) {
        placeBid(r.id, actor.id, nextBid).catch(() => {});
      } else {
        foldAuction(r.id, actor.id).catch(() => {});
      }
    }, 1200 + Math.random() * 1300);
    return () => clearTimeout(timer);
  }, [
    (room ?? initialRoom).pending_action?.type,
    (room ?? initialRoom).pending_action?.current_bid,
    (room ?? initialRoom).pending_action?.highest_bidder_id,
    (room ?? initialRoom).pending_action?.folded_ids?.length,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeProperties = properties.length > 0 ? properties : initialProperties;
  const myPlayer         = activePlayers.find((p) => p.id === myPlayerId) ?? null;
  const currentPlayer    = activePlayers[activeRoom.current_player_idx] ?? null;
  const isMyTurn         = currentPlayer?.id === myPlayerId;

  // Dynamic Tension Engine (Heartbeats + Pad shift)
  useEffect(() => {
    const activeRoom = room ?? initialRoom;
    if (activeRoom.status !== 'playing') {
      setTension(false);
      return;
    }
    
    const isAuction = activeRoom.pending_action?.type === 'auction';
    const cp = currentPlayer;
    const activeIsMyTurn = cp?.id === myPlayerId;
    const isLowBalance = myPlayer ? myPlayer.balance < 200 : false;
    
    // High tension triggers during any auction OR during our turn with critically low funds (<$200)
    setTension(isAuction || (activeIsMyTurn && isLowBalance));
  }, [room, initialRoom, currentPlayer, myPlayerId, myPlayer]);

  async function handleRoll() {
    if (!myPlayer || rollLoading) return;
    playClick();
    setRollLoading(true);
    try { await rollDice(activeRoom.id, myPlayer.id); } catch { /* handled by server action */ }
    finally { setRollLoading(false); }
  }

  async function handleEndTurn() {
    if (!myPlayer || endLoading) return;
    playClick();
    setEndLoading(true);
    try { await endTurn(activeRoom.id, myPlayer.id); } catch { /* handled by server action */ }
    finally { setEndLoading(false); }
  }

  if (activeRoom.status === 'lobby') {
    return <Lobby room={activeRoom} players={activePlayers} myPlayerId={myPlayerId} />;
  }

  if (activeRoom.status === 'finished') {
    return <WinScreen players={activePlayers} properties={activeProperties} tiles={board.tiles} myPlayerId={myPlayerId} />;
  }

  const isAnimating      = diceAnimating || walkingPlayerId !== null || pendingPlayerUpdate !== null;
  const pending          = activeRoom.pending_action;
  const isChestActive    = pending?.type === 'chest_quiz' && !!pending.question && !isAnimating;
  const isChestForMe     = pending?.player_id === myPlayerId;
  const isAuctionActive  = pending?.type === 'auction' && !isAnimating;
  const isBuyOfferActive = pending?.type === 'buy_offer' && isMyTurn && !!myPlayer && !myPlayer.is_bankrupt && pending.tile_id !== undefined && !isAnimating;
  const isTradeActive    = pending?.type === 'trade_offer' && !isAnimating && (
    pending.trade_from_player_id === myPlayerId || pending.trade_to_player_id === myPlayerId
  );
  const currentNeon      = NEON[currentPlayer?.color ?? 'cyan'] ?? 'var(--neon-cyan)';

  const phaseLabel = (() => {
    if (activeRoom.doubles_turn) return 'Doubles — roll again';
    if (activeRoom.turn_phase === 'roll') return 'Roll the dice';
    if (activeRoom.turn_phase === 'rolling') return 'Rolling…';
    if (activeRoom.turn_phase === 'action' && pending?.type === 'buy_offer') {
      return gameSettings.auctionsEnabled ? 'Buy or Auction?' : 'Buy or Pass?';
    }
    if (activeRoom.turn_phase === 'action') return 'Processing…';
    if (activeRoom.turn_phase === 'end') return 'End turn';
    return '';
  })();

  function copyCode() {
    playClick();
    navigator.clipboard.writeText(activeRoom.room_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  const railStyle: React.CSSProperties = {
    background: 'var(--bg-glass-strong)',
    backdropFilter: 'blur(16px) saturate(1.1)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  };

  const overlays = (
    <>
      {turnAnnounce && (
        <TurnAnnouncer
          key={turnAnnounce.key}
          playerName={turnAnnounce.name}
          playerColor={turnAnnounce.color}
          isMe={turnAnnounce.isMe}
          isBot={turnAnnounce.isBot}
          isMobile={isMobile}
        />
      )}
      {isChestActive && myPlayer && (
        <ChestModal room={activeRoom} playerId={myPlayerId} question={pending!.question!} isActivePlayer={isChestForMe} />
      )}
      {isAuctionActive && myPlayer && (
        <AuctionModal
          room={activeRoom}
          players={activePlayers}
          myPlayer={myPlayer}
          tiles={board.tiles}
          onManageProperties={() => setShowProps(true)}
        />
      )}
      {isBuyOfferActive && myPlayer && (
        <BuyOfferModal
          room={activeRoom}
          myPlayer={myPlayer}
          tiles={board.tiles}
          tileId={pending!.tile_id!}
          price={pending!.price ?? 0}
          allProperties={activeProperties}
          auctionsEnabled={gameSettings.auctionsEnabled}
          onManageProperties={() => setShowProps(true)}
        />
      )}
      {pending?.type === 'income_tax_choice' && myPlayer && !isAnimating && (
        <TaxChoiceModal room={activeRoom} myPlayer={myPlayer} />
      )}
      {myPlayer && (isTradeActive || showTrade) && (
        <TradeModal
          room={activeRoom}
          myPlayer={myPlayer}
          allPlayers={activePlayers}
          properties={activeProperties}
          tiles={board.tiles}
          onClose={() => setShowTrade(false)}
        />
      )}
      <TileDetailModal
        room={activeRoom}
        myPlayerId={myPlayerId}
        tile={selectedTile}
        tiles={board.tiles}
        property={selectedTile ? activeProperties.find((p) => p.tile_id === selectedTile.id) : undefined}
        players={activePlayers}
        allProperties={activeProperties}
        onClose={() => setSelectedTile(null)}
      />
      {showProps && myPlayer && (
        <PropertyManager
          room={activeRoom}
          player={myPlayer}
          properties={activeProperties}
          allPlayers={activePlayers}
          tiles={board.tiles}
          onClose={() => setShowProps(false)}
        />
      )}
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="tu-backdrop" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {overlays}

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          borderBottom: '1px solid var(--stroke-hairline)',
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          flexShrink: 0, zIndex: 30,
        }}>
          <TULogo />
          <button
            onClick={copyCode}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 11px',
              background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-pill)',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5,
              color: codeCopied ? 'var(--success)' : 'var(--accent)', letterSpacing: '0.12em',
            }}
          >
            {codeCopied ? '✓ copied' : activeRoom.room_code}
          </button>
          {gameSettings.vacationCash && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 'var(--r-pill)',
              background: 'var(--gold-soft)', border: '1px solid oklch(0.84 0.115 88 / 0.3)',
              fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11.5, color: 'var(--gold)',
            }}>
              <UmbrellaIcon size={11} /> {formatMoney(activeRoom.vacation_pot ?? 0)}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={cycleVolume}
            style={{
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-raised)', border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-md)',
              color: sfxLevel === 'mute' ? 'var(--danger)' : 'var(--text-muted)',
            }}
          >
            <VolumeIcon level={sfxLevel} />
          </button>
        </div>

        {/* Player strip */}
        <div style={{
          display: 'flex', gap: 7, padding: '9px 12px',
          overflowX: 'auto', flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
        }}>
          {activePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              properties={activeProperties}
              tiles={board.tiles}
              isCurrentTurn={currentPlayer?.id === player.id}
              isMe={player.id === myPlayerId}
              compact
            />
          ))}
        </div>

        {/* Board */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}>
          <BoardView
            board={board}
            players={activePlayers}
            properties={activeProperties}
            onTileClick={(id) => setSelectedTile(board.tiles[id])}
            lastDice={lastDiceRoll ?? undefined}
            diceAnimating={diceAnimating}
            isMyTurn={false /* actions live in the dock on mobile */}
            turnPhase={activeRoom.turn_phase}
            currentPlayerName={currentPlayer?.name}
            currentPlayerColor={currentPlayer?.color}
            diceRollerName={diceRollerName ?? undefined}
            diceRollerColor={diceRollerColor}
            doublesRolled={activeRoom.doubles_turn ?? false}
          />
        </div>

        {/* Bottom dock */}
        <div style={{
          flexShrink: 0, zIndex: 30,
          borderTop: '1px solid var(--stroke-hairline)',
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {myPlayer && (
            <ActionPanel
              room={activeRoom}
              myPlayer={myPlayer}
              isMyTurn={isMyTurn && !myPlayer.is_bankrupt}
              properties={activeProperties}
              jailFine={gameSettings.jailFine}
              showTurnActions
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="tu-btn"
              style={{ flex: 1, padding: '9px 10px', fontSize: 13 }}
              disabled={!!pending || !myPlayer || myPlayer.is_bankrupt}
              onClick={() => { playClick(); setShowTrade(true); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Trade
            </button>
            <button
              className="tu-btn"
              style={{ flex: 1, padding: '9px 10px', fontSize: 13 }}
              onClick={() => { playClick(); setShowProps(true); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10h14V10"/>
              </svg>
              Assets
            </button>
            <button
              className="tu-btn"
              style={{ flex: 1, padding: '9px 10px', fontSize: 13 }}
              onClick={() => { playClick(); setShowLogMobile(true); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Log
            </button>
          </div>
        </div>

        {/* Mobile activity sheet */}
        {showLogMobile && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'oklch(0.1 0.02 260 / 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && setShowLogMobile(false)}
          >
            <div
              className="tu-dock-in"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: '62vh',
                background: 'var(--bg-glass-strong)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid var(--stroke-soft)',
                borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
                <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--stroke-strong)' }} />
              </div>
              <EventLog entries={activeRoom.event_log ?? []} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  return (
    <div className="tu-backdrop" style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {overlays}

      {/* ── Left rail: identity + players ── */}
      <div style={{ ...railStyle, width: 268, borderRight: '1px solid var(--stroke-hairline)' }}>
        {/* Logo bar */}
        <div style={{
          padding: '15px 18px 13px',
          borderBottom: '1px solid var(--stroke-hairline)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <TULogo />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Tycoon<span style={{ color: 'var(--accent)' }}>UP</span>
          </span>
        </div>

        {/* Room code */}
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--stroke-hairline)', flexShrink: 0 }}>
          <div style={{ marginBottom: 7, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Room code
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              flex: 1, padding: '8px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--stroke-soft)',
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16,
              color: 'var(--accent)', letterSpacing: '0.16em',
            }}>
              {activeRoom.room_code}
            </div>
            <button
              onClick={copyCode}
              onMouseEnter={() => playHover()}
              className="tu-btn"
              style={{
                padding: '8px 13px', fontSize: 12,
                color: codeCopied ? 'var(--success)' : 'var(--text-secondary)',
                borderColor: codeCopied ? 'oklch(0.78 0.13 155 / 0.45)' : undefined,
              }}
            >
              {codeCopied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Players header */}
        <div style={{ padding: '13px 16px 8px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Players · {activePlayers.length}
          </span>
        </div>

        {/* Players list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {activePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              properties={activeProperties}
              tiles={board.tiles}
              isCurrentTurn={currentPlayer?.id === player.id}
              isMe={player.id === myPlayerId}
            />
          ))}
        </div>
      </div>

      {/* ── Center: the board is the hero ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        {/* Floating status bar */}
        <div style={{
          position: 'absolute',
          top: 14,
          left: 16,
          right: 16,
          zIndex: 35,
          padding: '9px 16px',
          border: '1px solid var(--stroke-soft)',
          borderRadius: 'var(--r-xl)',
          background: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(18px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
          boxShadow: 'var(--shadow-md), inset 0 1px 0 oklch(1 0 0 / 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {/* Turn chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 14px',
            background: isMyTurn ? 'var(--accent-soft)' : 'var(--bg-raised)',
            border: `1px solid ${isMyTurn ? 'oklch(0.80 0.11 168 / 0.4)' : 'var(--stroke-soft)'}`,
            borderRadius: 'var(--r-pill)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: currentNeon,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5,
              color: isMyTurn ? 'var(--accent)' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>
              {isMyTurn ? 'Your turn' : `${currentPlayer?.name ?? '…'}${currentPlayer?.is_bot ? ' · Bot' : ''}`}
            </span>
            {phaseLabel && (
              <>
                <div style={{ width: 1, height: 14, background: 'var(--stroke-soft)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {phaseLabel}
                </span>
              </>
            )}
          </div>

          {/* Vacation pot */}
          {gameSettings.vacationCash && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 13px',
              background: 'var(--gold-soft)',
              border: '1px solid oklch(0.84 0.115 88 / 0.3)',
              borderRadius: 'var(--r-pill)',
              flexShrink: 0,
            }}>
              <span style={{ display: 'flex', color: 'var(--gold)' }}><UmbrellaIcon size={12} /></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--gold)' }}>
                {formatMoney(activeRoom.vacation_pot ?? 0)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                pot
              </span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Volume toggle button */}
          <button
            onClick={cycleVolume}
            onMouseEnter={() => playHover()}
            title={sfxLevel === 'full' ? 'Sound: Full (click to lower)' : sfxLevel === 'half' ? 'Sound: Half (click to mute)' : 'Sound: Muted (click to unmute)'}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: sfxLevel === 'mute' ? 'var(--danger-soft)' : 'var(--bg-raised)',
              border: `1px solid ${sfxLevel === 'mute' ? 'oklch(0.71 0.155 25 / 0.4)' : 'var(--stroke-soft)'}`,
              borderRadius: 'var(--r-md)',
              color: sfxLevel === 'mute' ? 'var(--danger)' : sfxLevel === 'half' ? 'var(--gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            <VolumeIcon level={sfxLevel} />
          </button>
        </div>

        {/* Board area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '54px 16px 16px' }}>
          <BoardView
            board={board}
            players={activePlayers}
            properties={activeProperties}
            onTileClick={(id) => setSelectedTile(board.tiles[id])}
            lastDice={lastDiceRoll ?? undefined}
            diceAnimating={diceAnimating}
            isMyTurn={isMyTurn && !myPlayer?.is_bankrupt}
            turnPhase={activeRoom.turn_phase}
            currentPlayerName={currentPlayer?.name}
            currentPlayerColor={currentPlayer?.color}
            diceRollerName={diceRollerName ?? undefined}
            diceRollerColor={diceRollerColor}
            doublesRolled={activeRoom.doubles_turn ?? false}
            onRoll={handleRoll}
            onEndTurn={handleEndTurn}
            isRollLoading={rollLoading || diceAnimating}
            isEndLoading={endLoading}
          />
        </div>
      </div>

      {/* ── Right rail: wallet, actions, activity ── */}
      <div style={{ ...railStyle, width: 312, borderLeft: '1px solid var(--stroke-hairline)' }}>
        {/* Wallet + contextual actions */}
        {myPlayer && (
          <div style={{ padding: '14px 14px 0', flexShrink: 0 }}>
            <ActionPanel
              room={activeRoom}
              myPlayer={myPlayer}
              isMyTurn={isMyTurn && !myPlayer.is_bankrupt}
              properties={activeProperties}
              jailFine={gameSettings.jailFine}
            />
          </div>
        )}

        {/* Quick actions */}
        {myPlayer && (
          <div style={{ padding: '10px 14px 0', flexShrink: 0, display: 'flex', gap: 8 }}>
            <button
              onClick={() => { playClick(); setShowTrade(true); }}
              onMouseEnter={() => playHover()}
              disabled={!!pending || myPlayer.is_bankrupt}
              className="tu-btn"
              style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Trade
            </button>
            <button
              onClick={() => { playClick(); setShowProps(true); }}
              onMouseEnter={() => playHover()}
              className="tu-btn"
              style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10h14V10"/>
              </svg>
              Assets
            </button>
          </div>
        )}

        {/* Activity feed */}
        <div style={{
          flex: 1,
          margin: '12px 14px 14px',
          background: 'oklch(1 0 0 / 0.015)',
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
