// 모든 차수(/coach/cohorts, §8.4 · Step 3.2) — 코치/운영자 자기 차수 전체(모집·진행·마감). 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증→/login(미들웨어+여기) · 멤버→/home. 데이터: listCohortsByCoach(me.id) — RLS 본인 차수(운영자 전체).
// 카드 요약(응답·총원·돌봄) = /coach 와 동일 집계(공용 buildCohortRoster). 계약·DB 변경 0 — 기존 부품 조합.
import { redirect } from 'next/navigation';
import { instrumentDisplay, type CohortSummary } from '@/app/_screens/types';
import { createServerContext } from '@/core/supabase/server';
import { buildCohortRoster } from '../rosterModel';
import { AllCohortsClient } from './AllCohortsClient';

export const dynamic = 'force-dynamic';

export default async function AllCohortsPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용

  const cohorts = await ctx.listCohortsByCoach(me.id);
  const summaries: CohortSummary[] = [];
  for (const c of cohorts) {
    const [enrollments, responses, alerts, members] = await Promise.all([
      ctx.listEnrollments(c.id),
      ctx.listResponses({ instrumentId: c.instrumentId, cohortId: c.id }),
      ctx.listAlerts(c.id),
      ctx.listCohortMembers(c.id),
    ]);
    const { responded, waiting, careCount } = buildCohortRoster({ enrollments, responses, alerts, members });
    summaries.push({
      id: c.id,
      name: c.name,
      instrumentLabel: instrumentDisplay(c.instrumentId).label,
      responded,
      total: responded + waiting,
      careCount,
      code: c.code,
    });
  }

  return <AllCohortsClient cohorts={summaries} />;
}
