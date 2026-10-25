import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { getSetting } from '@/models/Setting';
import { verifyToken } from '@/lib/jwt';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function GET(req: NextRequest) {
  const headers = getCorsHeaders();
  const fallbackInvite = process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE || 'https://discord.gg/your-invite';
  let dynamicInviteUrl = fallbackInvite;

  try {
    await connectToDatabase();
    dynamicInviteUrl = await getSetting('discord_invite_url', fallbackInvite);
  } catch (e) {
    console.error('[DB Init Error in Access]:', e);
  }

  const authHeader = req.headers.get('authorization');
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return NextResponse.json(
      { allowed: false, reason: 'unauthorized', message: 'Authentication required', discordInviteUrl: dynamicInviteUrl },
      { status: 401, headers }
    );
  }

  const payload = verifyToken(token);
  if (!payload || !payload.discordId) {
    return NextResponse.json(
      { allowed: false, reason: 'unauthorized', message: 'Invalid or expired token', discordInviteUrl: dynamicInviteUrl },
      { status: 401, headers }
    );
  }

  try {
    const adminDiscordId = process.env.ADMIN_DISCORD_ID;
    const isAdmin = Boolean(adminDiscordId && payload.discordId === adminDiscordId);

    const user = await User.findOne({ discordId: payload.discordId });

    if (!user) {
      return NextResponse.json(
        { allowed: false, reason: 'not_registered', message: 'User not registered', discordInviteUrl: dynamicInviteUrl },
        { status: 200, headers }
      );
    }

    // Single device session enforcement: Check session nonce
    if (!user.sessionNonce || payload.sessionNonce !== user.sessionNonce) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'session_revoked',
          message: 'You have been logged in on another device. Please log in again.',
          discordInviteUrl: dynamicInviteUrl,
        },
        { status: 200, headers }
      );
    }

    // Owner entitlement does not bypass session revocation.
    if (isAdmin) {
      return NextResponse.json(
        { allowed: true, reason: 'active', passType: 'lifetime', expiresAt: null, discordInviteUrl: dynamicInviteUrl },
        { status: 200, headers },
      );
    }

    // Check pass expiration
    const now = new Date();
    if (user.expiresAt && now > user.expiresAt) {
      if (user.accessStatus !== 'expired') {
        user.accessStatus = 'expired';
        await user.save();
      }

      return NextResponse.json(
        {
          allowed: false,
          reason: 'expired',
          passType: user.passType,
          expiresAt: user.expiresAt.toISOString(),
          message: 'Your subscription pass has expired. Open a ticket to renew.',
          discordInviteUrl: dynamicInviteUrl,
        },
        { status: 200, headers }
      );
    }

    if (user.accessStatus === 'locked') {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'locked',
          passType: user.passType,
          message: 'Your account access has been locked. Contact support in Discord.',
          discordInviteUrl: dynamicInviteUrl,
        },
        { status: 200, headers }
      );
    }

    if (user.accessStatus !== 'active') {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'pending',
          passType: null,
          message: 'No active pass found. Please open a ticket on Discord to purchase access.',
          discordInviteUrl: dynamicInviteUrl,
        },
        { status: 200, headers }
      );
    }

    // Active
    return NextResponse.json(
      {
        allowed: true,
        reason: 'active',
        passType: user.passType,
        expiresAt: user.expiresAt ? user.expiresAt.toISOString() : null,
        discordInviteUrl: dynamicInviteUrl,
      },
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[API Access Error]:', err);
    return NextResponse.json(
      { allowed: false, reason: 'server_error', message: 'Internal server error', discordInviteUrl: dynamicInviteUrl },
      { status: 500, headers }
    );
  }
}

