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
  | 'dark-blue'
  // Mega board exclusive sets
  | 'teal'
  | 'steel';

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

export type PlayerColor =
  | 'cyan' | 'magenta' | 'lime' | 'amber' | 'violet' | 'rose'
  | 'orange' | 'sky';

// ── Game settings (configured by the host in the lobby) ─────────────────────

export type BoardId = 'classic' | 'mega';

export interface GameSettings {
  board: BoardId;              // classic = 40 tiles / 6 players · mega = 48 tiles / 8 players
  maxPlayers: number;          // 2–8 (classic caps at 6)
  startingCash: number;        // 500–2500
  goSalary: number;            // 0–400, collected when passing GO
  doubleRentOnFullSet: boolean;// x2 base rent on completed, unimproved sets
  auctionsEnabled: boolean;    // declined properties go to auction
  mortgageEnabled: boolean;    // allow mortgaging properties
  evenBuild: boolean;          // enforce even building / demolition across a set
  vacationCash: boolean;       // taxes & fines pool on Free Parking; landing collects
  setAdvantages: boolean;      // unique monopoly perks per color set
  auctionSeconds: number;      // 15 | 25 | 40
  jailFine: number;            // 50 | 75 | 100
  randomizeOrder: boolean;     // shuffle turn order at game start
}

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
  goojf_cards?: number; // Get Out of Jail Free cards held (spec §7 Option C)
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
// 'rolling' is a transient server-side lock that prevents double rolls
export type TurnPhase = 'roll' | 'rolling' | 'action' | 'end';

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
  | 'auction'
  | 'income_tax_choice'   // spec §4.5: player chooses flat $200 or 10% net worth
  | 'trade_offer';        // spec §10: peer-to-peer property + cash trade

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
  server_now?: number;        // server clock when auction state last changed (drift sync)
  folded_ids?: string[];      // players who withdrew from the auction
  // Income tax choice (spec §4.5)
  net_worth_tax?: number;
  flat_tax?: number;
  // Trade offer (spec §10)
  trade_from_player_id?: string;
  trade_from_player_name?: string;
  trade_to_player_id?: string;
  trade_to_player_name?: string;
  trade_offer_tile_ids?: number[];
  trade_offer_cash?: number;
  trade_request_tile_ids?: number[];
  trade_request_cash?: number;
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
  // Added via migration 003_settings.sql
  settings?: Partial<GameSettings> | null;
  vacation_pot?: number;
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
