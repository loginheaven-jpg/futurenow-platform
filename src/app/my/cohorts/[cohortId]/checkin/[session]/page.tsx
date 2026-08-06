// 회차 갈무리 카드 라우트(ADR-80 · Phase 4). 서버에서 게이트·일정 상태 판정 후 클라이언트 카드 렌더.
//   일정 미등록('준비 중')은 정상 상태(R1) — 결함 탐지는 인도자 콘솔(Phase 7)이 맡는다.
//   진단 러너(ResponseRunner) 미재사용 — 갈무리는 순서 고정·제출 후에도 열린다.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { CheckinCardClient } from './CheckinCardClient';
import { resolveCheckinMode } from './mode';

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

export default async function CheckinCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string; session: string }>;
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const { cohortId, session } = await params;
  const sp = await searchParams;
  const wantsEdit = (Array.isArray(sp.edit) ? sp.edit[0] : sp.edit) === '1';
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

  // 미등록 회차는 '준비 중'(레지스트리에 없음 · ADR-85). 회차 추가 = sessionN.ts + 레지스트리 한 줄.
  if (getCheckinSession(sessionNo) === null) return <Shell cohortId={cohortId}><Notice text="이 회차 갈무리는 준비 중입니다." /></Shell>;

  const existing = await ctx.getMyCheckin(cohortId, sessionNo);

  // 모드 판정(ADR-86) — 규칙은 mode.ts 순수 함수에(단위테스트로 고정).
  const initialMode = resolveCheckinMode({ wantsEdit, closed, existing });

  // 편지 사진 — 열람에 필요하므로 서버에서 signed URL 로 만든다(브라우저 supabase 재구현 없음).
  //   행이 없으면 사진도 있을 수 없다(업로드는 카드 안에서만 가능하고 그 시점에 행이 생긴다).
  const photos = existing == null ? [] : await ctx.listCheckinPhotos(cohortId, sessionNo, me.id).catch(() => []);

  // 되비추기(§6·Phase 4) — 지난 회차 답을 읽기전용으로 되비춘다. 새 코어 메서드 없음.
  //   ADR-90: 되비출 자리가 회차마다 달라(3회차는 세 곳) 3필드 다이제스트로는 표현할 수 없다.
  //     레지스트리의 Mirror.keys 가 임의 키를 지목하므로 **지난 회차 answers 를 통째로** 넘긴다.
  //     본인 자신의 지난 회차 답이라 노출 범위가 넓어지는 것이 아니다(RLS·화면 모두 동일 주체).
  //   미제출이어도 값이 있으면 보여 준다. 조회 실패는 조용히 넘긴다(되비추기 없다고 카드가 막히면 안 됨).
  //   ADR-86: '지금 쓰는 것을 돕는' 작성 보조라 열람(read)에는 싣지 않는다 — 조회 자체를 건너뛴다(왕복 감소).
  let prior: Record<string, unknown> | null = null;
  if (initialMode === 'edit' && sessionNo > 1) {
    const priorRow = await ctx.getMyCheckin(cohortId, sessionNo - 1).catch(() => null);
    if (priorRow) prior = (priorRow.answers ?? {}) as Record<string, unknown>;
  }

  return (
    <Shell cohortId={cohortId}>
      <CheckinCardClient
        cohortId={cohortId}
        sessionNo={sessionNo}
        userId={me.id}
        initialAnswers={(existing?.answers ?? {}) as Record<string, unknown>}
        initialFlags={{
          suggestionAnon: existing?.suggestionAnon ?? false,
          contactRequest: existing?.contactRequest ?? false,
          deepOpened: existing?.deepOpened ?? false,
          stepPrivate: existing?.stepPrivate ?? false,
        }}
        alreadyOpened={existing?.firstOpenedAt != null}
        hasContent={(existing?.hasContent ?? false) && existing?.submittedAt == null}
        closed={closed}
        prior={prior}
        initialMode={initialMode}
        photos={photos}
      />
    </Shell>
  );
}
