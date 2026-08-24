import type { GameSettings, BoardId } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  board: 'classic',
  maxPlayers: 6,
  startingCash: 1500,
  goSalary: 200,
  doubleRentOnFullSet: true,
  auctionsEnabled: true,
  mortgageEnabled: true,
  evenBuild: true,
  vacationCash: false,
  setAdvantages: true,
  auctionSeconds: 25,
  jailFine: 50,
  randomizeOrder: true,
};

// Choices surfaced in the lobby settings panel
export const SETTING_OPTIONS = {
  startingCash: [500, 1000, 1500, 2000, 2500],
  goSalary: [0, 100, 200, 300, 400],
  auctionSeconds: [15, 25, 40],
  jailFine: [50, 75, 100],
} as const;

export function boardMaxPlayers(board: BoardId): number {
  return board === 'mega' ? 8 : 6;
}

function pickNumber(v: unknown, allowed: readonly number[], fallback: number): number {
  return typeof v === 'number' && allowed.includes(v) ? v : fallback;
}

function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Coerce whatever is stored in game_rooms.settings into a complete, valid GameSettings. */
export function normalizeSettings(raw: unknown): GameSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<GameSettings>;
  const board: BoardId = r.board === 'mega' ? 'mega' : 'classic';
  const cap = boardMaxPlayers(board);
  const maxPlayers =
    typeof r.maxPlayers === 'number'
      ? Math.min(cap, Math.max(2, Math.round(r.maxPlayers)))
      : Math.min(cap, DEFAULT_SETTINGS.maxPlayers);

  return {
    board,
    maxPlayers,
    startingCash: pickNumber(r.startingCash, SETTING_OPTIONS.startingCash, DEFAULT_SETTINGS.startingCash),
    goSalary: pickNumber(r.goSalary, SETTING_OPTIONS.goSalary, DEFAULT_SETTINGS.goSalary),
    doubleRentOnFullSet: pickBool(r.doubleRentOnFullSet, DEFAULT_SETTINGS.doubleRentOnFullSet),
    auctionsEnabled: pickBool(r.auctionsEnabled, DEFAULT_SETTINGS.auctionsEnabled),
    mortgageEnabled: pickBool(r.mortgageEnabled, DEFAULT_SETTINGS.mortgageEnabled),
    evenBuild: pickBool(r.evenBuild, DEFAULT_SETTINGS.evenBuild),
    vacationCash: pickBool(r.vacationCash, DEFAULT_SETTINGS.vacationCash),
    setAdvantages: pickBool(r.setAdvantages, DEFAULT_SETTINGS.setAdvantages),
    auctionSeconds: pickNumber(r.auctionSeconds, SETTING_OPTIONS.auctionSeconds, DEFAULT_SETTINGS.auctionSeconds),
    jailFine: pickNumber(r.jailFine, SETTING_OPTIONS.jailFine, DEFAULT_SETTINGS.jailFine),
    randomizeOrder: pickBool(r.randomizeOrder, DEFAULT_SETTINGS.randomizeOrder),
  };
}
