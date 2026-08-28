// 화면 B — 인도자 격자(ADR-118). `/coach/cohort/[cohortId]/matrix`.
//
// 게이트는 회차 현황과 같다. 데이터 접근은 그 뒤에 온다(게이트-데이터 순서 · CLAUDE §9).
// 명단은 **참여자만**(ADR-118) — 운영자가 섞이면 그들이 제출하지 않아 신호가 인도자 자신에게 켜진다.
// 갈무리는 **한 번에** 읽는다(회차 인자 생략) — 회차 수만큼 왕복하지 않는다.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { MatrixView } from './MatrixView';

export const dynamic = 'force-dynamic';

export default async function CoachMatrixPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  const [sessions, members, cohort, rows] = await Promise.all([
    ctx.listCohortSessions(cohortId),
    ctx.listCohortMembers(cohortId, true),
    ctx.getCohort(cohortId).catch(() => null),
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
          기수 이름 같은 **서버 데이터**를 못 들기 때문이다. 실측상 그때 이 화면 어디에도
          기수 이름이 없었다(헤더·탭 줄·본문·시트 전부 X).
          **새 부품을 만들지 않았다** — 이 화면이 이미 쓰던 `t-caption` 보조 줄 패턴이다.
          제목은 헤더가 들고 있으므로 `t-h1` 을 또 두면 제목이 둘이 된다.
          헤더 부제 통로가 서면 U-4 에서 옮길지 판단한다(표에 그 사실을 적었다). */}
      {cohort?.name ? (
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          {cohort.name}
        </p>
      ) : null}
      {sessions.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>회차 일정이 아직 없습니다.</p>
      ) : (
        <MatrixView cohortId={cohortId} members={members} sessions={sessions} rows={enrolled} nowIso={new Date().toISOString()} />
      )}
    </div>
  );
}
