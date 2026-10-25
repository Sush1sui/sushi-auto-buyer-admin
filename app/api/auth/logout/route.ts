import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyToken } from '@/lib/jwt';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  // Bearer-only authentication avoids a cookie-authenticated cross-site logout.
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });

  try {
    await connectToDatabase();
    // Match the old nonce atomically so a delayed logout cannot revoke a newer login.
    await User.updateOne(
      { discordId: payload.discordId, sessionNonce: payload.sessionNonce },
      { $set: { sessionNonce: randomUUID() } },
    );
    const response = new NextResponse(null, { status: 204, headers });
    if (req.cookies.get('sushi_admin_token')?.value === token) {
      response.cookies.delete('sushi_admin_token');
    }
    return response;
  } catch (error) {
    console.error('[Logout Error]', error);
    return NextResponse.json({ error: 'Could not revoke session' }, { status: 503, headers });
  }
}
