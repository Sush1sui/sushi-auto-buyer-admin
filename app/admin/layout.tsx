import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken } from '@/lib/auth';

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

  if (!(await verifyAdminToken(token))) {
    redirect('/api/auth/discord?source=admin');
  }

  return <>{children}</>;
}
