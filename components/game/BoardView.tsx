'use client';

import { useMemo, useRef, useLayoutEffect, useState, useId } from 'react';
import { TILES, getTileGridPos } from '@/lib/game-data';
import TileCell from './TileCell';
import type { Player, Property } from '@/lib/types';

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
  doublesRolled?: boolean;
  onRoll?: () => void;
  onEndTurn?: () => void;
  isRollLoading?: boolean;
  isEndLoading?: boolean;
}

type TileSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

function getTileSide(id: number): TileSide {
  if ([0, 10, 20, 30].includes(id)) return 'corner';
  if (id >= 1  && id <= 9)  return 'bottom';
  if (id >= 11 && id <= 19) return 'left';
  if (id >= 21 && id <= 29) return 'top';
  return 'right';
}

// ─── Die face ────────────────────────────────────────────────────────────────

function DieFace({ n, size = 86, spinning = false }: { n: number; size?: number; spinning?: boolean }) {
  const uid = useId();
  const [display, setDisplay] = useState(n);

  useLayoutEffect(() => {
    if (!spinning) { setDisplay(n); return; }
    let count = 0;
    const iv = setInterval(() => {
      setDisplay(Math.ceil(Math.random() * 6));
      if (++count > 18) clearInterval(iv);
    }, 80);
    return () => clearInterval(iv);
  }, [spinning, n]);

  const dots: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <linearGradient id={`df-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.98 0.005 260)"/>
          <stop offset="1" stopColor="oklch(0.88 0.01 260)"/>
        </linearGradient>
        <filter id={`ds-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="oklch(0 0 0 / 0.25)"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="12"
        fill={`url(#df-${uid})`}
        stroke="oklch(0.7 0.01 260)"
        strokeWidth="0.5"
        filter={`url(#ds-${uid})`}
      />
      {(dots[display] ?? []).map((d, i) => (
        <circle key={i} cx={d[0] * 64} cy={d[1] * 64} r="4.5" fill="oklch(0.15 0.02 260)"/>
      ))}
    </svg>
  );
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
  players,
  properties,
  onTileClick,
  lastDice,
  diceAnimating = false,
  isMyTurn = false,
  turnPhase,
  currentPlayerName,
  currentPlayerColor,
  doublesRolled = false,
  onRoll,
  onEndTurn,
  isRollLoading = false,
  isEndLoading = false,
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
          border: '1px solid var(--stroke-soft)',
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
            return (
              <div key={tile.id} style={{ gridRow: row, gridColumn: col }}>
                <TileCell
                  tile={tile}
                  property={propertyMap.get(tile.id)}
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
            {(diceAnimating && currentPlayerName) && (
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
                  border: `1px solid ${playerNeon}80`,
                  borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: playerNeon,
                  boxShadow: `0 0 20px ${playerNeon}66`,
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: playerNeon, boxShadow: `0 0 6px ${playerNeon}` }}/>
                  {currentPlayerName} rolling
                </div>
              </div>
            )}

            {/* Main center content */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              zIndex: 1,
              padding: '0 20px',
            }}>

              {/* Dice pair */}
              <div style={{ display: 'flex', gap: 18 }}>
                <div style={{ transform: 'rotate(-6deg)', filter: 'drop-shadow(0 6px 20px oklch(0 0 0 / 0.5))' }}>
                  <DieFace n={dice[0]} size={86} spinning={diceAnimating}/>
                </div>
                <div style={{ transform: 'rotate(8deg)', filter: 'drop-shadow(0 6px 20px oklch(0 0 0 / 0.5))' }}>
                  <DieFace n={dice[1]} size={86} spinning={diceAnimating}/>
                </div>
              </div>

              {/* Roll info — hidden while animating */}
              {!diceAnimating && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {currentPlayerName && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase',
                    }}>
                      {currentPlayerName} rolled
                    </div>
                  )}
                  {lastDice && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      <span style={{ color: 'var(--neon-cyan)' }}>{dice[0]}</span>
                      {' '}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>+</span>{' '}
                      <span style={{ color: 'var(--neon-cyan)' }}>{dice[1]}</span>
                      {' '}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>=</span>{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{diceSum}</span>
                    </div>
                  )}
                  {doublesRolled && lastDice && (
                    <div style={{
                      padding: '3px 10px', borderRadius: 999,
                      background: 'oklch(0.76 0.12 72 / 0.14)',
                      border: '1px solid oklch(0.76 0.12 72 / 0.34)',
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--neon-amber)', letterSpacing: '0.08em',
                    }}>
                      Doubles — roll again
                    </div>
                  )}
                  {!lastDice && (
                    <>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                        Tycoon<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                        World Edition
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Action button */}
              {showActionBtn && (
                <button
                  disabled={isRollLoading || isEndLoading}
                  onClick={showRollBtn ? onRoll : onEndTurn}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 28px',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
                    letterSpacing: '-0.01em',
                    background: showRollBtn
                      ? 'linear-gradient(180deg, var(--neon-cyan) 0%, oklch(0.60 0.12 210) 100%)'
                      : doublesRolled
                        ? 'linear-gradient(180deg, var(--neon-lime) 0%, oklch(0.62 0.13 145) 100%)'
                        : 'var(--bg-raised)',
                    color: (showRollBtn || doublesRolled) ? 'oklch(0.12 0.02 260)' : 'var(--text-primary)',
                    border: (showRollBtn || doublesRolled) ? 'none' : '1px solid var(--stroke-soft)',
                    borderRadius: 10,
                    cursor: (isRollLoading || isEndLoading) ? 'not-allowed' : 'pointer',
                    opacity: (isRollLoading || isEndLoading) ? 0.6 : 1,
                    boxShadow: showRollBtn
                      ? '0 0 0 1px oklch(1 0 0 / 0.08), 0 3px 10px oklch(0.76 0.12 210 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.2)'
                      : doublesRolled
                        ? '0 0 0 1px oklch(1 0 0 / 0.08), 0 3px 10px oklch(0.77 0.13 145 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.2)'
                        : 'var(--shadow-sm)',
                    transition: 'all var(--dur-fast) var(--ease-out)',
                    marginTop: 8,
                    pointerEvents: 'auto',
                  }}
                >
                  {showRollBtn ? (
                    <>
                      <DiceIcon size={16} color="oklch(0.12 0.02 260)"/>
                      {isRollLoading ? 'Rolling…' : 'Roll Dice'}
                    </>
                  ) : (
                    <>
                      <ArrowIcon size={14} color={doublesRolled ? 'oklch(0.12 0.02 260)' : 'var(--text-primary)'}/>
                      {isEndLoading ? 'Ending…' : doublesRolled ? 'Roll again (doubles)' : 'End Turn'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
