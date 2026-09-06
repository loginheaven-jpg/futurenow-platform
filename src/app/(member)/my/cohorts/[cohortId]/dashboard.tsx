// 회기 대시보드 — **조립을 한 곳에 둔다** (ADR-181 · 지휘부 지시 2026-09-02).
//
// **왜 뽑았나**: 참여자 홈(`/home`)과 회기 홈(`/my/cohorts/[id]`)이 같은 것을 두 곳에서
//   다르게 말하고 있었다(실측 — 겹치는 자리 여섯). 지시는 「둘을 합쳐 대시보드로」다.
//   **그런데 회기 홈 라우트를 지울 수는 없다** — `returnTo` 화이트리스트에 등재돼 있어(ADR-176)
//   지우면 통과한 딥링크가 404 가 된다. 그리고 회기가 둘 이상이면 그 회기를 볼 자리가 필요하다.
//
//   그래서 **라우트는 둘로 두고 조립을 하나로** 뒀다. `/home` 은 지금 내 회기를,
//   `/my/cohorts/[id]` 는 그 회기를 같은 그릇으로 그린다. 사본이 아니라 같은 함수다(불변식 23).
//
// **판정은 한 줄도 새로 만들지 않았다** — 갈무리 문구·버튼·목적지(ADR-86 · ADR-91 B),
//   순서 규칙(사전 미완이면 진단 먼저 · ADR-80), 진행 누적(ADR-102 축3),
//   가치 카드 4상태(ADR-121)가 옮겨 오기 전과 같다.
//
// **바뀐 것은 셋이다**(지시):
//   ⑴ 「나의 기록」 네 줄 → **버튼 셋**. 서가는 회기와 무관하므로 시트로 갔다.
//   ⑵ 동행 피드에 **내가 마지막으로 쓴 날**을 병기한다(ADR-180 · 새 RPC).
//   ⑶ 옛 「진단 카드」를 없앴다 — 그 안의 세 링크가 전부 버튼 셋과 **중복**이었다.
//      다만 **ADR-80 의 순서 규칙은 지킨다**: 사전 미완이면 진단 버튼만 오늘 카드 **위로** 올린다.
import { postJoinHref } from '@/app/_vocab/postNudge';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CoreContext, CoreUser, MyCohortSummary } from '@/contracts';
import { CohortHomeScreen } from './CohortHomeScreen';
import { sessionPartLabel } from './sessionPart';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { PastSessionsClient } from './PastSessionsClient';
import { buildProgress, openedSessionNos } from './progress';
import { TOOL } from '@/app/_vocab/tool';
import { HOME_CARD, VALUE_TOOL } from '@/instruments/futurenow/values/copy';

export function monthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const neutralCard = {
  padding: 'var(--space-4)',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
  marginBottom: 'var(--space-4)',
} as const;

