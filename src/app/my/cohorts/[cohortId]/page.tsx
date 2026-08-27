// 차수 홈(ADR-80 · Phase 2). 카드 하나에 진단 둘 + 갈무리 일곱을 담는 본체.
//   시각 위계 세 단: 이번 주 갈무리(accent·primary) · 진단(중립·ghost) · 지난 회차(접힌 줄).
//   진단과 갈무리를 같은 위계로 두지 않는다("매주 진단받는다" 오인 방지).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { PastSessionsClient } from './PastSessionsClient';
import { buildProgress, openedSessionNos } from './progress';
import { TOOL } from '@/app/_vocab/tool';
import { HOME_CARD, VALUE_TOOL } from '@/instruments/futurenow/values/copy';

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
  // 지난 회차 = 마감된 회차 중 '열어 볼 수 있는' 것(레지스트리에 문안이 등록된 회차).
  //   미등록 회차(3~7회차 현재)를 링크로 내보내면 '준비 중' 안내에 부딪히므로 목록에서 뺀다(ADR-86).
  //   캡션 문자열 '지난 회차 N개'는 불변 — N 의 의미만 좁아진다.
  const pastSessionNos = sessions
    .filter((s) => new Date(s.closesAt).getTime() < now && getCheckinSession(s.sessionNo) !== null)
    .map((s) => s.sessionNo)
    .sort((a, b) => b - a);
  const pastCount = pastSessionNos.length;

  // 내 한 걸음(제출된 열린 회차의 step) — 열린 회차가 있을 때만 조회.
  const openCheckin = c.openSessionNo != null ? await ctx.getMyCheckin(cohortId, c.openSessionNo) : null;
  const valueRow = await ctx.getMyValueAssessment(cohortId);
  const stepWhat = typeof openCheckin?.answers?.step_what === 'string' ? (openCheckin.answers.step_what as string) : '';
  const stepWhen = typeof openCheckin?.answers?.step_when === 'string' ? (openCheckin.answers.step_when as string) : '';

  // 이번 주 갈무리 상태 문구
  // 버튼 문구와 목적지를 일치시킨다(ADR-86) — 쓰러/이어 쓰러 가는 사람은 작성 폼으로(?edit=1),
  //   이미 제출한 사람은 자기가 적은 것을 먼저 읽는 열람 화면으로.
  let checkinLine = '';
  let checkinBtn = '쓰러 가기';
  let checkinEdit = true;
  if (c.openSessionNo != null) {
    // ADR-102 축3 — 카드 하단과 **같은 문장**을 쓴다. 화면을 옮겨도 같은 것을 세고 있음이 보인다.
    //   '완성'이 아니라 '완료'로 통일하고(품질 판정처럼 읽히지 않게), 회차 번호는 붙이지 않는다 —
    //   이 줄 바로 위에 '{N}회차 갈무리'가 이미 있어 중복이 된다(원칙 §2-6).
    if (c.openSessionSubmitted) { checkinLine = '기록 완료'; checkinBtn = '적으신 것 보기'; checkinEdit = false; }
    // ADR-91 B: '무엇이 남았는지'를 더한다. 실측의 미완성 제출은 '돌아올 이유'가 없어서 생겼다.
    else if (c.openSessionHasContent) {
      const copy = getCheckinSession(c.openSessionNo);
      const left = copy ? copy.requiredTotal - copy.filledCount((openCheckin?.answers ?? {}) as Record<string, unknown>) : 0;
      checkinLine = left > 0 ? `${left}칸 더 채우면 완료` : '기록 완료';
      checkinBtn = '이어 쓰기';
    }
    else { checkinLine = openRow ? `${monthDay(openRow.closesAt)} 밤까지 열려 있어요` : ''; checkinBtn = '쓰러 가기'; }
  }

  // ADR-102 축3 — 7주 기록 누적. 회차별 제출 여부를 주는 경로가 없어(my_cohorts 는 '지금 열린 회차' 하나만
  //   조인하고 getMyCheckin 은 session_no 를 필수로 받는다) getMyCheckin 을 팬아웃한다. 계약·DB 델타 0.
  //   **이미 열린 회차만** 묻는다 — 미래 회차는 카드 라우트가 진입을 막아 제출이 있을 수 없다.
  //   열린 회차분은 위에서 이미 뽑았으므로(openCheckin) 재사용해 왕복을 하나 줄인다.
  //   기수가 커지면 ADR-91 B 가 예고한 대로 my_cohorts 확장으로 흡수한다. 지금은 '계약 0'이 우선이다.
  const opened = openedSessionNos(sessions, now);
  const submittedNos = new Set(
    (
      await Promise.all(
        opened.map(async (n) => {
          const row = n === c.openSessionNo ? openCheckin : await ctx.getMyCheckin(cohortId, n).catch(() => null);
          return row?.submittedAt != null ? n : null;
        }),
      )
    ).filter((n): n is number => n != null),
  );
  const progress = buildProgress(sessions, submittedNos);

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
      <Link className="ui-btn ui-btn--primary" href={`/my/cohorts/${cohortId}/checkin/${c.openSessionNo}${checkinEdit ? '?edit=1' : ''}`} style={{ width: '100%', textDecoration: 'none' }}>{checkinBtn}</Link>
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
      <div className="t-body" style={{ color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>{TOOL.short}</div>
      {!c.preDone ? (
        <Link className="ui-btn ui-btn--ghost" href={`/join?cohort=${cohortId}`} style={{ width: '100%', textDecoration: 'none' }}>{TOOL.pre} 시작하기</Link>
      ) : c.postOpened && !c.postDone ? (
        <Link className="ui-btn ui-btn--ghost" href={`/join?cohort=${cohortId}&wave=post`} style={{ width: '100%', textDecoration: 'none' }}>{TOOL.post} 하기</Link>
      ) : (
        <Link className="ui-btn ui-btn--ghost" href={`/my/cohorts/${cohortId}/report`} style={{ width: '100%', textDecoration: 'none' }}>내 리포트 보기</Link>
      )}
      {/* 나의 기록(ADR-118) — 회차 창과 무관하게 7주 내내 열어 둔다. 자기 점검이 목적이다. */}
      <Link className="ui-btn ui-btn--ghost" href={`/my/cohorts/${cohortId}/journey`} style={{ width: '100%', textDecoration: 'none', marginTop: 'var(--space-2)' }}>나의 기록 보기</Link>
      {/* 동행 피드(2차 · 발주 §6.3) — 탭바를 짓지 않으므로 차수 홈이 진입 표면 하나다.
          갈무리와 **같은 위계에 두지 않는다**: 갈무리는 혼자 쓰는 방이고 피드는 함께 보는 방이다(§3.3).
          여기서 잇는 것은 화면 이동뿐이고, 갈무리 → 피드로 글을 옮기는 길은 두지 않는다. */}
      <Link className="ui-btn ui-btn--ghost" href={`/feed?cohort=${cohortId}`} style={{ width: '100%', textDecoration: 'none', marginTop: 'var(--space-2)' }}>동행 보기</Link>
    </div>
  );

  // 가치 카드(ADR-121). 중립 위계 — 갈무리(accent)보다 낮게 둔다. 상태 넷을 stage 로 가른다.
  const valueState = valueRow == null ? 'none'
    : valueRow.stage === 'final' ? 'done'
    : valueRow.stage === 'exploring' ? 'exploring'
    : 'candidates';
  const valueCopy = HOME_CARD[valueState];
  const valueSection = (
    <div style={neutralCard}>
      <div className="t-body" style={{ color: 'var(--color-text)' }}>{VALUE_TOOL}</div>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '2px 0 var(--space-2)' }}>{valueCopy.line}</div>
      <Link className="ui-btn ui-btn--ghost" href={`/my/cohorts/${cohortId}/values`} style={{ width: '100%', textDecoration: 'none' }}>{valueCopy.btn}</Link>
    </div>
  );

  const pastSection = pastCount > 0 ? (
    <PastSessionsClient cohortId={cohortId} sessionNos={pastSessionNos} label={`지난 회차 ${pastCount}개`} />
  ) : null;

  // 상태별 순서: 사전 미완이면 진단 먼저, 진행 중이면 갈무리 먼저.
  const ordered = !c.preDone
    ? [diagnosisSection, checkinSection, stepSection, valueSection, pastSection]
    : [checkinSection, stepSection, valueSection, diagnosisSection, pastSection];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title={c.name} backHref="/home" homeHref="/home" action={<HeaderActions />} />
      {/* ADR-102 축3 — 7주 기록 누적. **AppHeader 바로 아래 고정**이고 ordered 배열 밖이다.
          '이번 주 갈무리' 블록은 사전진단 미완이면 밀리고 openSessionNo 가 없으면 아예 안 그려져
          앵커가 될 수 없다. 반면 이 표시는 '일정만 있으면 그린다'라 상태 무관 규칙이어야 한다.
          카드보다 먼저 전체를 보게 한다. */}
      {progress ? (
        <div className="t-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          <span>7주 기록</span>
          {/* 캡션급 위계 — 카드도 테두리도 두지 않는다(ADR-81 3단에 넷째가 끼는 자리라 강조하면 accent CTA 가 밀린다).
              색은 채움=본문색 / 비움=muted 뿐이다. 경고색을 쓰지 않는다 — 안 쓴 회차는 결핍이 아니라 아직 안 온 주다. */}
          <span aria-hidden="true" style={{ letterSpacing: '0.15em', color: 'var(--color-text-muted)' }}>
            {progress.cells.map((on, i) => (
              <span key={i} style={on ? { color: 'var(--color-text)' } : undefined}>{on ? '●' : '○'}</span>
            ))}
          </span>
          <span>{progress.done} / {progress.total} 완료</span>
        </div>
      ) : null}
      {ordered.map((s, i) => (s ? <div key={i}>{s}</div> : null))}
    </div>
  );
}
