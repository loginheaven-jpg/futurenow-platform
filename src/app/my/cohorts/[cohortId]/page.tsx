// 차수 홈(ADR-80 · Phase 2). 카드 하나에 진단 둘 + 갈무리 일곱을 담는 본체.
//   시각 위계 세 단: 이번 주 갈무리(accent·primary) · 진단(중립·ghost) · 지난 회차(접힌 줄).
//   진단과 갈무리를 같은 위계로 두지 않는다("매주 진단받는다" 오인 방지).
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

function monthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function CohortHomePage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const mine = await ctx.listMyCohorts();
  const c = mine.find((x) => x.cohortId === cohortId);
  if (!c) redirect('/my/cohorts');

  const sessions = await ctx.listCohortSessions(cohortId);
  // 서버 컴포넌트(force-dynamic)의 요청 시점 벽시계 — 지난 회차 계산에 필수.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const openRow = c.openSessionNo != null ? sessions.find((s) => s.sessionNo === c.openSessionNo) : null;
  const pastCount = sessions.filter((s) => new Date(s.closesAt).getTime() < now).length;

  // 내 한 걸음(제출된 열린 회차의 step) — 열린 회차가 있을 때만 조회.
  const openCheckin = c.openSessionNo != null ? await ctx.getMyCheckin(cohortId, c.openSessionNo) : null;
  const stepWhat = typeof openCheckin?.answers?.step_what === 'string' ? (openCheckin.answers.step_what as string) : '';
  const stepWhen = typeof openCheckin?.answers?.step_when === 'string' ? (openCheckin.answers.step_when as string) : '';

  // 이번 주 갈무리 상태 문구
  let checkinLine = '';
  let checkinBtn = '쓰러 가기';
  if (c.openSessionNo != null) {
    if (c.openSessionSubmitted) { checkinLine = '다 적으셨습니다'; checkinBtn = '고쳐 쓰기'; }
    else if (c.openSessionHasContent) { checkinLine = '쓰시던 자리가 남아 있어요'; checkinBtn = '이어 쓰기'; }
    else { checkinLine = openRow ? `${monthDay(openRow.closesAt)} 밤까지 열려 있어요` : ''; checkinBtn = '쓰러 가기'; }
  }

  const accentCard = {
    padding: 'var(--space-4)',
    background: 'var(--color-accent-soft, var(--color-surface-2))',
    border: 'var(--border-hair) solid var(--color-accent)',
    borderRadius: 'var(--radius)',
    marginBottom: 'var(--space-4)',
  } as const;
  const neutralCard = {
    padding: 'var(--space-4)',
    background: 'var(--color-surface-1)',
    border: 'var(--border-hair) solid var(--color-border)',
    borderRadius: 'var(--radius)',
    marginBottom: 'var(--space-4)',
  } as const;

  const checkinSection = c.openSessionNo != null ? (
    <div style={accentCard}>
      <div className="t-body-lg" style={{ color: 'var(--color-primary)' }}>{c.openSessionNo}회차 갈무리</div>
      {checkinLine ? <div className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '2px 0 var(--space-3)' }}>{checkinLine}</div> : null}
      <a className="ui-btn ui-btn--primary" href={`/my/cohorts/${cohortId}/checkin/${c.openSessionNo}`} style={{ width: '100%', textDecoration: 'none' }}>{checkinBtn}</a>
    </div>
  ) : null;

  const stepSection = (
    <div style={neutralCard}>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>내 한 걸음</div>
      {stepWhat || stepWhen ? (
        <>
          <div className="t-body" style={{ color: 'var(--color-text)' }}>{stepWhat}</div>
          <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{stepWhen}</div>
        </>
      ) : (
        <div className="t-caption" style={{ color: 'var(--color-text-muted)' }}>
          {c.openSessionNo != null ? `${c.openSessionNo}회차 갈무리를 마치시면, 정하신 한 걸음이 여기 남습니다.` : '갈무리를 마치시면, 정하신 한 걸음이 여기 남습니다.'}
        </div>
      )}
    </div>
  );

  const diagnosisSection = (
    <div style={neutralCard}>
      <div className="t-body" style={{ color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>진단</div>
      {!c.preDone ? (
        <a className="ui-btn ui-btn--ghost" href={`/join?cohort=${cohortId}`} style={{ width: '100%', textDecoration: 'none' }}>진단 시작하기</a>
      ) : c.postOpened && !c.postDone ? (
        <a className="ui-btn ui-btn--ghost" href={`/join?cohort=${cohortId}&wave=post`} style={{ width: '100%', textDecoration: 'none' }}>사후 진단하기</a>
      ) : (
        <a className="ui-btn ui-btn--ghost" href={`/my/cohorts/${cohortId}/report`} style={{ width: '100%', textDecoration: 'none' }}>내 리포트 보기</a>
      )}
    </div>
  );

  const pastSection = pastCount > 0 ? (
    <div className="t-caption" style={{ color: 'var(--color-text-muted)', padding: 'var(--space-2) var(--space-1)' }}>지난 회차 {pastCount}개</div>
  ) : null;

  // 상태별 순서: 사전 미완이면 진단 먼저, 진행 중이면 갈무리 먼저.
  const ordered = !c.preDone
    ? [diagnosisSection, checkinSection, stepSection, pastSection]
    : [checkinSection, stepSection, diagnosisSection, pastSection];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title={c.name} backHref="/my/cohorts" homeHref="/home" action={<HeaderActions />} />
      {ordered.map((s, i) => (s ? <div key={i}>{s}</div> : null))}
    </div>
  );
}
