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
import type { InterpretationContent } from '@/instruments/futurenow/report/interpretation';
import { InterpretationPanel } from './InterpretationPanel';

export const dynamic = 'force-dynamic';
// 비차단(B③-A): 서버 렌더는 existing 해석(getInterpretation·빠름)만 조회 — aiChat 동기 await 제거(첫 열람 26s 블랭크 회피).
// 생성(게이트웨이 ~수십초)은 InterpretationPanel 이 마운트 후 ensureInterpretationAction 으로 돌린다. maxDuration=60 은 그 액션 예산.
export const maxDuration = 60;

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

  // 비차단(B③-A): existing 해석만 즉시 조회(빠름). 없으면 null → 패널이 마운트 후 생성 트리거.
  //   게이트웨이 동기 블로킹 제거 → 리포트 시각화가 첫 열람부터 즉시 렌더. 해석 실패는 패널이 재시도 안내(시각화 무관).
  // 초기 VM(B③-B): effective(coach본 우선) + AI 원문(되돌리기 대상) + 코치 수정 여부(출처·되돌리기 노출).
  const existing = await ctx.getInterpretation(responseId).catch(() => null);
  const initialVm =
    existing && existing.effective && existing.aiContent
      ? {
          effective: existing.effective as InterpretationContent,
          ai: existing.aiContent as InterpretationContent,
          coachEdited: existing.coachContent != null,
        }
      : null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="개인 리포트" backHref={backTo} homeHref="/home" action={<HeaderActions />} />
      <InterpretationPanel responseId={responseId} initial={initialVm} />
      <div style={{ marginTop: 'var(--space-4)' }}>
        <ReportScreen scores={scores} />
      </div>
    </div>
  );
}
