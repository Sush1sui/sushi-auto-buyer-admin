import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSetting } from '@/models/Setting';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function GET() {
  const headers = getCorsHeaders();
  try {
    await connectToDatabase();
    const fallback = process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE || 'https://discord.gg/your-invite';
    const discordInviteUrl = await getSetting('discord_invite_url', fallback);

    return NextResponse.json({ discordInviteUrl }, { headers });
  } catch (err) {
    console.error('[API Config Error]:', err);
    return NextResponse.json(
      { discordInviteUrl: process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE || 'https://discord.gg/your-invite' },
      { headers }
    );
  }
}
