# Goal Description

The project goal is to build "TycoonUP", a rich, real-time multiplayer board game inspired by property-trading classics. It must feature a dark, neon-accented, premium UI with buttery-smooth animations using Framer Motion. The game requires a Jackbox-style anonymous room joining system allowing instant play with no authentication. The gameplay centers around purchasing and upgrading countries, with each country offering minor tactical advantages, interactive chest quizzes for rewards, and dynamic events (bankruptcies, auctions, prison, etc.).

## User Review Required

> [!IMPORTANT]
> Since we are using Supabase Realtime, the architecture shifts to a fully Serverless and Vercel-friendly model. The game state will be strictly authoritative via Next.js Server Actions (or Supabase Edge Functions) which compute game logic and persist it to the Supabase Postgres Database. Transient events (like dice roll animations, token movements) will be broadcasted instantly over Supabase Realtime Channels.
> Please review the updated "Backend Architecture" section.

## Proposed Changes

We will build this into the existing Next.js app in `/Users/macbookm2/Desktop/TycoonUP/tycoonup`.

### 1. Technology Stack Updates
- **Frontend Framework:** Next.js (React 19) + Tailwind CSS v4 (already installed).
- **Animations:** `framer-motion` for fluid dice rolls, token movements, board rendering, and chest animations.
- **State Management (Client):** `zustand` for predictable frontend game state reflecting the server.
- **Icons & Graphics:** `lucide-react` for crisp vector icons. Custom SVGs for flags and tokens.
- **Networking & Database:** `@supabase/supabase-js`, utilizing Supabase Realtime (Broadcast and Presence) for low-latency pub/sub, and Supabase Postgres for authoritative persistent game state.

### 2. Backend Architecture (Authoritative Serverless with Supabase)
- **Supabase Realtime:** We will use Realtime Channels (Broadcast and Presence). Presence will manage the lobby (tracking who is connected and their chosen color). Broadcast will push high-frequency transient events like `ANIMATE_DICE_ROLL`.
- **Database (Postgres):** Each `game_room` will have a row holding the authoritative state (current turn, properties owned, balances, positions).
- **Authoritative State Mutations:** Clients will execute state changes via Next.js Server Actions (e.g., `buyProperty(roomId, tileId)`). The server securely verifies the rules, mutates the database, and the clients instantly receive the update via Supabase Realtime Postgres CDC (Change Data Capture) or targeted Broadcasts.
- **Event Flow:** Client -> Next.js Server Action -> Supabase DB Mutated -> Realtime Subscription fires -> All Clients Update UI and Animations smoothly.

### 3. Frontend Architecture
- **Views:**
  - `/` (Home): Landing page with "Create Game" and "Join via Code" UI.
  - `/[roomCode]`: Main game route. Includes the Lobby (waiting state) -> transitions into the Game View.
- **Game Engine Components:**
  - `BoardView`: A grid component positioning the 40 country/action tiles cleanly along the edges.
  - `TokenLayer`: An absolute-positioned frame using Framer Motion `layout` to gracefully handle token transitions between tile coordinates.
  - `DiceOverlay`: The 3D-pseudophysics animated dice component triggering upon server roll command.
  - `ActionPanel`: The active player's HUD for end turns, actions, and mortgages.
  - `EventLog`: A rolling text log displaying all history dynamically.
- **Data Structures (Types):** Strictly type the game state shared by server/client.
  - `Player`: id, color, name, balance, position, inJail, isBankrupt.
  - `Tile`: id, type (Country, Chest, Tax, Jail, Go, etc.), setGroup, ownerId, upgradeLevel, advantage.

### 4. UI/UX Design System
- **Theme:** Deep charcoal/navy backgrounds (`bg-gray-900`) with glassmorphism panels (backdrop blur, semi-transparent overlays).
- **Color Identity:** Bright neon player colors (Cyan, Magenta, Lime, Amber) mapped heavily to their tokens and country borders.
- **Animations:** 
  - Framer Motion `spring` configs for token movement (giving an organic bounce landing).
  - Chest opening will use a scale/rotate sequence into a neon-glowing modal.
  - Property updates (upgrading) trigger simple flash/pulse effects using pure Tailwind+Framer.

### 5. Game Mechanics Implementation Steps
1. **Phase 1: Lobby & Transport.** Set up Supabase client, Realtime Presence channels, room database schemas, player joining/leaving, color picking, and starting the game.
2. **Phase 2: Board State & Movement.** Render the 40 tiles. Implement dice rolling, turn passing, calculating positions, and animating tokens across the map.
3. **Phase 3: Economy (Core Loop).** Passing GO, landing on unowned countries (Buy/Auction actions), and paying rent. Deducting/adding money and updating UI panels.
4. **Phase 4: Enhancements.** Chest quiz modals with fixed question banks, Prison mechanics, Country Upgrades, specific Minor Advantages per country, Mortgaging, and Bankruptcy logic.

## Open Questions

1. **Initial Question Bank:** For the Chest Quiz systems, do you have a specific theme for the trivia (Geography? Tech? General knowledge?) or should I construct a varied boilerplate set?
2. **Supabase Environment:** Do you already have a Supabase project created with your schema ready, or should I construct the SQL schema tables and stub the environment variables for you to link later?

## Verification Plan

### Automated Tests
- Server-side unit tests for game logic constraints (e.g., preventing negative balance purchases, ensuring dice rolls are bounded, testing bankruptcy triggers).

### Manual Verification
- Launch two discrete browser windows (or incognito) and test the lobby joining flow via room code.
- Visually verify Framer Motion token transitions across property corners.
- Play an accelerated cycle to simulate buying an entire set and verifying the upgrade (tier) mechanics and country-specific passive advantages.
- Trigger a chest tile to review the modal appearance and quiz timeout loop.
