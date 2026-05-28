'use client';

import { useMemo, useRef, useLayoutEffect, useState, useId } from 'react';
import { TILES, getTileGridPos } from '@/lib/game-data';
import TileCell from './TileCell';
import ThreeDDice from './ThreeDDice';
import { renderMascotSVG } from './PlayerMascot';
import type { Player, Property, EventLogEntry } from '@/lib/types';

interface BoardViewProps {
  players: Player[];
  properties: Property[];
  onTileClick?: (tileId: number) => void;
  // Board center game state (all optional — backward compatible)
  lastDice?: [number, number];
  diceAnimating?: boolean;
  isMyTurn?: boolean;
  turnPhase?: string;
  currentPlayerName?: string;
  currentPlayerColor?: string;
  diceRollerName?: string;   // who actually last rolled
  diceRollerColor?: string;  // their color
  doublesRolled?: boolean;
  onRoll?: () => void;
  onEndTurn?: () => void;
  isRollLoading?: boolean;
  isEndLoading?: boolean;
  eventLog?: EventLogEntry[];
}

type TileSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

function getTileSide(id: number): TileSide {
  if ([0, 10, 20, 30].includes(id)) return 'corner';
  if (id >= 1  && id <= 9)  return 'bottom';
  if (id >= 11 && id <= 19) return 'left';
  if (id >= 21 && id <= 29) return 'top';
  return 'right';
}

// ─── Dice icon (for Roll button) ──────────────────────────────────────────────

function DiceIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <circle cx="8"  cy="8"  r="1.2" fill={color} stroke="none"/>
      <circle cx="16" cy="8"  r="1.2" fill={color} stroke="none"/>
      <circle cx="12" cy="12" r="1.2" fill={color} stroke="none"/>
      <circle cx="8"  cy="16" r="1.2" fill={color} stroke="none"/>
      <circle cx="16" cy="16" r="1.2" fill={color} stroke="none"/>
    </svg>
  );
}

function ArrowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

const TYPE_COLORS: Record<string, string> = {
  move:   'var(--text-muted)',
  buy:    'var(--success)',
  rent:   'var(--neon-amber)',
  tax:    'var(--danger)',
  chest:  'var(--neon-cyan)',
  event:  'var(--neon-magenta)',
  jail:   'var(--neon-violet)',
  system: 'var(--text-faint)',
};

