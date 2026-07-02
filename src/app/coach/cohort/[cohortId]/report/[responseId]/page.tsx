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
import { generateInterpretation, type InterpretationContent } from '@/instruments/futurenow/report/interpretation';

export const dynamic = 'force-dynamic';
// 해석 지연 생성(B③-2)은 게이트웨이 호출(~수십초 가능)을 서버에서 블로킹 → Vercel 함수 타임아웃 여유 확보.
// (B③-3에서 비차단/클라이언트 트리거 로딩으로 개선 권고 — 첫 열람 26s 블랭크 회피.)
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

  // 지연 생성(B③-2): 처음 열 때 해석 문구 생성·저장, 이후 캐시. 게이트웨이/파싱 실패는 우아한 저하(문구만 빈자리, 시각화 정상).
  // 표시는 최소(읽기 전용) — 코치 수정 UI(다듬기·확정·되돌리기)·출처 배지는 B③-3.
  let interpretation: InterpretationContent | null = null;
  try {
    const view = await generateInterpretation(ctx, responseId, scores, resp.cohortId ?? cohortId);
    interpretation = (view.effective ?? null) as InterpretationContent | null;
  } catch {
    interpretation = null; // 해석 준비 실패 — 리포트 시각화는 영향 없음
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="개인 리포트" backHref={backTo} homeHref="/home" action={<HeaderActions />} />
      {interpretation ? (
        <section
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-2)',
            border: 'var(--border-hair) solid var(--color-border)',
          }}
        >
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
            AI 초안 · 참고용입니다. 코치가 다듬어 확정할 수 있어요.
          </p>
          <h2 className="t-h2" style={{ color: 'var(--color-primary)', margin: '0 0 var(--space-3)' }}>{interpretation.headline}</h2>
          {interpretation.axes.length > 0 ? (
            <ul style={{ margin: '0 0 var(--space-3)', paddingLeft: '1.1em', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {interpretation.axes.map((a, i) => (
                <li key={i} className="t-body" style={{ color: 'var(--color-text)' }}>
                  <strong>{a.name}</strong> — {a.reading}
                </li>
              ))}
            </ul>
          ) : null}
          {interpretation.caution ? (
            <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>{interpretation.caution}</p>
          ) : null}
          <p className="t-body" style={{ color: 'var(--color-text)', margin: 0 }}>{interpretation.growth}</p>
        </section>
      ) : null}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <ReportScreen scores={scores} />
      </div>
    </div>
  );
}
