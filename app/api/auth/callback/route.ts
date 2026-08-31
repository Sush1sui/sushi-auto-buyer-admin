import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { exchangeCodeForToken, fetchDiscordUser, fetchUserGuilds, fetchGuildMember } from '@/lib/discord';
import { signToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || 'extension';
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error || 'missing_code')}`, req.url));
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    if (!tokenData || !tokenData.access_token) {
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', req.url));
    }

    const discordUser = await fetchDiscordUser(tokenData.access_token);
    if (!discordUser || !discordUser.id) {
      return NextResponse.redirect(new URL('/auth/error?error=failed_fetching_user', req.url));
    }

    await connectToDatabase();

    const adminDiscordId = process.env.ADMIN_DISCORD_ID;
    const isAdmin = Boolean(adminDiscordId && discordUser.id === adminDiscordId);

    // Fetch guilds & roles
    const guilds = await fetchUserGuilds(tokenData.access_token);
    const guildIds = guilds.map((g) => g.id);

    const rolesMap: Record<string, string[]> = {};
    const freeServerId = process.env.FREE_ACCESS_SERVER_ID;
    const freeRoleId = process.env.FREE_ACCESS_ROLE_ID;

    if (freeServerId && guildIds.includes(freeServerId)) {
      const member = await fetchGuildMember(tokenData.access_token, freeServerId);
      if (member && member.roles) {
        rolesMap[freeServerId] = member.roles;
      }
    }

    // New session nonce invalidates any previous device's active session
    const newSessionNonce = crypto.randomUUID();

    // Check existing user in MongoDB
    let user = await User.findOne({ discordId: discordUser.id });

    if (!user) {
      // New user
      let initialStatus: 'active' | 'pending' = isAdmin ? 'active' : 'pending';
      let initialPassType: 'lifetime' | null = isAdmin ? 'lifetime' : null;
      let notes = isAdmin ? '👑 Admin Owner' : '';

      // Check role-based free access
      if (!isAdmin && freeServerId && freeRoleId && rolesMap[freeServerId]?.includes(freeRoleId)) {
        initialStatus = 'active';
        initialPassType = 'lifetime';
        notes = 'Auto-granted via Discord server role';
      }

      user = await User.create({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar || '',
        accessStatus: initialStatus,
        passType: initialPassType,
        activatedAt: initialStatus === 'active' ? new Date() : null,
        expiresAt: null,
        notes,
        sessionNonce: newSessionNonce,
        guilds: guildIds,
        roles: rolesMap,
      });
    } else {
      // Update existing user profile, guilds, and session nonce
      user.discordUsername = discordUser.username;
      user.discordAvatar = discordUser.avatar || '';
      user.sessionNonce = newSessionNonce;
      user.guilds = guildIds;
      user.roles = { ...user.roles, ...rolesMap };

      if (isAdmin) {
        user.accessStatus = 'active';
        user.passType = 'lifetime';
        user.expiresAt = null;
        if (!user.notes) user.notes = '👑 Admin Owner';
        if (!user.activatedAt) user.activatedAt = new Date();
      } else if (
        user.accessStatus === 'pending' &&
        freeServerId &&
        freeRoleId &&
        rolesMap[freeServerId]?.includes(freeRoleId)
      ) {
        user.accessStatus = 'active';
        user.passType = 'lifetime';
        user.activatedAt = new Date();
        user.notes = 'Auto-granted via Discord server role';
      }

      await user.save();
    }

    const jwtToken = signToken({
      discordId: user.discordId,
      sessionNonce: newSessionNonce,
      isAdmin,
    });

    if (state === 'admin') {
      if (isAdmin) {
        // Redirect to admin dashboard with token
        const response = NextResponse.redirect(new URL('/admin', req.url));
        response.cookies.set('sushi_admin_token', jwtToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
        });
        return response;
      } else {
        // Non-admin trying to log into admin dashboard -> Block completely
        return NextResponse.redirect(
          new URL('/auth/error?error=access_denied_not_an_admin', req.url)
        );
      }
    }

    // Default flow: Extension OAuth success landing
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : '';

    const successUrl = new URL('/auth/success', req.url);
    successUrl.searchParams.set('token', jwtToken);
    successUrl.searchParams.set('discordId', user.discordId);
    successUrl.searchParams.set('username', user.discordUsername);
    if (avatarUrl) {
      successUrl.searchParams.set('avatar', avatarUrl);
    }

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error('[OAuth Callback Error]:', err);
    return NextResponse.redirect(new URL('/auth/error?error=internal_server_error', req.url));
  }
}
