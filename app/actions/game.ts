'use server';

import { createServerClient } from '@/lib/supabase-server';
import {
  TILES,
  CHEST_QUESTIONS,
  EVENT_CARDS,
  STARTING_BALANCE,
  GO_SALARY,
  JAIL_FINE,
  JAIL_TURNS_MAX,
  generateRoomCode,
  calcTransportRent,
  calcUtilityRent,
} from '@/lib/game-data';
import type {
  ActionResult,
  DiceResult,
  Player,
  Property,
  PlayerColor,
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

// ──────────────────────────── create / join ────────────────────────────

export async function createRoom(
  playerName: string,
  color: PlayerColor,
): Promise<ActionResult<{ roomCode: string; playerId: string }>> {
  try {
    const supabase = createServerClient();
    const roomCode = generateRoomCode();

    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        status: 'lobby',
        current_player_idx: 0,
        turn_phase: 'roll',
        event_log: [log(`Room ${roomCode} created.`)],
      })
      .select()
      .single();

    if (roomError || !room) {
      return { success: false, error: roomError?.message ?? 'Failed to create room' };
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName.trim().slice(0, 20),
        color,
        balance: STARTING_BALANCE,
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

    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id, color')
      .eq('room_id', room.id);

    if ((existingPlayers?.length ?? 0) >= 6) {
      return { success: false, error: 'Room is full (max 6 players)' };
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
        balance: STARTING_BALANCE,
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

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at');

    if (!players || players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    const host = players.find((p) => p.turn_order === 0);
    if (host?.id !== playerId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from('players').update({ turn_order: i }).eq('id', shuffled[i].id);
    }

    const eventLog = [
      ...(room.event_log ?? []),
      log(`Game started! ${shuffled[0].name} goes first. Good luck!`),
    ];

    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        current_player_idx: 0,
        turn_phase: 'roll',
        event_log: eventLog,
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
  try {
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

    const currentPlayer: Player = players?.[room.current_player_idx];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const { data: allProperties } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId);

    const d1 = rollDie();
    const d2 = rollDie();
    const isDoubles = d1 === d2;
    const totalRoll = d1 + d2;
    const eventLog: EventLogEntry[] = [...(room.event_log ?? [])];

    const prevStreak = room.doubles_streak ?? 0;

    // ── Third consecutive double: go to jail ──
    if (isDoubles && prevStreak >= 2) {
      await supabase
        .from('players')
        .update({ in_jail: true, jail_turns: 0, position: 10 })
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

      return { success: true, data: { d1, d2, newPosition: 10, balanceChange: 0, message: 'Triple doubles — Jail!' } };
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
          // Fine tracked via balanceChange so the single final update handles it correctly
          balanceChange -= JAIL_FINE;
          await supabase.from('players').update({ in_jail: false, jail_turns: 0 }).eq('id', playerId);
          eventLog.push(log(`${currentPlayer.name} paid $${JAIL_FINE} bail and left jail.`, 'jail'));
        } else {
          await supabase.from('players').update({ jail_turns: newJailTurns }).eq('id', playerId);
          eventLog.push(log(`${currentPlayer.name} is stuck in jail (${newJailTurns}/${JAIL_TURNS_MAX} turns).`, 'jail'));
          await supabase.from('game_rooms').update({
            dice_roll: [d1, d2],
            doubles_turn: false,
            doubles_streak: 0,
            turn_phase: 'end',
            event_log: eventLog.slice(-50),
          }).eq('id', roomId);
          return { success: true, data: { d1, d2, newPosition: 10, balanceChange: 0, message: 'Still in jail' } };
        }
      }
    }

    // ── Move ──
    const oldPosition = currentPlayer.position;
    let newPosition = (oldPosition + totalRoll) % 40;

    // Passed GO
    const passedGo = oldPosition + totalRoll >= 40;
    if (passedGo) {
      balanceChange += GO_SALARY;
      eventLog.push(log(`${currentPlayer.name} passed GO! +$${GO_SALARY}`, 'move'));

      // Light-blue (India) monopoly: owner earns +$15 when THEY pass GO
      const indiaTiles = [6, 8, 9];
      const ownsIndia = indiaTiles.every((tid) =>
        allProperties?.find((p) => p.tile_id === tid && p.owner_id === playerId && !p.is_mortgaged),
      );
      if (ownsIndia) {
        balanceChange += 10;
        eventLog.push(log(`${currentPlayer.name} earned +$10 from India monopoly (GO bonus)!`, 'system'));
      }
    }

    // Dark-blue (Global Finance) monopoly: $100 collected when any player rolls doubles
    if (isDoubles) {
      // Find if someone else owns the full dark-blue set (both Zurich 37 + Singapore 39)
      const darkBlueOwners = new Map<string, number>();
      allProperties?.filter((p) => [37, 39].includes(p.tile_id) && p.owner_id && p.owner_id !== playerId && !p.is_mortgaged)
        .forEach((p) => darkBlueOwners.set(p.owner_id!, (darkBlueOwners.get(p.owner_id!) ?? 0) + 1));
      for (const [ownerId, count] of darkBlueOwners) {
        if (count >= 2) {
          const financeOwner = players?.find((p) => p.id === ownerId);
          if (financeOwner) {
            await supabase.from('players').update({ balance: financeOwner.balance + 100 }).eq('id', financeOwner.id);
            eventLog.push(log(`${financeOwner.name} collected $100 from Global Finance monopoly (doubles)!`, 'system'));
          }
          break;
        }
      }
    }

    const tile = TILES[newPosition];
    let pendingAction: PendingAction | null = null;
    let nextPhase: 'roll' | 'action' | 'end' = 'end';
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
            if (tile.set) {
              const setTileIds = TILES.filter(t => t.set === tile.set).map(t => t.id);
              const ownsFullSet = setTileIds.every(id =>
                allProperties?.find(p => p.tile_id === id && p.owner_id === prop.owner_id && !p.is_mortgaged),
              );
              if (ownsFullSet) {
                // Double base rent when monopoly and no upgrades (spec §8.2)
                if (prop.upgrade_level === 0) rent *= 2;
                // Orange monopoly: +$10 per landing (spec SET_ADVANTAGES)
                if (tile.set === 'orange') rent += 10;
                // Red monopoly: +$5 per upgrade level (spec SET_ADVANTAGES)
                if (tile.set === 'red') rent += 5 * prop.upgrade_level;
              }
            }
          } else if (tile.type === 'transport') {
            const owned = allProperties?.filter(
              (p) => p.owner_id === prop.owner_id && [5, 15, 25, 35].includes(p.tile_id),
            );
            rent = calcTransportRent(owned?.length ?? 1);
          } else if (tile.type === 'utility') {
            const owned = allProperties?.filter(
              (p) => p.owner_id === prop.owner_id && [12, 28].includes(p.tile_id),
            );
            rent = calcUtilityRent(totalRoll, owned?.length ?? 1);
          }

          const paid = Math.min(rent, currentPlayer.balance + balanceChange);
          balanceChange -= paid;

          const owner = players?.find((p) => p.id === prop.owner_id);
          if (owner) {
            await supabase.from('players').update({ balance: owner.balance + paid }).eq('id', owner.id);
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
          balanceChange -= Math.abs(ev.amount);
        } else if (ev.type === 'move_go') {
          newPosition = 0;
          balanceChange += GO_SALARY;
        } else if (ev.type === 'jail') {
          newPosition = 10;
          await supabase.from('players').update({ in_jail: true, jail_turns: 0, position: 10 }).eq('id', playerId);
        } else if (ev.type === 'collect_all') {
          let total = 0;
          for (const p of players ?? []) {
            if (p.id !== playerId && !p.is_bankrupt) {
              const pay = Math.min(ev.amount, p.balance);
              await supabase.from('players').update({ balance: p.balance - pay }).eq('id', p.id);
              total += pay;
            }
          }
          balanceChange += total;
        } else if (ev.type === 'pay_all') {
          let total = 0;
          for (const p of players ?? []) {
            if (p.id !== playerId && !p.is_bankrupt) {
              const pay = Math.min(Math.abs(ev.amount), Math.max(0, currentPlayer.balance + balanceChange));
              await supabase.from('players').update({ balance: p.balance + pay }).eq('id', p.id);
              total += pay;
            }
          }
          balanceChange -= total;
        } else if (ev.type === 'goojf') {
          // Get Out of Jail Free card — held by the player until used (spec §6.1)
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
          // Income Tax: player chooses $200 flat OR 10% of net worth (spec §4.5)
          let netWorth = currentPlayer.balance + balanceChange;
          for (const p of allProperties?.filter(p2 => p2.owner_id === playerId) ?? []) {
            const t = TILES[p.tile_id];
            netWorth += t.buyPrice ?? 0;
            if (p.upgrade_level > 0 && t.upgradePrice) netWorth += p.upgrade_level * t.upgradePrice;
            if (p.is_mortgaged) netWorth -= t.mortgageValue ?? 0;
          }
          pendingAction = {
            type: 'income_tax_choice',
            player_id: playerId,
            net_worth_tax: Math.round(netWorth * 0.1),
            flat_tax: 200,
          };
          nextPhase = 'action';
        } else {
          // Flat tax (Luxury Tax) — no choice
          const tax = tile.taxAmount ?? 0;
          const taxPaid = Math.min(tax, currentPlayer.balance + balanceChange);
          balanceChange -= taxPaid;
          eventLog.push(log(`${currentPlayer.name} paid $${tax}.`, 'tax'));
          pendingAction = { type: 'tax_paid', player_id: playerId, amount: tax };
          nextPhase = 'end';
        }
        break;
      }

      case 'go-to-jail': {
        newPosition = 10;
        await supabase.from('players').update({ in_jail: true, jail_turns: 0, position: 10 }).eq('id', playerId);
        eventLog.push(log(`${currentPlayer.name} went to Jail!`, 'jail'));
        nextPhase = 'end';
        break;
      }

      default:
        // GO, jail (visiting), free-parking — nothing happens
        break;
    }

    // ── Update player position + balance ──
    const newBalance = Math.max(0, currentPlayer.balance + balanceChange);
    if (tile.type !== 'go-to-jail' && !(tile.type === 'event' && (newPosition === 10))) {
      await supabase.from('players').update({ position: newPosition, balance: newBalance }).eq('id', playerId);
    } else if (tile.type === 'event') {
      await supabase.from('players').update({ position: newPosition, balance: newBalance }).eq('id', playerId);
    }

    // ── Bankruptcy check ──
    const finalBalance = newBalance;
    if (finalBalance <= 0) {
      // When owed to another player, ALL assets transfer to them (spec §12)
      const creditorId = pendingAction?.type === 'pay_rent' ? pendingAction.recipient_id : null;
      if (creditorId) {
        await supabase.from('properties')
          .update({ owner_id: creditorId, upgrade_level: 0, is_mortgaged: false })
          .eq('room_id', roomId).eq('owner_id', playerId);
        const goojfToTransfer = currentPlayer.goojf_cards ?? 0;
        if (goojfToTransfer > 0) {
          const creditor = players?.find(p => p.id === creditorId);
          if (creditor) {
            await supabase.from('players').update({ goojf_cards: (creditor.goojf_cards ?? 0) + goojfToTransfer }).eq('id', creditorId);
          }
        }
        const creditorName = players?.find(p => p.id === creditorId)?.name ?? 'creditor';
        eventLog.push(log(`${currentPlayer.name}'s assets transferred to ${creditorName}.`, 'system'));
      } else {
        const { error: relError } = await releasePlayerProperties(supabase, roomId, playerId);
        if (relError) return { success: false, error: relError.message };
      }
      const { error: playerUpdateError } = await supabase.from('players').update({ is_bankrupt: true, balance: 0 }).eq('id', playerId);
      if (playerUpdateError) return { success: false, error: playerUpdateError.message };
      eventLog.push(log(`${currentPlayer.name} went bankrupt!`, 'system'));
    }

    // ── Doubles tracking ──
    const newStreak = isDoubles ? prevStreak + 1 : 0;

    const { error: updateError } = await supabase.from('game_rooms').update({
      dice_roll: [d1, d2],
      doubles_turn: isDoubles && !wasInJail,
      doubles_streak: newStreak,
      pending_action: pendingAction,
      turn_phase: nextPhase,
      event_log: eventLog.slice(-50),
    }).eq('id', roomId);

    if (updateError) {
      // Rollback position/balance since room update failed (primitive fallback)
      await supabase.from('players').update({ position: oldPosition, balance: currentPlayer.balance }).eq('id', playerId);
      return { success: false, error: `DB Update Failed: ${updateError.message}` };
    }

    return { success: true, data: { d1, d2, newPosition, balanceChange, message } };
  } catch (e) {
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

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };

    const tile = TILES[tileId];
    if (!tile.buyPrice) return { success: false, error: 'Tile cannot be purchased' };
    if (player.balance < tile.buyPrice) return { success: false, error: 'Insufficient funds' };

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
      doubles_turn: nextPhase === 'roll' ? false : false,
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
    if (pending?.type !== 'buy_offer') return { success: false, error: 'No buy offer active' };

    const auctionPending = {
      type: 'auction' as const,
      tile_id: pending.tile_id,
      player_id: playerId,
      current_bid: 0,
      highest_bidder_id: null,
      highest_bidder_name: null,
      expires_at: Date.now() + 25000,
    };

    const newLog = [
      ...(room.event_log ?? []),
      log(`${TILES[pending.tile_id ?? 0]?.name} goes to auction! (25 seconds)`, 'buy'),
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

// ──────────────────────────── place bid ────────────────────────────

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
    if (pending.expires_at && Date.now() > pending.expires_at) {
      return { success: false, error: 'Auction has expired' };
    }

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };

    if (amount <= (pending.current_bid ?? 0)) {
      return { success: false, error: `Bid must be greater than current bid ($${pending.current_bid})` };
    }
    if (amount > player.balance) {
      return { success: false, error: 'Insufficient funds' };
    }

    const tile = TILES[pending.tile_id ?? 0];
    if (tile.buyPrice && amount > tile.buyPrice * 2) {
      return { success: false, error: `Bid cannot exceed $${tile.buyPrice * 2}` };
    }

    const updated = {
      ...pending,
      current_bid: amount,
      highest_bidder_id: playerId,
      highest_bidder_name: player.name,
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

// ──────────────────────────── resolve auction ────────────────────────────

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

    const tile = TILES[pending.tile_id ?? 0];
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
            room_id: roomId,
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

    await supabase.from('game_rooms').update({
      pending_action: null,
      turn_phase: nextPhase,
      doubles_turn: false,
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

    return { success: true };
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
    if (!pending?.question) return { success: false, error: 'No active quiz' };

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };

    const correct = answerIndex === pending.question.correctIndex;
    let delta = correct ? pending.question.reward : -pending.question.penalty;

    // Brown (Egypt) monopoly: +10% reward, −10% penalty (spec SET_ADVANTAGES)
    const { data: chestAllProps } = await supabase.from('properties').select('tile_id,owner_id,is_mortgaged').eq('room_id', roomId);
    const brownTileIds = TILES.filter(t => t.set === 'brown').map(t => t.id);
    const ownsBrown = brownTileIds.every(id =>
      chestAllProps?.find(p => p.tile_id === id && p.owner_id === playerId && !p.is_mortgaged),
    );
    if (ownsBrown) {
      delta = correct ? Math.round(delta * 1.1) : Math.round(delta * 0.9);
    }

    const newBalance = Math.max(0, player.balance + delta);

    await supabase.from('players').update({ balance: newBalance }).eq('id', playerId);

    const newLog = [
      ...(room.event_log ?? []),
      log(
        correct
          ? `${player.name} answered correctly! +$${pending.question.reward}`
          : `${player.name} answered wrong. -$${pending.question.penalty}`,
        'chest',
      ),
    ];

    // Doubles: if player rolled doubles, give another roll after quiz
    const nextPhase = room.doubles_turn ? 'roll' : 'end';

    await supabase.from('game_rooms').update({
      pending_action: null,
      turn_phase: nextPhase,
      doubles_turn: false,
      event_log: newLog.slice(-50),
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

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('turn_order');

    const current = players?.[room.current_player_idx];
    if (!current || current.id !== playerId) return { success: false, error: 'Not your turn' };

    // ── Doubles extra roll ──
    if (room.doubles_turn) {
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

    // ── Check win condition ──
    const activePlayers = players?.filter((p) => !p.is_bankrupt) ?? [];
    if (activePlayers.length <= 1) {
      await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', roomId);
      return { success: true };
    }

    // ── Advance to next non-bankrupt player ──
    let nextIdx = (room.current_player_idx + 1) % (players?.length ?? 1);
    let safety = 0;
    while (players?.[nextIdx]?.is_bankrupt && safety < 10) {
      nextIdx = (nextIdx + 1) % (players?.length ?? 1);
      safety++;
    }

    const nextPlayer = players?.[nextIdx];
    const newLog = [...(room.event_log ?? [])];

    // ── Passive country advantages for next player ──
    if (nextPlayer) {
      const { data: allProperties } = await supabase
        .from('properties')
        .select('*')
        .eq('room_id', roomId);

      let passiveBonus = 0;
      const passiveMessages: string[] = [];

      // Dark-blue (Global Finance) monopoly: $25/turn if full set owned
      const darkBlueTiles = [37, 39];
      const ownsDarkBlue = darkBlueTiles.every((tid) =>
        allProperties?.find((p) => p.tile_id === tid && p.owner_id === nextPlayer.id && !p.is_mortgaged),
      );
      if (ownsDarkBlue) {
        passiveBonus += 25;
        passiveMessages.push('Global Finance monopoly +$25');
      }

      // Green (UK) monopoly: $15/turn if balance ≥ $800
      const greenTiles = [31, 32, 34];
      const ownsGreen = greenTiles.every((tid) =>
        allProperties?.find((p) => p.tile_id === tid && p.owner_id === nextPlayer.id && !p.is_mortgaged),
      );
      if (ownsGreen && nextPlayer.balance >= 800) {
        passiveBonus += 15;
        passiveMessages.push('UK monopoly +$15');
      }

      // Yellow (USA) monopoly: $20 bonus at start of each of your turns
      const yellowTiles = [26, 27, 29];
      const ownsYellow = yellowTiles.every((tid) =>
        allProperties?.find((p) => p.tile_id === tid && p.owner_id === nextPlayer.id && !p.is_mortgaged),
      );
      if (ownsYellow) {
        passiveBonus += 20;
        passiveMessages.push('USA monopoly +$20');
      }

      if (passiveBonus > 0) {
        await supabase
          .from('players')
          .update({ balance: nextPlayer.balance + passiveBonus })
          .eq('id', nextPlayer.id);
        newLog.push(
          log(`${nextPlayer.name} earned $${passiveBonus} passive income (${passiveMessages.join(', ')}).`, 'system'),
        );
      }
    }

    newLog.push(log(`${nextPlayer?.name ?? 'Next player'}'s turn.`, 'system'));

    const { error: updateError } = await supabase.from('game_rooms').update({
      current_player_idx: nextIdx,
      turn_phase: 'roll',
      pending_action: null,
      doubles_turn: false,
      doubles_streak: 0,
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

// ──────────────────────────── upgrade property ────────────────────────────

export async function upgradeProperty(
  roomId: string,
  playerId: string,
  tileId: number,
): Promise<ActionResult> {
  try {
    const supabase = createServerClient();

    const tile = TILES[tileId];
    if (tile.type !== 'country' || !tile.upgradePrice || !tile.set) {
      return { success: false, error: 'Cannot upgrade this tile' };
    }

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.find((_, idx) => idx === activeRoomData.current_player_idx);
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);

    const { data: prop } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId)
      .eq('tile_id', tileId)
      .single();

    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (prop.upgrade_level >= 4) return { success: false, error: 'Already at max level' };
    if (prop.is_mortgaged) return { success: false, error: 'Cannot upgrade a mortgaged property' };

    // Must own the complete color group (spec §8.4)
    const setTileIds = TILES.filter(t => t.set === tile.set).map(t => t.id);
    const ownsFullSet = setTileIds.every(id =>
      allProps?.find(p => p.tile_id === id && p.owner_id === playerId && !p.is_mortgaged),
    );
    if (!ownsFullSet) return { success: false, error: 'Must own the complete color group to upgrade' };

    // Even building rule: must be at the minimum upgrade level in the group (spec §8.4)
    const myGroupProps = allProps?.filter(p => setTileIds.includes(p.tile_id) && p.owner_id === playerId) ?? [];
    const minLevel = Math.min(...myGroupProps.map(p => p.upgrade_level));
    if (prop.upgrade_level > minLevel) {
      return { success: false, error: 'Build evenly — upgrade another property in this group first' };
    }

    // Pink monopoly: upgrade cost −$10 (spec SET_ADVANTAGES)
    let effectivePrice = tile.upgradePrice;
    if (tile.set === 'pink' && ownsFullSet) {
      effectivePrice = Math.max(0, effectivePrice - 10);
    }

    const { data: player } = await supabase.from('players').select('balance').eq('id', playerId).single();
    if (!player || player.balance < effectivePrice) return { success: false, error: 'Insufficient funds' };

    await supabase.from('properties').update({ upgrade_level: prop.upgrade_level + 1 }).eq('id', prop.id);
    await supabase.from('players').update({ balance: player.balance - effectivePrice }).eq('id', playerId);

    const { data: room } = await supabase.from('game_rooms').select('event_log').eq('id', roomId).single();
    const newLog = [
      ...(room?.event_log ?? []),
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

    const tile = TILES[tileId];
    if (tile.type !== 'country' || !tile.upgradePrice || !tile.set) {
      return { success: false, error: 'Cannot downgrade this tile' };
    }

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.find((_, idx) => idx === activeRoomData.current_player_idx);
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: prop } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId)
      .eq('tile_id', tileId)
      .single();

    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (prop.upgrade_level <= 0) return { success: false, error: 'No upgrades to sell' };
    if (prop.is_mortgaged) return { success: false, error: 'Property is mortgaged' };

    // Even demolition rule: can only sell from the highest-level property in the group (spec §8.5)
    const { data: allProps } = await supabase.from('properties').select('tile_id,owner_id,upgrade_level').eq('room_id', roomId);
    const setTileIds = TILES.filter(t => t.set === tile.set).map(t => t.id);
    const myGroupProps = allProps?.filter(p => setTileIds.includes(p.tile_id) && p.owner_id === playerId) ?? [];
    const maxLevel = Math.max(...myGroupProps.map(p => p.upgrade_level));

    if (prop.upgrade_level < maxLevel) {
      return { success: false, error: 'Must sell from the highest-level property first (even demolition rule)' };
    }

    const sellPrice = Math.floor(tile.upgradePrice / 2);

    const { data: player } = await supabase.from('players').select('balance').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };

    await supabase.from('properties').update({ upgrade_level: prop.upgrade_level - 1 }).eq('id', prop.id);
    await supabase.from('players').update({ balance: player.balance + sellPrice }).eq('id', playerId);

    const { data: room } = await supabase.from('game_rooms').select('event_log').eq('id', roomId).single();
    const newLog = [
      ...(room?.event_log ?? []),
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

    const tile = TILES[tileId];
    if (!tile.mortgageValue) return { success: false, error: 'This tile has no mortgage value' };

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.find((_, idx) => idx === activeRoomData.current_player_idx);
    if (currentPlayer?.id !== playerId) return { success: false, error: 'Can only build or mortgage on your turn' };

    const { data: prop } = await supabase
      .from('properties')
      .select('*')
      .eq('room_id', roomId)
      .eq('tile_id', tileId)
      .single();

    if (!prop || prop.owner_id !== playerId) return { success: false, error: 'You do not own this property' };
    if (prop.is_mortgaged) return { success: false, error: 'Already mortgaged' };
    if (prop.upgrade_level > 0) return { success: false, error: 'Sell upgrades before mortgaging' };

    // Must sell ALL upgrades across the entire color group first (spec §11)
    if (tile.set) {
      const { data: allProps } = await supabase.from('properties').select('tile_id,owner_id,upgrade_level').eq('room_id', roomId);
      const setTileIds = TILES.filter(t => t.set === tile.set).map(t => t.id);
      const groupHasUpgrades = allProps?.some(
        p => setTileIds.includes(p.tile_id) && p.owner_id === playerId && p.upgrade_level > 0,
      );
      if (groupHasUpgrades) {
        return { success: false, error: 'Sell all upgrades in this color group before mortgaging' };
      }
    }

    const { data: player } = await supabase.from('players').select('balance').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };

    await supabase.from('properties').update({ is_mortgaged: true }).eq('id', prop.id);
    await supabase.from('players').update({ balance: player.balance + tile.mortgageValue }).eq('id', playerId);

    const { data: room } = await supabase.from('game_rooms').select('event_log').eq('id', roomId).single();
    const newLog = [
      ...(room?.event_log ?? []),
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

    const tile = TILES[tileId];
    if (!tile.mortgageValue) return { success: false, error: 'This tile has no mortgage value' };

    const { data: activeRoomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (!activeRoomData) return { success: false, error: 'Room not found' };
    if (activeRoomData.status !== 'playing') return { success: false, error: 'Game not in progress' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const currentPlayer = players?.find((_, idx) => idx === activeRoomData.current_player_idx);
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

    const { data: player } = await supabase.from('players').select('balance').eq('id', playerId).single();
    if (!player || player.balance < unmortgageCost) {
      return { success: false, error: `Need $${unmortgageCost} to unmortgage` };
    }

    await supabase.from('properties').update({ is_mortgaged: false }).eq('id', prop.id);
    await supabase.from('players').update({ balance: player.balance - unmortgageCost }).eq('id', playerId);

    const { data: room } = await supabase.from('game_rooms').select('event_log').eq('id', roomId).single();
    const newLog = [
      ...(room?.event_log ?? []),
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

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };
    if (!player.in_jail) return { success: false, error: 'Not in jail' };
    if (player.balance < JAIL_FINE) return { success: false, error: 'Insufficient funds' };

    await supabase.from('players').update({
      in_jail: false,
      jail_turns: 0,
      balance: player.balance - JAIL_FINE,
    }).eq('id', playerId);

    const { data: room } = await supabase.from('game_rooms').select('event_log').eq('id', roomId).single();
    const newLog = [
      ...(room?.event_log ?? []),
      log(`${player.name} paid $${JAIL_FINE} bail to leave jail.`, 'jail'),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog.slice(-50) }).eq('id', roomId);
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

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!player) return { success: false, error: 'Player not found' };

    const tax = choice === 'flat' ? (pending.flat_tax ?? 200) : (pending.net_worth_tax ?? 0);
    const taxPaid = Math.min(tax, player.balance);
    const newBalance = player.balance - taxPaid;

    await supabase.from('players').update({ balance: newBalance }).eq('id', playerId);

    const label = choice === 'flat' ? `$${tax} (flat)` : `$${tax} (10% net worth)`;
    const newLog = [
      ...(room.event_log ?? []),
      log(`${player.name} paid ${label} income tax.`, 'tax'),
    ];

    const nextPhase = room.doubles_turn ? 'roll' : 'end';
    await supabase.from('game_rooms').update({
      pending_action: { type: 'tax_paid', player_id: playerId, amount: taxPaid },
      turn_phase: nextPhase,
      doubles_turn: false,
      event_log: newLog.slice(-50),
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
    if (room.pending_action) return { success: false, error: 'Another action is in progress' };

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('turn_order');
    const fromPlayer = players?.find(p => p.id === fromPlayerId);
    const toPlayer   = players?.find(p => p.id === toPlayerId);
    if (!fromPlayer || !toPlayer) return { success: false, error: 'Player not found' };
    if (toPlayer.is_bankrupt) return { success: false, error: 'Cannot trade with a bankrupt player' };
    if (fromPlayerId === toPlayerId) return { success: false, error: 'Cannot trade with yourself' };

    // Only current player may propose
    const currentPlayer = players?.[room.current_player_idx];
    if (currentPlayer?.id !== fromPlayerId) return { success: false, error: 'Can only trade on your turn' };
    if (room.turn_phase !== 'end' && room.turn_phase !== 'action') {
      return { success: false, error: 'Can only trade during your turn' };
    }

    if (offerCash < 0 || requestCash < 0) return { success: false, error: 'Cash amounts cannot be negative' };
    if (offerCash > fromPlayer.balance) return { success: false, error: 'Insufficient cash to offer' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);

    // Validate offer properties — must own them and have no upgrades (spec §10)
    for (const tileId of offerTileIds) {
      const p = allProps?.find(pr => pr.tile_id === tileId && pr.owner_id === fromPlayerId);
      if (!p) return { success: false, error: `You do not own tile ${TILES[tileId]?.name}` };
      if (p.upgrade_level > 0) return { success: false, error: `Sell upgrades on ${TILES[tileId]?.name} before trading` };
    }

    // Validate request properties — target must own them and have no upgrades
    for (const tileId of requestTileIds) {
      const p = allProps?.find(pr => pr.tile_id === tileId && pr.owner_id === toPlayerId);
      if (!p) return { success: false, error: `${toPlayer.name} does not own tile ${TILES[tileId]?.name}` };
      if (p.upgrade_level > 0) return { success: false, error: `${TILES[tileId]?.name} has upgrades — must sell first` };
    }

    const tradePending: import('@/lib/types').PendingAction = {
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

    await supabase.from('game_rooms').update({
      pending_action: tradePending,
      event_log: newLog.slice(-50),
    }).eq('id', roomId);

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
    const fromPlayer = players?.find(p => p.id === fromId);
    const toPlayer   = players?.find(p => p.id === toId);
    if (!fromPlayer || !toPlayer) return { success: false, error: 'Player not found' };

    const offerCash   = pending.trade_offer_cash   ?? 0;
    const requestCash = pending.trade_request_cash ?? 0;

    if (fromPlayer.balance < offerCash) return { success: false, error: 'Proposer no longer has enough cash' };
    if (toPlayer.balance < requestCash)  return { success: false, error: 'You no longer have enough cash' };

    const { data: allProps } = await supabase.from('properties').select('*').eq('room_id', roomId);

    // Re-validate ownership
    for (const tileId of pending.trade_offer_tile_ids ?? []) {
      if (!allProps?.find(p => p.tile_id === tileId && p.owner_id === fromId)) {
        return { success: false, error: 'Proposer no longer owns all offered properties' };
      }
    }
    for (const tileId of pending.trade_request_tile_ids ?? []) {
      if (!allProps?.find(p => p.tile_id === tileId && p.owner_id === toId)) {
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

const BOT_NAMES = ['HAL', 'GLaDOS', 'EVA', 'JARVIS', 'SHODAN', 'K2SO'];

export async function addBot(
  roomId: string,
): Promise<ActionResult<{ playerId: string }>> {
  try {
    const supabase = createServerClient();

    const { data: room } = await supabase
      .from('game_rooms')
      .select('status')
      .eq('id', roomId)
      .single();
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Can only add bots in lobby' };

    const { data: existing } = await supabase
      .from('players')
      .select('color, name')
      .eq('room_id', roomId);

    if ((existing?.length ?? 0) >= 6) {
      return { success: false, error: 'Room is full' };
    }

    const allColors = ['cyan', 'magenta', 'lime', 'amber', 'violet', 'rose'];
    const usedColors = existing?.map((p) => p.color) ?? [];
    const freeColor = allColors.find((c) => !usedColors.includes(c));
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
        balance: STARTING_BALANCE,
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

    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('event_log')
      .eq('id', roomId)
      .single();

    const newLog = [
      ...(roomData?.event_log ?? []),
      log(`🤖 ${botName} (bot) joined the game.`),
    ];
    await supabase.from('game_rooms').update({ event_log: newLog }).eq('id', roomId);

    return { success: true, data: { playerId: player.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ──────────────────────────── bankruptcy helper ────────────────────────────

async function releasePlayerProperties(
  supabase: ReturnType<typeof createServerClient>,
  roomId: string,
  playerId: string,
) {
  return await supabase
    .from('properties')
    .update({ owner_id: null, upgrade_level: 0, is_mortgaged: false })
    .eq('room_id', roomId)
    .eq('owner_id', playerId);
}
