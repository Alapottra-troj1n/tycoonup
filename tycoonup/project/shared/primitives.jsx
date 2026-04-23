/* TycoonUP — shared SVG primitives & data (no imports, exposes to window) */

// ——— Logo ———
const TULogo = ({ size = 28, label = true }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="tu-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.85 0.2 130)" />
          <stop offset="0.5" stopColor="oklch(0.82 0.17 210)" />
          <stop offset="1" stopColor="oklch(0.72 0.22 350)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="oklch(0.22 0.03 260)" stroke="url(#tu-g)" strokeWidth="1.5"/>
      <path d="M9 10 L23 10 M16 10 L16 22" stroke="url(#tu-g)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="23.5" cy="9" r="1.6" fill="oklch(0.85 0.2 130)" />
    </svg>
    {label && (
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: Math.round(size * 0.64),
        letterSpacing: '-0.02em', color: 'var(--text-primary)'
      }}>
        Tycoon<span style={{ color: 'var(--neon-cyan)' }}>UP</span>
      </span>
    )}
  </div>
);

// ——— Player token (smiley orb) ———
const PlayerToken = ({ color = 'cyan', size = 36, glow = true, title }) => {
  const map = {
    cyan: 'var(--neon-cyan)', magenta: 'var(--neon-magenta)',
    lime: 'var(--neon-lime)', amber: 'var(--neon-amber)',
    violet: 'var(--neon-violet)', rose: 'var(--neon-rose)'
  };
  const c = map[color] || color;
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label={title}>
      <defs>
        <radialGradient id={`g-${id}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.35" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      {glow && <circle cx="20" cy="20" r="18" fill={c} opacity="0.25" filter="blur(6px)" />}
      <circle cx="20" cy="20" r="14" fill={`url(#g-${id})`} stroke="oklch(0 0 0 / 0.3)" strokeWidth="0.5" />
      {/* eyes */}
      <ellipse cx="15.5" cy="18" rx="1.5" ry="2" fill="oklch(0.1 0.02 260)" />
      <ellipse cx="24.5" cy="18" rx="1.5" ry="2" fill="oklch(0.1 0.02 260)" />
      {/* smile */}
      <path d="M15 23 Q20 26 25 23" stroke="oklch(0.1 0.02 260)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      {/* specular */}
      <ellipse cx="14.5" cy="14.5" rx="2.5" ry="1.6" fill="white" opacity="0.55" />
    </svg>
  );
};

// ——— Flag chip (simplified stripes, recognizable but original) ———
const FLAGS = {
  US: { stripes: ['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'], canton: '#3C3B6E', stars: true },
  UK: { cross: true, bg: '#012169', cross1: '#FFFFFF', cross2: '#C8102E' },
  FR: { bars: ['#0055A4', '#FFFFFF', '#EF4135'], vertical: true },
  JP: { circle: '#BC002D', bg: '#FFFFFF' },
  CN: { bg: '#DE2910', star: '#FFDE00' },
  BR: { diamond: true, bg: '#009C3B', inner: '#FFDF00', center: '#002776' },
  IT: { bars: ['#009246', '#FFFFFF', '#CE2B37'], vertical: true },
  DE: { stripes: ['#000000', '#DD0000', '#FFCE00'] },
  AE: { stripes: ['#00732F', '#FFFFFF', '#000000'], hoist: '#FF0000' },
  SG: { stripes: ['#EF3340', '#FFFFFF'], crescent: true },
  IN: { stripes: ['#FF9933', '#FFFFFF', '#138808'], wheel: '#000080' },
  AU: { cross: true, bg: '#012169', cross1: '#FFFFFF', cross2: '#C8102E', stars: true },
  KR: { circle: 'half', bg: '#FFFFFF' },
  ZA: { za: true },
  CA: { bars: ['#FF0000', '#FFFFFF', '#FF0000'], vertical: true, leaf: true },
  MX: { bars: ['#006847', '#FFFFFF', '#CE1126'], vertical: true },
  ES: { stripes: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'] },
  NL: { stripes: ['#AE1C28', '#FFFFFF', '#21468B'] },
  CH: { cross: 'plus', bg: '#FF0000', cross1: '#FFFFFF' },
  TR: { bg: '#E30A17', crescent: true }
};

const FlagChip = ({ code, size = 18, round = true }) => {
  const f = FLAGS[code] || FLAGS.US;
  const w = size * 1.4, h = size;
  const id = React.useId();
  return (
    <svg width={w} height={h} viewBox={`0 0 28 20`} style={{
      borderRadius: round ? 4 : 2,
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 0.5px oklch(0 0 0 / 0.4)',
      display: 'block'
    }}>
      <defs>
        <clipPath id={`clip-${id}`}><rect width="28" height="20" rx={round ? 2 : 0}/></clipPath>
      </defs>
      <g clipPath={`url(#clip-${id})`}>
        <rect width="28" height="20" fill={f.bg || '#222'} />
        {f.stripes && !f.vertical && f.stripes.map((c, i) => (
          <rect key={i} y={(20 / f.stripes.length) * i} width="28" height={20 / f.stripes.length} fill={c} />
        ))}
        {f.bars && f.vertical && f.bars.map((c, i) => (
          <rect key={i} x={(28 / f.bars.length) * i} width={28 / f.bars.length} height="20" fill={c} />
        ))}
        {f.canton && <rect width="11" height="11" fill={f.canton} />}
        {f.canton && f.stars && (
          <g fill="white" fontSize="3">
            {[...Array(9)].map((_, i) => <circle key={i} cx={1 + (i % 3) * 3.5} cy={2 + Math.floor(i / 3) * 3.5} r="0.6"/>)}
          </g>
        )}
        {f.cross && !f.stars && (<>
          <path d="M0 0 L28 20 M28 0 L0 20" stroke={f.cross1} strokeWidth="3"/>
          <path d="M14 0 L14 20 M0 10 L28 10" stroke={f.cross1} strokeWidth="5"/>
          <path d="M14 0 L14 20 M0 10 L28 10" stroke={f.cross2} strokeWidth="3"/>
        </>)}
        {f.cross === 'plus' && (<>
          <rect x="11" y="4" width="6" height="12" fill={f.cross1}/>
          <rect x="5" y="7" width="18" height="6" fill={f.cross1}/>
        </>)}
        {f.circle && f.circle !== 'half' && <circle cx="14" cy="10" r="5" fill={f.circle}/>}
        {f.circle === 'half' && (<>
          <path d="M14 5 A5 5 0 0 1 14 15 A2.5 2.5 0 0 0 14 10 A2.5 2.5 0 0 1 14 5" fill="#CD2E3A"/>
          <path d="M14 15 A5 5 0 0 1 14 5 A2.5 2.5 0 0 1 14 10 A2.5 2.5 0 0 0 14 15" fill="#0047A0"/>
        </>)}
        {f.star && <polygon points="7,5 7.6,6.7 9.3,6.7 8,7.8 8.5,9.5 7,8.4 5.5,9.5 6,7.8 4.7,6.7 6.4,6.7" fill={f.star}/>}
        {f.crescent && (<>
          <circle cx="10" cy="10" r="4" fill="white"/>
          <circle cx="11.5" cy="10" r="3.2" fill={f.bg || '#EF3340'}/>
          <polygon points="14,7 14.5,9 16.5,9 15,10 15.5,12 14,10.8 12.5,12 13,10 11.5,9 13.5,9" fill="white"/>
        </>)}
        {f.hoist && <rect width="6" height="20" fill={f.hoist}/>}
        {f.diamond && (<>
          <polygon points="14,3 25,10 14,17 3,10" fill={f.inner}/>
          <circle cx="14" cy="10" r="3.5" fill={f.center}/>
        </>)}
        {f.wheel && <circle cx="14" cy="10" r="2.5" fill="none" stroke={f.wheel} strokeWidth="0.5"/>}
        {f.leaf && <polygon points="14,5 15,9 18,9 15.5,11 16.5,14 14,12 11.5,14 12.5,11 10,9 13,9" fill="#FF0000" stroke="#FF0000"/>}
        {f.za && (<>
          <polygon points="0,0 28,0 28,20 0,20" fill="#007A4D"/>
          <polygon points="0,0 10,10 0,20" fill="#000000"/>
          <polygon points="0,0 12,10 0,20" fill="#FFB612" opacity="0"/>
          <polygon points="0,3 10,10 0,17" fill="#FFB612"/>
          <path d="M0 3 L28 0 L28 5 L10 10 L28 15 L28 20 L0 17" fill="#FFFFFF" opacity="0.9"/>
          <path d="M0 5 L28 2 L28 4 L10 10 L28 16 L28 18 L0 15" fill="#DE3831"/>
          <path d="M0 7 L28 4 L28 5 L14 10 L28 15 L28 16 L0 13" fill="#002395"/>
        </>)}
      </g>
    </svg>
  );
};

// ——— Dice face (static SVG) ———
const DieFace = ({ n = 1, size = 64 }) => {
  const dots = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]]
  };
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <linearGradient id={`df-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.98 0.005 260)"/>
          <stop offset="1" stopColor="oklch(0.88 0.01 260)"/>
        </linearGradient>
        <filter id={`ds-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="oklch(0 0 0 / 0.25)"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="12" fill={`url(#df-${id})`} stroke="oklch(0.7 0.01 260)" strokeWidth="0.5" filter={`url(#ds-${id})`}/>
      {dots[n].map((d, i) => (
        <circle key={i} cx={d[0] * 64} cy={d[1] * 64} r="4.5" fill="oklch(0.15 0.02 260)"/>
      ))}
    </svg>
  );
};

