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
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#060912' }}
      >
        <div
          className="text-center p-8 rounded-2xl max-w-md"
          style={{ background: 'rgba(255,50,50,0.06)', border: '1px solid rgba(255,50,50,0.2)' }}
        >
          <p className="text-red-400 text-xl font-bold mb-2">Supabase not configured</p>
          <p className="text-slate-500 text-sm">
            Add your Supabase credentials to <code className="text-cyan-400">.env.local</code> and
            run the schema from <code className="text-cyan-400">supabase/schema.sql</code>.
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
