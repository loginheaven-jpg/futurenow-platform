// 본부 멤버 관리(§8.6 첫 조각) — 운영자 전용 서버 컴포넌트. listUsers(기존 메서드) 배선.
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();

  if (!me || me.role !== 'admin') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>운영자 전용 화면입니다.</p>
      </div>
    );
  }

  const members = await ctx.listUsers();
  return <AdminClient members={members} currentUserId={me.id} />;
}
