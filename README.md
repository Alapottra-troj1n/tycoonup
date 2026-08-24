# TycoonUP

A real-time multiplayer Monopoly-style board game — a richup.io alternative with all the batteries included. Built with Next.js 16, Supabase Realtime, Zustand, and Framer Motion.

## Features

- **No accounts** — create a room, share a 6-letter code or invite link, play
- **2 boards**: Classic World (40 tiles, up to 6 players) and Mega World (48 tiles, 10 country sets, up to 8 players)
- **Custom rules** (host picks in the lobby): starting cash, GO salary, x2 rent on full sets, auctions on/off + timer, mortgages, even-build rule, vacation cash pot, monopoly perks, jail fine, turn order shuffle
- **Live auctions** with quick-bid chips, fold/pass, anti-snipe clock extension, server-synced timer
- **Trading anytime** between any two players (properties + cash)
- **Bots** that buy, answer quizzes, bid in auctions, and take their turns
- **Monopoly perks** — each completed country set unlocks a unique passive bonus
- Procedurally synthesized sound design, animated board, win screen with leaderboard

## Setup

1. Create a [Supabase](https://supabase.com) project.
2. In the Supabase SQL editor, run in order:
   - `supabase/schema.sql`
   - `supabase/migrations/001_phase3.sql`
   - `supabase/migrations/002_add_bot.sql`
   - `supabase/migrations/003_settings.sql`
3. Create `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000), create a game, and share the invite link.

## Architecture

- All game logic is server-authoritative in `app/actions/game.ts` (Next.js Server Actions).
- Supabase Postgres is the source of truth; Supabase Realtime broadcasts changes to all clients.
- `lib/store.ts` (Zustand) mirrors state client-side and decouples dice/walk animations from network updates.
- Board definitions and monopoly perks are data-driven in `lib/game-data.ts`; per-room rules in `lib/settings.ts`.

See `PROGRESS.md` for the full build history and file map.
