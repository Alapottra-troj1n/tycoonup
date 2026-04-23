export type TileType =
  | 'go'
  | 'country'
  | 'chest'
  | 'event'
  | 'tax'
  | 'transport'
  | 'utility'
  | 'jail'
  | 'free-parking'
  | 'go-to-jail';

export type CountrySet =
  | 'brown'
  | 'light-blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark-blue';

export interface Tile {
  id: number;
  name: string;       // City name for 'country' tiles, otherwise tile name
  type: TileType;
  set?: CountrySet;
  country?: string;   // Parent country name (for city tiles)
  buyPrice?: number;
  rentLevels?: number[];
  upgradePrice?: number;
  mortgageValue?: number;
  advantage?: string; // DEPRECATED on tiles; now lives in SET_ADVANTAGES
  taxAmount?: number;
  taxType?: 'flat' | 'percent'; // 'percent' = 10% of player balance
  flag?: string;
}

export type PlayerColor = 'cyan' | 'magenta' | 'lime' | 'amber' | 'violet' | 'rose';

export interface Player {
  id: string;
  room_id: string;
  name: string;
  color: PlayerColor;
  balance: number;
  position: number;
  in_jail: boolean;
  jail_turns: number;
  is_bankrupt: boolean;
  turn_order: number;
  is_bot?: boolean;
}

export interface Property {
  id: string;
  room_id: string;
  tile_id: number;
  owner_id: string | null;
  upgrade_level: number;
  is_mortgaged: boolean;
}

export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type TurnPhase = 'roll' | 'action' | 'end';

export interface EventLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'move' | 'buy' | 'rent' | 'tax' | 'chest' | 'event' | 'jail' | 'system';
}

export type PendingActionType =
  | 'buy_offer'
  | 'chest_quiz'
  | 'pay_rent'
  | 'event_result'
  | 'tax_paid'
  | 'doubles_roll'
  | 'auction';

export interface PendingAction {
  type: PendingActionType;
  tile_id?: number;
  player_id: string;
  price?: number;
  amount?: number;
  recipient_id?: string;
  question?: ChestQuestion;
  message?: string;
  // Auction-specific
  current_bid?: number;
  highest_bidder_id?: string | null;
  highest_bidder_name?: string | null;
  expires_at?: number;
}

export interface GameRoom {
  id: string;
  room_code: string;
  status: RoomStatus;
  current_player_idx: number;
  turn_phase: TurnPhase;
  dice_roll: [number, number] | null;
  pending_action: PendingAction | null;
  event_log: EventLogEntry[];
  // Phase 3 — added via migration 001_phase3.sql
  doubles_turn?: boolean;
  doubles_streak?: number;
  created_at: string;
  updated_at: string;
}

export interface ChestQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  reward: number;
  penalty: number;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DiceResult {
  d1: number;
  d2: number;
  newPosition: number;
  balanceChange: number;
  message: string;
}
