// 내 차수 목록(/my/cohorts, Step 1.2) — 본인 참여 차수. 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증→/login 만(A′-1 역할 감금 해제 — 코치·운영자도 본인 참여 차수를 본다). 셸 헤더+로그아웃+홈(→/home).
// 데이터: listMyCohorts(my_cohorts DEFINER RPC, auth.uid() 스코프). 앱은 cohorts·responses 직접 select 안 함.
import { redirect } from 'next/navigation';
import { MyCohorts } from '@/app/_screens/MyCohorts';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MyCohortsPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const cohorts = await ctx.listMyCohorts();

  // 차수 1개면 목록은 불필요한 경유 — 막바로 차수 홈으로. (0개=빈 상태, 2개+=목록이 값을 함)
  if (cohorts.length === 1) redirect(`/my/cohorts/${cohorts[0].cohortId}`);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-2 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다 —
          제목은 라우트의 성질이지 화면의 사정이 아니다. */}
      <MyCohorts cohorts={cohorts} />
    </div>
  );
}
