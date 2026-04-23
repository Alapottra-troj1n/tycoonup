/* TycoonUP — Board renderer (11x11 grid, tiles upright, band faces inward) */

const tilePos = (i) => {
  if (i <= 10) return { row: 10, col: 10 - i, orient: 'bottom' };
  if (i <= 20) return { row: 20 - i, col: 0, orient: 'left' };
  if (i <= 30) return { row: 0, col: i - 20, orient: 'top' };
  return { row: i - 30, col: 10, orient: 'right' };
};

const BoardTile = ({ tile, pos, owner = null, tier = 0, tokens = [], highlight = false, onClick }) => {
  const isCorner = tile.type === 'corner';
  // Corners need to anchor at the physical corners of the 11×11 grid.
  // Bottom-right corner (GO) is at pos {row:10, col:10}; the BoardTile cell occupies row 10, col 10.
  // For top-right corner (i=20), pos is {row:0, col:10} — occupies row 0, col 10.
  // For top-left corner (i=20 is left, wait no): i=30 is top-right. Actually pos.row/col already point to correct TL anchor.
  // We just need corners to occupy 1 cell (the corner cell itself is already 108×108 in the grid). No span needed.
  const colSpan = 1;
  const rowSpan = 1;
  const isHorizontalEdge = pos.orient === 'left' || pos.orient === 'right';

  return (
    <div
      onClick={onClick}
      style={{
        gridRow: `${pos.row + 1} / span ${rowSpan}`,
        gridColumn: `${pos.col + 1} / span ${colSpan}`,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%'
      }}
    >
      <div style={{
        width: isCorner ? 108 : (isHorizontalEdge ? 108 : 62),
        height: isCorner ? 108 : (isHorizontalEdge ? 62 : 108),
      }}>
        <TileBody tile={tile} owner={owner} tier={tier} tokens={tokens} highlight={highlight} isCorner={isCorner} orient={pos.orient}/>
      </div>
    </div>
  );
};

