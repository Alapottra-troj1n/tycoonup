/* TycoonUP — shared Tile, PlayerCard, panels */

const SET_VAR = {
  americas: 'var(--set-americas)',
  europe: 'var(--set-europe)',
  asia: 'var(--set-asia)',
  mideast: 'var(--set-mideast)',
  africa: 'var(--set-africa)',
  oceania: 'var(--set-oceania)',
  utility: 'var(--set-utility)',
  transit: 'var(--set-transit)'
};

const PLAYER_VAR = {
  cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)',
  lime: 'var(--neon-lime)', amber: 'var(--neon-amber)'
};

// ——— Tile (board square) ———
const Tile = ({ tile, orientation = 'bottom', owner = null, tier = 0, tokens = [], compact = false, highlight = false }) => {
  // orientation: bottom | left | top | right | corner
  const isCorner = tile.type === 'corner';
  const isCountry = tile.type === 'country';
  const isTransit = tile.type === 'transit';
  const isUtility = tile.type === 'utility';
  const isChest = tile.type === 'chest';
  const isSurprise = tile.type === 'surprise';
  const isTax = tile.type === 'tax';

  const ownerColor = owner ? PLAYER_VAR[owner] : null;
  const setColor = isCountry ? SET_VAR[tile.set] : (isTransit ? SET_VAR.transit : isUtility ? SET_VAR.utility : null);

  // Dimensions based on orientation
  const dim = isCorner
    ? { w: 108, h: 108 }
    : (orientation === 'bottom' || orientation === 'top')
      ? { w: 62, h: 108 }
      : { w: 108, h: 62 };

  const rotate = {
    bottom: 0, left: 90, top: 180, right: 270, corner: 0
  }[orientation] || 0;

  // Tile body
  const tileBody = (
    <div style={{
      position: 'relative',
      width: dim.w, height: dim.h,
      background: highlight
        ? 'linear-gradient(180deg, oklch(0.28 0.05 260) 0%, oklch(0.22 0.035 260) 100%)'
        : 'var(--bg-tile)',
      border: highlight
        ? `1px solid ${ownerColor || 'var(--neon-cyan)'}`
        : '1px solid var(--stroke-hairline)',
      borderRadius: isCorner ? 10 : 6,
      overflow: 'hidden',
      boxShadow: highlight ? `0 0 24px ${ownerColor || 'oklch(0.82 0.17 210 / 0.5)'}` : 'none',
      transition: 'all var(--dur-med) var(--ease-out)'
    }}>
      {/* Owner color band on country/transit/utility */}
      {(isCountry || isTransit || isUtility) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 14,
          background: ownerColor
            ? `linear-gradient(180deg, ${ownerColor} 0%, oklch(from ${ownerColor} calc(l - 0.15) c h) 100%)`
            : setColor,
          opacity: ownerColor ? 1 : 0.9,
          boxShadow: ownerColor ? `inset 0 -1px 0 oklch(0 0 0 / 0.3), 0 0 12px ${ownerColor}` : 'inset 0 -1px 0 oklch(0 0 0 / 0.3)'
        }}>
          {/* tier pips */}
          {tier > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              {[...Array(Math.min(tier, 5))].map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, background: 'white', borderRadius: '50%', boxShadow: '0 0 4px white' }}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isCountry && (
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 6px' }}>
          <FlagChip code={tile.flag} size={18} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{tile.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>${tile.price}</div>
        </div>
      )}

      {isTransit && (
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 6px' }}>
          <Icon name="airplane" size={20} color="var(--text-secondary)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>{tile.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>${tile.price}</div>
        </div>
      )}

      {isUtility && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px', gap: 4 }}>
          <Icon name={tile.kind === 'electric' ? 'bolt' : 'drop'} size={22} color={tile.kind === 'electric' ? 'var(--neon-amber)' : 'var(--neon-cyan)'}/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>{tile.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>${tile.price}</div>
        </div>
      )}

      {isChest && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(180deg, oklch(0.82 0.17 75 / 0.2), oklch(0.82 0.17 75 / 0.05))',
            border: '1px solid oklch(0.82 0.17 75 / 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="treasure" size={20} color="var(--neon-amber)"/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Treasure</div>
        </div>
      )}

      {isSurprise && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999,
            background: 'linear-gradient(180deg, oklch(0.72 0.22 350 / 0.25), oklch(0.72 0.22 350 / 0.05))',
            border: '1px solid oklch(0.72 0.22 350 / 0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="question" size={18} color="var(--neon-magenta)"/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Surprise</div>
        </div>
      )}

      {isTax && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }}>
          <Icon name="scale" size={20} color="var(--text-secondary)"/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1 }}>{tile.label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{tile.sub}</div>
        </div>
      )}

      {isCorner && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
          {tile.icon === 'go' && (<>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: 'var(--neon-lime)', letterSpacing: '-0.04em', textShadow: '0 0 16px oklch(0.85 0.2 130 / 0.7)', lineHeight: 1 }}>GO</div>
            <Icon name="arrow" size={18} color="var(--neon-lime)"/>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-secondary)', textAlign: 'center' }}>Collect $200</div>
          </>)}
          {tile.icon === 'jail' && (<>
            <Icon name="lock" size={24} color="var(--neon-magenta)"/>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: 'var(--text-primary)' }}>Prison</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>Just visiting</div>
          </>)}
          {tile.icon === 'vacation' && (<>
            <Icon name="palm" size={22} color="var(--neon-lime)"/>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: 'var(--text-primary)' }}>Vacation</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>$50 held</div>
          </>)}
          {tile.icon === 'prison' && (<>
            <Icon name="ban" size={22} color="var(--neon-rose)"/>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10, color: 'var(--text-primary)', textAlign: 'center' }}>Go to Prison</div>
          </>)}
        </div>
      )}

      {/* Tokens sitting on tile */}
      {tokens.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 4, left: 4, right: 4,
          display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', alignItems: 'center'
        }}>
          {tokens.map((t, i) => (
            <div key={i} style={{ filter: `drop-shadow(0 0 4px ${PLAYER_VAR[t]})` }}>
              <PlayerToken color={t} size={18} glow={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Rotate content within a fixed-size slot for edge orientations — we keep
  // the wrapper pre-rotation so the tile visually "stands up" on that edge.
  // For clarity the caller passes `orientation`; the content is rotated so
  // names read correctly from the player sitting at that edge.
  if (orientation === 'bottom' || orientation === 'corner') {
    return tileBody;
  }
  return (
    <div style={{ width: dim.w, height: dim.h, position: 'relative' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        transformOrigin: 'center center'
      }}>
        {/* inner body is rotated; must swap dim */}
        <div style={{
          width: (orientation === 'left' || orientation === 'right') ? dim.h : dim.w,
          height: (orientation === 'left' || orientation === 'right') ? dim.w : dim.h
        }}>
          {React.cloneElement(tileBody, {}, tileBody.props.children)}
        </div>
      </div>
    </div>
  );
};

// ——— Simplified tile (no rotation wrapper complication) — single horizontal body ———
const TileCard = ({ tile, owner = null, tier = 0, tokens = [], highlight = false, size = 'md' }) => {
  // Standalone vertical tile for the design system + buy modal
  const ownerColor = owner ? PLAYER_VAR[owner] : null;
  const setColor = tile.set ? SET_VAR[tile.set] : (tile.type === 'transit' ? SET_VAR.transit : tile.type === 'utility' ? SET_VAR.utility : null);
  const w = size === 'lg' ? 96 : 62;
  const h = size === 'lg' ? 160 : 108;

  return (
    <div style={{
      width: w, height: h, position: 'relative',
      background: 'var(--bg-tile)',
      border: highlight ? `1px solid ${ownerColor || 'var(--neon-cyan)'}` : '1px solid var(--stroke-hairline)',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: highlight ? `0 0 20px ${ownerColor || 'oklch(0.82 0.17 210 / 0.4)'}` : 'var(--shadow-sm)'
    }}>
      {(tile.type === 'country' || tile.type === 'transit' || tile.type === 'utility') && (
        <div style={{
          height: size === 'lg' ? 22 : 14,
          background: ownerColor
            ? `linear-gradient(180deg, ${ownerColor}, oklch(from ${ownerColor} calc(l - 0.15) c h))`
            : setColor,
          position: 'relative'
        }}>
          {tier > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              {[...Array(Math.min(tier, 5))].map((_, i) => (
                <div key={i} style={{ width: size === 'lg' ? 7 : 5, height: size === 'lg' ? 7 : 5, background: 'white', borderRadius: '50%', boxShadow: '0 0 6px white' }}/>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: size === 'lg' ? 10 : 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: `calc(100% - ${size === 'lg' ? 22 : 14}px)`, gap: 4 }}>
        {tile.type === 'country' && <FlagChip code={tile.flag} size={size === 'lg' ? 28 : 18} />}
        {tile.type === 'transit' && <Icon name="airplane" size={size === 'lg' ? 32 : 20} color="var(--text-secondary)"/>}
        {tile.type === 'utility' && <Icon name={tile.kind === 'electric' ? 'bolt' : 'drop'} size={size === 'lg' ? 32 : 22} color={tile.kind === 'electric' ? 'var(--neon-amber)' : 'var(--neon-cyan)'}/>}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size === 'lg' ? 14 : 10, textAlign: 'center', lineHeight: 1.15, letterSpacing: '-0.01em' }}>{tile.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: size === 'lg' ? 13 : 9, color: 'var(--text-secondary)' }}>${tile.price}</div>
      </div>
    </div>
  );
};

// ——— Player card (sidebar) ———
const PlayerCard = ({ color, name, balance, isTurn, isYou, netWorth }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    background: isTurn ? 'oklch(1 0 0 / 0.04)' : 'transparent',
    border: isTurn ? `1px solid ${PLAYER_VAR[color]}` : '1px solid var(--stroke-hairline)',
    borderRadius: 12,
    position: 'relative',
    boxShadow: isTurn ? `0 0 20px ${PLAYER_VAR[color]}33` : 'none',
    transition: 'all var(--dur-med) var(--ease-out)'
  }}>
    {isTurn && (
      <div style={{
        position: 'absolute', left: -1, top: 12, bottom: 12, width: 3,
        background: PLAYER_VAR[color], borderRadius: 2,
        boxShadow: `0 0 12px ${PLAYER_VAR[color]}`
      }}/>
    )}
    <PlayerToken color={color} size={32} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {isYou && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>you</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>${balance.toLocaleString()}</div>
      </div>
    </div>
  </div>
);

// ——— Glass panel ———
const GlassPanel = ({ children, style = {}, pad = true, ...rest }) => (
  <div {...rest} style={{
    background: 'var(--bg-glass-strong)',
    backdropFilter: 'blur(14px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
    border: '1px solid var(--stroke-soft)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-lg), inset 0 1px 0 oklch(1 0 0 / 0.04)',
    padding: pad ? 18 : 0,
    ...style
  }}>{children}</div>
);

// ——— Button ———
const Button = ({ children, variant = 'primary', size = 'md', icon, color, onClick, disabled, fullWidth, style = {} }) => {
  const pad = size === 'sm' ? '6px 12px' : size === 'lg' ? '14px 22px' : '10px 18px';
  const fs = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const bg = variant === 'primary'
    ? `linear-gradient(180deg, ${color || 'var(--neon-cyan)'} 0%, oklch(from ${color || 'var(--neon-cyan)'} calc(l - 0.1) c h) 100%)`
    : variant === 'ghost' ? 'transparent'
    : variant === 'danger' ? 'linear-gradient(180deg, var(--danger), oklch(from var(--danger) calc(l - 0.1) c h))'
    : 'var(--bg-raised)';
  const col = variant === 'primary' || variant === 'danger' ? 'oklch(0.12 0.02 260)' : 'var(--text-primary)';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: pad, fontSize: fs, fontFamily: 'var(--font-display)', fontWeight: 600,
      letterSpacing: '-0.01em',
      background: bg,
      color: col,
      border: variant === 'ghost' ? '1px solid var(--stroke-soft)' : variant === 'secondary' ? '1px solid var(--stroke-soft)' : 'none',
      borderRadius: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      width: fullWidth ? '100%' : 'auto',
      boxShadow: variant === 'primary' ? `0 0 0 1px oklch(1 0 0 / 0.08), 0 4px 16px ${color || 'var(--neon-cyan)'}55, inset 0 1px 0 oklch(1 0 0 / 0.3)` : 'var(--shadow-sm)',
      transition: 'all var(--dur-fast) var(--ease-out)',
      ...style
    }}>
      {icon && <Icon name={icon} size={fs + 2} color={col}/>}
      {children}
    </button>
  );
};

// ——— Chip / Badge ———
const Chip = ({ children, color = 'cyan', style = {} }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px',
    background: `oklch(from ${PLAYER_VAR[color] || color} l c h / 0.15)`,
    color: PLAYER_VAR[color] || color,
    border: `1px solid oklch(from ${PLAYER_VAR[color] || color} l c h / 0.35)`,
    borderRadius: 999,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    ...style
  }}>{children}</span>
);

Object.assign(window, { Tile, TileCard, PlayerCard, GlassPanel, Button, Chip, PLAYER_VAR, SET_VAR });