function renderParsedMessage(message: string, players: Player[]) {
  if (!message) return null;
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = players.map(p => escapeRegExp(p.name)).filter(Boolean);
  if (names.length === 0) return <span>{message}</span>;
  
  const regex = new RegExp(`(${names.join('|')})`, 'g');
  const parts = message.split(regex);
  
  return (
    <span style={{ display: 'inline', alignItems: 'center', flexWrap: 'wrap', lineHeight: 1.4 }}>
      {parts.map((part, idx) => {
        const player = players.find(p => p.name === part);
        if (player) {
          return (
            <span 
              key={idx} 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 3, 
                fontWeight: 600,
                verticalAlign: 'middle',
              }}
            >
              <span 
                style={{ 
                  display: 'inline-block',
                  width: 13, 
                  height: 13, 
                  borderRadius: '50%',
                  border: '1px solid oklch(1 0 0 / 0.8)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  verticalAlign: 'middle',
                  background: '#11131e',
                  transform: 'translateY(-1px)'
                }}
              >
                {renderMascotSVG(player.color)}
              </span>
              <span style={{ color: `var(--neon-${player.color})` }}>{player.name}</span>
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

// ─── BoardView ────────────────────────────────────────────────────────────────

export default function BoardView({
  players,
  properties,
  onTileClick,
  lastDice,
  diceAnimating = false,
  isMyTurn = false,
  turnPhase,
  currentPlayerName,
  currentPlayerColor,
  diceRollerName,
  diceRollerColor,
  doublesRolled = false,
  onRoll,
  onEndTurn,
  isRollLoading = false,
  isEndLoading = false,
  eventLog = [],
}: BoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);

  // Board intrinsic: 2 corners (108px) + 9 tiles (62px) + 10 gaps (2px) + 2×6px padding
  const BOARD_SIZE  = 760;
  const CORNER_SIZE = 108;
  const TILE_SIZE   = 62;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const avail = Math.min(width - 4, height - 4);
      if (avail <= 0) return;
      const s = Math.max(0.35, Math.min(1, avail / BOARD_SIZE));
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const propertyMap = useMemo(() => {
    const m = new Map<number, Property>();
    properties.forEach((p) => m.set(p.tile_id, p));
    return m;
  }, [properties]);

  const playersOnTile = useMemo(() => {
    const m = new Map<number, Player[]>();
    players.forEach((p) => {
      if (!p.is_bankrupt) {
        const list = m.get(p.position) ?? [];
        list.push(p);
        m.set(p.position, list);
      }
    });
    return m;
  }, [players]);

  const dice = lastDice ?? [5, 3];
  const diceSum = dice[0] + dice[1];

  // Player token color → CSS variable
  const NEON: Record<string, string> = {
    cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)', lime: 'var(--neon-lime)',
    amber: 'var(--neon-amber)', violet: 'var(--neon-violet)', rose: 'var(--neon-rose)',
  };
  const playerNeon = NEON[currentPlayerColor ?? ''] ?? 'var(--neon-cyan)';
  // Roller neon: use diceRollerColor when available, fallback to currentPlayerColor
  const rollerNeon = NEON[diceRollerColor ?? currentPlayerColor ?? ''] ?? 'var(--neon-cyan)';
  // The label for who rolled — prefer diceRollerName, fallback to currentPlayerName
  const rollerLabel = diceRollerName ?? currentPlayerName;

  // Which action button to show in board center
  const showRollBtn   = isMyTurn && turnPhase === 'roll'  && !!onRoll;
  const showEndBtn    = isMyTurn && turnPhase === 'end'   && !!onEndTurn;
  const showActionBtn = showRollBtn || showEndBtn;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {/* Outer container sized to scaled board */}
      <div style={{ width: BOARD_SIZE * scale, height: BOARD_SIZE * scale, position: 'relative', flexShrink: 0 }}>
        {/* Inner board at intrinsic 760px, scaled down */}
        <div style={{
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          display: 'grid',
          gridTemplateColumns: `${CORNER_SIZE}px repeat(9, ${TILE_SIZE}px) ${CORNER_SIZE}px`,
          gridTemplateRows: `${CORNER_SIZE}px repeat(9, ${TILE_SIZE}px) ${CORNER_SIZE}px`,
          background: 'radial-gradient(ellipse at center, oklch(0.22 0.025 255) 0%, oklch(0.15 0.018 255) 100%)',
          borderRadius: 18,
          padding: 6,
          gap: 2,
          boxShadow: 'var(--shadow-xl), inset 0 0 80px oklch(0 0 0 / 0.4)',
          position: 'relative',
        }}>

          {/* ── Board tiles ── */}
          {TILES.map((tile) => {
            const { row, col } = getTileGridPos(tile.id);
            const side = getTileSide(tile.id);
            const isCorner = side === 'corner';
            const property = propertyMap.get(tile.id);
            const owner = property?.owner_id ? players.find((p) => p.id === property.owner_id) : undefined;
            return (
              <div key={tile.id} style={{ gridRow: row, gridColumn: col }}>
                <TileCell
                  tile={tile}
                  property={property}
                  owner={owner}
                  playersOnTile={playersOnTile.get(tile.id) ?? []}
                  isCorner={isCorner}
                  side={side}
                  onClick={() => onTileClick?.(tile.id)}
                />
              </div>
            );
          })}

          {/* ── Board center ── */}
          <div style={{
            gridRow: '2 / 11',
            gridColumn: '2 / 11',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {/* Watermark */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: 'rotate(-18deg)',
              opacity: 0.04,
              pointerEvents: 'none', userSelect: 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 140, letterSpacing: '-0.06em', color: 'white', whiteSpace: 'nowrap' }}>
                TYCOON<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
              </div>
            </div>

            {/* "Player rolling" badge — top of center, absolutely positioned */}
            {(diceAnimating && rollerLabel) && (
              <div style={{
                position: 'absolute',
                top: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px',
                  background: 'oklch(0.21 0.024 255 / 0.92)',
                  border: `1px solid ${rollerNeon}80`,
                  borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: rollerNeon,
                  boxShadow: `0 0 20px ${rollerNeon}66`,
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: rollerNeon, boxShadow: `0 0 6px ${rollerNeon}` }}/>
                  {rollerLabel} rolling
                </div>
              </div>
            )}

            {/* Main center content — Perfectly stabilized to prevent layout shifts */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: 430, // Stable fixed height for the entire center column
              zIndex: 1,
              padding: '0 20px',
              textAlign: 'center',
            }}>

              {/* Zone 1: Dice Area (Fixed height) */}
              <div style={{
                height: 110,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24, // slightly larger gap for 3D dice to tumble freely
              }}>
                <div style={{ filter: 'drop-shadow(0 8px 24px oklch(0 0 0 / 0.55))' }}>
                  <ThreeDDice n={dice[0]} size={76} spinning={diceAnimating}/>
                </div>
                <div style={{ filter: 'drop-shadow(0 8px 24px oklch(0 0 0 / 0.55))' }}>
                  <ThreeDDice n={dice[1]} size={76} spinning={diceAnimating}/>
                </div>
              </div>

              {/* Zone 2: Status & Info Area (Fixed height) */}
              <div style={{
                height: 90,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
                {diceAnimating ? (
                  // Pulse status while rolling to reassure the player and prevent empty space
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      animation: 'tu-pulse 1.4s ease-in-out infinite',
                    }}
                  >
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: rollerNeon, letterSpacing: '0.2em', textTransform: 'uppercase',
                    }}>
                      Shaking the dice...
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
                      color: 'var(--text-secondary)', letterSpacing: '-0.02em',
                    }}>
                      Let &apos;em roll!
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}>
                    {lastDice && rollerLabel && (
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9.5,
                        color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase',
                      }}>
                        {isMyTurn && turnPhase === 'roll'
                          ? <><span style={{ color: rollerNeon }}>{rollerLabel}</span> rolled — now it&apos;s your turn!</>
                          : <><span style={{ color: rollerNeon }}>{rollerLabel}</span> rolled</>}
                      </div>
                    )}
                    {lastDice && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
                        <span style={{ color: 'var(--neon-cyan)' }}>{dice[0]}</span>
                        {' '}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>+</span>{' '}
                        <span style={{ color: 'var(--neon-cyan)' }}>{dice[1]}</span>
                        {' '}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>=</span>{' '}
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{diceSum}</span>
                      </div>
                    )}
                    {doublesRolled && lastDice && (
                      <div style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: 'oklch(0.76 0.12 72 / 0.14)',
                        border: '1px solid oklch(0.76 0.12 72 / 0.34)',
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: 'var(--neon-amber)', letterSpacing: '0.08em',
                      }}>
                        Doubles — roll again
                      </div>
                    )}
                    {!lastDice && (
                      <>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                          Tycoon<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                          World Edition
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Zone 3: Action Button Area (Fixed height) */}
              <div style={{
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {showActionBtn ? (() => {
                  const revealedDoubles = doublesRolled && !diceAnimating;
                  return (
                    <button
                      disabled={isRollLoading || isEndLoading}
                      onClick={showRollBtn ? onRoll : onEndTurn}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 20px',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5,
                        letterSpacing: '-0.01em',
                        background: showRollBtn
                          ? 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(0.60 0.12 210) 100%)'
                          : revealedDoubles
                            ? 'linear-gradient(180deg, var(--neon-lime) 0%, oklch(0.62 0.13 145) 100%)'
                            : 'var(--bg-raised)',
                        color: (showRollBtn || revealedDoubles) ? 'oklch(0.12 0.02 260)' : 'var(--text-primary)',
                        border: (showRollBtn || revealedDoubles) ? 'none' : '1px solid var(--stroke-soft)',
                        borderRadius: 8,
                        cursor: (isRollLoading || isEndLoading) ? 'not-allowed' : 'pointer',
                        opacity: (isRollLoading || isEndLoading) ? 0.6 : 1,
                        boxShadow: showRollBtn
                          ? '0 0 0 1px oklch(1 0 0 / 0.08), 0 3px 10px oklch(0.76 0.12 210 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.2)'
                          : revealedDoubles
                            ? '0 0 0 1px oklch(1 0 0 / 0.08), 0 3px 10px oklch(0.77 0.13 145 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.2)'
                            : 'var(--shadow-sm)',
                        transition: 'all var(--dur-fast) var(--ease-out)',
                        pointerEvents: 'auto',
                      }}
                    >
                      {showRollBtn ? (
                        <>
                          <DiceIcon size={14} color="oklch(0.12 0.02 260)"/>
                          {isRollLoading ? 'Rolling…' : 'Roll Dice'}
                        </>
                      ) : (
                        <>
                          <ArrowIcon size={12} color={revealedDoubles ? 'oklch(0.12 0.02 260)' : 'var(--text-primary)'}/>
                          {isEndLoading ? 'Ending…' : revealedDoubles ? 'Roll again (doubles)' : 'End Turn'}
                        </>
                      )}
                    </button>
                  );
                })() : null}
              </div>

              {/* Zone 4: Recent Activities (Fixed height, tracks map landing/events in the center) */}
              <div style={{
                height: 150,
                width: '100%',
                maxWidth: 400,
                marginTop: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '10px 14px',
                borderRadius: 'var(--r-lg)',
                background: 'oklch(0.17 0.020 255 / 0.40)',
                border: '1px solid var(--stroke-hairline)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                overflow: 'hidden',
                textAlign: 'left',
                justifyContent: 'flex-start',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-faint)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--stroke-hairline)',
                  paddingBottom: 4,
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  userSelect: 'none',
                }}>
                  <span>Recent Activity</span>
                  <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 4px var(--neon-cyan)' }} />
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  overflow: 'hidden',
                  flex: 1,
                }}>
                  {eventLog.slice(-4).map((entry) => (
                    <div 
                      key={entry.id} 
                      style={{ 
                        fontSize: 10.5, 
                        color: TYPE_COLORS[entry.type] ?? 'var(--text-secondary)',
                        fontFamily: 'var(--font-display)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {renderParsedMessage(entry.message, players)}
                    </div>
                  ))}
                  {eventLog.length === 0 && (
                    <div style={{ 
                      fontSize: 10, 
                      color: 'var(--text-faint)', 
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'center',
                      paddingTop: 24,
                      userSelect: 'none',
                    }}>
                      Waiting for actions...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
