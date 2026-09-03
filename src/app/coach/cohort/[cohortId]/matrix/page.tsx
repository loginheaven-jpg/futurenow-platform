// 화면 B — 인도자 격자(ADR-118). `/coach/cohort/[cohortId]/matrix`.
//
// 게이트는 회차 현황과 같다. 데이터 접근은 그 뒤에 온다(게이트-데이터 순서 · CLAUDE §9).
// 명단은 **참여자만**(ADR-118) — 운영자가 섞이면 그들이 제출하지 않아 신호가 인도자 자신에게 켜진다.
// 갈무리는 **한 번에** 읽는다(회차 인자 생략) — 회차 수만큼 왕복하지 않는다.
import { redirect } from 'next/navigation';
import { requestContext, requestUser } from '@/app/_lib/requestScope';
import { MatrixView } from './MatrixView';

export const dynamic = 'force-dynamic';

export default async function CoachMatrixPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  // ★ **`getCohort` 를 걷었다**(U-6) — 이 화면이 회기 이름을 그리지 않게 되면서
  //   그 조회의 유일한 쓰임이 사라졌다. 게이트는 위의 `currentUser` 와 RLS 가 든다(성질을 바꾸지 않았다).
  const [sessions, members, rows] = await Promise.all([
    ctx.listCohortSessions(cohortId),
    ctx.listCohortMembers(cohortId, true),
    ctx.listCohortCheckins(cohortId),
  ]);

  // 등록된 사람의 갈무리만(이동·삭제된 사람의 checkins 는 DB에 남아도 격자에서 제외 — ADR-84).
  const memberIds = new Set(members.map((m) => m.userId));
  const enrolled = rows.filter((r) => memberIds.has(r.userId));

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}
      {/* **부제를 본문 첫 줄이 든다**(최박사 결재 2026-09-01 · U-3 후속).
          헤더가 껍데기로 가며 `subtitle` 이 사라졌다 — 표는 라우트의 성질만 들고
          회기 이름 같은 **서버 데이터**를 못 들기 때문이다. 실측상 그때 이 화면 어디에도
          회기 이름이 없었다(헤더·탭 줄·본문·시트 전부 X).
          **새 부품을 만들지 않았다** — 이 화면이 이미 쓰던 `t-caption` 보조 줄 패턴이다.
          제목은 헤더가 들고 있으므로 `t-h1` 을 또 두면 제목이 둘이 된다.
          헤더 부제 통로가 서면 U-4 에서 옮길지 판단한다(표에 그 사실을 적었다). */}
      {/* ★★ **회기 이름은 띠의 칩이 든다**(U-6 · 지휘부 결재 2026-09-03 「중복없이, 일관된 위치」).
          U-4 가 이 줄을 세울 때의 근거는 *「실측상 이 화면 어디에도 회기 이름이 없었다」* 였고,
          U-5 가 띠에 칩을 세우면서 **그 근거가 사실이 아니게 됐다** — 같은 문자열이 한 화면에 둘이었다.
          최박사 결재 2026-09-01(**본문이 든다**)은 «표가 들지 말라» 는 것이었고, 지금 이름을 드는 것도
          표가 아니라 **회기 레이아웃이 서버에서 읽어 넘긴 값**이다. 지휘부가 그 자리를 칩으로 확정했다. */}
      {sessions.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>회차 일정이 아직 없습니다.</p>
      ) : (
        <MatrixView cohortId={cohortId} members={members} sessions={sessions} rows={enrolled} nowIso={new Date().toISOString()} />
      )}
    </div>
  );
}
