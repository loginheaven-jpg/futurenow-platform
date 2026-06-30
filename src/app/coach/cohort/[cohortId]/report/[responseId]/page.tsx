// 개인 리포트(코치/운영자 전용). getResponse→B② score→기존 ReportScreen 재사용(신규 리포트 0).
// 접근 제어: responses RLS(차수 코치+운영자+본인만 SELECT). 차단/부재 → 404. 참여자는 이 임상 리포트 UI 경로 없음(§7.5 거울만).
// wave 비교(prev)는 후속 — MVP 는 단일 wave 로 충분(ReportScreen 이 prev optional 처리).
import { notFound, redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { ReportScreen } from '@/instruments/futurenow/report/ReportScreen';
import { futurenowScoring } from '@/instruments/futurenow/scoring';

export const dynamic = 'force-dynamic';

export default async function CoachReportPage({
  params,
}: {
  params: Promise<{ cohortId: string; responseId: string }>;
}) {
  const { cohortId, responseId } = await params;
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  const resp = await ctx.getResponse<Answers, unknown>(responseId).catch(() => null);
  if (!resp) notFound(); // RLS 차단(비소유 코치)·부재 → 404

  const scores = futurenowScoring.score(resp.answers, { wave: resp.wave });
  const backTo = `/coach/cohort/${resp.cohortId ?? cohortId}`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="개인 리포트" backHref={backTo} homeHref="/coach" action={<HeaderActions />} />
      <div style={{ marginTop: 'var(--space-4)' }}>
        <ReportScreen scores={scores} />
      </div>
    </div>
  );
}
