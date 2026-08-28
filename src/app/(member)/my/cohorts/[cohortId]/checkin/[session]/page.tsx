// 회차 갈무리 카드 라우트(ADR-80 · Phase 4). 서버에서 게이트·일정 상태 판정 후 클라이언트 카드 렌더.
//   일정 미등록('준비 중')은 정상 상태(R1) — 결함 탐지는 인도자 콘솔(Phase 7)이 맡는다.
//   진단 러너(ResponseRunner) 미재사용 — 갈무리는 순서 고정·제출 후에도 열린다.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { neededBacks, priorSessionNos, type Priors } from '@/instruments/futurenow/checkin/slots';
import { CheckinCardClient } from './CheckinCardClient';
import { resolveCheckinMode } from './mode';

export const dynamic = 'force-dynamic';

function monthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// `cohortId` 소품을 걷었다(U-2) — 헤더가 껍데기로 가면서 이 껍질이 쓰지 않게 됐다.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-2 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다 —
          제목은 라우트의 성질이지 화면의 사정이 아니다. */}
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
  if (!row) return <Shell><Notice text="아직 준비 중입니다. 인도자가 일정을 올리면 열립니다." /></Shell>;

  // 서버 컴포넌트(force-dynamic)의 요청 시점 벽시계 — 회차 개폐 판정에 필수.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  if (new Date(row.opensAt).getTime() > now) {
    return <Shell><Notice text={`아직 열리지 않았습니다 · ${monthDay(row.opensAt)}에 열립니다`} /></Shell>;
  }
  const closed = new Date(row.closesAt).getTime() < now;

  // 미등록 회차는 '준비 중'(레지스트리에 없음 · ADR-85). 회차 추가 = sessionN.ts + 레지스트리 한 줄.
  const copy = getCheckinSession(sessionNo);
  if (copy === null) return <Shell><Notice text="이 회차 갈무리는 준비 중입니다." /></Shell>;

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
  //   ADR-103: **어느 깊이를 부를지는 회차 번호가 아니라 문안이 정한다.** neededBacks 가 문안의 모든
  //   mirror 를 훑어 필요한 깊이만 낸다(1·2·3회차 [1] · 4회차 [1,2]). 번호로 분기하면 5·6·7회차에서
  //   다시 고쳐야 하고 그것이 ADR-90 이 없앤 특례다. 문안을 이미 읽고 있으므로 추가 비용은 0이다.
  //   Promise.all 로 묶는다 — 직렬이면 응답 시간이 그만큼 는다.
  const priorNos = priorSessionNos(sessionNo, initialMode, neededBacks(copy));
  const priorRows = await Promise.all(priorNos.map((n) => ctx.getMyCheckin(cohortId, n).catch(() => null)));
  const priors: Priors = {};
  priorNos.forEach((n, i) => {
    const pr = priorRows[i];
    priors[sessionNo - n] = pr ? ((pr.answers ?? {}) as Record<string, unknown>) : null;
  });

  return (
    <Shell>
      {/* **key 가 '고쳐 쓰기'를 살린다**(3차 T-2 · 발현을 테스트로 증명 2026-08-27 · 지휘부 사전 허가).
          `?edit=1` 은 **같은 라우트의 쿼리 변경**이라 재마운트가 없다. 그런데 카드는
          `useState(initialMode)` 로 모드를 잡고 `setMode` 는 둘 다 `'read'` 로만 간다 —
          `'edit'` 로 가는 클릭 경로가 없다. 즉 **prop 이 바뀌어도 모드가 갈리지 않는다.**
          `mode.ts` 가 제출·마감과 무관하게 `?edit=1` 을 무조건 편집으로 판정하는 이유는
          그 링크가 **제출을 마친 사람이 자기 갈무리를 고치는 유일한 통로**이기 때문이다.
          키에 `initialMode` 를 넣어야 그 전환이 새 인스턴스를 만든다 — 차수·회차만으로는 못 가른다.
          **갈무리 로직·문안·저장 경로·`mode.ts` 는 한 줄도 건드리지 않았다**(발주 §8-5 범위). */}
      <CheckinCardClient
        key={`${cohortId}-${sessionNo}-${initialMode}`}
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
        priors={priors}
        initialMode={initialMode}
        photos={photos}
      />
    </Shell>
  );
}
