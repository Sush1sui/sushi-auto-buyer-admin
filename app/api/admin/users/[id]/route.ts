import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { verifyAdmin } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();
    const user = await User.findOne({ discordId: id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[Admin User GET Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const user = await User.findOne({ discordId: id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { accessStatus, passType, durationDays, customExpiresAt, notes } = body;

    if (accessStatus !== undefined) {
      user.accessStatus = accessStatus;
      if (accessStatus === 'active' && !user.activatedAt) {
        user.activatedAt = new Date();
      }
    }

    if (passType !== undefined) {
      user.passType = passType;
      if (passType === 'lifetime') {
        user.expiresAt = null;
      } else if (passType === 'monthly') {
        const days = durationDays || 30;
        user.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      } else if (passType === 'custom') {
        if (customExpiresAt) {
          user.expiresAt = new Date(customExpiresAt);
        } else if (durationDays) {
          user.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        }
      }
    }

    if (notes !== undefined) {
      user.notes = notes;
    }

    await user.save();

    return NextResponse.json({ user, message: 'User updated successfully' });
  } catch (err) {
    console.error('[Admin User PATCH Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();
    const result = await User.deleteOne({ discordId: id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('[Admin User DELETE Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
