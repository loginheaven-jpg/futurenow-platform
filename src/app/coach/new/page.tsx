// 차수 개설 라우트(§8.2) — 코치/운영자 전용. 사용자 세션 의존이라 동적 렌더.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { NewCohortClient } from './NewCohortClient';

export const dynamic = 'force-dynamic';

export default async function NewCohortPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <NewCohortClient />
    </div>
  );
}
