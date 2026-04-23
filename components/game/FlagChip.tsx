import { useId, CSSProperties } from 'react';

// Extract 2-letter ISO country code from a flag emoji (e.g. '🇪🇬' → 'EG')
function getCodeFromEmoji(flag: string): string {
  if (!flag) return 'US';
  if (flag.length < 4) return flag.toUpperCase();
  try {
    return [...flag].map(c => String.fromCodePoint(c.codePointAt(0)! - 0x1F1A5)).join('').toUpperCase();
  } catch (e) {
    return 'US';
  }
}

// ——— Flag chip (simplified stripes, recognizable but original) ———
const FLAGS: Record<string, any> = {
  US: { stripes: ['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'], canton: '#3C3B6E', stars: true },
  GB: { cross: true, bg: '#012169', cross1: '#FFFFFF', cross2: '#C8102E' }, // Was UK
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
  TR: { bg: '#E30A17', crescent: true },
  EG: { stripes: ['#CE1126', '#FFFFFF', '#000000'], circle: '#C09300' },
  MA: { bg: '#C1272D', star: '#006233' },
  GR: { stripes: ['#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF'], canton: '#0D5EAF', crossCanton: '#FFFFFF' },
  HR: { stripes: ['#FF0000', '#FFFFFF', '#0000FF'], squareCenter: '#FF0000' },
  AR: { stripes: ['#75AADB', '#FFFFFF', '#75AADB'], circle: '#FCBF49' }
};

export default function FlagChip({ 
  code, 
  size = 18, 
  round = true,
  style,
  className
}: { 
  code: string; 
  size?: number; 
  round?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const parsedCode = getCodeFromEmoji(code);
  const f = FLAGS[parsedCode] || FLAGS.US;
  const w = size * 1.4;
  const h = size;
  const id = useId();
  return (
    <svg width={w} height={h} viewBox={`0 0 28 20`} className={className} style={{
      borderRadius: round ? 4 : 2,
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 0.5px oklch(0 0 0 / 0.4)',
      display: 'inline-block',
      ...style
    }}>
      <defs>
        <clipPath id={`clip-${id}`}><rect width="28" height="20" rx={round ? 2 : 0}/></clipPath>
      </defs>
      <g clipPath={`url(#clip-${id})`}>
        <rect width="28" height="20" fill={f.bg || '#222'} />
        {f.stripes && !f.vertical && f.stripes.map((c: string, i: number) => (
          <rect key={i} y={(20 / f.stripes.length) * i} width="28" height={20 / f.stripes.length} fill={c} />
        ))}
        {f.bars && f.vertical && f.bars.map((c: string, i: number) => (
          <rect key={i} x={(28 / f.bars.length) * i} width={28 / f.bars.length} height="20" fill={c} />
        ))}
        {f.canton && <rect width="11" height="11" fill={f.canton} />}
        {f.crossCanton && (
          <g>
            <rect x="4.5" y="0" width="2" height="11" fill={f.crossCanton} />
            <rect x="0" y="4.5" width="11" height="2" fill={f.crossCanton} />
          </g>
        )}
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
        {f.squareCenter && (
          <rect x="12" y="8" width="4" height="4" fill={f.squareCenter} />
        )}
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
}
