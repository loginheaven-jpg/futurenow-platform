// 그룹 리포트(/coach/cohort/[id]/group, §B③ · Step 3.3) — 차수 집계(축 평균·분포). 코치 전용 리얼.
// B-3: 사전·사후 각각 그룹 평균을 산출. 사후 응답이 있으면 사전/사후 두 평균을 라벨링해 비교, 없으면 사전 단독(폴백).
// 게이트: 미인증→/login · 멤버→/home · getCohort 소유 게이트 — 비소유·미존재 → 404. 멤버 순화(participantMirror)와 분리(ADR-30).
// 데이터: listResponses(wave별) → latestPerUser(재진단 dedup, 각 wave 최신 1건) → futurenowScoring.score → GroupView. 계약·DB 변경 0.
import { notFound, redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { GroupView } from '@/instruments/futurenow/report/GroupView';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { latestPerUser } from '@/app/_lib/latestPerUser';

export const dynamic = 'force-dynamic';

export default async function GroupReportPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버 차단(리얼 비노출)

  const cohort = await ctx.getCohort(cohortId).catch(() => null);
  if (!cohort) notFound(); // 미존재/RLS 차단(비소유·비멤버) → 404 (차수 상세와 동일 게이트)

  // 사전·사후 각각 user별 최신 1건(재진단 dedup) → 평균. 사후 있으면 비교(B-3).
  const scoresFor = async (wave: 'pre' | 'post') => {
    const rs = await ctx.listResponses<Answers, unknown>({ instrumentId: 'futurenow', cohortId, wave });
    return latestPerUser(rs).map((r) => futurenowScoring.score(r.answers, { wave: r.wave }));
  };
  const [preScores, postScores] = await Promise.all([scoresFor('pre'), scoresFor('post')]);
  const hasComparison = postScores.length > 0;
  const backTo = `/coach/cohort/${cohortId}`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="그룹 리포트" subtitle={hasComparison ? '사전·사후 비교 · 차수 평균' : '사전 진단 · 차수 평균'} backHref={backTo} homeHref="/home" action={<HeaderActions />} />
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {preScores.length === 0 && postScores.length === 0 ? (
          <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
            아직 제출된 응답이 없어요. 참여자가 사전 진단을 마치면 그룹 평균이 나타나요.
          </p>
        ) : (
          <>
            {preScores.length > 0 ? (
              <section>
                {hasComparison ? (
                  <h2 className="t-h2" style={{ color: 'var(--color-text-secondary)', fontSize: 15, margin: '0 0 var(--space-3)' }}>사전 진단 — 그룹 평균</h2>
                ) : null}
                <GroupView all={preScores} />
              </section>
            ) : null}
            {hasComparison ? (
              <section>
                <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 15, margin: '0 0 var(--space-3)' }}>사후 진단 — 그룹 평균</h2>
                <GroupView all={postScores} />
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
