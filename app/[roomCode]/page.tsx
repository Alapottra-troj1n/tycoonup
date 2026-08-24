import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import GameRoomClient from '@/components/game/GameRoomClient';
import type { GameRoom, Player, Property } from '@/lib/types';

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomCode } = await params;
  const cookieStore = await cookies();
  const playerId = cookieStore.get(`player_id_${roomCode.toUpperCase()}`)?.value ?? null;

  let room: GameRoom | null = null;
  let players: Player[] = [];
  let properties: Property[] = [];
  let supabaseReady = true;

  try {
    const supabase = createServerClient();

    const { data: roomData, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (error || !roomData) {
      redirect('/');
    }

    room = roomData as GameRoom;

    const [{ data: playersData }, { data: propertiesData }] = await Promise.all([
      supabase.from('players').select('*').eq('room_id', room.id).order('turn_order'),
      supabase.from('properties').select('*').eq('room_id', room.id),
    ]);

    players = (playersData ?? []) as Player[];
    properties = (propertiesData ?? []) as Property[];
  } catch {
    supabaseReady = false;
  }

  if (!supabaseReady) {
    return (
      <div className="tu-backdrop" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{
          textAlign: 'center', padding: 32, maxWidth: 420,
          background: 'var(--danger-soft)', border: '1px solid oklch(0.71 0.155 25 / 0.25)',
          borderRadius: 'var(--r-xl)',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--danger)', margin: '0 0 8px' }}>
            Supabase not configured
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Add your Supabase credentials to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>.env.local</code> and
            run the schema from <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>supabase/schema.sql</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!room) redirect('/');

  // If no player ID cookie, redirect home to join/create
  if (!playerId || !players.find((p) => p.id === playerId)) {
    redirect(`/?join=${roomCode.toUpperCase()}`);
  }

  return (
    <GameRoomClient
      initialRoom={room}
      initialPlayers={players}
      initialProperties={properties}
      myPlayerId={playerId}
    />
  );
}
