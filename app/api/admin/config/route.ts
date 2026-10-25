import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSetting, setSetting } from '@/models/Setting';
import { verifyAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const fallback = process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE || 'https://discord.gg/your-invite';
    const discordInviteUrl = await getSetting('discord_invite_url', fallback);

    return NextResponse.json({ discordInviteUrl });
  } catch (err) {
    console.error('[Admin Config GET Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { discordInviteUrl } = await req.json();
    if (!discordInviteUrl) {
      return NextResponse.json({ error: 'Missing discordInviteUrl' }, { status: 400 });
    }

    await connectToDatabase();
    await setSetting('discord_invite_url', discordInviteUrl.trim());

    return NextResponse.json({ success: true, discordInviteUrl: discordInviteUrl.trim() });
  } catch (err) {
    console.error('[Admin Config POST Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
