// 멤버 내 리포트(/my/cohorts/[cohortId]/report, Step 1.3) — 순화 뷰(갈망 거울 재사용, ADR-27).
// 멤버 본인 결과를 "나중에 다시" 본다. 계약·DB·RLS 변경 0 — 전부 기존 부품 조합(finalizeResponse 와 동형):
//   listResponses(본인 wave='pre', responses_select RLS user_id=auth.uid() self-read) → score → participantMirror.
// 하드룰: severity·점수·활력 버킷·돌봄 0건. 측정은 코치 리얼 리포트(별도)의 몫. scores 저장 안 함(재채점).
import { redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { MirrorView } from '@/app/_screens/MirrorView';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { participantMirror } from '@/instruments/futurenow/participantMirror';
import { futurenowScoring } from '@/instruments/futurenow/scoring';

export const dynamic = 'force-dynamic';

export default async function MyReportPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = createCoreContext(await createServerSupabase());
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role !== 'user') redirect('/coach');

  // 본인 사전 응답(responses_select RLS = user_id=auth.uid() self-read). 없으면 빈 상태.
  const responses = await ctx.listResponses<Answers, unknown>({
    instrumentId: 'futurenow',
    cohortId,
    userId: me.id,
    wave: 'pre',
  });
  const resp = responses[0] ?? null;
  const mirror = resp ? participantMirror(futurenowScoring.score(resp.answers, { wave: resp.wave })) : null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader title="내 마음의 거울" action={<HeaderActions />} />
      <a
        href="/my/cohorts"
        className="t-caption"
        style={{ color: 'var(--color-text-secondary)', display: 'inline-block', marginBottom: 'var(--space-6)' }}
      >
        ← 내 차수
      </a>

      {mirror ? (
        <div>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
            지난 진단에서 당신의 마음이 향한 곳이에요.
          </p>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <MirrorView mirror={mirror} />
          </div>
          {mirror.faith ? (
            <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{mirror.faith}</p>
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
