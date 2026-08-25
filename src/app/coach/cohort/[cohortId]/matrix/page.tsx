// 화면 B — 인도자 격자(ADR-118). `/coach/cohort/[cohortId]/matrix`.
//
// 게이트는 회차 현황과 같다. 데이터 접근은 그 뒤에 온다(게이트-데이터 순서 · CLAUDE §9).
// 명단은 **참여자만**(ADR-118) — 운영자가 섞이면 그들이 제출하지 않아 신호가 인도자 자신에게 켜진다.
// 갈무리는 **한 번에** 읽는다(회차 인자 생략) — 회차 수만큼 왕복하지 않는다.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
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
      <AppHeader
        variant="sub"
        title="갈무리 격자"
        subtitle={cohort?.name ?? undefined}
        backHref={`/coach/cohort/${cohortId}/checkin`}
        homeHref="/home"
        action={<HeaderActions />}
      />
      {sessions.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>회차 일정이 아직 없습니다.</p>
      ) : (
        <MatrixView cohortId={cohortId} members={members} sessions={sessions} rows={enrolled} nowIso={new Date().toISOString()} />
      )}
    </div>
  );
}
