'use client';

import { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { getTileGridPosFor, tileSideFor, type BoardDef } from '@/lib/game-data';
import TileCell from './TileCell';
import ThreeDDice from './ThreeDDice';
import { neonOf } from '@/lib/colors';
import type { Player, Property } from '@/lib/types';

interface BoardViewProps {
  board: BoardDef;
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

// ─── BoardView ────────────────────────────────────────────────────────────────

export default function BoardView({
  board,
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
}: BoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);

  // Board intrinsic size: 2 corners + (gridSize-2) tiles + gaps + padding
  const CORNER_SIZE = 108;
  const TILE_SIZE   = 62;
  const GAP         = 3;
  const PAD         = 10;
  const g           = board.gridSize;
  const BOARD_SIZE  = 2 * CORNER_SIZE + (g - 2) * TILE_SIZE + (g - 1) * GAP + 2 * PAD;

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

  // Roller neon: use diceRollerColor when available, fallback to currentPlayerColor
  const rollerNeon = neonOf(diceRollerColor ?? currentPlayerColor);
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
          gridTemplateColumns: `${CORNER_SIZE}px repeat(${g - 2}, ${TILE_SIZE}px) ${CORNER_SIZE}px`,
          gridTemplateRows: `${CORNER_SIZE}px repeat(${g - 2}, ${TILE_SIZE}px) ${CORNER_SIZE}px`,
          background:
            'radial-gradient(ellipse at 50% 42%, oklch(0.225 0.028 258) 0%, oklch(0.165 0.022 260) 78%, oklch(0.145 0.02 262) 100%)',
          border: '1px solid var(--stroke-soft)',
          borderRadius: 24,
          padding: PAD,
          gap: GAP,
          boxShadow: 'var(--shadow-xl), inset 0 1px 0 oklch(1 0 0 / 0.05), inset 0 0 40px oklch(0 0 0 / 0.22)',
          position: 'relative',
        }}>

          {/* ── Board tiles ── */}
          {board.tiles.map((tile) => {
            const { row, col } = getTileGridPosFor(board, tile.id);
            const side = tileSideFor(board, tile.id);
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
            gridRow: `2 / ${g}`,
            gridColumn: `2 / ${g}`,
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
              transform: 'rotate(-16deg)',
              opacity: 0.02,
              pointerEvents: 'none', userSelect: 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 96, letterSpacing: '-0.06em', color: 'white', whiteSpace: 'nowrap' }}>
                TYCOON<span style={{ color: 'var(--accent)' }}>UP</span>
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
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: rollerNeon }}/>
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
              height: 280, // Stable fixed height (dice + status + button zones)
              zIndex: 1,
              padding: '0 20px',
              textAlign: 'center',
            }}>

              {/* Zone 1: Dice Area (Fixed height) */}
              <div style={{
                height: 118,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 30, // room for the dice to tumble freely
              }}>
                <ThreeDDice n={dice[0]} size={74} spinning={diceAnimating}/>
                <ThreeDDice n={dice[1]} size={74} spinning={diceAnimating}/>
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
                  // Static status while rolling — the spinning dice are motion enough
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: rollerNeon, letterSpacing: '0.18em', textTransform: 'uppercase',
                    }}>
                      Shaking the dice…
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700,
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
                    gap: 7,
                  }}>
                    {lastDice && rollerLabel && (
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10.5,
                        color: 'var(--text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
                      }}>
                        {isMyTurn && turnPhase === 'roll'
                          ? <><span style={{ color: rollerNeon }}>{rollerLabel}</span> rolled — your turn!</>
                          : <><span style={{ color: rollerNeon }}>{rollerLabel}</span> rolled</>}
                      </div>
                    )}
                    {lastDice && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{dice[0]} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>+</span> {dice[1]}</span>
                        <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 20 }}>=</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', color: 'var(--accent)',
                        }}>{diceSum}</span>
                      </div>
                    )}
                    {doublesRolled && lastDice && (
                      <div style={{
                        padding: '3px 11px', borderRadius: 999,
                        background: 'var(--gold-soft)',
                        border: '1px solid oklch(0.84 0.115 88 / 0.4)',
                        fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 10.5,
                        color: 'var(--gold)', letterSpacing: '0.08em',
                      }}>
                        ✦ Doubles — roll again
                      </div>
                    )}
                    {!lastDice && (
                      <>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                          Tycoon<span style={{ color: 'var(--accent)' }}>UP</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
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
                  const isPrimary = showRollBtn || revealedDoubles;
                  return (
                    <button
                      disabled={isRollLoading || isEndLoading}
                      onClick={showRollBtn ? onRoll : onEndTurn}
                      className={`tu-btn ${isPrimary ? 'tu-btn-primary' : ''}`}
                      style={{
                        padding: '13px 28px',
                        fontSize: 15,
                        borderRadius: 'var(--r-lg)',
                        pointerEvents: 'auto',
                      }}
                    >
                      {showRollBtn ? (
                        <>
                          <DiceIcon size={16} color="currentColor"/>
                          {isRollLoading ? 'Rolling…' : 'Roll Dice'}
                        </>
                      ) : (
                        <>
                          <ArrowIcon size={14} color="currentColor"/>
                          {isEndLoading ? 'Ending…' : revealedDoubles ? 'Roll again' : 'End Turn'}
                        </>
                      )}
                    </button>
                  );
                })() : null}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
