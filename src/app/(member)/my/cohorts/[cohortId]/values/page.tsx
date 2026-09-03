// 가치 카드 — 참여자 화면(ADR-121).
//
// **게이트 두 겹.** ① `/my` 는 `proxy.guard.ts` PROTECTED_PREFIXES 에 있어 미인증이 미들웨어에서 /login 으로 걸린다.
//   ② 그것은 *인증*만 본다. **회기 소속**은 여기서 본다 — 남의 cohortId 를 URL 에 넣어도 자기 회기가 아니면 못 들어간다.
//   회기 홈(`../page.tsx`)이 쓰는 것과 같은 방식이고, 게이트를 데이터보다 **먼저** 통과시킨다(CLAUDE §9).
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { ValuesClient } from './ValuesClient';

export const dynamic = 'force-dynamic';

export default async function ValuesPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;

  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const mine = await ctx.listMyCohorts();
  const cohort = mine.find((c) => c.cohortId === cohortId);
  if (!cohort) redirect('/my/cohorts');

  const initial = await ctx.getMyValueAssessment(cohortId);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* 선형 흐름이라 flow — 다만 흐름 안의 뒤로는 화면이 스스로 준다(단계 되돌리기). */}
      {/* **헤더는 껍데기가 그린다**(U-2 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다 —
          제목은 라우트의 성질이지 화면의 사정이 아니다. */}
      <ValuesClient cohortId={cohortId} initial={initial} />
    </div>
  );
}