const TileBody = ({ tile, owner, tier, tokens, highlight, isCorner, orient = 'bottom' }) => {
  const ownerColor = owner ? PLAYER_VAR[owner] : null;
  const setColor = tile.type === 'country' ? SET_VAR[tile.set] : tile.type === 'transit' ? SET_VAR.transit : tile.type === 'utility' ? SET_VAR.utility : null;
  const bandHeight = 14;
  const isHorizontal = orient === 'left' || orient === 'right';

  // Band faces INWARD (toward board center).
  // bottom row → band on top; top row → band on bottom; left col → band on right; right col → band on left.
  const bandPos = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' }[orient] || 'top';
  const bandStyle = (() => {
    const base = { position: 'absolute' };
    if (bandPos === 'top') return { ...base, top: 0, left: 0, right: 0, height: bandHeight };
    if (bandPos === 'bottom') return { ...base, bottom: 0, left: 0, right: 0, height: bandHeight };
    if (bandPos === 'left') return { ...base, top: 0, bottom: 0, left: 0, width: bandHeight };
    return { ...base, top: 0, bottom: 0, right: 0, width: bandHeight };
  })();

  // Content area insets — leave room for band on the inward side.
  const contentInset = {
    top: bandPos === 'top' ? bandHeight + 4 : 4,
    bottom: bandPos === 'bottom' ? bandHeight + 4 : 4,
    left: bandPos === 'left' ? bandHeight + 4 : 4,
    right: bandPos === 'right' ? bandHeight + 4 : 4,
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: highlight
        ? 'linear-gradient(180deg, oklch(0.30 0.06 260) 0%, oklch(0.22 0.035 260) 100%)'
        : 'var(--bg-tile)',
      border: highlight ? `1.5px solid ${ownerColor || 'var(--neon-cyan)'}` : '1px solid var(--stroke-hairline)',
      borderRadius: isCorner ? 10 : 6,
      overflow: 'hidden',
      boxShadow: highlight ? `0 0 26px ${ownerColor || 'oklch(0.82 0.17 210 / 0.55)'}` : 'none',
      transition: 'all var(--dur-med) var(--ease-out)'
    }}>
      {(tile.type === 'country' || tile.type === 'transit' || tile.type === 'utility') && (
        <div style={{
          ...bandStyle,
          background: ownerColor
            ? `linear-gradient(${bandPos === 'top' ? 180 : bandPos === 'bottom' ? 0 : bandPos === 'left' ? 90 : -90}deg, ${ownerColor}, oklch(from ${ownerColor} calc(l - 0.15) c h))`
            : setColor,
          boxShadow: ownerColor ? `0 0 10px ${ownerColor}88` : 'none'
        }}>
          {tier > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexDirection: isHorizontal ? 'column' : 'row' }}>
              {[...Array(Math.min(tier, 5))].map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, background: 'white', borderRadius: '50%', boxShadow: '0 0 4px white' }}/>
              ))}
            </div>
          )}
        </div>
      )}

      {tile.type === 'country' && (
        <div style={{
          position: 'absolute',
          top: contentInset.top, bottom: contentInset.bottom, left: contentInset.left, right: contentInset.right,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 6px', gap: 4
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>${tile.price}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1, letterSpacing: '-0.01em', flex: isHorizontal ? 1 : 'none' }}>{tile.name}</div>
          <FlagChip code={tile.flag} size={14} />
        </div>
      )}
      {tile.type === 'transit' && (
        <div style={{
          position: 'absolute',
          top: contentInset.top, bottom: contentInset.bottom, left: contentInset.left, right: contentInset.right,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 6px', gap: 4
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>${tile.price}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1, flex: isHorizontal ? 1 : 'none' }}>{tile.name}</div>
          <Icon name="airplane" size={16} color="var(--text-secondary)"/>
        </div>
      )}
      {tile.type === 'utility' && (
        <div style={{
          position: 'absolute',
          top: contentInset.top, bottom: contentInset.bottom, left: contentInset.left, right: contentInset.right,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4
        }}>
          <Icon name={tile.kind === 'electric' ? 'bolt' : 'drop'} size={20} color={tile.kind === 'electric' ? 'var(--neon-amber)' : 'var(--neon-cyan)'}/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>{tile.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>${tile.price}</div>
        </div>
      )}
      {tile.type === 'chest' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(180deg, oklch(0.82 0.17 75 / 0.25), oklch(0.82 0.17 75 / 0.05))', border: '1px solid oklch(0.82 0.17 75 / 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="treasure" size={18} color="var(--neon-amber)"/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Treasure</div>
        </div>
      )}
      {tile.type === 'surprise' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(180deg, oklch(0.72 0.22 350 / 0.3), oklch(0.72 0.22 350 / 0.06))', border: '1px solid oklch(0.72 0.22 350 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="question" size={16} color="var(--neon-magenta)"/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Surprise</div>
        </div>
      )}
      {tile.type === 'tax' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }}>
          <Icon name="scale" size={18} color="var(--text-secondary)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>{tile.label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{tile.sub}</div>
        </div>
      )}
      {tile.type === 'corner' && tile.icon === 'go' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, color: 'var(--neon-lime)', letterSpacing: '-0.04em', textShadow: '0 0 18px oklch(0.85 0.2 130 / 0.8)', lineHeight: 1 }}>GO</div>
          <Icon name="arrow" size={18} color="var(--neon-lime)"/>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center' }}>Collect $200</div>
        </div>
      )}
      {tile.type === 'corner' && tile.icon === 'jail' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="lock" size={26} color="var(--neon-magenta)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>Prison</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>Just visiting</div>
        </div>
      )}
      {tile.type === 'corner' && tile.icon === 'vacation' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="palm" size={24} color="var(--neon-lime)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>Vacation</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>$50 held</div>
        </div>
      )}
      {tile.type === 'corner' && tile.icon === 'prison' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
          <Icon name="ban" size={24} color="var(--neon-rose)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, textAlign: 'center' }}>Go to Prison</div>
        </div>
      )}

      {tokens.length > 0 && (
        <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxHeight: 18, overflow: 'hidden' }}>
          {tokens.slice(0, 4).map((t, i) => (
            <div key={i} style={{ filter: `drop-shadow(0 0 3px ${PLAYER_VAR[t]})` }}>
              <PlayerToken color={t} size={14} glow={false}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ——— Board ———
const Board = ({ ownership = {}, tiers = {}, tokens = {}, highlight = null, onTileClick, scale = 1 }) => {
  return (
    <div style={{ width: 760 * scale, height: 760 * scale, position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 760, height: 760,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        display: 'grid',
        gridTemplateColumns: '108px repeat(9, 62px) 108px',
        gridTemplateRows: '108px repeat(9, 62px) 108px',
        background: 'radial-gradient(ellipse at center, oklch(0.2 0.03 260) 0%, oklch(0.14 0.02 260) 100%)',
        border: '1px solid var(--stroke-soft)',
        borderRadius: 18,
        padding: 6,
        gap: 2,
        boxShadow: 'var(--shadow-xl), inset 0 0 80px oklch(0 0 0 / 0.4)',
        position: 'relative'
      }}>
        {BOARD_TILES.map(tile => {
          const pos = tilePos(tile.id);
          return (
            <BoardTile
              key={tile.id}
              tile={tile}
              pos={pos}
              owner={ownership[tile.id]}
              tier={tiers[tile.id] || 0}
              tokens={tokens[tile.id] || []}
              highlight={highlight === tile.id}
              onClick={onTileClick ? () => onTileClick(tile) : undefined}
            />
          );
        })}

        <div style={{
          gridRow: '2 / 11', gridColumn: '2 / 11',
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, oklch(0.18 0.025 260) 0%, transparent 70%)'
        }}>
          <BoardCenter />
        </div>
      </div>
    </div>
  );
};

const BoardCenter = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: 'rotate(-18deg)',
      opacity: 0.04,
      pointerEvents: 'none'
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 140, letterSpacing: '-0.06em', color: 'white' }}>TYCOON<span style={{ color: 'var(--neon-cyan)' }}>UP</span></div>
    </div>

    <div style={{ display: 'flex', gap: 18, zIndex: 1 }}>
      <div style={{ transform: 'rotate(-6deg)', filter: 'drop-shadow(0 6px 20px oklch(0 0 0 / 0.5))' }}>
        <DieFace n={5} size={86}/>
      </div>
      <div style={{ transform: 'rotate(8deg)', filter: 'drop-shadow(0 6px 20px oklch(0 0 0 / 0.5))' }}>
        <DieFace n={3} size={86}/>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Turn 14 · Zenith rolled</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
        <span style={{ color: 'var(--neon-cyan)' }}>5</span> <span style={{ color: 'var(--text-muted)' }}>+</span> <span style={{ color: 'var(--neon-cyan)' }}>3</span> <span style={{ color: 'var(--text-muted)' }}>=</span> <span style={{ fontFamily: 'var(--font-mono)' }}>8</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Landed on <b style={{ color: 'var(--neon-magenta)' }}>Tokyo</b> · your property</div>
    </div>

    <Button variant="primary" size="lg" icon="dice" style={{ marginTop: 8 }}>Roll to continue</Button>
  </div>
);

Object.assign(window, { Board });
