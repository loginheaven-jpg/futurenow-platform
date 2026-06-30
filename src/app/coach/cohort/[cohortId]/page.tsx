// 차수 상세(§8.3) — 코치/운영자 전용 서버 컴포넌트. 데이터는 기존 메서드 배선(계약 변경 0).
import { notFound, redirect } from 'next/navigation';
import { instrumentDisplay, type CohortSummary } from '@/app/_screens/types';
import { buildCohortRoster } from '@/app/coach/rosterModel';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { CohortDetailClient } from './CohortDetailClient';

export const dynamic = 'force-dynamic';

export default async function CohortDetailPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  const cohort = await ctx.getCohort(cohortId).catch(() => null);
  if (!cohort) notFound(); // 미존재/RLS 차단 → 404

  const [enrollments, responses, alerts, members] = await Promise.all([
    ctx.listEnrollments(cohortId),
    ctx.listResponses({ instrumentId: cohort.instrumentId, cohortId }),
    ctx.listAlerts(cohortId),
    ctx.listCohortMembers(cohortId),
  ]);

  const { roster, responded, waiting, careCount } = buildCohortRoster({ enrollments, responses, alerts, members });
  const summary: CohortSummary = {
    id: cohort.id,
    name: cohort.name,
    description: cohort.description,
    instrumentLabel: instrumentDisplay(cohort.instrumentId).label,
    responded,
    total: responded + waiting,
    careCount,
    code: cohort.code,
  };

  return <CohortDetailClient summary={summary} roster={roster} status={cohort.status} maxMembers={cohort.maxMembers} />;
}
