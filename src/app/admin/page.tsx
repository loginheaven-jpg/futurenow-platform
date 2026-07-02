// 본부 멤버 관리(§8.6 첫 조각) — 운영자 전용 서버 컴포넌트. listUsers(기존 메서드) 배선.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 멤버는 자기 집으로
  if (me.role !== 'admin') redirect('/coach'); // 코치(비운영자)는 코치 콘솔로

  // 멤버 목록(직접 역할관리) + 코치 신청 대기 큐(승인/거절) — 둘을 구분해 본부에 노출.
  const [members, applications] = await Promise.all([ctx.listUsers(), ctx.listCoachApplications('pending')]);
  return <AdminClient members={members} applications={applications} currentUserId={me.id} />;
}
