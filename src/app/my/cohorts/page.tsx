// 내 차수 목록(/my/cohorts, Step 1.2) — 본인 참여 차수. 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증→/login 만(A′-1 역할 감금 해제 — 코치·운영자도 본인 참여 차수를 본다). 셸 헤더+로그아웃+홈(→/home).
// 데이터: listMyCohorts(my_cohorts DEFINER RPC, auth.uid() 스코프). 앱은 cohorts·responses 직접 select 안 함.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { MyCohorts } from '@/app/_screens/MyCohorts';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MyCohortsPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const cohorts = await ctx.listMyCohorts();

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="내 차수" homeHref="/home" action={<HeaderActions homeHref="/home" />} />
      <MyCohorts cohorts={cohorts} />
    </div>
  );
}
