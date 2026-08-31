import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { verifyToken } from '@/lib/jwt';

function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  if (!token) {
    token = req.cookies.get('sushi_admin_token')?.value || '';
  }

  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const adminDiscordId = process.env.ADMIN_DISCORD_ID;
  if (payload.isAdmin || (adminDiscordId && payload.discordId === adminDiscordId)) {
    return payload;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const admin = verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const adminDiscordId = process.env.ADMIN_DISCORD_ID;

    const baseFilter: Record<string, unknown> = {};
    if (adminDiscordId) {
      baseFilter.discordId = { $ne: adminDiscordId };
    }

    const query: Record<string, unknown> = { ...baseFilter };

    if (status && ['active', 'locked', 'expired', 'pending'].includes(status)) {
      query.accessStatus = status;
    }

    if (search) {
      query.$and = [
        baseFilter,
        {
          $or: [
            { discordUsername: { $regex: search, $options: 'i' } },
            { discordId: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const [users, total, active, locked, expired, pending] = await Promise.all([
      User.find(query).sort({ updatedAt: -1 }).limit(100),
      User.countDocuments(baseFilter),
      User.countDocuments({ ...baseFilter, accessStatus: 'active' }),
      User.countDocuments({ ...baseFilter, accessStatus: 'locked' }),
      User.countDocuments({ ...baseFilter, accessStatus: 'expired' }),
      User.countDocuments({ ...baseFilter, accessStatus: 'pending' }),
    ]);

    return NextResponse.json({
      users,
      stats: {
        total,
        active,
        locked,
        expired,
        pending,
      },
    });
  } catch (err) {
    console.error('[Admin Users GET Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
