// 모든 회기(/coach/cohorts, §8.4 · Step 3.2) — 코치/운영자 자기 회기 전체(모집·진행·마감). 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증→/login(미들웨어+여기) · 멤버→/home. 데이터: listCohortsByCoach(me.id) — RLS 본인 회기(운영자 전체).
// 카드 요약(응답·총원·돌봄) = /coach 와 동일 집계(공용 buildCohortRoster). 계약·DB 변경 0 — 기존 부품 조합.
import { redirect } from 'next/navigation';
import { instrumentDisplay, type CohortSummary } from '@/app/_screens/types';
import { requestContext, requestUser } from '@/app/_lib/requestScope';
import { buildCohortRoster } from '../rosterModel';
import { AllCohortsClient } from './AllCohortsClient';
import { ConsoleTitle } from '@/app/_screens/console/ConsoleTitle';

export const dynamic = 'force-dynamic';

export default async function AllCohortsPage() {
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용

  // 운영자(수퍼바이저)는 모든 인도자 회기(ADR-74). 인도자는 본인 소유만. RLS 이중 강제.
  const isAdmin = me.role === 'admin';
  const cohorts = isAdmin ? await ctx.listAllCohorts() : await ctx.listCohortsByCoach(me.id);
  const coachNameById = new Map<string, string | null>();
  if (isAdmin) {
    const users = await ctx.listUsers().catch(() => []);
    for (const u of users) coachNameById.set(u.id, u.name);
  }
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
      coachName: isAdmin ? (coachNameById.get(c.coachId) ?? null) : undefined,
      instrumentLabel: instrumentDisplay(c.instrumentId).label,
      responded,
      total: responded + waiting,
      careCount,
      code: c.code,
    });
  }

  // ★ **본문 폭과 화면 이름은 라우트가 든다**(U-6). 표현 부품 안에 두면 그 부품이
  //   라우팅에 매여 단독 렌더가 안 되고, 폭이 부품마다 흩어진다.
  return (
    <div className="console-body">
      <ConsoleTitle />
      <AllCohortsClient cohorts={summaries} isAdmin={isAdmin} />
    </div>
  );
}
