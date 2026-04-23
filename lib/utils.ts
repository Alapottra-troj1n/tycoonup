import { TILES, SET_COLORS, PLAYER_COLOR_MAP, SET_ADVANTAGES, SET_SIZES } from './game-data';
import type { Property, Player } from './types';

export function getPropertyByTileId(properties: Property[], tileId: number): Property | undefined {
  return properties.find((p) => p.tile_id === tileId);
}

export function getPlayerById(players: Player[], id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

export function getPlayersOnTile(players: Player[], tileId: number): Player[] {
  return players.filter((p) => p.position === tileId && !p.is_bankrupt);
}

export function getSetOwnerCount(
  properties: Property[],
  set: string,
  playerId: string,
): number {
  const setTileIds = TILES
    .filter((t) => t.set === set)
    .map((t) => t.id);
  return setTileIds.filter((id) =>
    properties.find((p) => p.tile_id === id && p.owner_id === playerId),
  ).length;
}

/** Returns true when the player owns every city in the set. */
export function ownsFullSet(
  properties: Property[],
  set: string,
  playerId: string,
): boolean {
  const setTiles = TILES.filter((t) => t.set === set);
  return setTiles.every((t) =>
    properties.find((p) => p.tile_id === t.id && p.owner_id === playerId),
  );
}

/**
 * Returns the monopoly advantage text for a set if the player owns all cities,
 * otherwise null.
 */
export function getSetAdvantage(
  properties: Property[],
  set: string,
  playerId: string,
): string | null {
  if (!set || !ownsFullSet(properties, set, playerId)) return null;
  return SET_ADVANTAGES[set] ?? null;
}

/** How many cities in the set does the player own vs total needed. */
export function getSetProgress(
  properties: Property[],
  set: string,
  playerId: string,
): { owned: number; total: number } {
  const total = SET_SIZES[set] ?? TILES.filter((t) => t.set === set).length;
  const owned = getSetOwnerCount(properties, set, playerId);
  return { owned, total };
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export function getTileColor(tileId: number): string {
  const tile = TILES[tileId];
  if (tile?.set) return SET_COLORS[tile.set] ?? '#555';
  return '#334155';
}

export function getPlayerColorHex(color: string): string {
  return PLAYER_COLOR_MAP[color]?.hex ?? '#ffffff';
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Extract 2-letter ISO country code from a flag emoji (e.g. '🇪🇬' → 'eg')
export function flagCode(flag: string): string {
  return [...flag].map(c => String.fromCodePoint(c.codePointAt(0)! - 0x1F1A5)).join('').toLowerCase();
}
