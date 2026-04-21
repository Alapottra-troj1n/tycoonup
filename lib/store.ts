'use client';

import { create } from 'zustand';
import type { GameRoom, Player, Property, EventLogEntry } from './types';

interface GameStore {
  room: GameRoom | null;
  players: Player[];
  properties: Property[];
  myPlayerId: string | null;
  lastDiceRoll: [number, number] | null;
  diceAnimating: boolean;

  setRoom: (room: GameRoom) => void;
  setPlayers: (players: Player[]) => void;
  upsertPlayer: (player: Player) => void;
  setProperties: (properties: Property[]) => void;
  upsertProperty: (property: Property) => void;
  setMyPlayerId: (id: string) => void;
  triggerDiceRoll: (roll: [number, number]) => void;
  stopDiceAnimation: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,
  players: [],
  properties: [],
  myPlayerId: null,
  lastDiceRoll: null,
  diceAnimating: false,

  setRoom: (room) => {
    const prev = get().room;
    const isNewRoll =
      room.dice_roll &&
      (prev?.dice_roll?.[0] !== room.dice_roll[0] || prev?.dice_roll?.[1] !== room.dice_roll[1]);
    set({ room });
    if (isNewRoll) {
      set({ lastDiceRoll: room.dice_roll as [number, number], diceAnimating: true });
      setTimeout(() => set({ diceAnimating: false }), 2000);
    }
  },

  setPlayers: (players) => set({ players }),

  upsertPlayer: (player) =>
    set((s) => {
      const idx = s.players.findIndex((p) => p.id === player.id);
      if (idx === -1) return { players: [...s.players, player] };
      const updated = [...s.players];
      updated[idx] = player;
      return { players: updated };
    }),

  setProperties: (properties) => set({ properties }),

  upsertProperty: (property) =>
    set((s) => {
      const idx = s.properties.findIndex((p) => p.id === property.id);
      if (idx === -1) return { properties: [...s.properties, property] };
      const updated = [...s.properties];
      updated[idx] = property;
      return { properties: updated };
    }),

  setMyPlayerId: (id) => set({ myPlayerId: id }),

  triggerDiceRoll: (roll) => {
    set({ lastDiceRoll: roll, diceAnimating: true });
    setTimeout(() => set({ diceAnimating: false }), 2000);
  },

  stopDiceAnimation: () => set({ diceAnimating: false }),
}));

export function selectCurrentPlayer(store: GameStore): Player | null {
  if (!store.room) return null;
  return store.players[store.room.current_player_idx] ?? null;
}

export function selectMyPlayer(store: GameStore): Player | null {
  if (!store.myPlayerId) return null;
  return store.players.find((p) => p.id === store.myPlayerId) ?? null;
}

export function selectIsMyTurn(store: GameStore): boolean {
  if (!store.room || !store.myPlayerId) return false;
  const current = store.players[store.room.current_player_idx];
  return current?.id === store.myPlayerId;
}
