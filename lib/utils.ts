import { TILES, SET_COLORS, PLAYER_COLOR_MAP } from './game-data';
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