// ——— Board tile data (40 real-world cities + action tiles) ———
const BOARD_TILES = [
  // Bottom row (right to left): 0 = GO corner (bottom-right)
  { id: 0, type: 'corner', label: 'GO', sub: 'Collect $200', icon: 'go' },
  { id: 1, type: 'country', name: 'Lagos', flag: 'ZA', set: 'africa', price: 60 },
  { id: 2, type: 'chest', label: 'Treasure' },
  { id: 3, type: 'country', name: 'Cairo', flag: 'ZA', set: 'africa', price: 60 },
  { id: 4, type: 'tax', label: 'Income Tax', sub: '10%' },
  { id: 5, type: 'transit', name: 'JFK Airport', code: 'JFK', price: 200 },
  { id: 6, type: 'country', name: 'Mumbai', flag: 'IN', set: 'asia', price: 100 },
  { id: 7, type: 'surprise', label: 'Surprise' },
  { id: 8, type: 'country', name: 'Seoul', flag: 'KR', set: 'asia', price: 100 },
  { id: 9, type: 'country', name: 'Tokyo', flag: 'JP', set: 'asia', price: 120 },

  // Left column (bottom to top)
  { id: 10, type: 'corner', label: 'Prison', sub: 'Just visiting', icon: 'jail' },
  { id: 11, type: 'country', name: 'Shanghai', flag: 'CN', set: 'asia', price: 140 },
  { id: 12, type: 'utility', name: 'Electric Co.', kind: 'electric', price: 150 },
  { id: 13, type: 'country', name: 'Beijing', flag: 'CN', set: 'asia', price: 140 },
  { id: 14, type: 'country', name: 'Singapore', flag: 'SG', set: 'asia', price: 160 },
  { id: 15, type: 'transit', name: 'CDG Airport', code: 'CDG', price: 200 },
  { id: 16, type: 'country', name: 'Istanbul', flag: 'TR', set: 'mideast', price: 180 },
  { id: 17, type: 'chest', label: 'Treasure' },
  { id: 18, type: 'country', name: 'Dubai', flag: 'AE', set: 'mideast', price: 180 },
  { id: 19, type: 'country', name: 'Abu Dhabi', flag: 'AE', set: 'mideast', price: 200 },

  // Top row (left to right)
  { id: 20, type: 'corner', label: 'Vacation', sub: '$50 on hold', icon: 'vacation' },
  { id: 21, type: 'country', name: 'Madrid', flag: 'ES', set: 'europe', price: 220 },
  { id: 22, type: 'surprise', label: 'Surprise' },
  { id: 23, type: 'country', name: 'Rome', flag: 'IT', set: 'europe', price: 220 },
  { id: 24, type: 'country', name: 'Berlin', flag: 'DE', set: 'europe', price: 240 },
  { id: 25, type: 'transit', name: 'LHR Airport', code: 'LHR', price: 200 },
  { id: 26, type: 'country', name: 'Amsterdam', flag: 'NL', set: 'europe', price: 260 },
  { id: 27, type: 'country', name: 'Paris', flag: 'FR', set: 'europe', price: 260 },
  { id: 28, type: 'utility', name: 'Water Co.', kind: 'water', price: 150 },
  { id: 29, type: 'country', name: 'London', flag: 'UK', set: 'europe', price: 280 },

  // Right column (top to bottom)
  { id: 30, type: 'corner', label: 'Go to Prison', sub: '', icon: 'prison' },
  { id: 31, type: 'country', name: 'Toronto', flag: 'CA', set: 'americas', price: 300 },
  { id: 32, type: 'country', name: 'Mexico City', flag: 'MX', set: 'americas', price: 300 },
  { id: 33, type: 'chest', label: 'Treasure' },
  { id: 34, type: 'country', name: 'São Paulo', flag: 'BR', set: 'americas', price: 320 },
  { id: 35, type: 'transit', name: 'SFO Airport', code: 'SFO', price: 200 },
  { id: 36, type: 'surprise', label: 'Surprise' },
  { id: 37, type: 'country', name: 'Sydney', flag: 'AU', set: 'oceania', price: 350 },
  { id: 38, type: 'tax', label: 'Luxury Tax', sub: '$100' },
  { id: 39, type: 'country', name: 'New York', flag: 'US', set: 'americas', price: 400 }
];

