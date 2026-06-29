// 내 차수 목록(/my/cohorts, Step 1.2) — 멤버 시점. 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증→/login·코치·운영자→/coach(/home 패턴 재사용). 셸 헤더+로그아웃+뒤로(→/home).
// 데이터: listMyCohorts(my_cohorts DEFINER RPC). 앱은 cohorts·responses 직접 select 안 함.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { LogoutButton } from '@/app/_screens/LogoutButton';
import { MyCohorts } from '@/app/_screens/MyCohorts';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MyCohortsPage() {
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role !== 'user') redirect('/coach');

  const cohorts = await ctx.listMyCohorts();

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader title="내 차수" action={<LogoutButton />} />
      <a
        href="/home"
        className="t-caption"
        style={{ color: 'var(--color-text-secondary)', display: 'inline-block', marginBottom: 'var(--space-4)' }}
      >
        ← 홈으로
      </a>
      <MyCohorts cohorts={cohorts} />
    </div>
  );
}
