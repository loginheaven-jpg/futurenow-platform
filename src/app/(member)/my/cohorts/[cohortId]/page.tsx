// 회기 홈(ADR-80 · Phase 2) — **그 회기를 보는 자리**.
//
// **조립은 여기 없다**(ADR-181). `/home` 이 같은 대시보드를 그리므로 조립을 `dashboard.tsx` 로
//   뽑았고, 이 라우트는 **게이트와 회기 고르기만** 한다. 사본이 아니라 같은 함수다(불변식 23).
//
// **이 라우트를 지우지 않는다** — `returnTo` 화이트리스트에 등재돼 있어(ADR-176) 지우면
//   통과한 딥링크가 404 가 된다. 그리고 회기가 둘 이상인 사람은 여기서 그 회기를 본다.
import { redirect } from 'next/navigation';
import { requestContext, requestUser, requestCohorts } from '@/app/_lib/requestScope';
import { renderCohortDashboard } from './dashboard';

export const dynamic = 'force-dynamic';

export default async function CohortHomePage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect(`/login?returnTo=${encodeURIComponent(`/my/cohorts/${cohortId}`)}`);

  const mine = await requestCohorts();
  const c = mine.find((x) => x.cohortId === cohortId);
  if (!c) redirect('/my/cohorts');

  return renderCohortDashboard(ctx, me, c);
}