// Icon library (inline SVG) — pure, no emoji
const Icon = ({ name, size = 16, color = 'currentColor', stroke = 1.5 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    dice: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill={color}/><circle cx="16" cy="8" r="1" fill={color}/><circle cx="12" cy="12" r="1" fill={color}/><circle cx="8" cy="16" r="1" fill={color}/><circle cx="16" cy="16" r="1" fill={color}/></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    send: <><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></>,
    volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    bot: <><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4h-2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    question: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    airplane: <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L9 12l-3 3H4l-1 1 3 2 2 3 1-1v-2l3-3 3.7 5.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>,
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    drop: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>,
    treasure: <><rect x="3" y="8" width="18" height="12" rx="1"/><path d="M3 12h18"/><circle cx="12" cy="14" r="1.5"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    scale: <><path d="M12 3v18M5 7l7-4 7 4M5 7l-3 7h6zm14 0l3 7h-6z"/></>,
    ban: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>,
    palm: <><path d="M12 22V12"/><path d="M12 12c-2-5-7-6-9-4 2 0 5 1 6 4"/><path d="M12 12c2-5 7-6 9-4-2 0-5 1-6 4"/><path d="M12 12c0-5-4-7-7-5 2 1 3 3 3 5"/><path d="M12 12c0-5 4-7 7-5-2 1-3 3-3 5"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    crown: <path d="M2 20h20L20 8l-4 4-4-6-4 6-4-4z"/>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    trend: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    coin: <><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9m0 0h5"/></>
  };
  return <svg {...p}>{paths[name]}</svg>;
};

Object.assign(window, { TULogo, PlayerToken, FlagChip, DieFace, BOARD_TILES, FLAGS, Icon });
