# TycoonUP — Build Progress

> Last updated: 2026-04-21
> Hand this file to any model/LLM to get full context on the project state.

---

## What this is

Real-time multiplayer Monopoly-style board game (country tiles, dark neon UI, Supabase Realtime backend, Jackbox-style anonymous room joining).

**Stack:** Next.js 16.2.4 (React 19, Turbopack, Tailwind v4), Supabase (Postgres + Realtime CDC), Zustand, Framer Motion, Lucide React.

**IMPORTANT — Next.js 16 breaking changes:**
- `params` in page components is a `Promise<>` and must be `await`-ed
- `cookies()` must be `await`-ed
- Read `node_modules/next/dist/docs/` before writing any Next.js code

---

## Phases

### Phase 1 — Lobby & Transport ✅ COMPLETE
- Home page: Create room / Join room by code
- Jackbox-style anonymous join: color picker → cookie stored per room
- Lobby screen with player list and host Start button
- Supabase Realtime CDC subscriptions (game_rooms, players, properties tables)
- `app/api/set-player/route.ts` — sets `player_id_${roomCode}` httpOnly cookie (24h)

### Phase 2 — Board State & Movement ✅ COMPLETE
- 11×11 CSS Grid board with 40 tiles
- Tile definitions: 22 countries (with color sets), 4 transports, 2 utilities, 3 chest, 3 event, 2 tax, 4 corners
- Framer Motion `layoutId` player token animations on board
- Dice roll with movement, GO salary ($200), jail logic
- Buy offer flow (buy or skip)
- Chest quiz modal (20s countdown, correct/wrong feedback)
- Event cards
- Tax tiles
- Go-to-jail tile

### Phase 3 — Economy ✅ COMPLETE
- Rent calculation with upgrade levels
- Property upgrades (up to level 3)
- Mortgage / unmortgage properties
- Auction system: skip triggers 25s auction, real-time bids via Supabase CDC, auto-resolves on timer
- Doubles tracking: `doubles_turn` + `doubles_streak` columns → extra roll on doubles, 3 consecutive doubles → jail
- Bankruptcy: player marked bankrupt, properties released/auctioned
- Win condition: last non-bankrupt player wins
- Win screen: confetti particles (Framer Motion), ranked leaderboard by net worth

### Phase 4 — Enhancements ✅ COMPLETE
- Passive country advantages:
  - Switzerland (tile 37): +$40 per turn for owner
  - UK (tile 31): +$25 per turn if owner balance ≥ $1000
  - Singapore (tile 39): owner collects $100 when ANY player rolls doubles
  - Greece (tile 6): owner gets +$15 bonus when THEY pass GO
- Property Manager drawer (upgrade, mortgage, unmortgage from ActionPanel)
- Dice overlay animation (spinning → settle)
- Event log with color-coded entries and AnimatePresence
- Player cards with turn indicator pulse and property chips
- Pay jail fine button ($50)

