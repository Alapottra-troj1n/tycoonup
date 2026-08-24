'use server';

import { createServerClient } from '@/lib/supabase-server';
import {
  BOARDS,
  type BoardDef,
  CHEST_QUESTIONS,
  EVENT_CARDS,
  JAIL_TURNS_MAX,
  SET_PERKS,
  SET_COUNTRY_NAMES,
  ALL_PLAYER_COLORS,
  generateRoomCode,
  calcTransportRent,
  calcUtilityRent,
  transportTileIds,
  utilityTileIds,
} from '@/lib/game-data';
import { normalizeSettings, boardMaxPlayers } from '@/lib/settings';
import type {
  ActionResult,
  DiceResult,
  GameRoom,
  GameSettings,
  Player,
  Property,
  PlayerColor,
  CountrySet,
  EventLogEntry,
  PendingAction,
} from '@/lib/types';

// ──────────────────────────── helpers ────────────────────────────

function log(
  message: string,
  type: EventLogEntry['type'] = 'system',
): EventLogEntry {
  return { id: crypto.randomUUID(), timestamp: Date.now(), message, type };
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

type Supa = ReturnType<typeof createServerClient>;

function settingsOf(room: Pick<GameRoom, 'settings'>): GameSettings {
  return normalizeSettings(room.settings);
}

function boardOf(room: Pick<GameRoom, 'settings'>): BoardDef {
  return BOARDS[settingsOf(room).board];
}

/** Friendly error when the settings migration has not been applied yet. */
function migrationHint(message: string): string {
  if (/settings|vacation_pot/i.test(message)) {
    return 'Database is missing the settings columns — run supabase/migrations/003_settings.sql in the Supabase SQL editor.';
  }
  return message;
}

/** True when the player owns every (unmortgaged) tile of a set. */
function ownsFullSetSrv(
  board: BoardDef,
  props: Property[] | null | undefined,
  set: CountrySet,
  playerId: string,
): boolean {
  const setTileIds = board.tiles.filter((t) => t.set === set).map((t) => t.id);
  return setTileIds.every((id) =>
    props?.find((p) => p.tile_id === id && p.owner_id === playerId && !p.is_mortgaged),
  );
}

/** All sets the player fully owns (unmortgaged). */
function fullSetsOf(board: BoardDef, props: Property[] | null | undefined, playerId: string): CountrySet[] {
  const sets = new Set<CountrySet>();
  for (const t of board.tiles) if (t.set) sets.add(t.set);
  return [...sets].filter((s) => ownsFullSetSrv(board, props, s, playerId));
}

/**
 * Income a player collects at the start of their turn from monopoly perks.
 * Returns [amount, labels].
 */
function turnStartIncome(
  board: BoardDef,
  props: Property[] | null | undefined,
  player: Player,
  settings: GameSettings,
): [number, string[]] {
  if (!settings.setAdvantages) return [0, []];
  let total = 0;
  const labels: string[] = [];
  for (const set of fullSetsOf(board, props, player.id)) {
    for (const perk of SET_PERKS[set] ?? []) {
      if (perk.kind === 'turn_income' && (perk.minBalance === undefined || player.balance >= perk.minBalance)) {
        total += perk.amount;
        labels.push(`${SET_COUNTRY_NAMES[set] ?? set} monopoly +$${perk.amount}`);
      }
    }
  }
  return [total, labels];
}

/** Sum of go_bonus perks for the player's full sets. */
function goBonusIncome(
  board: BoardDef,
  props: Property[] | null | undefined,
  playerId: string,
  settings: GameSettings,
): [number, string[]] {
  if (!settings.setAdvantages) return [0, []];
  let total = 0;
  const labels: string[] = [];
  for (const set of fullSetsOf(board, props, playerId)) {
    for (const perk of SET_PERKS[set] ?? []) {
      if (perk.kind === 'go_bonus') {
        total += perk.amount;
        labels.push(`${SET_COUNTRY_NAMES[set] ?? set} monopoly +$${perk.amount}`);
      }
    }
  }
  return [total, labels];
}

function nextActiveIdx(players: Player[], fromIdx: number): number {
  let idx = (fromIdx + 1) % Math.max(players.length, 1);
  let safety = 0;
  while (players[idx]?.is_bankrupt && safety < players.length + 2) {
    idx = (idx + 1) % players.length;
    safety++;
  }
  return idx;
}

/**
 * Make a player bankrupt: transfer their assets to the creditor (when owed to
 * another player) or release them to the bank, then mark them bankrupt.
 * Mutates `players` in memory so callers see the updated state.
 */
async function bankruptPlayer(
  supabase: Supa,
  roomId: string,
  players: Player[],
  debtor: Player,
  creditorId: string | null,
  eventLog: EventLogEntry[],
): Promise<void> {
  if (creditorId) {
    await supabase.from('properties')
      .update({ owner_id: creditorId, upgrade_level: 0, is_mortgaged: false })
      .eq('room_id', roomId).eq('owner_id', debtor.id);
    const goojf = debtor.goojf_cards ?? 0;
    const creditor = players.find((p) => p.id === creditorId);
    if (goojf > 0 && creditor) {
      await supabase.from('players')
        .update({ goojf_cards: (creditor.goojf_cards ?? 0) + goojf })
        .eq('id', creditorId);
    }
    eventLog.push(log(`${debtor.name}'s assets transferred to ${creditor?.name ?? 'creditor'}.`, 'system'));
  } else {
    await supabase.from('properties')
      .update({ owner_id: null, upgrade_level: 0, is_mortgaged: false })
      .eq('room_id', roomId)
      .eq('owner_id', debtor.id);
    eventLog.push(log(`${debtor.name}'s properties returned to the bank.`, 'system'));
  }
  await supabase.from('players').update({ is_bankrupt: true, balance: 0, goojf_cards: 0 }).eq('id', debtor.id);
  debtor.is_bankrupt = true;
  debtor.balance = 0;
  eventLog.push(log(`${debtor.name} went bankrupt!`, 'system'));
}

/**
 * Advance the game to the next active player (handles win condition and
 * turn-start passive income). Performs the final game_rooms update, merging in
 * `extraRoomFields` (e.g. fresh dice values).
 */
async function advanceTurn(
  supabase: Supa,
  room: GameRoom,
  players: Player[],
  props: Property[] | null | undefined,
  eventLog: EventLogEntry[],
  extraRoomFields: Record<string, unknown> = {},
): Promise<ActionResult> {
  const settings = settingsOf(room);
  const board = boardOf(room);
  const active = players.filter((p) => !p.is_bankrupt);

  if (active.length <= 1) {
    if (active.length === 1) eventLog.push(log(`🏆 ${active[0].name} wins the game!`, 'system'));
    const { error } = await supabase.from('game_rooms').update({
      status: 'finished',
      pending_action: null,
      event_log: eventLog.slice(-50),
      ...extraRoomFields,
    }).eq('id', room.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const nextIdx = nextActiveIdx(players, room.current_player_idx);
  const nextPlayer = players[nextIdx];

  if (nextPlayer) {
    const [income, labels] = turnStartIncome(board, props, nextPlayer, settings);
    if (income > 0) {
      await supabase.from('players')
        .update({ balance: nextPlayer.balance + income })
        .eq('id', nextPlayer.id);
      eventLog.push(log(`${nextPlayer.name} earned $${income} passive income (${labels.join(', ')}).`, 'system'));
    }
    eventLog.push(log(`${nextPlayer.name}'s turn.`, 'system'));
  }

  const { error } = await supabase.from('game_rooms').update({
    current_player_idx: nextIdx,
    turn_phase: 'roll',
    pending_action: null,
    doubles_turn: false,
    doubles_streak: 0,
    event_log: eventLog.slice(-50),
    ...extraRoomFields,
  }).eq('id', room.id);

  if (error) return { success: false, error: `DB Update Failed: ${error.message}` };
  return { success: true };
}

// ──────────────────────────── create / join ────────────────────────────

export async function createRoom(
  playerName: string,
  color: PlayerColor,
  settingsInput?: Partial<GameSettings>,
): Promise<ActionResult<{ roomCode: string; playerId: string }>> {
  try {
    const supabase = createServerClient();
    const roomCode = generateRoomCode();
    const settings = normalizeSettings(settingsInput);

    let { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        status: 'lobby',
        current_player_idx: 0,
        turn_phase: 'roll',
        settings,
        event_log: [log(`Room ${roomCode} created.`)],
      })
      .select()
      .single();

    // Settings column missing (migration 003 not applied) — fall back to defaults.
    if (roomError && /settings/i.test(roomError.message)) {
      ({ data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          status: 'lobby',
          current_player_idx: 0,
          turn_phase: 'roll',
          event_log: [log(`Room ${roomCode} created.`)],
        })
        .select()
        .single());
    }

    if (roomError || !room) {
      return { success: false, error: roomError?.message ?? 'Failed to create room' };
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName.trim().slice(0, 20),
        color,
        balance: settings.startingCash,
        position: 0,
        in_jail: false,
        jail_turns: 0,
        is_bankrupt: false,
        turn_order: 0,
      })
      .select()
      .single();

    if (playerError || !player) {
      return { success: false, error: playerError?.message ?? 'Failed to create player' };
    }

    return { success: true, data: { roomCode, playerId: player.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
  color: PlayerColor,
): Promise<ActionResult<{ roomId: string; playerId: string }>> {
  try {
    const supabase = createServerClient();

    const { data: room, error: roomErr } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomErr || !room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Game already started' };

    const settings = settingsOf(room);

    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id, color')
      .eq('room_id', room.id);

    if ((existingPlayers?.length ?? 0) >= settings.maxPlayers) {
      return { success: false, error: `Room is full (max ${settings.maxPlayers} players)` };
    }

    if (existingPlayers?.some((p) => p.color === color)) {
      return { success: false, error: 'Color already taken' };
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName.trim().slice(0, 20),
        color,
        balance: settings.startingCash,
        position: 0,
        in_jail: false,
        jail_turns: 0,
        is_bankrupt: false,
        turn_order: existingPlayers?.length ?? 0,
      })
      .select()
      .single();

    if (playerErr || !player) {
      return { success: false, error: playerErr?.message ?? 'Failed to join' };
    }

    const newLog = [...(room.event_log ?? []), log(`${playerName} joined the game.`)];
    await supabase.from('game_rooms').update({ event_log: newLog }).eq('id', room.id);

    return { success: true, data: { roomId: room.id, playerId: player.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── lobby management ────────────────────────────

function hostOf(players: Player[] | null | undefined): Player | undefined {
  return players
    ?.slice()
    .sort((a, b) => a.turn_order - b.turn_order)
    .find((p) => !p.is_bot);
}

export async function updateRoomSettings(
  roomId: string,
  playerId: string,
  patch: Partial<GameSettings>,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Settings can only be changed in the lobby' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
    if (hostOf(players)?.id !== playerId) {
      return { success: false, error: 'Only the host can change settings' };
    }

    const current = settingsOf(room);
    const next = normalizeSettings({ ...current, ...patch });

    const playerCount = players?.length ?? 0;
    if (boardMaxPlayers(next.board) < playerCount) {
      return { success: false, error: `The ${next.board} board supports up to ${boardMaxPlayers(next.board)} players — remove players first` };
    }
    // Never allow the cap to drop below the players already in the room
    next.maxPlayers = Math.max(next.maxPlayers, Math.max(2, playerCount));

    const { error } = await supabase.from('game_rooms').update({ settings: next }).eq('id', roomId);
    if (error) return { success: false, error: migrationHint(error.message) };

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function kickPlayer(
  roomId: string,
  hostPlayerId: string,
  targetPlayerId: string,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Players can only be removed in the lobby' };

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('turn_order');

    const host = hostOf(players);
    if (host?.id !== hostPlayerId) return { success: false, error: 'Only the host can remove players' };
    if (targetPlayerId === host.id) return { success: false, error: 'The host cannot remove themselves' };

    const target = players?.find((p) => p.id === targetPlayerId);
    if (!target) return { success: false, error: 'Player not found' };

    await supabase.from('players').delete().eq('id', targetPlayerId);

    // Re-number turn_order so it stays contiguous
    const remaining = (players ?? []).filter((p) => p.id !== targetPlayerId);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].turn_order !== i) {
        await supabase.from('players').update({ turn_order: i }).eq('id', remaining[i].id);
      }
    }

    const newLog = [...(room.event_log ?? []), log(`${target.name} was removed from the lobby.`)];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── start game ────────────────────────────

export async function startGame(
  roomId: string,
  playerId: string,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Game already started' };

    const settings = settingsOf(room);

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('turn_order');

    if (!players || players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    if (hostOf(players)?.id !== playerId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    const ordered = settings.randomizeOrder
      ? [...players].sort(() => Math.random() - 0.5)
      : [...players];

    for (let i = 0; i < ordered.length; i++) {
      // Apply the (possibly host-edited) starting cash and reset state for everyone
      await supabase.from('players').update({
        turn_order: i,
        balance: settings.startingCash,
        position: 0,
        in_jail: false,
        jail_turns: 0,
        is_bankrupt: false,
        goojf_cards: 0,
      }).eq('id', ordered[i].id);
    }

    const eventLog = [
      ...(room.event_log ?? []),
      log(`Game started on the ${boardOf(room).name} board! ${ordered[0].name} goes first. Good luck!`),
    ];

    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        current_player_idx: 0,
        turn_phase: 'roll',
        pending_action: null,
        event_log: eventLog.slice(-50),
      })
      .eq('id', roomId);

    if (updateError) return { success: false, error: updateError.message };

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── roll dice ────────────────────────────

export async function rollDice(
  roomId: string,
  playerId: string,
): Promise<ActionResult<DiceResult>> {
  const supabase = createServerClient();

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (!room) return { success: false, error: 'Room not found' };
  if (room.status !== 'playing') return { success: false, error: 'Game not in progress' };
  if (room.turn_phase !== 'roll') return { success: false, error: 'Not in roll phase' };

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('turn_order');

  const currentPlayer: Player | undefined = players?.[room.current_player_idx];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { success: false, error: 'Not your turn' };
  }
  if (currentPlayer.is_bankrupt) return { success: false, error: 'You are bankrupt' };

  // Atomically claim the roll — prevents double-click / double-client races.
  const { data: claimed } = await supabase
    .from('game_rooms')
    .update({ turn_phase: 'rolling' })
    .eq('id', roomId)
    .eq('turn_phase', 'roll')
    .select('id');
  if (!claimed || claimed.length === 0) {
    return { success: false, error: 'Roll already in progress' };
  }

  try {
    const settings = settingsOf(room);
    const board = boardOf(room);
    const SIZE = board.size;

    const { data: allProperties } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId);

    const d1 = rollDie();
    const d2 = rollDie();
    const isDoubles = d1 === d2;
    const totalRoll = d1 + d2;
    const eventLog: EventLogEntry[] = [...(room.event_log ?? [])];
    let potDelta = 0; // vacation pot change this roll

    // A dice roll supersedes any unanswered trade offer
    if (room.pending_action?.type === 'trade_offer') {
      eventLog.push(log('Pending trade offer expired (dice were rolled).', 'system'));
    }

    const prevStreak = room.doubles_streak ?? 0;

    // ── Third consecutive double: go to jail ──
    if (isDoubles && prevStreak >= 2 && !currentPlayer.in_jail) {
      await supabase
        .from('players')
        .update({ in_jail: true, jail_turns: 0, position: board.jailPos })
        .eq('id', playerId);

      eventLog.push(log(`${currentPlayer.name} rolled doubles 3 times in a row — Go to Jail!`, 'jail'));

      await supabase.from('game_rooms').update({
        dice_roll: [d1, d2],
        doubles_turn: false,
        doubles_streak: 0,
        pending_action: null,
        turn_phase: 'end',
        event_log: eventLog.slice(-50),
      }).eq('id', roomId);

      return { success: true, data: { d1, d2, newPosition: board.jailPos, balanceChange: 0, message: 'Triple doubles — Jail!' } };
    }

    const wasInJail = currentPlayer.in_jail;
    let balanceChange = 0;

    // ── Jail logic ──
    if (currentPlayer.in_jail) {
      if (isDoubles) {
        await supabase.from('players').update({ in_jail: false, jail_turns: 0 }).eq('id', playerId);
        eventLog.push(log(`${currentPlayer.name} rolled doubles and escaped jail!`, 'jail'));
      } else {
        const newJailTurns = currentPlayer.jail_turns + 1;
        if (newJailTurns >= JAIL_TURNS_MAX) {
          // Forced bail on the final jail turn — tracked via balanceChange
          balanceChange -= settings.jailFine;
          if (settings.vacationCash) potDelta += settings.jailFine;
          await supabase.from('players').update({ in_jail: false, jail_turns: 0 }).eq('id', playerId);
          eventLog.push(log(`${currentPlayer.name} paid $${settings.jailFine} bail and left jail.`, 'jail'));
        } else {
          await supabase.from('players').update({ jail_turns: newJailTurns }).eq('id', playerId);
          eventLog.push(log(`${currentPlayer.name} is stuck in jail (${newJailTurns}/${JAIL_TURNS_MAX} turns).`, 'jail'));
          await supabase.from('game_rooms').update({
            dice_roll: [d1, d2],
            doubles_turn: false,
            doubles_streak: 0,
            pending_action: null,
            turn_phase: 'end',
            event_log: eventLog.slice(-50),
          }).eq('id', roomId);
          return { success: true, data: { d1, d2, newPosition: board.jailPos, balanceChange: 0, message: 'Still in jail' } };
        }
      }
    }

    // ── Move ──
    const oldPosition = currentPlayer.position;
    let newPosition = (oldPosition + totalRoll) % SIZE;

    // Passed GO
    const passedGo = oldPosition + totalRoll >= SIZE;
    if (passedGo && settings.goSalary > 0) {
      balanceChange += settings.goSalary;
      eventLog.push(log(`${currentPlayer.name} passed GO! +$${settings.goSalary}`, 'move'));
    }
    if (passedGo) {
      const [goBonus, goLabels] = goBonusIncome(board, allProperties, playerId, settings);
      if (goBonus > 0) {
        balanceChange += goBonus;
        eventLog.push(log(`${currentPlayer.name} earned a GO bonus: ${goLabels.join(', ')}.`, 'system'));
      }
    }

    // doubles_income perks: pay set owners when ANY other player rolls doubles
    if (isDoubles && settings.setAdvantages) {
      for (const other of players ?? []) {
        if (other.id === playerId || other.is_bankrupt) continue;
        let payout = 0;
        const sets = fullSetsOf(board, allProperties, other.id);
        for (const set of sets) {
          for (const perk of SET_PERKS[set] ?? []) {
            if (perk.kind === 'doubles_income') payout += perk.amount;
          }
        }
        if (payout > 0) {
          await supabase.from('players').update({ balance: other.balance + payout }).eq('id', other.id);
          eventLog.push(log(`${other.name} collected $${payout} from their monopoly (doubles rolled)!`, 'system'));
        }
      }
    }

    const tile = board.tiles[newPosition];
    let pendingAction: PendingAction | null = null;
    let nextPhase: 'roll' | 'action' | 'end' = 'end';
    let creditorId: string | null = null; // who gets the debtor's assets on bankruptcy
    let shortfall = 0;                    // unpaid debt this roll → triggers bankruptcy
    let sentToJail = false;
    const message = `${currentPlayer.name} rolled ${d1}+${d2}=${totalRoll} → ${tile.name}`;
    eventLog.push(log(message, 'move'));

    // ── Tile effects ──
    switch (tile.type) {
      case 'country':
      case 'transport':
      case 'utility': {
        const prop = allProperties?.find((p) => p.tile_id === newPosition);
        if (!prop || !prop.owner_id) {
          // Unowned — offer to buy
          pendingAction = {
            type: 'buy_offer',
            tile_id: newPosition,
            player_id: playerId,
            price: tile.buyPrice ?? 0,
          };
          nextPhase = 'action';
        } else if (prop.owner_id !== playerId && !prop.is_mortgaged) {
          // Owned by opponent — pay rent
          let rent = 0;
          if (tile.type === 'country') {
            rent = tile.rentLevels?.[prop.upgrade_level] ?? 0;
            if (tile.set && ownsFullSetSrv(board, allProperties, tile.set, prop.owner_id)) {
              if (prop.upgrade_level === 0 && settings.doubleRentOnFullSet) rent *= 2;
              if (settings.setAdvantages) {
                for (const perk of SET_PERKS[tile.set] ?? []) {
                  if (perk.kind === 'rent_bonus') rent += perk.amount;
                  if (perk.kind === 'rent_per_level') rent += perk.amount * prop.upgrade_level;
                }
              }
            }
          } else if (tile.type === 'transport') {
            const ids = transportTileIds(board);
            const owned = allProperties?.filter(
              (p) => p.owner_id === prop.owner_id && ids.includes(p.tile_id) && !p.is_mortgaged,
            );
            rent = calcTransportRent(Math.max(owned?.length ?? 1, 1));
          } else if (tile.type === 'utility') {
            const ids = utilityTileIds(board);
            const owned = allProperties?.filter(
              (p) => p.owner_id === prop.owner_id && ids.includes(p.tile_id) && !p.is_mortgaged,
            );
            rent = calcUtilityRent(totalRoll, Math.max(owned?.length ?? 1, 1));
          }

          const available = Math.max(0, currentPlayer.balance + balanceChange);
          const paid = Math.min(rent, available);
          balanceChange -= paid;
          if (paid < rent) {
            shortfall = rent - paid;
            creditorId = prop.owner_id;
          }

          const owner = players?.find((p) => p.id === prop.owner_id);
          if (owner) {
            await supabase.from('players').update({ balance: owner.balance + paid }).eq('id', owner.id);
            owner.balance += paid;
          }

          eventLog.push(log(
            `${currentPlayer.name} paid $${paid} rent to ${owner?.name ?? 'bank'} for ${tile.name}.`,
            'rent',
          ));
          pendingAction = {
            type: 'pay_rent',
            tile_id: newPosition,
            player_id: playerId,
            amount: paid,
            recipient_id: prop.owner_id,
          };
          nextPhase = 'end';
        }
        break;
      }

      case 'chest': {
        const q = CHEST_QUESTIONS[Math.floor(Math.random() * CHEST_QUESTIONS.length)];
        pendingAction = { type: 'chest_quiz', player_id: playerId, question: q };
        nextPhase = 'action';
        break;
      }

      case 'event': {
        const ev = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
        if (ev.type === 'gain') {
          balanceChange += ev.amount;
        } else if (ev.type === 'lose') {
          const available = Math.max(0, currentPlayer.balance + balanceChange);
          const owed = Math.abs(ev.amount);
          const paid = Math.min(owed, available);
          balanceChange -= paid;
          if (paid < owed) shortfall = owed - paid;
          if (settings.vacationCash) potDelta += paid;
        } else if (ev.type === 'move_go') {
          newPosition = 0;
          balanceChange += settings.goSalary;
        } else if (ev.type === 'jail') {
          newPosition = board.jailPos;
          sentToJail = true;
          await supabase.from('players').update({ in_jail: true, jail_turns: 0, position: board.jailPos }).eq('id', playerId);
        } else if (ev.type === 'collect_all') {
          let total = 0;
          for (const p of players ?? []) {
            if (p.id !== playerId && !p.is_bankrupt) {
              const pay = Math.min(ev.amount, p.balance);
              await supabase.from('players').update({ balance: p.balance - pay }).eq('id', p.id);
              p.balance -= pay;
              total += pay;
            }
          }
          balanceChange += total;
        } else if (ev.type === 'pay_all') {
          const each = Math.abs(ev.amount);
          let total = 0;
          for (const p of players ?? []) {
            if (p.id !== playerId && !p.is_bankrupt) {
              const available = Math.max(0, currentPlayer.balance + balanceChange - total);
              const pay = Math.min(each, available);
              await supabase.from('players').update({ balance: p.balance + pay }).eq('id', p.id);
              p.balance += pay;
              total += pay;
              if (pay < each) shortfall += each - pay;
            }
          }
          balanceChange -= total;
        } else if (ev.type === 'goojf') {
          const newCards = (currentPlayer.goojf_cards ?? 0) + 1;
          await supabase.from('players').update({ goojf_cards: newCards }).eq('id', playerId);
        }
        eventLog.push(log(`Event: ${ev.message}`, 'event'));
        pendingAction = { type: 'event_result', player_id: playerId, message: ev.message };
        nextPhase = 'end';
        break;
      }

      case 'tax': {
        if (tile.taxType === 'percent') {
          // Income Tax: player chooses flat $200 OR 10% of net worth (spec §4.5)
          let netWorth = currentPlayer.balance + balanceChange;
          for (const p of allProperties?.filter((p2) => p2.owner_id === playerId) ?? []) {
            const t = board.tiles[p.tile_id];
            netWorth += t.buyPrice ?? 0;
            if (p.upgrade_level > 0 && t.upgradePrice) netWorth += p.upgrade_level * t.upgradePrice;
            if (p.is_mortgaged) netWorth -= t.mortgageValue ?? 0;
          }
          pendingAction = {
            type: 'income_tax_choice',
            player_id: playerId,
            net_worth_tax: Math.max(0, Math.round(netWorth * 0.1)),
            flat_tax: 200,
          };
          nextPhase = 'action';
        } else {
          // Flat tax (Luxury Tax) — no choice
          const tax = tile.taxAmount ?? 0;
          const available = Math.max(0, currentPlayer.balance + balanceChange);
          const taxPaid = Math.min(tax, available);
          balanceChange -= taxPaid;
          if (taxPaid < tax) shortfall += tax - taxPaid;
          if (settings.vacationCash) potDelta += taxPaid;
          eventLog.push(log(`${currentPlayer.name} paid $${taxPaid} tax.`, 'tax'));
          pendingAction = { type: 'tax_paid', player_id: playerId, amount: taxPaid };
          nextPhase = 'end';
        }
        break;
      }

      case 'go-to-jail': {
        newPosition = board.jailPos;
        sentToJail = true;
        await supabase.from('players').update({ in_jail: true, jail_turns: 0, position: board.jailPos }).eq('id', playerId);
        eventLog.push(log(`${currentPlayer.name} went to Jail!`, 'jail'));
        nextPhase = 'end';
        break;
      }

      case 'free-parking': {
        // Vacation cash: collect the pooled taxes & fines
        if (settings.vacationCash) {
          const pot = room.vacation_pot ?? 0;
          if (pot > 0) {
            balanceChange += pot;
            potDelta -= pot;
            eventLog.push(log(`🏖️ ${currentPlayer.name} landed on Vacation and collected the $${pot} pot!`, 'system'));
          } else {
            eventLog.push(log(`🏖️ ${currentPlayer.name} is on vacation — the pot is empty.`, 'system'));
          }
        }
        break;
      }

      default:
        // GO, jail (visiting) — nothing happens
        break;
    }

    // Any residual negative balance (e.g. forced bail exceeding cash) is unpaid debt
    shortfall += Math.max(0, -(currentPlayer.balance + balanceChange));

    // ── Update player position + balance ──
    const newBalance = Math.max(0, currentPlayer.balance + balanceChange);
    if (!sentToJail) {
      await supabase.from('players').update({ position: newPosition, balance: newBalance }).eq('id', playerId);
    } else {
      // Position already set to jail; only sync the balance
      await supabase.from('players').update({ balance: newBalance }).eq('id', playerId);
    }
    currentPlayer.balance = newBalance;
    currentPlayer.position = newPosition;

    // ── Doubles tracking ──
    const newStreak = isDoubles && !wasInJail ? prevStreak + 1 : 0;
    const doublesTurn = isDoubles && !wasInJail && !sentToJail;

    const potFields = settings.vacationCash && potDelta !== 0
      ? { vacation_pot: Math.max(0, (room.vacation_pot ?? 0) + potDelta) }
      : {};

    // ── Bankruptcy: couldn't fully pay an obligation ──
    if (shortfall > 0 && players) {
      await bankruptPlayer(supabase, roomId, players, currentPlayer, creditorId, eventLog);
      const result = await advanceTurn(supabase, room, players, allProperties, eventLog, {
        dice_roll: [d1, d2],
        ...potFields,
      });
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: { d1, d2, newPosition, balanceChange, message } };
    }

    const { error: updateError } = await supabase.from('game_rooms').update({
      dice_roll: [d1, d2],
      doubles_turn: doublesTurn,
      doubles_streak: newStreak,
      pending_action: pendingAction,
      turn_phase: nextPhase,
      event_log: eventLog.slice(-50),
      ...potFields,
    }).eq('id', roomId);

    if (updateError) {
      // Roll back position/balance since the room update failed
      await supabase.from('players').update({ position: oldPosition, balance: currentPlayer.balance }).eq('id', playerId);
      await supabase.from('game_rooms').update({ turn_phase: 'roll' }).eq('id', roomId).eq('turn_phase', 'rolling');
      return { success: false, error: `DB Update Failed: ${updateError.message}` };
    }

    return { success: true, data: { d1, d2, newPosition, balanceChange, message } };
  } catch (e) {
    // Release the roll lock so the game doesn't soft-lock
    await supabase.from('game_rooms').update({ turn_phase: 'roll' }).eq('id', roomId).eq('turn_phase', 'rolling');
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── buy property ────────────────────────────

export async function buyProperty(
  roomId: string,
  playerId: string,
  tileId: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const pending = room.pending_action;
    if (pending?.type !== 'buy_offer' || pending.player_id !== playerId || pending.tile_id !== tileId) {
      return { success: false, error: 'No active purchase offer for you' };
    }

    const board = boardOf(room);
    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };
    if (player.is_bankrupt) return { success: false, error: 'You are bankrupt' };

    const tile = board.tiles[tileId];
    if (!tile?.buyPrice) return { success: false, error: 'Tile cannot be purchased' };
    if (player.balance < tile.buyPrice) return { success: false, error: 'Insufficient funds' };

    // Guard against double-purchase
    const { data: existing } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('room_id', roomId)
      .eq('tile_id', tileId)
      .maybeSingle();
    if (existing?.owner_id) return { success: false, error: 'Property is already owned' };

    await supabase.from('properties').upsert(
      { room_id: roomId, tile_id: tileId, owner_id: playerId, upgrade_level: 0, is_mortgaged: false },
      { onConflict: 'room_id,tile_id' },
    );

    await supabase.from('players').update({ balance: player.balance - tile.buyPrice }).eq('id', playerId);

    const newLog = [
      ...(room.event_log ?? []),
      log(`${player.name} bought ${tile.flag ?? ''} ${tile.name} for $${tile.buyPrice}.`, 'buy'),
    ];

    // If player had rolled doubles, they still get their extra roll
    const nextPhase = room.doubles_turn ? 'roll' : 'end';

    const { error: updateError } = await supabase.from('game_rooms').update({
      pending_action: null,
      turn_phase: nextPhase,
      doubles_turn: false,
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

    if (updateError) {
      return { success: false, error: `DB Update Failed: ${updateError.message}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── skip buy → auction ────────────────────────────

export async function skipBuy(roomId: string, playerId: string): Promise<ActionResult> {
  try {
    const supabase = createServerClient();
    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'buy_offer' || pending.player_id !== playerId) {
      return { success: false, error: 'No buy offer active' };
    }

    const settings = settingsOf(room);
    const board = boardOf(room);
    const tile = board.tiles[pending.tile_id ?? 0];

    // Auctions disabled — the property simply stays with the bank
    if (!settings.auctionsEnabled) {
      const newLog = [
        ...(room.event_log ?? []),
        log(`${tile?.name ?? 'Property'} was declined and stays with the bank.`, 'system'),
      ];
      const nextPhase = room.doubles_turn ? 'roll' : 'end';
      await supabase.from('game_rooms').update({
        pending_action: null,
        turn_phase: nextPhase,
        doubles_turn: false,
        event_log: newLog.slice(-50),
      }).eq('id', roomId);
      return { success: true };
    }

    const now = Date.now();
    const auctionPending: PendingAction = {
      type: 'auction',
      tile_id: pending.tile_id,
      player_id: playerId,
      current_bid: 0,
      highest_bidder_id: null,
      highest_bidder_name: null,
      expires_at: now + settings.auctionSeconds * 1000,
      server_now: now,
      folded_ids: [],
    };

    const newLog = [
      ...(room.event_log ?? []),
      log(`${tile?.name} goes to auction! (${settings.auctionSeconds} seconds)`, 'buy'),
    ];

    await supabase.from('game_rooms').update({
      pending_action: auctionPending,
      turn_phase: 'action',
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── auctions ────────────────────────────

const AUCTION_SNIPE_WINDOW_MS = 8000; // bids near the end extend the clock

export async function placeBid(
  roomId: string,
  playerId: string,
  amount: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'auction') return { success: false, error: 'No auction active' };
    const now = Date.now();
    if (pending.expires_at && now > pending.expires_at) {
      return { success: false, error: 'Auction has expired' };
    }
    if (pending.folded_ids?.includes(playerId)) {
      return { success: false, error: 'You withdrew from this auction' };
    }

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };
    if (player.is_bankrupt) return { success: false, error: 'You are bankrupt' };

    if (!Number.isFinite(amount) || amount <= (pending.current_bid ?? 0)) {
      return { success: false, error: `Bid must be greater than current bid ($${pending.current_bid ?? 0})` };
    }
    amount = Math.floor(amount);
    if (amount > player.balance) {
      return { success: false, error: 'Insufficient funds' };
    }

    const board = boardOf(room);
    const tile = board.tiles[pending.tile_id ?? 0];
    if (tile.buyPrice && amount > tile.buyPrice * 2) {
      return { success: false, error: `Bid cannot exceed $${tile.buyPrice * 2}` };
    }

    // Anti-snipe: a bid inside the final seconds pushes the clock back out
    let expiresAt = pending.expires_at ?? now + AUCTION_SNIPE_WINDOW_MS;
    if (expiresAt - now < AUCTION_SNIPE_WINDOW_MS) {
      expiresAt = now + AUCTION_SNIPE_WINDOW_MS;
    }

    const updated: PendingAction = {
      ...pending,
      current_bid: amount,
      highest_bidder_id: playerId,
      highest_bidder_name: player.name,
      expires_at: expiresAt,
      server_now: now,
    };

    const newLog = [
      ...(room.event_log ?? []),
      log(`${player.name} bid $${amount} for ${tile.name}!`, 'buy'),
    ];

    await supabase.from('game_rooms').update({
      pending_action: updated,
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Withdraw from the auction. When everyone else folds, it settles instantly. */
export async function foldAuction(roomId: string, playerId: string): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'auction') return { success: false, error: 'No auction active' };
    if (pending.highest_bidder_id === playerId) {
      return { success: false, error: 'The highest bidder cannot withdraw' };
    }

    const folded = new Set(pending.folded_ids ?? []);
    if (folded.has(playerId)) return { success: true };
    folded.add(playerId);

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('turn_order');

    const stillIn = (players ?? []).filter(
      (p) => !p.is_bankrupt && !folded.has(p.id),
    );

    // Everyone folded (or only the highest bidder remains) → settle now
    const onlyLeaderLeft = stillIn.every((p) => p.id === pending.highest_bidder_id);
    if (onlyLeaderLeft) {
      return settleAuction(supabase, { ...room, pending_action: { ...pending, folded_ids: [...folded] } });
    }

    await supabase.from('game_rooms').update({
      pending_action: { ...pending, folded_ids: [...folded], server_now: Date.now() },
    }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function settleAuction(supabase: Supa, room: GameRoom): Promise<ActionResult> {
  const pending = room.pending_action;
  if (pending?.type !== 'auction') return { success: false, error: 'No active auction' };

  const board = boardOf(room);
  const tile = board.tiles[pending.tile_id ?? 0];
  const newLog = [...(room.event_log ?? [])];

  if (pending.highest_bidder_id && (pending.current_bid ?? 0) > 0) {
    const { data: winner } = await supabase
      .from('players')
      .select('*')
      .eq('id', pending.highest_bidder_id)
      .single();

    if (winner && winner.balance >= (pending.current_bid ?? 0)) {
      await supabase.from('properties').upsert(
        {
          room_id: room.id,
          tile_id: pending.tile_id,
          owner_id: pending.highest_bidder_id,
          upgrade_level: 0,
          is_mortgaged: false,
        },
        { onConflict: 'room_id,tile_id' },
      );
      await supabase.from('players')
        .update({ balance: winner.balance - (pending.current_bid ?? 0) })
        .eq('id', pending.highest_bidder_id);

      newLog.push(log(
        `${pending.highest_bidder_name} won ${tile.name} at auction for $${pending.current_bid}!`,
        'buy',
      ));
    }
  } else {
    newLog.push(log(`${tile.name} went unsold at auction.`, 'system'));
  }

  const nextPhase = room.doubles_turn ? 'roll' : 'end';

  // Guard with a pending-action equality check so concurrent resolvers can't double-settle
  const { error } = await supabase.from('game_rooms').update({
    pending_action: null,
    turn_phase: nextPhase,
    doubles_turn: false,
    event_log: newLog.slice(-50),
  }).eq('id', room.id).not('pending_action', 'is', null);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resolveAuction(roomId: string): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'auction') return { success: false, error: 'No active auction' };
    if (pending.expires_at && Date.now() < pending.expires_at - 500) {
      return { success: false, error: 'Auction still running' };
    }

    return settleAuction(supabase, room);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── answer chest quiz ────────────────────────────

export async function answerChestQuestion(
  roomId: string,
  playerId: string,
  answerIndex: number,
): Promise<ActionResult<{ correct: boolean; amount: number }>> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'chest_quiz' || !pending.question || pending.player_id !== playerId) {
      return { success: false, error: 'No active quiz for you' };
    }

    const settings = settingsOf(room);
    const board = boardOf(room);

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const player = players?.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const correct = answerIndex === pending.question.correctIndex;
    let delta = correct ? pending.question.reward : -pending.question.penalty;

    // chest_bonus perk (brown set): better rewards, softer penalties
    if (settings.setAdvantages) {
      const { data: chestAllProps } = await supabase.from('properties').select('*').eq('room_id', roomId);
      for (const set of fullSetsOf(board, chestAllProps, playerId)) {
        for (const perk of SET_PERKS[set] ?? []) {
          if (perk.kind === 'chest_bonus') {
            const f = perk.pct / 100;
            delta = correct ? Math.round(delta * (1 + f)) : Math.round(delta * (1 - f));
          }
        }
      }
    }

    const owed = delta < 0 ? -delta : 0;
    const paid = Math.min(owed, player.balance);
    const shortfall = owed - paid;
    const newBalance = delta >= 0 ? player.balance + delta : player.balance - paid;

    await supabase.from('players').update({ balance: newBalance }).eq('id', playerId);
    player.balance = newBalance;

    const newLog = [
      ...(room.event_log ?? []),
      log(
        correct
          ? `${player.name} answered correctly! +$${delta}`
          : `${player.name} answered wrong. -$${paid}`,
        'chest',
      ),
    ];

    const potFields = settings.vacationCash && paid > 0
      ? { vacation_pot: (room.vacation_pot ?? 0) + paid }
      : {};

    if (shortfall > 0 && players) {
      await bankruptPlayer(supabase, roomId, players, player, null, newLog);
      const result = await advanceTurn(supabase, room, players, null, newLog, potFields);
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: { correct, amount: Math.abs(delta) } };
    }

    // Doubles: if player rolled doubles, give another roll after quiz
    const nextPhase = room.doubles_turn ? 'roll' : 'end';

    await supabase.from('game_rooms').update({
      pending_action: null,
      turn_phase: nextPhase,
      doubles_turn: false,
      event_log: newLog.slice(-50),
      ...potFields,
    }).eq('id', roomId);

    return { success: true, data: { correct, amount: Math.abs(delta) } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── end turn ────────────────────────────

export async function endTurn(
  roomId: string,
  playerId: string,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('turn_order');

    const current = players?.[room.current_player_idx];
    if (!current || current.id !== playerId) return { success: false, error: 'Not your turn' };

    // ── Doubles extra roll ──
    if (room.doubles_turn && !current.is_bankrupt) {
      const newLog = [
        ...(room.event_log ?? []),
        log(`${current.name} rolled doubles — rolling again!`, 'system'),
      ];
      await supabase.from('game_rooms').update({
        turn_phase: 'roll',
        pending_action: null,
        doubles_turn: false, // reset; rollDice will set it again if next roll is also doubles
        event_log: newLog.slice(-50),
      }).eq('id', roomId);
      return { success: true };
    }

    const { data: allProperties } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId);

    const newLog = [...(room.event_log ?? [])];
    return advanceTurn(supabase, room, players ?? [], allProperties, newLog);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── upgrade property ────────────────────────────

export async function upgradeProperty(
  roomId: string,
  playerId: string,
  tileId: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const settings = settingsOf(activeRoomData);
    const board = boardOf(activeRoomData);

    const tile = board.tiles[tileId];
    if (!tile || tile.type !== 'country' || !tile.upgradePrice || !tile.set) {
      return { success: false, error: 'Cannot upgrade this tile' };
    }

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.[activeRoomData.current_player_idx];
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);

    const prop = allProps?.find((p) => p.tile_id === tileId);
    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (prop.upgrade_level >= 4) return { success: false, error: 'Already at max level' };
    if (prop.is_mortgaged) return { success: false, error: 'Cannot upgrade a mortgaged property' };

    // Must own the complete color group (spec §8.4)
    if (!ownsFullSetSrv(board, allProps, tile.set, playerId)) {
      return { success: false, error: 'Must own the complete color group to upgrade' };
    }

    // Even building rule: must be at the minimum upgrade level in the group (spec §8.4)
    const setTileIds = board.tiles.filter((t) => t.set === tile.set).map((t) => t.id);
    const myGroupProps = allProps?.filter((p) => setTileIds.includes(p.tile_id) && p.owner_id === playerId) ?? [];
    if (settings.evenBuild) {
      const minLevel = Math.min(...myGroupProps.map((p) => p.upgrade_level));
      if (prop.upgrade_level > minLevel) {
        return { success: false, error: 'Build evenly — upgrade another property in this group first' };
      }
    }

    // upgrade_discount perk (pink set)
    let effectivePrice = tile.upgradePrice;
    if (settings.setAdvantages) {
      for (const perk of SET_PERKS[tile.set] ?? []) {
        if (perk.kind === 'upgrade_discount') effectivePrice = Math.max(0, effectivePrice - perk.amount);
      }
    }

    if (currentPlayer.balance < effectivePrice) return { success: false, error: 'Insufficient funds' };

    await supabase.from('properties').update({ upgrade_level: prop.upgrade_level + 1 }).eq('id', prop.id);
    await supabase.from('players').update({ balance: currentPlayer.balance - effectivePrice }).eq('id', playerId);

    const newLog = [
      ...(activeRoomData.event_log ?? []),
      log(`${tile.flag ?? ''} ${tile.name} upgraded to level ${prop.upgrade_level + 1}!`, 'buy'),
    ];

    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── downgrade property ────────────────────────────

export async function downgradeProperty(
  roomId: string,
  playerId: string,
  tileId: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const settings = settingsOf(activeRoomData);
    const board = boardOf(activeRoomData);

    const tile = board.tiles[tileId];
    if (!tile || tile.type !== 'country' || !tile.upgradePrice || !tile.set) {
      return { success: false, error: 'Cannot downgrade this tile' };
    }

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.[activeRoomData.current_player_idx];
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);
    const prop = allProps?.find((p) => p.tile_id === tileId);

    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (prop.upgrade_level <= 0) return { success: false, error: 'No upgrades to sell' };
    if (prop.is_mortgaged) return { success: false, error: 'Property is mortgaged' };

    // Even demolition rule: can only sell from the highest-level property in the group (spec §8.5)
    if (settings.evenBuild) {
      const setTileIds = board.tiles.filter((t) => t.set === tile.set).map((t) => t.id);
      const myGroupProps = allProps?.filter((p) => setTileIds.includes(p.tile_id) && p.owner_id === playerId) ?? [];
      const maxLevel = Math.max(...myGroupProps.map((p) => p.upgrade_level));
      if (prop.upgrade_level < maxLevel) {
        return { success: false, error: 'Must sell from the highest-level property first (even demolition rule)' };
      }
    }

    const sellPrice = Math.floor(tile.upgradePrice / 2);

    await supabase.from('properties').update({ upgrade_level: prop.upgrade_level - 1 }).eq('id', prop.id);
    await supabase.from('players').update({ balance: currentPlayer.balance + sellPrice }).eq('id', playerId);

    const newLog = [
      ...(activeRoomData.event_log ?? []),
      log(`${tile.flag ?? ''} ${tile.name} downgraded to level ${prop.upgrade_level - 1}. Received $${sellPrice}.`, 'buy'),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── mortgage / unmortgage ────────────────────────────

export async function mortgageProperty(
  roomId: string,
  playerId: string,
  tileId: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const settings = settingsOf(activeRoomData);
    if (!settings.mortgageEnabled) return { success: false, error: 'Mortgaging is disabled in this game' };

    const board = boardOf(activeRoomData);
    const tile = board.tiles[tileId];
    if (!tile?.mortgageValue) return { success: false, error: 'This tile has no mortgage value' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.[activeRoomData.current_player_idx];
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);
    const prop = allProps?.find((p) => p.tile_id === tileId);

    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (prop.is_mortgaged) return { success: false, error: 'Already mortgaged' };
    if (prop.upgrade_level > 0) return { success: false, error: 'Sell upgrades before mortgaging' };

    // Must sell ALL upgrades across the entire color group first (spec §11)
    if (tile.set) {
      const setTileIds = board.tiles.filter((t) => t.set === tile.set).map((t) => t.id);
      const groupHasUpgrades = allProps?.some(
        (p) => setTileIds.includes(p.tile_id) && p.owner_id === playerId && p.upgrade_level > 0,
      );
      if (groupHasUpgrades) {
        return { success: false, error: 'Sell all upgrades in this color group before mortgaging' };
      }
    }

    await supabase.from('properties').update({ is_mortgaged: true }).eq('id', prop.id);
    await supabase.from('players').update({ balance: currentPlayer.balance + tile.mortgageValue }).eq('id', playerId);

    const newLog = [
      ...(activeRoomData.event_log ?? []),
      log(`${tile.name} mortgaged for $${tile.mortgageValue}.`, 'system'),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unmortgageProperty(
  roomId: string,
  playerId: string,
  tileId: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const board = boardOf(activeRoomData);
    const tile = board.tiles[tileId];
    if (!tile?.mortgageValue) return { success: false, error: 'This tile has no mortgage value' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.[activeRoomData.current_player_idx];
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: prop } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId)
      .eq('tile_id', tileId)
      .single();

    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (!prop.is_mortgaged) return { success: false, error: 'Not mortgaged' };

    const unmortgageCost = Math.ceil(tile.mortgageValue * 1.1);

    if (currentPlayer.balance < unmortgageCost) {
      return { success: false, error: `Need $${unmortgageCost} to unmortgage` };
    }

    await supabase.from('properties').update({ is_mortgaged: false }).eq('id', prop.id);
    await supabase.from('players').update({ balance: currentPlayer.balance - unmortgageCost }).eq('id', playerId);

    const newLog = [
      ...(activeRoomData.event_log ?? []),
      log(`${tile.name} unmortgaged for $${unmortgageCost}.`, 'system'),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── pay jail fine ────────────────────────────

export async function payJailFine(
  roomId: string,
  playerId: string,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const settings = settingsOf(room);

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };
    if (!player.in_jail) return { success: false, error: 'Not in jail' };
    if (player.balance < settings.jailFine) return { success: false, error: 'Insufficient funds' };

    await supabase.from('players').update({
      in_jail: false,
      jail_turns: 0,
      balance: player.balance - settings.jailFine,
    }).eq('id', playerId);

    const newLog = [
      ...(room.event_log ?? []),
      log(`${player.name} paid $${settings.jailFine} bail to leave jail.`, 'jail'),
    ];
    const potFields = settings.vacationCash
      ? { vacation_pot: (room.vacation_pot ?? 0) + settings.jailFine }
      : {};
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50), ...potFields }).eq('id', roomId);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── choose income tax ────────────────────────────

export async function chooseTax(
  roomId: string,
  playerId: string,
  choice: 'flat' | 'percent',
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'income_tax_choice' || pending.player_id !== playerId) {
      return { success: false, error: 'No active tax choice' };
    }

    const settings = settingsOf(room);

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const player = players?.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const tax = choice === 'flat' ? (pending.flat_tax ?? 200) : (pending.net_worth_tax ?? 0);
    const taxPaid = Math.min(tax, player.balance);
    const shortfall = tax - taxPaid;
    const newBalance = player.balance - taxPaid;

    await supabase.from('players').update({ balance: newBalance }).eq('id', playerId);
    player.balance = newBalance;

    const label = choice === 'flat' ? `$${taxPaid} (flat)` : `$${taxPaid} (10% net worth)`;
    const newLog = [
      ...(room.event_log ?? []),
      log(`${player.name} paid ${label} income tax.`, 'tax'),
    ];

    const potFields = settings.vacationCash && taxPaid > 0
      ? { vacation_pot: (room.vacation_pot ?? 0) + taxPaid }
      : {};

    if (shortfall > 0 && players) {
      await bankruptPlayer(supabase, roomId, players, player, null, newLog);
      const result = await advanceTurn(supabase, room, players, null, newLog, potFields);
      if (!result.success) return { success: false, error: result.error };
      return { success: true };
    }

    const nextPhase = room.doubles_turn ? 'roll' : 'end';
    await supabase.from('game_rooms').update({
      pending_action: { type: 'tax_paid', player_id: playerId, amount: taxPaid },
      turn_phase: nextPhase,
      doubles_turn: false,
      event_log: newLog.slice(-50),
      ...potFields,
    }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── use GOOJF card ────────────────────────────

export async function useGoojfCard(
  roomId: string,
  playerId: string,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };
    if (!player.in_jail) return { success: false, error: 'Not in jail' };
    if ((player.goojf_cards ?? 0) < 1) return { success: false, error: 'No Get Out of Jail Free card' };

    await supabase.from('players').update({
      in_jail: false,
      jail_turns: 0,
      goojf_cards: (player.goojf_cards ?? 1) - 1,
    }).eq('id', playerId);

    const { data: room } = await supabase.from('game_rooms').select('event_log').eq('id', roomId).single();
    const newLog = [
      ...(room?.event_log ?? []),
      log(`${player.name} used a Get Out of Jail Free card!`, 'jail'),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── trading ────────────────────────────
// Trades can be proposed by ANY player at ANY time (richup-style), as long as
// no other blocking action is pending.

export async function proposeTrade(
  roomId: string,
  fromPlayerId: string,
  toPlayerId: string,
  offerTileIds: number[],
  offerCash: number,
  requestTileIds: number[],
  requestCash: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'playing') return { success: false, error: 'Game not in progress' };
    if (room.pending_action) return { success: false, error: 'Another action is in progress — try again in a moment' };

    const board = boardOf(room);

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const fromPlayer = players?.find((p) => p.id === fromPlayerId);
    const toPlayer   = players?.find((p) => p.id === toPlayerId);
    if (!fromPlayer || !toPlayer) return { success: false, error: 'Player not found' };
    if (fromPlayer.is_bankrupt) return { success: false, error: 'You are bankrupt' };
    if (toPlayer.is_bankrupt) return { success: false, error: 'Cannot trade with a bankrupt player' };
    if (fromPlayerId === toPlayerId) return { success: false, error: 'Cannot trade with yourself' };

    if (offerCash < 0 || requestCash < 0) return { success: false, error: 'Cash amounts cannot be negative' };
    if (offerCash > fromPlayer.balance) return { success: false, error: 'Insufficient cash to offer' };
    if (offerTileIds.length === 0 && requestTileIds.length === 0 && offerCash === 0 && requestCash === 0) {
      return { success: false, error: 'The trade is empty' };
    }

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);

    // Validate offer properties — must own them and have no upgrades (spec §10)
    for (const tileId of offerTileIds) {
      const p = allProps?.find((pr) => pr.tile_id === tileId && pr.owner_id === fromPlayerId);
      if (!p) return { success: false, error: `You do not own ${board.tiles[tileId]?.name}` };
      if (p.upgrade_level > 0) return { success: false, error: `Sell upgrades on ${board.tiles[tileId]?.name} before trading` };
    }

    // Validate request properties — target must own them and have no upgrades
    for (const tileId of requestTileIds) {
      const p = allProps?.find((pr) => pr.tile_id === tileId && pr.owner_id === toPlayerId);
      if (!p) return { success: false, error: `${toPlayer.name} does not own ${board.tiles[tileId]?.name}` };
      if (p.upgrade_level > 0) return { success: false, error: `${board.tiles[tileId]?.name} has upgrades — must sell first` };
    }

    const tradePending: PendingAction = {
      type: 'trade_offer',
      player_id: toPlayerId,
      trade_from_player_id: fromPlayerId,
      trade_from_player_name: fromPlayer.name,
      trade_to_player_id: toPlayerId,
      trade_to_player_name: toPlayer.name,
      trade_offer_tile_ids: offerTileIds,
      trade_offer_cash: offerCash,
      trade_request_tile_ids: requestTileIds,
      trade_request_cash: requestCash,
    };

    const newLog = [
      ...(room.event_log ?? []),
      log(`${fromPlayer.name} proposed a trade to ${toPlayer.name}.`, 'system'),
    ];

    // Only claim the pending slot if it is still free (avoids clobbering a
    // concurrent action that landed between our read and this write)
    const { data: updatedRows, error } = await supabase.from('game_rooms').update({
      pending_action: tradePending,
      event_log: newLog.slice(-50),
    }).eq('id', roomId).is('pending_action', null).select('id');

    if (error) return { success: false, error: error.message };
    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: 'Another action just started — try again' };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function acceptTrade(roomId: string, playerId: string): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'trade_offer') return { success: false, error: 'No active trade offer' };
    if (pending.trade_to_player_id !== playerId) return { success: false, error: 'Not your trade to accept' };

    const fromId = pending.trade_from_player_id!;
    const toId   = pending.trade_to_player_id!;

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
    const fromPlayer = players?.find((p) => p.id === fromId);
    const toPlayer   = players?.find((p) => p.id === toId);
    if (!fromPlayer || !toPlayer) return { success: false, error: 'Player not found' };

    const offerCash   = pending.trade_offer_cash   ?? 0;
    const requestCash = pending.trade_request_cash ?? 0;

    if (fromPlayer.balance < offerCash) return { success: false, error: 'Proposer no longer has enough cash' };
    if (toPlayer.balance < requestCash)  return { success: false, error: 'You no longer have enough cash' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);

    // Re-validate ownership
    for (const tileId of pending.trade_offer_tile_ids ?? []) {
      if (!allProps?.find((p) => p.tile_id === tileId && p.owner_id === fromId)) {
        return { success: false, error: 'Proposer no longer owns all offered properties' };
      }
    }
    for (const tileId of pending.trade_request_tile_ids ?? []) {
      if (!allProps?.find((p) => p.tile_id === tileId && p.owner_id === toId)) {
        return { success: false, error: 'You no longer own all requested properties' };
      }
    }

    // Transfer offered properties to toPlayer
    for (const tileId of pending.trade_offer_tile_ids ?? []) {
      await supabase.from('properties').update({ owner_id: toId }).eq('room_id', roomId).eq('tile_id', tileId);
    }
    // Transfer requested properties to fromPlayer
    for (const tileId of pending.trade_request_tile_ids ?? []) {
      await supabase.from('properties').update({ owner_id: fromId }).eq('room_id', roomId).eq('tile_id', tileId);
    }

    // Exchange cash
    await supabase.from('players').update({ balance: fromPlayer.balance - offerCash + requestCash }).eq('id', fromId);
    await supabase.from('players').update({ balance: toPlayer.balance  - requestCash + offerCash }).eq('id', toId);

    const newLog = [
      ...(room.event_log ?? []),
      log(`Trade accepted! ${fromPlayer.name} ↔ ${toPlayer.name}.`, 'buy'),
    ];

    await supabase.from('game_rooms').update({
      pending_action: null,
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function rejectTrade(roomId: string, playerId: string): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!room) return { success: false, error: 'Room not found' };

    const pending = room.pending_action;
    if (pending?.type !== 'trade_offer') return { success: false, error: 'No active trade offer' };
    // Either the recipient (reject) or the proposer (cancel) may clear the offer
    if (pending.trade_to_player_id !== playerId && pending.trade_from_player_id !== playerId) {
      return { success: false, error: 'Not your trade' };
    }

    const { data: player } = await supabase.from('players').select('name').eq('id', playerId).single();
    const newLog = [
      ...(room.event_log ?? []),
      log(`${player?.name ?? 'Player'} ${pending.trade_from_player_id === playerId ? 'cancelled' : 'rejected'} the trade.`, 'system'),
    ];

    await supabase.from('game_rooms').update({
      pending_action: null,
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── add bot ────────────────────────────

const BOT_NAMES = ['HAL', 'GLaDOS', 'EVA', 'JARVIS', 'SHODAN', 'K2SO', 'TARS', 'WOPR'];

export async function addBot(
  roomId: string,
): Promise<ActionResult<{ playerId: string }>> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Can only add bots in lobby' };

    const settings = settingsOf(room);

    const { data: existing } = await supabase
      .from('players')
      .select('color, name')
      .eq('room_id', roomId);

    if ((existing?.length ?? 0) >= settings.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    const usedColors = existing?.map((p) => p.color) ?? [];
    const freeColor = ALL_PLAYER_COLORS.find((c) => !usedColors.includes(c));
    if (!freeColor) return { success: false, error: 'No colors left' };

    const usedNames = existing?.map((p) => p.name) ?? [];
    const botName =
      BOT_NAMES.find((n) => !usedNames.includes(n)) ??
      `Bot${Math.floor(Math.random() * 99)}`;

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        room_id: roomId,
        name: botName,
        color: freeColor,
        balance: settings.startingCash,
        position: 0,
        in_jail: false,
        jail_turns: 0,
        is_bankrupt: false,
        is_bot: true,
        turn_order: existing?.length ?? 0,
      })
      .select()
      .single();

    if (error || !player) return { success: false, error: error?.message ?? 'Failed to add bot' };

    const newLog = [
      ...(room.event_log ?? []),
      log(`🤖 ${botName} (bot) joined the game.`),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);

    return { success: true, data: { playerId: player.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
