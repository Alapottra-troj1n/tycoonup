import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { roomCode, playerId } = await req.json();

  if (!roomCode || !playerId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(`player_id_${roomCode}`, playerId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });

  return NextResponse.json({ ok: true });
}
