'use client';

import { create } from 'zustand';
import type { GameRoom, Player, Property } from './types';
import { boardFor } from './game-data';

interface GameStore {
  room: GameRoom | null;
  players: Player[];
  properties: Property[];
  myPlayerId: string | null;
  lastDiceRoll: [number, number] | null;
  diceAnimating: boolean;
  boardSize: number;

  pendingPlayerUpdate: Player | null;
  walkingPlayerId: string | null;
  walkingTargetPosition: number | null;

  setRoom: (room: GameRoom) => void;
  setPlayers: (players: Player[]) => void;
  upsertPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setProperties: (properties: Property[]) => void;
  upsertProperty: (property: Property) => void;
  setMyPlayerId: (id: string) => void;
  triggerDiceRoll: (roll: [number, number]) => void;
  stopDiceAnimation: () => void;
  stopDiceSpin: () => void;
  startWalking: () => void;
}

// 'roll' and the transient server-side 'rolling' lock both count as the
// pre-result phase for animation detection.
function isRollPhase(phase: string | undefined): boolean {
  return phase === 'roll' || phase === 'rolling';
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,
  players: [],
  properties: [],
  myPlayerId: null,
  lastDiceRoll: null,
  diceAnimating: false,
  boardSize: 40,

  pendingPlayerUpdate: null,
  walkingPlayerId: null,
  walkingTargetPosition: null,

  setRoom: (room) => {
    const prev = get().room;
    const boardSize = boardFor(room).size;
    // A new roll occurs when the game is playing and the turn phase transitions OUT of 'roll'/'rolling'
    const isNewRoll = !!(
      room.status === 'playing' &&
      room.dice_roll &&
      prev?.status === 'playing' &&
      isRollPhase(prev.turn_phase) &&
      !isRollPhase(room.turn_phase)
    );
    // A turn change happens when the active player index advances (different player)
    const isTurnChange = !!(
      room.status === 'playing' &&
      prev?.status === 'playing' &&
      room.current_player_idx !== prev?.current_player_idx
    );
    set({ room, boardSize });
    if (isNewRoll) {
      // Find the player rolling and calculate their exact target position based on the dice roll
      const sortedPrev = get().players.slice().sort((a, b) => a.turn_order - b.turn_order);
      const cpPrev = sortedPrev[prev?.current_player_idx ?? 0];
      const totalRoll = room.dice_roll ? ((room.dice_roll[0] as number) + (room.dice_roll[1] as number)) : 0;
      const targetPos = cpPrev ? (cpPrev.position + totalRoll) % boardSize : null;
      const walkingId = cpPrev?.id ?? null;

      // Start the dice roll animation
      if (!get().diceAnimating) {
        set({
          lastDiceRoll: room.dice_roll as [number, number],
          diceAnimating: true,
          walkingPlayerId: walkingId,
          walkingTargetPosition: targetPos,
        });
        setTimeout(() => get().stopDiceSpin(), 1000);
        setTimeout(() => get().startWalking(), 1800);
      } else {
        set({
          lastDiceRoll: room.dice_roll as [number, number],
          walkingPlayerId: get().walkingPlayerId ?? walkingId,
          walkingTargetPosition: get().walkingTargetPosition ?? targetPos,
        });
      }
    } else if (isTurnChange) {
      // Clear stale dice from the previous player's turn so the board shows "waiting" state
      set({ lastDiceRoll: null });
    }
  },

  setPlayers: (players) => set({ players }),

  upsertPlayer: (player) =>
    set((s) => {
      const idx = s.players.findIndex((p) => p.id === player.id);
      if (idx === -1) return { players: [...s.players, player] };
      const existing = s.players[idx];
      const boardSize = s.boardSize || 40;

      // If a roll/walk is active or pending, we must NOT let the player's position
      // instantly jump in the store. Instead, we save the update as pending, and update
      // other player stats (like balance) while keeping their visual position at the old position.
      const isPositionChange = existing.position !== player.position;
      const isRollActiveOrPending =
        s.diceAnimating ||
        s.walkingPlayerId !== null ||
        (s.room?.status === 'playing' && isRollPhase(s.room.turn_phase));

      if (isPositionChange && isRollActiveOrPending) {
        const updatedWithOldPosition = { ...player, position: existing.position };
        const updated = [...s.players];
        updated[idx] = updatedWithOldPosition;

        // Calculate steps and target pos based on the new position (as backup)
        const steps = (player.position - existing.position + boardSize) % boardSize;
        const targetPos = (existing.position + steps) % boardSize;

        const isAlreadyAnimating = s.diceAnimating || s.walkingPlayerId !== null;
        if (!isAlreadyAnimating) {
          setTimeout(() => get().stopDiceSpin(), 1000);
          setTimeout(() => get().startWalking(), 1800);
        }

        return {
          players: updated,
          pendingPlayerUpdate: player,
          diceAnimating: isAlreadyAnimating ? s.diceAnimating : true,
          walkingPlayerId: player.id,
          walkingTargetPosition: s.walkingTargetPosition ?? targetPos,
        };
      }

      const updated = [...s.players];
      updated[idx] = player;
      return { players: updated };
    }),

  removePlayer: (playerId) =>
    set((s) => ({ players: s.players.filter((p) => p.id !== playerId) })),

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
    const sortedPrev = get().players.slice().sort((a, b) => a.turn_order - b.turn_order);
    const cpPrev = get().room ? sortedPrev[get().room!.current_player_idx] : null;
    const boardSize = get().boardSize || 40;
    const targetPos = cpPrev ? (cpPrev.position + roll[0] + roll[1]) % boardSize : null;

    set({
      lastDiceRoll: roll,
      diceAnimating: true,
      walkingPlayerId: cpPrev?.id ?? null,
      walkingTargetPosition: targetPos,
    });
    setTimeout(() => get().stopDiceSpin(), 1000);
    setTimeout(() => get().startWalking(), 1800);
  },

  stopDiceAnimation: () => set({ diceAnimating: false, walkingPlayerId: null, walkingTargetPosition: null, pendingPlayerUpdate: null }),
  stopDiceSpin: () => set({ diceAnimating: false }),

  startWalking: () => {
    const { walkingPlayerId, walkingTargetPosition } = get();
    if (!walkingPlayerId || walkingTargetPosition === null) {
      set({ walkingPlayerId: null, walkingTargetPosition: null, pendingPlayerUpdate: null });
      return;
    }

    const interval = setInterval(() => {
      const state = get();
      if (!state.walkingPlayerId || state.walkingTargetPosition === null) {
        clearInterval(interval);
        return;
      }

      const pIdx = state.players.findIndex(p => p.id === state.walkingPlayerId);
      if (pIdx === -1) {
        clearInterval(interval);
        set({ walkingPlayerId: null, walkingTargetPosition: null, pendingPlayerUpdate: null });
        return;
      }

      const player = state.players[pIdx];
      if (player.position === state.walkingTargetPosition) {
        clearInterval(interval);
        // Apply pending player updates (like final teleport to jail or GO) once walk finishes
        const finalUpdate = state.pendingPlayerUpdate;
        if (finalUpdate) {
          const finalPlayers = [...state.players];
          const pIdx2 = finalPlayers.findIndex(p => p.id === finalUpdate.id);
          if (pIdx2 !== -1) {
            finalPlayers[pIdx2] = finalUpdate;
          }
          set({
            players: finalPlayers,
            walkingPlayerId: null,
            walkingTargetPosition: null,
            pendingPlayerUpdate: null,
          });
        } else {
          set({ walkingPlayerId: null, walkingTargetPosition: null });
        }
        return;
      }

      // Move player visually exactly 1 tile forward along the perimeter
      const nextPos = (player.position + 1) % (state.boardSize || 40);
      const updatedPlayers = [...state.players];
      updatedPlayers[pIdx] = { ...player, position: nextPos };

      set({ players: updatedPlayers });

      if (nextPos === state.walkingTargetPosition) {
        clearInterval(interval);
        // Delay slightly at the end of the walk to allow the slide animation to finish smoothly
        setTimeout(() => {
          const currentState = get();
          const finalUpdate = currentState.pendingPlayerUpdate;
          if (finalUpdate) {
            const finalPlayers = [...currentState.players];
            const pIdx2 = finalPlayers.findIndex(p => p.id === finalUpdate.id);
            if (pIdx2 !== -1) {
              finalPlayers[pIdx2] = finalUpdate;
            }
            set({
              players: finalPlayers,
              walkingPlayerId: null,
              walkingTargetPosition: null,
              pendingPlayerUpdate: null,
            });
          } else {
            set({
              walkingPlayerId: null,
              walkingTargetPosition: null,
            });
          }
        }, 220);
      }
    }, 260); // Deliberate 260ms walking steps
  },
}));

export function selectCurrentPlayer(store: GameStore): Player | null {
  if (!store.room) return null;
  const sorted = store.players.slice().sort((a, b) => a.turn_order - b.turn_order);
  return sorted[store.room.current_player_idx] ?? null;
}

export function selectMyPlayer(store: GameStore): Player | null {
  if (!store.myPlayerId) return null;
  return store.players.find((p) => p.id === store.myPlayerId) ?? null;
}

export function selectIsMyTurn(store: GameStore): boolean {
  if (!store.room || !store.myPlayerId) return false;
  return selectCurrentPlayer(store)?.id === store.myPlayerId;
}
