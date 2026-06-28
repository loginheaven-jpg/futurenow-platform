// 차수 개설 라우트(§8.2) — 코치/운영자 전용. 사용자 세션 의존이라 동적 렌더.
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { NewCohortClient } from './NewCohortClient';

export const dynamic = 'force-dynamic';

export default async function NewCohortPage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {!me || me.role === 'user' ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>코치 전용 화면입니다.</p>
      ) : (
        <NewCohortClient />
      )}
    </div>
  );
}
