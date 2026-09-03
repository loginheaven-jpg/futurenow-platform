// 회기 상세(§8.3) — 코치/운영자 전용 서버 컴포넌트. 데이터는 기존 메서드 배선(계약 변경 0).
import { notFound, redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { instrumentDisplay, type CohortSummary } from '@/app/_screens/types';
import { buildCohortRoster } from '@/app/coach/rosterModel';
import { requestCohort, requestContext, requestUser } from '@/app/_lib/requestScope';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { TRAP_AXES } from '@/instruments/futurenow/report/labels';
import { CohortDetailClient } from './CohortDetailClient';
import { FeedSummary } from './FeedSummary';

export const dynamic = 'force-dynamic';

export default async function CohortDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { cohortId } = await params;
  // 뒤로가기 출처(A′-4): 콘솔 경유(?from=console)→콘솔, 그 외(목록 경유·직접 진입)→모든 회기 목록 기본.
  const sp = await searchParams;
  const from = typeof sp.from === 'string' ? sp.from : null;
  const backHref = from === 'console' ? '/coach' : '/coach/cohorts';
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  const cohort = await requestCohort(cohortId).catch(() => null);
  if (!cohort) notFound(); // 미존재/RLS 차단 → 404

  const [enrollments, responses, alerts, members] = await Promise.all([
    ctx.listEnrollments(cohortId),
    ctx.listResponses<Answers, unknown>({ instrumentId: cohort.instrumentId, cohortId }),
    ctx.listAlerts(cohortId),
    ctx.listCohortMembers(cohortId),
  ]);

  // 주 함정 태그(Phase 3·ADR-77): 사용자별 최신 응답을 채점해 trap.primary 라벨. 답안은 이미 로드됨(추가 쿼리 0).
  //   채점은 in-memory 산술(멤버 수만큼)이라 경량 — 채점 실패는 스킵. futurenow 회기만(타 인스트루먼트 태그 없음).
  const trapByUserId: Record<string, string> = {};
  if (cohort.instrumentId === 'futurenow') {
    const trapLabel = Object.fromEntries(TRAP_AXES.map((t) => [t.code, t.label]));
    const latest = new Map<string, (typeof responses)[number]>();
    for (const r of responses) {
      if (!r.userId) continue;
      const prev = latest.get(r.userId);
      if (!prev || r.createdAt > prev.createdAt) latest.set(r.userId, r);
    }
    for (const [uid, r] of latest) {
      try {
        trapByUserId[uid] = trapLabel[futurenowScoring.score(r.answers, { wave: r.wave }).trap.primary];
      } catch {
        /* 채점 실패 스킵 — 태그만 생략, 명단은 정상 */
      }
    }
  }

  const { roster, responded, waiting, careCount } = buildCohortRoster({ enrollments, responses, alerts, members, trapByUserId });
  const summary: CohortSummary = {
    id: cohort.id,
    name: cohort.name,
    description: cohort.description,
    instrumentLabel: instrumentDisplay(cohort.instrumentId).label,
    responded,
    total: responded + waiting,
    careCount,
    code: cohort.code,
  };

  // 참여자 휴지통 노출·권한(ADR-73): 운영자 또는 이 회기의 코치(소유)만. RPC 도 동일 게이트로 이중 방어.
  const canManageMembers = me.role === 'admin' || cohort.coachId === me.id;

  // 참여자 이동 대상(ADR-84·운영자 전용): 같은 진단의 모든 회기(미배정 체험·휴지통 포함), 현재 회기 제외.
  const moveTargets =
    me.role === 'admin'
      ? (await ctx.listAllCohorts())
          .filter((c) => c.id !== cohortId && c.instrumentId === cohort.instrumentId)
          .map((c) => ({ id: c.id, name: c.name }))
      : [];

  return (
    <>
      <CohortDetailClient
        summary={summary}
        roster={roster}
        status={cohort.status}
        maxMembers={cohort.maxMembers}
        postOpened={cohort.postOpenedAt != null}
        backHref={backHref}
        isAdmin={me.role === 'admin'}
        canManageMembers={canManageMembers}
        memberCount={enrollments.length}
        responseCount={responses.length}
        moveTargets={moveTargets}
      />
      {/* 피드 흐름 요약(2차 · 발주 §6.2). 기존 명단 화면은 한 줄도 건드리지 않고 아래에 덧댄다. */}
      <div style={{ maxWidth: 'var(--w-public, 1200px)', margin: '0 auto', padding: '0 var(--space-4) var(--space-6)' }}>
        <FeedSummary cohortId={cohortId} />
      </div>
    </>
  );
}
