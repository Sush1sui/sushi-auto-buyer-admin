import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sushi_admin_token')?.value;

  if (!token) {
    redirect('/api/auth/discord?source=admin');
  }

  const payload = verifyToken(token);
  const adminDiscordId = process.env.ADMIN_DISCORD_ID;

  if (
    !payload ||
    !payload.discordId ||
    (adminDiscordId && payload.discordId !== adminDiscordId && !payload.isAdmin)
  ) {
    redirect('/api/auth/discord?source=admin');
  }

  return <>{children}</>;
}
