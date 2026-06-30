// 본부 멤버 관리(§8.6 첫 조각) — 운영자 전용 서버 컴포넌트. listUsers(기존 메서드) 배선.
import { redirect } from 'next/navigation';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 멤버는 자기 집으로
  if (me.role !== 'admin') redirect('/coach'); // 코치(비운영자)는 코치 콘솔로

  const members = await ctx.listUsers();
  return <AdminClient members={members} currentUserId={me.id} />;
}
