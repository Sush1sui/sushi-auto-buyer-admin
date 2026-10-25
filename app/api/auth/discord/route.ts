import { NextRequest, NextResponse } from 'next/server';
import { getDiscordOAuthUrl } from '@/lib/discord';
import { randomBytes } from 'node:crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') === 'admin' ? 'admin' : 'extension';
  const state = `${source}:${randomBytes(32).toString('hex')}`;
  const response = NextResponse.redirect(getDiscordOAuthUrl(state));
  response.cookies.set('sushi_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/auth',
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