### Bot System ✅ COMPLETE
- "Add Bot" button in Lobby
- Bot names: HAL, GLaDOS, EVA, JARVIS, SHODAN, K2SO
- `addBot` server action creates bot player with `is_bot: true`
- `supabase/migrations/002_add_bot.sql` — adds `is_bot BOOLEAN DEFAULT FALSE` to players
- Client-side auto-play in `GameRoomClient.tsx`: watches for `currentPlayer.is_bot` → auto-calls server actions with realistic delays
- Bot roll delay: 800–1400ms; bot buy decision: 600ms; bot quiz: 1200ms (random answer); bot end turn: 500ms
- Bot badge shown in Lobby and PlayerCard
- **Bug fixed (2026-04-21):** `isHost` in `Lobby.tsx` was picking bot as host when bot had low turn_order → fixed to skip bots with `.find(p => !p.is_bot)`
- **Bug fixed (2026-04-21):** `startGame` in `game.ts` was including `doubles_turn`/`doubles_streak` in the update (only exist after migration 001) — if migration not run, update silently failed and room stayed in lobby. Fixed by removing those fields from the startGame update (they use DB defaults / are managed by rollDice+endTurn).
- **Bug fixed (2026-04-21):** `handleStart` in `Lobby.tsx` never called `setLoading(false)` on success → button stuck on "Starting…" forever. Fixed with try/finally.
- **Bug fixed (2026-04-21):** `activePlayers` array in `GameRoomClient.tsx` was not sorted by `turn_order` → `activePlayers[current_player_idx]` picked wrong player after startGame shuffled turn orders → bot never auto-played. Fixed by sorting activePlayers by turn_order at the source (both in bot useEffect and in main render).
- **Feature added (2026-04-21):** `TileDetailModal` component — click any tile on the board to see: owner, mortgage value, upgrade price, rent table (country), rent by routes (transport), utility formula, passive advantage. Wired via `onTileClick` in GameRoomClient → `BoardView` → `TileCell`.

---

## Database Setup

### Run in Supabase SQL editor in order:

1. `supabase/schema.sql` — initial tables + RLS + Realtime
2. `supabase/migrations/001_phase3.sql` — adds `doubles_turn`, `doubles_streak` to `game_rooms`
3. `supabase/migrations/002_add_bot.sql` — adds `is_bot` to `players`

### Environment variables needed (`env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## File Map

```
app/
  page.tsx                    Home — Create/Join room UI (client component)
  layout.tsx                  Root layout
  globals.css                 Global styles + Tailwind
  [roomCode]/
    page.tsx                  Room page (server, awaits params, reads cookie)
  actions/
    game.ts                   ALL server actions (authoritative game logic)
  api/
    set-player/
      route.ts                POST — sets httpOnly player cookie

components/game/
  GameRoomClient.tsx          Root client component; Supabase Realtime; bot auto-play
  Lobby.tsx                   Pre-game lobby with player list + Add Bot
  BoardView.tsx               11×11 CSS Grid board
  TileCell.tsx                Individual tile with player tokens (Framer Motion layoutId)
  ActionPanel.tsx             Roll / Buy / Auction / End Turn / Property Manager toggle
  PropertyManager.tsx         Slide-up drawer: upgrade / mortgage / unmortgage
  AuctionModal.tsx            25s countdown, real-time bids, auto-resolve
  ChestModal.tsx              Quiz modal with 20s countdown
  DiceOverlay.tsx             Animated dice overlay
  PlayerCard.tsx              Player sidebar card with balance + properties
  EventLog.tsx                Scrolling log with AnimatePresence
  WinScreen.tsx               Confetti + ranked leaderboard

lib/
  types.ts                    All TypeScript types
  game-data.ts                Tile definitions, chest questions, event cards, constants
  supabase.ts                 Browser Supabase singleton (null-guard for missing env)
  supabase-server.ts          Server-side Supabase client factory
  store.ts                    Zustand store; auto-triggers dice animation on dice_roll change
  utils.ts                    formatMoney, getPlayersOnTile, ownsFullSet

supabase/
  schema.sql                  Initial schema
  migrations/
    001_phase3.sql            doubles_turn + doubles_streak columns
    002_add_bot.sql           is_bot column on players
```

---

## Key Constants (`lib/game-data.ts`)
- `STARTING_BALANCE = 1500`
- `GO_SALARY = 200`
- `JAIL_FINE = 50`
- `MAX_PLAYERS = 6`
- Upgrade levels: `rentLevels[upgradeLevel]` (0 = base rent, 1/2/3 = upgraded)

---

## Pending / Future Work
- [ ] Design system unification (user building in Claude Design — will provide tokens/colors)
- [ ] Trade system between players
- [ ] Remaining country-specific passive advantages (currently 4 implemented)
- [ ] Mobile/responsive layout improvements
- [ ] Sound effects
