// Single source of truth for the 8 player accent colors.
// Every component should import from here instead of redeclaring values.
//  · `var`  — CSS custom property reference (token-driven styles)
//  · `dim`  — muted variant token
//  · `hex`  — raw hex, for styles that need alpha suffixes (`${hex}55`)

export const PLAYER_COLORS: Record<string, { var: string; dim: string; hex: string }> = {
  cyan:    { var: 'var(--neon-cyan)',    dim: 'var(--neon-cyan-dim)',    hex: '#5fd3e8' },
  magenta: { var: 'var(--neon-magenta)', dim: 'var(--neon-magenta-dim)', hex: '#e88bd0' },
  lime:    { var: 'var(--neon-lime)',    dim: 'var(--neon-lime-dim)',    hex: '#7fe39a' },
  amber:   { var: 'var(--neon-amber)',   dim: 'var(--neon-amber-dim)',   hex: '#f2cf6e' },
  violet:  { var: 'var(--neon-violet)',  dim: 'var(--neon-violet-dim)',  hex: '#b49df0' },
  rose:    { var: 'var(--neon-rose)',    dim: 'var(--neon-rose-dim)',    hex: '#f2939e' },
  orange:  { var: 'var(--neon-orange)',  dim: 'var(--neon-orange-dim)',  hex: '#f5a86c' },
  sky:     { var: 'var(--neon-sky)',     dim: 'var(--neon-sky-dim)',     hex: '#8ab8f5' },
};

export const NEON: Record<string, string> = Object.fromEntries(
  Object.entries(PLAYER_COLORS).map(([k, v]) => [k, v.var]),
);

export function neonOf(color: string | undefined | null): string {
  return NEON[color ?? ''] ?? 'var(--neon-cyan)';
}

export function playerHexOf(color: string | undefined | null): string {
  return PLAYER_COLORS[color ?? '']?.hex ?? '#5fd3e8';
}
