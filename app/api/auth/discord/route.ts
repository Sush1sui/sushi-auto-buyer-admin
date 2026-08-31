import { NextRequest, NextResponse } from 'next/server';
import { getDiscordOAuthUrl } from '@/lib/discord';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || 'extension'; // 'admin' or 'extension'
  const oauthUrl = getDiscordOAuthUrl(source);
  return NextResponse.redirect(oauthUrl);
}
