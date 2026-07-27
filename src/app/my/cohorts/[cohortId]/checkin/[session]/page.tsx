// 회차 갈무리 카드 라우트(ADR-80 · Phase 4). 서버에서 게이트·일정 상태 판정 후 클라이언트 카드 렌더.
//   일정 미등록('준비 중')은 정상 상태(R1) — 결함 탐지는 인도자 콘솔(Phase 7)이 맡는다.
//   진단 러너(ResponseRunner) 미재사용 — 갈무리는 순서 고정·제출 후에도 열린다.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { CheckinCardClient } from './CheckinCardClient';

export const dynamic = 'force-dynamic';

function monthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function Shell({ cohortId, children }: { cohortId: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="오늘의 갈무리" backHref={`/my/cohorts/${cohortId}`} homeHref="/home" action={<HeaderActions />} />
      {children}
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="t-body" style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-8) 0' }}>{text}</p>;
}

export default async function CheckinCardPage({ params }: { params: Promise<{ cohortId: string; session: string }> }) {
  const { cohortId, session } = await params;
  const sessionNo = Number(session);
  const self = `/my/cohorts/${cohortId}/checkin/${session}`;

  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect(`/login?returnTo=${encodeURIComponent(self)}`);

  const mine = await ctx.listMyCohorts();
  if (!mine.some((c) => c.cohortId === cohortId)) redirect('/my/cohorts');

  // 회차 일정 조회 — 행이 없으면 '준비 중'(정상), 미래면 '아직 열리지 않음'.
  const sessions = await ctx.listCohortSessions(cohortId);
  const row = sessions.find((s) => s.sessionNo === sessionNo);
  if (!row) return <Shell cohortId={cohortId}><Notice text="아직 준비 중입니다. 인도자가 일정을 올리면 열립니다." /></Shell>;

  // 서버 컴포넌트(force-dynamic)의 요청 시점 벽시계 — 회차 개폐 판정에 필수.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  if (new Date(row.opensAt).getTime() > now) {
    return <Shell cohortId={cohortId}><Notice text={`아직 열리지 않았습니다 · ${monthDay(row.opensAt)}에 열립니다`} /></Shell>;
  }
  const closed = new Date(row.closesAt).getTime() < now;

  // 1회차 카드만 이번 범위. 2~7회차 문항은 실측 후 보정해 추가.
  if (sessionNo !== 1) return <Shell cohortId={cohortId}><Notice text="이 회차 갈무리는 준비 중입니다." /></Shell>;

  const existing = await ctx.getMyCheckin(cohortId, sessionNo);

  return (
    <Shell cohortId={cohortId}>
      <CheckinCardClient
        cohortId={cohortId}
        sessionNo={sessionNo}
        initialAnswers={(existing?.answers ?? {}) as Record<string, unknown>}
        initialFlags={{
          shareConsent: existing?.shareConsent ?? false,
          suggestionAnon: existing?.suggestionAnon ?? false,
          contactRequest: existing?.contactRequest ?? false,
          deepOpened: existing?.deepOpened ?? false,
        }}
        alreadyOpened={existing?.firstOpenedAt != null}
        submitted={existing?.submittedAt != null}
        closed={closed}
      />
    </Shell>
  );
}