/** 「나의 기록」 버튼 하나. 제목 왼쪽 · 곁말 오른쪽 — 옛 줄 목록과 같은 배치다. */
function RecordButton({ href, title, note }: { href: string; title: string; note?: string }) {
  return (
    <Link
      href={href}
      className="ui-btn ui-btn--ghost"
      style={{ width: '100%', textDecoration: 'none', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}
    >
      {/* 제목은 본문 굵기로 세우고 곁말은 한 단 낮춘다 — 전에는 곁말이 너무 옅어 안 읽혔다
          (지휘부 승인 2026-09-03 — 가독성). **색이 아니라 굵기와 크기로** 위계를 만든다. */}
      <span style={{ fontWeight: 700 }}>{title}</span>
      {note ? <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{note}</span> : null}
    </Link>
  );
}

/**
 * 회기 대시보드를 그린다.
 *
 * **호출부가 게이트를 먼저 지난다**(불변식 19) — 여기서는 인증·소속을 다시 판정하지 않는다.
 * `c` 는 **이미 내 것으로 확인된** 회기다.
 */
export async function renderCohortDashboard(
  ctx: CoreContext,
  me: CoreUser,
  c: MyCohortSummary,
  /** 고를 수 있는 회기들. 둘 이상이면 머리에 선택 줄이 선다(ADR-182). 안 주면 안 그린다. */
  choices: MyCohortSummary[] = [],
): Promise<ReactNode> {
  const cohortId = c.cohortId;
  const sessions = await ctx.listCohortSessions(cohortId);
  // 서버 컴포넌트(force-dynamic)의 요청 시점 벽시계 — 지난 회차 계산에 필수.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const openRow = c.openSessionNo != null ? sessions.find((s) => s.sessionNo === c.openSessionNo) : null;

  // 지난 회차 = 마감된 회차 중 열어 볼 수 있는 것(레지스트리에 문안이 등록된 회차).
  const pastSessionNos = sessions
    .filter((s) => new Date(s.closesAt).getTime() < now && getCheckinSession(s.sessionNo) !== null)
    .map((s) => s.sessionNo)
    .sort((a, b) => b - a);
  const pastCount = pastSessionNos.length;

  const openCheckin = c.openSessionNo != null ? await ctx.getMyCheckin(cohortId, c.openSessionNo) : null;
  // 가치 카드와 마지막 쓴 날은 서로를 안 쓴다 — 줄 세우지 않는다(ADR-176 과 같은 규율).
  const [valueRow, lastPostAt] = await Promise.all([
    ctx.getMyValueAssessment(cohortId),
    ctx.feedMyLastPostAt(cohortId).catch(() => null),
  ]);
  const stepWhat = typeof openCheckin?.answers?.step_what === 'string' ? (openCheckin.answers.step_what as string) : '';
  const stepWhen = typeof openCheckin?.answers?.step_when === 'string' ? (openCheckin.answers.step_when as string) : '';

  // 이번 주 갈무리 상태 문구 — 버튼 문구와 목적지를 일치시킨다(ADR-86).
  let checkinLine = '';
  let checkinBtn = '쓰러 가기';
  let checkinEdit = true;
  if (c.openSessionNo != null) {
    if (c.openSessionSubmitted) { checkinLine = '기록 완료'; checkinBtn = '적으신 것 보기'; checkinEdit = false; }
    else if (c.openSessionHasContent) {
      const copy = getCheckinSession(c.openSessionNo);
      const left = copy ? copy.requiredTotal - copy.filledCount((openCheckin?.answers ?? {}) as Record<string, unknown>) : 0;
      checkinLine = left > 0 ? `${left}칸 더 채우면 완료` : '기록 완료';
      checkinBtn = '이어 쓰기';
    }
    else { checkinLine = openRow ? `${monthDay(openRow.closesAt)} 밤까지 열려 있어요` : ''; checkinBtn = '쓰러 가기'; }
  }

  // ADR-102 축3 — 7주 기록 누적. 이미 열린 회차만 묻고, 열린 회차분은 위에서 뽑은 것을 재사용한다.
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

  // 진단 버튼 — 옛 「진단 카드」의 **첫 칸만** 남았다. 나머지 둘(나의 기록·동행)은 아래 버튼과 중복이었다.
  //   문안은 지휘부가 정했다 — 미완이면 「이어 하기」, 마쳤으면 「리포트 보기」(지시 2026-09-02).
  //
  //   ★ **마무리는 「시작」이다**(지휘부 지시 2026-09-03 「사후체크 시작 이라고 보여줘야 한다」).
  //     사전은 «풀다 만 것을 이어서» 라 「이어 하기」가 맞지만, 마무리는 **방금 열린 것**이라
  //     한 번도 시작하지 않은 사람에게 「이어 하기」라고 하면 **없던 일을 있었다고 말하는 것**이다.
  //     **새 문안이 아니다** — 체크 허브가 마무리에 이미 「시작」을 쓴다(`assessments/page.tsx:96`).
  //     같은 대상을 두 화면이 다르게 부르던 것이 함께 풀린다.
  const diagnosis = !c.preDone
    ? { title: TOOL.pre, note: '이어 하기', href: `/join?cohort=${cohortId}` }
    : c.postOpened && !c.postDone
      ? { title: TOOL.post, note: '시작', href: postJoinHref(cohortId) }
      : { title: `${TOOL.pre} 완료`, note: '리포트 보기', href: `/my/cohorts/${cohortId}/report` };

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

  const partLabel = sessionPartLabel(c.openSessionNo);
  const sessionTitle = c.openSessionNo != null ? (getCheckinSession(c.openSessionNo)?.cover.subtitle ?? null) : null;

  // **ADR-80 순서 규칙을 지킨다** — 사전을 안 마쳤으면 진단이 오늘 카드보다 먼저다.
  //   그때는 아래 버튼 줄에서 그 칸을 빼 **같은 문이 두 번 서지 않게** 한다.
  const diagnosisFirst = !c.preDone;

  return (
    <CohortHomeScreen
      head={{ hello: `${me.name?.trim() || '회원'} 님의 여정`, part: partLabel, title: sessionTitle }}
      progress={progress ? { label: '7주 기록', ...progress, cohortName: c.name } : null}
      // ★ **회기 선택**(ADR-182 · 지휘부 확정 2026-09-03). 활성이 둘 이상일 때만 선다.
      //   `/feed` 가 이미 쓰는 **같은 관용구**다 — 그 파일 주석이 *「부품을 새로 만들지 않는 편이
      //   불변식 20 에도 맞다」* 라고 적었고 여기서도 그대로다. 선택은 **면과 테두리**로 가른다(색 아님).
      picker={choices.length > 1 ? (
        <nav aria-label="회기 선택" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {choices.map((x) => (
            <Link
              key={x.cohortId}
              href={`/my/cohorts/${x.cohortId}`}
              aria-current={x.cohortId === cohortId ? 'page' : undefined}
              className={`ui-btn ${x.cohortId === cohortId ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
              style={{ textDecoration: 'none' }}
            >
              {x.name}
            </Link>
          ))}
        </nav>
      ) : null}
      before={diagnosisFirst ? (
        <div style={neutralCard}>
          <div className="t-body" style={{ color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>{TOOL.short}</div>
          <RecordButton {...diagnosis} />
        </div>
      ) : null}
      today={
        c.openSessionNo != null
          ? {
              tag: '오늘의 갈무리',
              title: `${c.openSessionNo}회차${sessionTitle ? ` — ${sessionTitle}` : ''}`,
              line: checkinLine || undefined,
              cta: {
                href: `/my/cohorts/${cohortId}/checkin/${c.openSessionNo}${checkinEdit ? '?edit=1' : ''}`,
                label: checkinBtn,
              },
            }
          : null
      }
      actions={
        <>
          <RecordButton href={`/my/cohorts/${cohortId}/journey`} title="되비추기" note="지난 회차 다시 보기" />
          {/* 마지막 쓴 날 병기(지시). 쓴 적이 없으면 **옛 곁말을 그대로 둔다** — 없는 말을 짓지 않는다. */}
          <RecordButton href={`/feed?cohort=${cohortId}`} title="동행 피드" note={lastPostAt ? monthDay(lastPostAt) : '오늘의 걸음'} />
          {diagnosisFirst ? null : <RecordButton {...diagnosis} />}
        </>
      }
    >
      {stepSection}
      {valueSection}
      {pastSection}
    </CohortHomeScreen>
  );
}
