import type { Tile, ChestQuestion, CountrySet, BoardId, GameRoom } from './types';
import { normalizeSettings } from './settings';
import { PLAYER_COLORS } from './colors';

// ⚠️  Tiles must be ordered by id (index === id) because the game uses tiles[position] lookups.

// ─── Classic board — 40 tiles, 11×11 grid, up to 6 players ─────────────────
export const TILES: Tile[] = [
  /* 0  */ { id: 0,  name: 'GO',                   type: 'go' },
  /* 1  */ { id: 1,  name: 'Cairo',                 type: 'country', set: 'brown',     country: 'Egypt',       flag: '🇪🇬', buyPrice: 60,  rentLevels: [2, 10, 30, 90, 160],         upgradePrice: 50,  mortgageValue: 30  },
  /* 2  */ { id: 2,  name: 'World Chest',           type: 'chest' },
  /* 3  */ { id: 3,  name: 'Luxor',                 type: 'country', set: 'brown',     country: 'Egypt',       flag: '🇪🇬', buyPrice: 60,  rentLevels: [4, 20, 60, 180, 320],         upgradePrice: 50,  mortgageValue: 30  },
  /* 4  */ { id: 4,  name: 'Income Tax',             type: 'tax',    taxAmount: 0,     taxType: 'percent' },
  /* 5  */ { id: 5,  name: 'Silk Road',             type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 6  */ { id: 6,  name: 'Mumbai',                type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 100, rentLevels: [6, 30, 90, 270, 400],         upgradePrice: 50,  mortgageValue: 50  },
  /* 7  */ { id: 7,  name: 'Global Event',          type: 'event' },
  /* 8  */ { id: 8,  name: 'Delhi',                 type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 100, rentLevels: [6, 30, 90, 270, 400],         upgradePrice: 50,  mortgageValue: 50  },
  /* 9  */ { id: 9,  name: 'Bangalore',             type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 120, rentLevels: [8, 40, 100, 300, 450],         upgradePrice: 50,  mortgageValue: 60  },
  /* 10 */ { id: 10, name: 'Jail',                  type: 'jail' },
  /* 11 */ { id: 11, name: 'Paris',                 type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 140, rentLevels: [10, 50, 150, 450, 625],       upgradePrice: 100, mortgageValue: 70  },
  /* 12 */ { id: 12, name: 'Global Bank',           type: 'utility', buyPrice: 150,   mortgageValue: 75 },
  /* 13 */ { id: 13, name: 'Lyon',                  type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 140, rentLevels: [10, 50, 150, 450, 625],       upgradePrice: 100, mortgageValue: 70  },
  /* 14 */ { id: 14, name: 'Marseille',             type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 160, rentLevels: [12, 60, 180, 500, 700],       upgradePrice: 100, mortgageValue: 80  },
  /* 15 */ { id: 15, name: 'Trade Route',           type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 16 */ { id: 16, name: 'São Paulo',             type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 180, rentLevels: [14, 70, 200, 550, 750],       upgradePrice: 100, mortgageValue: 90  },
  /* 17 */ { id: 17, name: 'World Chest',           type: 'chest' },
  /* 18 */ { id: 18, name: 'Rio de Janeiro',        type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 180, rentLevels: [14, 70, 200, 550, 750],       upgradePrice: 100, mortgageValue: 90  },
  /* 19 */ { id: 19, name: 'Brasília',              type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 200, rentLevels: [16, 80, 220, 600, 800],       upgradePrice: 100, mortgageValue: 100 },
  /* 20 */ { id: 20, name: 'Free Parking',          type: 'free-parking' },
  /* 21 */ { id: 21, name: 'Tokyo',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 220, rentLevels: [18, 90, 250, 700, 875],       upgradePrice: 150, mortgageValue: 110 },
  /* 22 */ { id: 22, name: 'Global Event',          type: 'event' },
  /* 23 */ { id: 23, name: 'Osaka',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 220, rentLevels: [18, 90, 250, 700, 875],       upgradePrice: 150, mortgageValue: 110 },
  /* 24 */ { id: 24, name: 'Kyoto',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 240, rentLevels: [20, 100, 300, 750, 950],      upgradePrice: 150, mortgageValue: 120 },
  /* 25 */ { id: 25, name: 'Maritime Hub',          type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 26 */ { id: 26, name: 'New York',              type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 260, rentLevels: [22, 110, 330, 800, 975],      upgradePrice: 150, mortgageValue: 130 },
  /* 27 */ { id: 27, name: 'Los Angeles',           type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 260, rentLevels: [22, 110, 330, 800, 975],      upgradePrice: 150, mortgageValue: 130 },
  /* 28 */ { id: 28, name: 'World Trade',           type: 'utility', buyPrice: 150,   mortgageValue: 75 },
  /* 29 */ { id: 29, name: 'Chicago',               type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 280, rentLevels: [24, 120, 360, 850, 1025],     upgradePrice: 150, mortgageValue: 140 },
  /* 30 */ { id: 30, name: 'Go To Jail',            type: 'go-to-jail' },
  /* 31 */ { id: 31, name: 'London',                type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],     upgradePrice: 200, mortgageValue: 150 },
  /* 32 */ { id: 32, name: 'Manchester',            type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],     upgradePrice: 200, mortgageValue: 150 },
  /* 33 */ { id: 33, name: 'World Chest',           type: 'chest' },
  /* 34 */ { id: 34, name: 'Edinburgh',             type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 320, rentLevels: [28, 150, 450, 1000, 1200],    upgradePrice: 200, mortgageValue: 160 },
  /* 35 */ { id: 35, name: 'Global Airways',        type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 36 */ { id: 36, name: 'Global Event',          type: 'event' },
  /* 37 */ { id: 37, name: 'Zurich',                type: 'country', set: 'dark-blue', country: 'Switzerland', flag: '🇨🇭', buyPrice: 350, rentLevels: [35, 175, 500, 1100, 1300],    upgradePrice: 200, mortgageValue: 175 },
  /* 38 */ { id: 38, name: 'Ransom to Underworld',  type: 'tax',    taxAmount: 100,   taxType: 'flat' },
  /* 39 */ { id: 39, name: 'Singapore',             type: 'country', set: 'dark-blue', country: 'Singapore',   flag: '🇸🇬', buyPrice: 400, rentLevels: [50, 200, 600, 1400, 2000],    upgradePrice: 200, mortgageValue: 200 },
];

// ─── Mega board — 48 tiles, 13×13 grid, up to 8 players ────────────────────
// Adds two extra country sets: teal (Australia) and steel (Germany).
export const MEGA_TILES: Tile[] = [
  /* 0  */ { id: 0,  name: 'GO',                   type: 'go' },
  /* 1  */ { id: 1,  name: 'Cairo',                 type: 'country', set: 'brown',     country: 'Egypt',       flag: '🇪🇬', buyPrice: 60,  rentLevels: [2, 10, 30, 90, 160],          upgradePrice: 50,  mortgageValue: 30  },
  /* 2  */ { id: 2,  name: 'World Chest',           type: 'chest' },
  /* 3  */ { id: 3,  name: 'Luxor',                 type: 'country', set: 'brown',     country: 'Egypt',       flag: '🇪🇬', buyPrice: 60,  rentLevels: [4, 20, 60, 180, 320],          upgradePrice: 50,  mortgageValue: 30  },
  /* 4  */ { id: 4,  name: 'Income Tax',             type: 'tax',    taxAmount: 0,     taxType: 'percent' },
  /* 5  */ { id: 5,  name: 'Silk Road',             type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 6  */ { id: 6,  name: 'Mumbai',                type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 100, rentLevels: [6, 30, 90, 270, 400],          upgradePrice: 50,  mortgageValue: 50  },
  /* 7  */ { id: 7,  name: 'Global Event',          type: 'event' },
  /* 8  */ { id: 8,  name: 'Delhi',                 type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 100, rentLevels: [6, 30, 90, 270, 400],          upgradePrice: 50,  mortgageValue: 50  },
  /* 9  */ { id: 9,  name: 'Bangalore',             type: 'country', set: 'light-blue',country: 'India',       flag: '🇮🇳', buyPrice: 120, rentLevels: [8, 40, 100, 300, 450],         upgradePrice: 50,  mortgageValue: 60  },
  /* 10 */ { id: 10, name: 'Sydney',                type: 'country', set: 'teal',      country: 'Australia',   flag: '🇦🇺', buyPrice: 130, rentLevels: [10, 45, 130, 390, 550],        upgradePrice: 100, mortgageValue: 65  },
  /* 11 */ { id: 11, name: 'Melbourne',             type: 'country', set: 'teal',      country: 'Australia',   flag: '🇦🇺', buyPrice: 130, rentLevels: [10, 45, 130, 390, 550],        upgradePrice: 100, mortgageValue: 65  },
  /* 12 */ { id: 12, name: 'Jail',                  type: 'jail' },
  /* 13 */ { id: 13, name: 'Brisbane',              type: 'country', set: 'teal',      country: 'Australia',   flag: '🇦🇺', buyPrice: 150, rentLevels: [12, 55, 165, 470, 640],        upgradePrice: 100, mortgageValue: 75  },
  /* 14 */ { id: 14, name: 'Paris',                 type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 160, rentLevels: [12, 60, 180, 500, 700],        upgradePrice: 100, mortgageValue: 80  },
  /* 15 */ { id: 15, name: 'Global Bank',           type: 'utility', buyPrice: 150,   mortgageValue: 75 },
  /* 16 */ { id: 16, name: 'Lyon',                  type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 160, rentLevels: [12, 60, 180, 500, 700],        upgradePrice: 100, mortgageValue: 80  },
  /* 17 */ { id: 17, name: 'Marseille',             type: 'country', set: 'pink',      country: 'France',      flag: '🇫🇷', buyPrice: 180, rentLevels: [14, 65, 195, 540, 750],        upgradePrice: 100, mortgageValue: 90  },
  /* 18 */ { id: 18, name: 'Trade Route',           type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 19 */ { id: 19, name: 'São Paulo',             type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 200, rentLevels: [16, 80, 220, 600, 800],        upgradePrice: 100, mortgageValue: 100 },
  /* 20 */ { id: 20, name: 'World Chest',           type: 'chest' },
  /* 21 */ { id: 21, name: 'Rio de Janeiro',        type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 200, rentLevels: [16, 80, 220, 600, 800],        upgradePrice: 100, mortgageValue: 100 },
  /* 22 */ { id: 22, name: 'Brasília',              type: 'country', set: 'orange',    country: 'Brazil',      flag: '🇧🇷', buyPrice: 220, rentLevels: [18, 90, 250, 650, 850],        upgradePrice: 100, mortgageValue: 110 },
  /* 23 */ { id: 23, name: 'Global Event',          type: 'event' },
  /* 24 */ { id: 24, name: 'Vacation',              type: 'free-parking' },
  /* 25 */ { id: 25, name: 'Tokyo',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 240, rentLevels: [20, 100, 300, 750, 925],       upgradePrice: 150, mortgageValue: 120 },
  /* 26 */ { id: 26, name: 'Osaka',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 240, rentLevels: [20, 100, 300, 750, 925],       upgradePrice: 150, mortgageValue: 120 },
  /* 27 */ { id: 27, name: 'Kyoto',                 type: 'country', set: 'red',       country: 'Japan',       flag: '🇯🇵', buyPrice: 260, rentLevels: [22, 110, 330, 800, 975],       upgradePrice: 150, mortgageValue: 130 },
  /* 28 */ { id: 28, name: 'Maritime Hub',          type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 29 */ { id: 29, name: 'Berlin',                type: 'country', set: 'steel',     country: 'Germany',     flag: '🇩🇪', buyPrice: 280, rentLevels: [24, 120, 360, 850, 1025],      upgradePrice: 150, mortgageValue: 140 },
  /* 30 */ { id: 30, name: 'Munich',                type: 'country', set: 'steel',     country: 'Germany',     flag: '🇩🇪', buyPrice: 280, rentLevels: [24, 120, 360, 850, 1025],      upgradePrice: 150, mortgageValue: 140 },
  /* 31 */ { id: 31, name: 'World Chest',           type: 'chest' },
  /* 32 */ { id: 32, name: 'Frankfurt',             type: 'country', set: 'steel',     country: 'Germany',     flag: '🇩🇪', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],      upgradePrice: 150, mortgageValue: 150 },
  /* 33 */ { id: 33, name: 'New York',              type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],      upgradePrice: 150, mortgageValue: 150 },
  /* 34 */ { id: 34, name: 'World Trade',           type: 'utility', buyPrice: 150,   mortgageValue: 75 },
  /* 35 */ { id: 35, name: 'Los Angeles',           type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 300, rentLevels: [26, 130, 390, 900, 1100],      upgradePrice: 150, mortgageValue: 150 },
  /* 36 */ { id: 36, name: 'Go To Jail',            type: 'go-to-jail' },
  /* 37 */ { id: 37, name: 'Chicago',               type: 'country', set: 'yellow',    country: 'USA',         flag: '🇺🇸', buyPrice: 320, rentLevels: [28, 150, 450, 1000, 1200],     upgradePrice: 150, mortgageValue: 160 },
  /* 38 */ { id: 38, name: 'London',                type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 320, rentLevels: [28, 150, 450, 1000, 1200],     upgradePrice: 200, mortgageValue: 160 },
  /* 39 */ { id: 39, name: 'Manchester',            type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 320, rentLevels: [28, 150, 450, 1000, 1200],     upgradePrice: 200, mortgageValue: 160 },
  /* 40 */ { id: 40, name: 'World Chest',           type: 'chest' },
  /* 41 */ { id: 41, name: 'Edinburgh',             type: 'country', set: 'green',     country: 'UK',          flag: '🇬🇧', buyPrice: 340, rentLevels: [30, 160, 470, 1050, 1270],     upgradePrice: 200, mortgageValue: 170 },
  /* 42 */ { id: 42, name: 'Global Airways',        type: 'transport', buyPrice: 200,  rentLevels: [25, 50, 100, 200], mortgageValue: 100 },
  /* 43 */ { id: 43, name: 'Global Event',          type: 'event' },
  /* 44 */ { id: 44, name: 'Zurich',                type: 'country', set: 'dark-blue', country: 'Switzerland', flag: '🇨🇭', buyPrice: 360, rentLevels: [40, 185, 540, 1200, 1500],     upgradePrice: 200, mortgageValue: 180 },
  /* 45 */ { id: 45, name: 'Ransom to Underworld',  type: 'tax',    taxAmount: 100,   taxType: 'flat' },
  /* 46 */ { id: 46, name: 'Singapore',             type: 'country', set: 'dark-blue', country: 'Singapore',   flag: '🇸🇬', buyPrice: 420, rentLevels: [55, 220, 650, 1500, 2100],     upgradePrice: 200, mortgageValue: 210 },
  /* 47 */ { id: 47, name: 'Global Event',          type: 'event' },
];

// ─── Board definitions ──────────────────────────────────────────────────────

export interface BoardDef {
  id: BoardId;
  name: string;
  description: string;
  gridSize: number;   // CSS grid is gridSize × gridSize
  size: number;       // number of tiles around the perimeter
  tiles: Tile[];
  jailPos: number;
  freeParkingPos: number;
  maxPlayers: number;
}

export const BOARDS: Record<BoardId, BoardDef> = {
  classic: {
    id: 'classic',
    name: 'Classic World',
    description: '40 tiles · 8 country sets · 2–6 players',
    gridSize: 11,
    size: 40,
    tiles: TILES,
    jailPos: 10,
    freeParkingPos: 20,
    maxPlayers: 6,
  },
  mega: {
    id: 'mega',
    name: 'Mega World',
    description: '48 tiles · 10 country sets · 2–8 players',
    gridSize: 13,
    size: 48,
    tiles: MEGA_TILES,
    jailPos: 12,
    freeParkingPos: 24,
    maxPlayers: 8,
  },
};

type RoomLike = Pick<GameRoom, 'settings'> | null | undefined;

/** The board a room is playing on (falls back to classic). */
export function boardFor(room: RoomLike): BoardDef {
  return BOARDS[normalizeSettings(room?.settings).board];
}

export function tilesFor(room: RoomLike): Tile[] {
  return boardFor(room).tiles;
}

// Maps tile ID → CSS grid position (1-indexed) for any square board.
export function getTileGridPosFor(board: BoardDef, id: number): { row: number; col: number } {
  const n = board.size / 4;      // tiles per side (incl. one corner)
  const g = board.gridSize;
  if (id === 0)      return { row: g, col: g };
  if (id < n)        return { row: g, col: g - id };
  if (id === n)      return { row: g, col: 1 };
  if (id < 2 * n)    return { row: g - (id - n), col: 1 };
  if (id === 2 * n)  return { row: 1, col: 1 };
  if (id < 3 * n)    return { row: 1, col: (id - 2 * n) + 1 };
  if (id === 3 * n)  return { row: 1, col: g };
  return { row: (id - 3 * n) + 1, col: g };
}

export type TileSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

export function tileSideFor(board: BoardDef, id: number): TileSide {
  const n = board.size / 4;
  if (id % n === 0) return 'corner';
  if (id < n)       return 'bottom';
  if (id < 2 * n)   return 'left';
  if (id < 3 * n)   return 'top';
  return 'right';
}

export function transportTileIds(board: BoardDef): number[] {
  return board.tiles.filter((t) => t.type === 'transport').map((t) => t.id);
}

export function utilityTileIds(board: BoardDef): number[] {
  return board.tiles.filter((t) => t.type === 'utility').map((t) => t.id);
}

// ── Set display colours — equal-luminance pastels, readable on dark tiles ──
export const SET_COLORS: Record<string, string> = {
  brown: '#c79a6b',
  'light-blue': '#7ec8e3',
  pink: '#ef9cc0',
  orange: '#f2a866',
  red: '#ec8080',
  yellow: '#e9cd6b',
  green: '#7fd0a2',
  'dark-blue': '#86a6e8',
  teal: '#63d8c6',
  steel: '#b4c2d6',
};

// ── Monopoly advantages — unlocked when a player owns the full set ─────────
// Data-driven perk definitions consumed by the game engine. All bonuses are
// intentionally mild to preserve game balance.

export type SetPerk =
  | { kind: 'chest_bonus'; pct: number }                          // better quiz rewards / softer penalties
  | { kind: 'go_bonus'; amount: number }                          // extra cash when passing GO
  | { kind: 'upgrade_discount'; amount: number }                  // cheaper upgrades in this set
  | { kind: 'rent_bonus'; amount: number }                        // flat extra rent per landing
  | { kind: 'rent_per_level'; amount: number }                    // extra rent per upgrade level
  | { kind: 'turn_income'; amount: number; minBalance?: number }  // income at the start of your turn
  | { kind: 'doubles_income'; amount: number };                   // collect when ANY other player rolls doubles

export const SET_PERKS: Record<CountrySet, SetPerk[]> = {
  brown:        [{ kind: 'chest_bonus', pct: 10 }],
  'light-blue': [{ kind: 'go_bonus', amount: 10 }],
  pink:         [{ kind: 'upgrade_discount', amount: 10 }],
  orange:       [{ kind: 'rent_bonus', amount: 10 }],
  red:          [{ kind: 'rent_per_level', amount: 5 }],
  yellow:       [{ kind: 'turn_income', amount: 20 }],
  green:        [{ kind: 'turn_income', amount: 15, minBalance: 800 }],
  'dark-blue':  [{ kind: 'turn_income', amount: 25 }, { kind: 'doubles_income', amount: 100 }],
  teal:         [{ kind: 'go_bonus', amount: 15 }],
  steel:        [{ kind: 'rent_per_level', amount: 10 }],
};

export const SET_ADVANTAGES: Record<string, string> = {
  'brown':      'Chest reward: win 10% more, lose 10% less',
  'light-blue': '+$10 bonus each time you pass GO',
  'pink':       'Upgrade cost reduced by $10 per city in this set',
  'orange':     'Opponents pay +$10 extra rent on your orange cities',
  'red':        '+$5 bonus rent per upgrade level on your red cities',
  'yellow':     'Earn $20 bonus once per full round (your turn start)',
  'green':      'Earn $15 interest per turn when your balance is ≥ $800',
  'dark-blue':  'Earn $25 passive income at the start of each of your turns, plus $100 when any opponent rolls doubles',
  'teal':       '+$15 bonus each time you pass GO',
  'steel':      '+$10 bonus rent per upgrade level on your steel cities',
};

// ── Set sizes (how many city tiles form a full monopoly) ──────────────────
export const SET_SIZES: Record<string, number> = {
  'brown':      2,
  'light-blue': 3,
  'pink':       3,
  'orange':     3,
  'red':        3,
  'yellow':     3,
  'green':      3,
  'dark-blue':  2,
  'teal':       3,
  'steel':      3,
};

export const SET_COUNTRY_NAMES: Record<string, string> = {
  'brown':      'Egypt',
  'light-blue': 'India',
  'pink':       'France',
  'orange':     'Brazil',
  'red':        'Japan',
  'yellow':     'USA',
  'green':      'UK',
  'dark-blue':  'Global Finance',
  'teal':       'Australia',
  'steel':      'Germany',
};

// Player color values live in lib/colors.ts (single source of truth);
// re-exported here so existing imports keep working.
export const PLAYER_COLOR_MAP: Record<string, { hex: string }> = PLAYER_COLORS;

export const ALL_PLAYER_COLORS = Object.keys(PLAYER_COLOR_MAP) as Array<keyof typeof PLAYER_COLOR_MAP>;

export const CHEST_QUESTIONS: ChestQuestion[] = [
  {
    id: 1, question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctIndex: 2, reward: 150, penalty: 75,
  },
  {
    id: 2, question: 'Which country has the largest land area?',
    options: ['China', 'USA', 'Canada', 'Russia'],
    correctIndex: 3, reward: 200, penalty: 100,
  },
  {
    id: 3, question: 'What currency does Japan use?',
    options: ['Yuan', 'Yen', 'Won', 'Ringgit'],
    correctIndex: 1, reward: 100, penalty: 50,
  },
  {
    id: 4, question: 'Which river is the longest in the world?',
    options: ['Amazon', 'Yangtze', 'Mississippi', 'Nile'],
    correctIndex: 3, reward: 175, penalty: 75,
  },
  {
    id: 5, question: 'How many countries are in the European Union?',
    options: ['24', '27', '30', '33'],
    correctIndex: 1, reward: 150, penalty: 75,
  },
  {
    id: 6, question: 'What is the smallest country in the world by area?',
    options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'],
    correctIndex: 2, reward: 200, penalty: 100,
  },
  {
    id: 7, question: 'Which country invented paper?',
    options: ['Japan', 'India', 'Egypt', 'China'],
    correctIndex: 3, reward: 125, penalty: 50,
  },
  {
    id: 8, question: "What percentage of Earth's surface is covered by oceans?",
    options: ['51%', '61%', '71%', '81%'],
    correctIndex: 2, reward: 150, penalty: 75,
  },
  {
    id: 9, question: 'Which city is known as the "City of Light"?',
    options: ['Rome', 'London', 'Paris', 'Vienna'],
    correctIndex: 2, reward: 100, penalty: 50,
  },
  {
    id: 10, question: "What is the world's most spoken language by native speakers?",
    options: ['English', 'Spanish', 'Mandarin', 'Hindi'],
    correctIndex: 2, reward: 175, penalty: 75,
  },
  {
    id: 11, question: 'Which country has the most time zones?',
    options: ['Russia', 'USA', 'France', 'China'],
    correctIndex: 2, reward: 200, penalty: 100,
  },
  {
    id: 12, question: 'What is the tallest mountain in the world?',
    options: ['K2', 'Kangchenjunga', 'Lhotse', 'Mount Everest'],
    correctIndex: 3, reward: 100, penalty: 50,
  },
  {
    id: 13, question: 'Which country produces the most coffee?',
    options: ['Colombia', 'Vietnam', 'Brazil', 'Ethiopia'],
    correctIndex: 2, reward: 125, penalty: 50,
  },
  {
    id: 14, question: 'How many continents are on Earth?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2, reward: 100, penalty: 50,
  },
  {
    id: 15, question: 'What is the currency of Switzerland?',
    options: ['Euro', 'Swiss Franc', 'Florin', 'Krone'],
    correctIndex: 1, reward: 150, penalty: 75,
  },
  {
    id: 16, question: 'Which city is the financial capital of India?',
    options: ['Delhi', 'Kolkata', 'Mumbai', 'Chennai'],
    correctIndex: 2, reward: 125, penalty: 50,
  },
  {
    id: 17, question: 'What is the capital of Brazil?',
    options: ['Rio de Janeiro', 'São Paulo', 'Belo Horizonte', 'Brasília'],
    correctIndex: 3, reward: 150, penalty: 75,
  },
  {
    id: 18, question: 'In which Japanese city was the first atomic bomb dropped?',
    options: ['Tokyo', 'Osaka', 'Hiroshima', 'Kyoto'],
    correctIndex: 2, reward: 175, penalty: 75,
  },
  {
    id: 19, question: 'Which is the largest desert in the world?',
    options: ['Sahara', 'Gobi', 'Antarctic Desert', 'Arabian'],
    correctIndex: 2, reward: 200, penalty: 100,
  },
  {
    id: 20, question: 'What is the capital of Canada?',
    options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'],
    correctIndex: 3, reward: 150, penalty: 75,
  },
  {
    id: 21, question: 'Which strait separates Europe and Africa?',
    options: ['Bosphorus', 'Strait of Gibraltar', 'Strait of Hormuz', 'Dover Strait'],
    correctIndex: 1, reward: 175, penalty: 75,
  },
  {
    id: 22, question: 'Which country is home to the kangaroo?',
    options: ['New Zealand', 'South Africa', 'Australia', 'Argentina'],
    correctIndex: 2, reward: 100, penalty: 50,
  },
  {
    id: 23, question: 'What is the largest country in South America?',
    options: ['Argentina', 'Brazil', 'Peru', 'Colombia'],
    correctIndex: 1, reward: 125, penalty: 50,
  },
  {
    id: 24, question: 'Mount Fuji is located in which country?',
    options: ['China', 'South Korea', 'Japan', 'Vietnam'],
    correctIndex: 2, reward: 100, penalty: 50,
  },
  {
    id: 25, question: 'Which European city is famous for its canals and gondolas?',
    options: ['Amsterdam', 'Venice', 'Bruges', 'Stockholm'],
    correctIndex: 1, reward: 125, penalty: 50,
  },
  {
    id: 26, question: 'The Great Barrier Reef lies off the coast of which country?',
    options: ['Indonesia', 'Philippines', 'Australia', 'Fiji'],
    correctIndex: 2, reward: 150, penalty: 75,
  },
  {
    id: 27, question: 'Which country has the largest population?',
    options: ['China', 'India', 'USA', 'Indonesia'],
    correctIndex: 1, reward: 175, penalty: 75,
  },
  {
    id: 28, question: 'What is the capital of Germany?',
    options: ['Munich', 'Frankfurt', 'Hamburg', 'Berlin'],
    correctIndex: 3, reward: 100, penalty: 50,
  },
  {
    id: 29, question: 'Which ocean is the deepest?',
    options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
    correctIndex: 2, reward: 150, penalty: 75,
  },
  {
    id: 30, question: 'The pyramids of Giza are near which city?',
    options: ['Alexandria', 'Cairo', 'Luxor', 'Aswan'],
    correctIndex: 1, reward: 100, penalty: 50,
  },
];

export const EVENT_CARDS = [
  { message: 'Economic Boom! Collect $100 from the bank.', amount: 100, type: 'gain' as const },
  { message: 'Market Crash! Pay $75 to the bank.', amount: -75, type: 'lose' as const },
  { message: 'Trade Summit! Advance to GO and collect your salary.', amount: 200, type: 'move_go' as const },
  { message: 'Tax Rebate! Collect $75 from the bank.', amount: 75, type: 'gain' as const },
  { message: 'Geopolitical Crisis! Go directly to Jail.', amount: 0, type: 'jail' as const },
  { message: 'World Cup Host! Collect $25 from each player.', amount: 25, type: 'collect_all' as const },
  { message: 'Natural Disaster! Pay $125 in relief funds.', amount: -125, type: 'lose' as const },
  { message: 'Foreign Investment! Collect $150 from the bank.', amount: 150, type: 'gain' as const },
  { message: 'Global Recession! Pay $100 to the bank.', amount: -100, type: 'lose' as const },
  { message: 'Currency Devaluation! Pay $50 to each player.', amount: -50, type: 'pay_all' as const },
  { message: 'Diplomatic Immunity! Get Out of Jail Free — keep this card until needed.', amount: 0, type: 'goojf' as const },
  { message: 'Startup Exit! Your venture pays off — collect $175.', amount: 175, type: 'gain' as const },
  { message: 'Customs Fine! Pay $60 to the bank.', amount: -60, type: 'lose' as const },
  { message: 'Tourism Boom! Collect $15 from each player.', amount: 15, type: 'collect_all' as const },
  { message: 'Cyber Attack! Pay $90 for security upgrades.', amount: -90, type: 'lose' as const },
  { message: 'Lottery Win! Collect $125 from the bank.', amount: 125, type: 'gain' as const },
];

export const STARTING_BALANCE = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_TURNS_MAX = 3;

// Transport rent: 25 * (2 ^ (ownedCount - 1))
export function calcTransportRent(ownedCount: number): number {
  return 25 * Math.pow(2, ownedCount - 1);
}

// Utility rent: dice total * multiplier (4 if 1 owned, 10 if both owned)
export function calcUtilityRent(diceTotal: number, ownedCount: number): number {
  return diceTotal * (ownedCount === 2 ? 10 : 4);
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
