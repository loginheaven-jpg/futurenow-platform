// 멤버 내 리포트(/my/cohorts/[cohortId]/report, Step 1.3) — 순화 뷰(갈망 거울 재사용, ADR-27).
// B-3: 사전·사후가 모두 있으면 비교(지난 사전 ↔ 지금 사후 미러 나란히), 하나면 단독, 없으면 빈 상태.
//   listResponses(본인 wave별, RLS self-read) → latestPerUser(각 wave 최신 1건, 재진단 dedup ADR-33) → score → participantMirror.
// 하드룰 불변: severity·점수·활력 버킷·돌봄 0건(순화 유지 — 측정은 코치 리얼 리포트 몫). scores 저장 안 함(재채점).
import { redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { MirrorView } from '@/app/_screens/MirrorView';
import { createServerContext } from '@/core/supabase/server';
import { participantMirror } from '@/instruments/futurenow/participantMirror';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { latestPerUser } from '@/app/_lib/latestPerUser';

export const dynamic = 'force-dynamic';

export default async function MyReportPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login'); // 전 역할 개방(A′-1 정합) — 본인 참여분만 순화 뷰. RLS(responses_select user_id=auth.uid())가 본인 스코프. 코치/운영자도 자기 참여 리포트 열람.

  // 본인 사전·사후 각 wave 최신 1건(재진단 dedup) → 순화 미러. 다중 행이어도 latestPerUser가 최신끼리 페어링.
  const mirrorFor = async (wave: 'pre' | 'post') => {
    const rs = await ctx.listResponses<Answers, unknown>({ instrumentId: 'futurenow', cohortId, userId: me.id, wave });
    const r = latestPerUser(rs)[0] ?? null;
    return r ? participantMirror(futurenowScoring.score(r.answers, { wave: r.wave })) : null;
  };
  const [preMirror, postMirror] = await Promise.all([mirrorFor('pre'), mirrorFor('post')]);
  const both = !!preMirror && !!postMirror;
  const single = postMirror ?? preMirror; // 하나만 있을 때(사전 또는 사후)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="내 마음의 거울" backHref="/my/cohorts" homeHref="/home" action={<HeaderActions />} />

      {both ? (
        <div>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
            세미나 전과 후, 당신의 마음이 어떻게 움직였는지 나란히 놓아봤어요.
          </p>
          <section style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-6)', borderBottom: 'var(--border-hair) solid var(--color-border)' }}>
            <p className="t-caption" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, margin: '0 0 var(--space-3)' }}>세미나 전 · 사전 진단</p>
            <MirrorView mirror={preMirror!} />
          </section>
          <section>
            <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-3)' }}>세미나 후 · 지금</p>
            <MirrorView mirror={postMirror!} />
            {postMirror!.faith ? (
              <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-5) 0 0' }}>{postMirror!.faith}</p>
            ) : null}
          </section>
        </div>
      ) : single ? (
        <div>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
            지난 진단에서 당신의 마음이 향한 곳이에요.
          </p>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <MirrorView mirror={single} />
          </div>
          {single.faith ? (
            <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{single.faith}</p>
          ) : null}
        </div>
      ) : (
        <div>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
            아직 진단 결과가 없어요. 받은 코드로 참여하면 결과를 볼 수 있어요.
          </p>
          <a className="ui-btn ui-btn--primary" href="/join" style={{ width: '100%', textDecoration: 'none' }}>
            받은 코드로 참여
          </a>
        </div>
      )}
    </div>
  );
}
