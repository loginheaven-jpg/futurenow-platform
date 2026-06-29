// 그룹 리포트(/coach/cohort/[id]/group, §B③ 1주차 오프닝 · Step 3.3) — 차수 집계(축 평균·분포). 코치 전용 리얼.
// 게이트: 미인증→/login(미들웨어+여기) · 멤버→/home. 멤버 순화(participantMirror)와 분리(ADR-30) — 멤버 진입 경로 0.
// 데이터: listResponses(pre) → futurenowScoring.score → FuturenowScores[] → 기존 GroupView. 계약·DB 변경 0.
// 권한: responses_select RLS(is_cohort_coach)가 자기 차수만 반환 → 타 차수 cohortId 주입 시 빈 결과(누출 0).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { GroupView } from '@/instruments/futurenow/report/GroupView';
import { futurenowScoring } from '@/instruments/futurenow/scoring';

export const dynamic = 'force-dynamic';

export default async function GroupReportPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버 차단(리얼 비노출)

  const responses = await ctx.listResponses<Answers, unknown>({
    instrumentId: 'futurenow',
    cohortId,
    wave: 'pre',
  });
  const scores = responses.map((r) => futurenowScoring.score(r.answers, { wave: r.wave }));
  const backTo = `/coach/cohort/${cohortId}`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader title="그룹 리포트" subtitle="사전 진단 · 차수 평균" action={<HeaderActions />} />
      <Link href={backTo} className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
        ← 차수로 돌아가기
      </Link>
      <div style={{ marginTop: 'var(--space-4)' }}>
        {scores.length === 0 ? (
          <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
            아직 제출된 응답이 없어요. 참여자가 사전 진단을 마치면 그룹 평균이 나타나요.
          </p>
        ) : (
          <GroupView all={scores} />
        )}
      </div>
    </div>
  );
}
