import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/jwt';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function verifyAdminToken(token: string): Promise<TokenPayload | null> {
  const payload = verifyToken(token);
  const owner = process.env.ADMIN_DISCORD_ID;
  if (!payload || !owner || payload.discordId !== owner) return null;

  try {
    await connectToDatabase();
    const user = await User.findOne({ discordId: payload.discordId, sessionNonce: payload.sessionNonce });
    return user ? payload : null;
  } catch (error) {
    console.error('[Admin Session Check Error]', error);
    return null;
  }
}

export async function verifyAdmin(req: NextRequest): Promise<TokenPayload | null> {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : req.cookies.get('sushi_admin_token')?.value;
  return token ? verifyAdminToken(token) : null;
}
